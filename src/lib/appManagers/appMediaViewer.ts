//import { MTDocument, ProgressivePreloader, wrapVideo } from "../../components/misc";
import appPeersManager from "./appPeersManager";
import appDialogsManager from "./appDialogsManager";
import appPhotosManager from "./appPhotosManager";
import appSidebarRight from "./appSidebarRight";
import { $rootScope } from "../utils";
import appMessagesManager from "./appMessagesManager";
//import { CancellablePromise } from "../mtproto/apiFileManager";
import { RichTextProcessor } from "../richtextprocessor";
import { logger } from "../polyfill";
import ProgressivePreloader from "../../components/preloader";
import { wrapVideo } from "../../components/wrappers";

export class AppMediaViewer {
  private overlaysDiv = document.querySelector('.overlays') as HTMLDivElement;
  private mediaViewerDiv = this.overlaysDiv.firstElementChild as HTMLDivElement;
  private author = {
    avatarEl: this.overlaysDiv.querySelector('.user-avatar') as HTMLDivElement,
    nameEl: this.overlaysDiv.querySelector('.media-viewer-name') as HTMLDivElement,
    date: this.overlaysDiv.querySelector('.media-viewer-date') as HTMLDivElement
  };
  private buttons = {
    delete: this.overlaysDiv.querySelector('.media-viewer-delete-button') as HTMLDivElement,
    forward: this.overlaysDiv.querySelector('.media-viewer-forward-button') as HTMLDivElement,
    download: this.overlaysDiv.querySelector('.media-viewer-download-button') as HTMLDivElement,
    close: this.overlaysDiv.querySelector('.media-viewer-close-button') as HTMLDivElement,
    prev: this.overlaysDiv.querySelector('.media-viewer-switcher-left') as HTMLDivElement,
    next: this.overlaysDiv.querySelector('.media-viewer-switcher-right') as HTMLDivElement,
  };
  private content = {
    container: this.overlaysDiv.querySelector('.media-viewer-media') as HTMLDivElement,
    caption: this.overlaysDiv.querySelector('.media-viewer-caption') as HTMLDivElement,
    mover: this.overlaysDiv.querySelector('.media-viewer-mover') as HTMLDivElement
  };
  
  private reverse = false;
  public currentMessageID = 0;
  private higherMsgID: number | undefined = 0;
  private lowerMsgID: number | undefined = 0;
  private preloader: ProgressivePreloader = null;

  private lastTarget: HTMLElement = null;
  private prevTarget: HTMLElement = null;
  private nextTarget: HTMLElement = null;

  public log: ReturnType<typeof logger>; 
  
  constructor() {
    this.log = logger('AMV');
    this.preloader = new ProgressivePreloader();
    
    this.buttons.close.addEventListener('click', () => {
      //this.overlaysDiv.classList.remove('active');
      this.content.container.innerHTML = '';
      this.currentMessageID = 0;

      this.setMoverToTarget(this.lastTarget, true);
    });
    
    /* this.buttons.prev.addEventListener('click', () => {
      let id = this.reverse ? this.lowerMsgID : this.higherMsgID;
      if(id) {
        this.openMedia(appMessagesManager.getMessage(id), this.reverse);
      } else {
        this.buttons.prev.style.display = 'none';
      }
    });
    
    this.buttons.next.addEventListener('click', () => {
      let id = this.reverse ? this.higherMsgID : this.lowerMsgID;
      if(id) {
        this.openMedia(appMessagesManager.getMessage(id), this.reverse);
      } else {
        this.buttons.next.style.display = 'none';
      }
    }); */
    this.buttons.prev.addEventListener('click', () => {
      let target = this.prevTarget;
      if(target) {
        target.click();
      } else {
        this.buttons.prev.style.display = 'none';
      }
    });
    
    this.buttons.next.addEventListener('click', () => {
      let target = this.nextTarget;
      if(target) {
        target.click();
      } else {
        this.buttons.next.style.display = 'none';
      }
    });

    this.buttons.download.addEventListener('click', () => {
      let message = appMessagesManager.getMessage(this.currentMessageID);
      appPhotosManager.downloadPhoto(message.media.photo.id);
    });

    this.overlaysDiv.addEventListener('click', (e) => {
      let target = e.target as HTMLElement;

      if(target == this.mediaViewerDiv || target.tagName == 'IMG') {
        this.buttons.close.click();
      }
    });
    /* this.buttons.prev.onclick = (e) => {
      let history = appSidebarRight.historiesStorage[$rootScope.selectedPeerID]['inputMessagesFilterPhotoVideo'].slice();
      
      let message: any;
      
      if(!this.reverse) {
        for(let mid of history) {
          if(mid > this.currentMessageID) {
            let _message = appMessagesManager.getMessage(mid);
            if(_message.media && _message.media.photo) {
              message = _message;
            }
          } else break;
        }
      } else {
        for(let mid of history) {
          if(mid < this.currentMessageID) {
            let _message = appMessagesManager.getMessage(mid);
            if(_message.media && _message.media.photo) {
              message = _message;
              break;
            }
          }
        }
      }
      
      if(message) {
        this.openMedia(message.media.photo, message.mid, this.reverse);
      } else {
        this.buttons.prev.style.display = 'none';
      }
    };
    
    this.buttons.next.onclick = (e) => {
      let history = appSidebarRight.historiesStorage[$rootScope.selectedPeerID]['inputMessagesFilterPhotoVideo'].slice();
      
      let message: any;
      
      if(this.reverse) {
        for(let mid of history) {
          if(mid > this.currentMessageID) {
            let _message = appMessagesManager.getMessage(mid);
            if(_message.media && _message.media.photo) {
              message = _message;
            }
          } else break;
        }
      } else {
        for(let mid of history) {
          if(mid < this.currentMessageID) {
            let _message = appMessagesManager.getMessage(mid);
            if(_message.media && _message.media.photo) {
              message = _message;
              break;
            }
          }
        }
      }
      
      if(message) {
        this.openMedia(message.media.photo, message.mid, this.reverse);
      } else {
        this.buttons.next.style.display = 'none';
      }
    }; */
  }

  public setMoverToTarget(target: HTMLElement, closing = false) {
    let mover = this.content.mover;

    if(!closing) {
      mover.innerHTML = '';
    }

    let rect = target.getBoundingClientRect();
    let containerRect = this.content.container.getBoundingClientRect();
    let scaleX = rect.width / containerRect.width;
    let scaleY = rect.height / containerRect.height;
    mover.style.transform = `translate(${rect.left}px, ${rect.top}px) scale(${scaleX}, ${scaleY})`;
    mover.style.width = containerRect.width + 'px';
    mover.style.height = containerRect.height + 'px';

    if(!closing) {
      let img: HTMLImageElement;
      let video: HTMLVideoElement;

      if(target.tagName == 'DIV') { // means backgrounded with cover
        //img.style.objectFit = 'cover';
        img = new Image();
        img.src = target.style.backgroundImage.slice(5, -2);
      } else if(target.tagName == 'IMG') {
        img = new Image();
        img.src = (target as HTMLImageElement).src;
        img.style.objectFit = 'contain';
      } else if(target.tagName == 'VIDEO') {
        video = document.createElement('video');
        let source = document.createElement('source');
        source.src = target.querySelector('source').src;
        video.append(source);
      }

      if(img) {
        mover.appendChild(img);
      } else if(video) {
        mover.appendChild(video);
      }
  
      mover.style.display = '';
      mover.classList.add('active');
    } else {
      setTimeout(() => {
        this.overlaysDiv.classList.remove('active');
      }, 125);
      setTimeout(() => {
        mover.innerHTML = '';
        mover.classList.remove('active');
        mover.style.display = 'none';
      }, 250);
    }

    return () => {
      mover.style.transform = `translate(${containerRect.left}px, ${containerRect.top}px) scale(1, 1)`;
    };
  }
  
  public openMedia(message: any, reverse = false, target?: HTMLElement, prevTarget?: HTMLElement, nextTarget?: HTMLElement) {
    this.log('openMedia doc:', message, prevTarget, nextTarget);
    let media = message.media.photo || message.media.document || message.media.webpage.document || message.media.webpage.photo;
    
    let isVideo = media.mime_type == 'video/mp4';
    
    this.currentMessageID = message.mid;
    this.reverse = reverse;
    this.prevTarget = prevTarget || null;
    this.nextTarget = nextTarget || null;
    
    let container = this.content.container;
    
    if(container.firstElementChild) {
      container.innerHTML = '';
    }
    
    let date = new Date(media.date * 1000);
    let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let dateStr = months[date.getMonth()] + ' ' + date.getDate() + ' at '+ date.getHours() + ':' + ('0' + date.getMinutes()).slice(-2);
    this.author.date.innerText = dateStr;
    
    let name = appPeersManager.getPeerTitle(message.fromID);
    this.author.nameEl.innerHTML = name;
    
    if(message.message) {
      this.content.caption.innerHTML = RichTextProcessor.wrapRichText(message.message, {
        entities: message.totalEntities
      });
    } else {
      this.content.caption.innerHTML = '';
    }
    
    appDialogsManager.loadDialogPhoto(this.author.avatarEl, message.fromID);
    
    this.overlaysDiv.classList.add('active');

    container.classList.add('loading');

    // ok set
    let mover = this.content.mover;

    this.lastTarget = target;
    //this.setMoverToTarget(target);
    let maxWidth = appPhotosManager.windowW - 16;
    let maxHeight = appPhotosManager.windowH - 100;
    if(isVideo) {
      //this.preloader.attach(container);
      //this.preloader.setProgress(75);

      let size = appPhotosManager.setAttachmentSize(media, container, maxWidth, maxHeight);

      this.log('will wrap video', media, size);

      let afterTimeout = this.setMoverToTarget(target);
      
      setTimeout(() => {
        afterTimeout();

        wrapVideo.call(this, media, mover, message, false, this.preloader).then(() => {
          if(this.currentMessageID != message.mid) {
            this.log.warn('media viewer changed video');
            return;
          }
        });
      });

      /* appPhotosManager.setAttachmentSize(media, container, appPhotosManager.windowW, appPhotosManager.windowH);
      wrapVideo.call(this, media, container, message, false, this.preloader).then(() => {
        if(this.currentMessageID != message.mid) {
          this.log.warn('media viewer changed video');
          return;
        }

        container.classList.remove('loading');
        container.style.width = '';
        container.style.height = '';
      }); */
    } else {
      let size = appPhotosManager.setAttachmentSize(media.id, container, maxWidth, maxHeight);

      let afterTimeout = this.setMoverToTarget(target);
      
      setTimeout(() => {
        afterTimeout();
        this.preloader.attach(mover);

        let cancellablePromise = appPhotosManager.preloadPhoto(media.id, size);
        cancellablePromise.then((blob) => {
          if(this.currentMessageID != message.mid) {
            this.log.warn('media viewer changed photo');
            return;
          }
          
          this.log('indochina', blob);

          let image = mover.firstElementChild as HTMLImageElement || new Image();
          image.src = URL.createObjectURL(blob);
          mover.append(image);

          this.preloader.detach();
        }).catch(err => {
          this.log.error(err);
        });
      }, 0);
    }
    
    /* let history = appSidebarRight.historiesStorage[$rootScope.selectedPeerID]['inputMessagesFilterPhotoVideo'].slice();
    let index = history.findIndex(m => m == message.mid);
    let comparer = (mid: number) => {
      let _message = appMessagesManager.getMessage(mid);
      let media = _message.media;

      if(media && (media.photo || (media.document && ['video', 'gif'].indexOf(media.document.type) !== -1))) return true;
      return false;
    };
    
    this.higherMsgID = history.slice(0, index).reverse().find(comparer);
    this.lowerMsgID = history.slice(index + 1).find(comparer);
    
    if(this.reverse) {
      this.buttons.prev.style.display = this.lowerMsgID !== undefined ? '' : 'none';
      this.buttons.next.style.display = this.higherMsgID !== undefined ? '' : 'none';
    } else {
      this.buttons.prev.style.display = this.higherMsgID !== undefined ? '' : 'none';
      this.buttons.next.style.display = this.lowerMsgID !== undefined ? '' : 'none';
    } */

    this.buttons.prev.style.display = this.prevTarget ? '' : 'none';
    this.buttons.next.style.display = this.nextTarget ? '' : 'none';
    
    //console.log('prev and next', prevMsgID, nextMsgID);
  }
}

export default new AppMediaViewer();
