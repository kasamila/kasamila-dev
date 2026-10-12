import {demoText} from './demo-copy.js?v=6';

// Portal presentation/admission only. Do not alter the SDK renderer, its frame
// callbacks, geometry timeline, or the media URL selected by the Runtime.
export class DemoVideo {
 constructor(stage,poster,{onState,onFailure}) {
  this.stage=stage;this.onState=onState;this.onFailure=onFailure;
  this.closed=false;this.frames=0;this.lastFrame=0;this.state='loading';
  this.cover=document.createElement('div');this.cover.className='demo-video-cover';
  this.cover.style.cssText='position:absolute;inset:0;z-index:2;pointer-events:none;background:#0b1a22;display:grid;place-items:center';
  const image=document.createElement('img');image.alt='';image.src=poster;
  image.style.cssText='width:100%;height:100%;object-fit:contain';this.cover.append(image);stage.append(this.cover);
  stage.dataset.demoVideoState='loading';
 }
 get needsGesture(){return this.playBlocked===true;}
 resume(){
  if(this.closed||!this.video||this.video.error)return;
  this.playBlocked=false;
  // Also called directly by the visible activation button's trusted click.
  try{Promise.resolve(this.video.play()).catch(error=>{
   if(!this.closed&&error?.name==='NotAllowedError')this.playBlocked=true;
  });}catch(error){if(error?.name==='NotAllowedError')this.playBlocked=true;}
 }
 wait(element){
  this.element=element;this.video=element.video||element.shadowRoot?.querySelector('video');
  if(!this.video){this.fail();return Promise.reject(new Error('video unavailable'));}
  const video=this.video;video.muted=true;video.playsInline=true;video.preload='auto';
  this.promise=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});
  this.videoError=()=>this.fail();video.addEventListener('error',this.videoError);
  this.canvas=element.canvas||element.shadowRoot?.querySelector('canvas');
  this.canvas?.addEventListener('webglcontextlost',this.videoError);
  this.foreground=()=>{if(!document.hidden){this.frames=0;this.lastFrame=0;this.waitStarted=performance.now();this.resume();this.check();}};
  document.addEventListener('visibilitychange',this.foreground);
  if(typeof video.requestVideoFrameCallback==='function'){
   const frame=()=>{
    if(this.closed)return;
    this.frames++;this.lastFrame=performance.now();
    this.frameRequest=video.requestVideoFrameCallback(frame);
   };
   this.frameRequest=video.requestVideoFrameCallback(frame);
  }else{
   // Older browsers: observe decoded media time advancing, not metadata alone.
   this.lastTime=video.currentTime;
  }
  this.waitStarted=performance.now();this.resume();
  this.poll=setInterval(()=>this.check(),200);this.check();return this.promise;
 }
 check(){
  if(this.closed)return;
  const v=this.video,now=performance.now();
  if(v.error){this.fail();return;}
  if(typeof v.requestVideoFrameCallback!=='function'&&v.currentTime!==this.lastTime){
   this.frames++;this.lastFrame=now;this.lastTime=v.currentTime;
  }
  const decoded=v.readyState>=2&&v.videoWidth>0&&v.videoHeight>0&&!v.seeking;
  // Two presented frames give the SDK its own frame callback/render opportunity.
  const playable=decoded&&!v.paused&&this.frames>=2&&now-this.lastFrame<3000;
  if(playable){
   this.unavailableSince=null;
   if(this.state!=='ready'){
    this.state='ready';this.cover.hidden=true;this.cover.style.display='none';this.stage.dataset.demoVideoState='ready';
    this.waitStarted=null;this.onState(true);this.resolve?.();this.resolve=this.reject=null;
   }
   return;
  }
  if(document.hidden)return;
  if(this.state==='ready'){
   // The renderer can briefly pause/seek while advancing its template. Do not
   // interrupt a conversation for those normal transitions.
   this.unavailableSince??=now;
   if(now-this.unavailableSince<1500)return;
   this.state='buffering';this.cover.hidden=false;this.cover.style.display='grid';this.stage.dataset.demoVideoState='buffering';
   this.waitStarted=now;this.onState(false);
  }
  if(this.waitStarted!==null&&now-this.waitStarted>=45000)this.fail();
 }
 fail(){
  if(this.closed)return;
  const reject=this.reject;this.reject=this.resolve=null;
  this.close();reject?.(new Error('video unavailable'));this.onFailure(demoText('videoFailed'));
 }
 close(){
  if(this.closed)return;this.closed=true;clearInterval(this.poll);
  if(this.frameRequest!==undefined)this.video?.cancelVideoFrameCallback?.(this.frameRequest);
  this.video?.removeEventListener('error',this.videoError);this.canvas?.removeEventListener('webglcontextlost',this.videoError);
  document.removeEventListener('visibilitychange',this.foreground);
  this.cover.remove();delete this.stage.dataset.demoVideoState;
  this.reject?.(new DOMException('Cancelled','AbortError'));this.resolve=this.reject=null;
 }
}
