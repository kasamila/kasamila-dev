import {demoText} from './demo-copy.js?v=20261017';

// Own the entire startup deadline, including fetch/import/model/audio waits.
// Keep the audio recovery control after startup for mobile foreground resumes.
export class DemoStartup {
 constructor(anchor, status, onTimeout) {
  this.controller=new AbortController();this.status=status;this.phase='preparing';
  this.button=document.createElement('button');this.button.type='button';this.button.hidden=true;
  this.button.className='demo-audio-activate';anchor.after(this.button);
  this.button.onclick=()=>{
   this.media?.resume();
   // Call resume directly in the trusted click, before any asynchronous work.
   for(const ctx of this.contexts())if(ctx.state!=='running')Promise.resolve(ctx.resume()).catch(()=>{});
  };
  this.timer=setTimeout(()=>onTimeout(demoText('startupTimeout')),180000);
  this.poll=setInterval(()=>this.update(),250);this.update();
 }
 get signal(){return this.controller.signal;}
 contexts(){return [...new Set([this.context,this.element?.audioPlayer?.audioContext].filter(Boolean))];}
 bind(element,context){this.element=element;this.context=context;this.update();}
 update(){
  const blocked=this.contexts().some(ctx=>['suspended','interrupted'].includes(ctx.state));
  const videoBlocked=this.media?.needsGesture;
  this.button.hidden=!blocked&&!videoBlocked;
  this.button.textContent=demoText(videoBlocked?'enableVideo':'enableAudio');
  const key=this.phase?(blocked?'audioBlocked':videoBlocked?'videoBlocked':this.phase):null;
  if(key&&key!==this.lastStatus){this.lastStatus=key;this.status(demoText(key));}
 }
 video(media){this.media=media;this.phase='loadingVideo';this.update();}
 connecting(){this.phase='connectingVoice';this.update();}
 complete(){clearTimeout(this.timer);this.phase=null;this.update();}
 close(){clearTimeout(this.timer);clearInterval(this.poll);this.controller.abort();this.button.remove();}
}

export async function releaseDemoRuntime(value){
 if(!value)return;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{await fetch(new URL('/api/v1/runtime/sessions/end',value.api_base||location.origin),{method:'POST',keepalive:true,signal:controller.signal,headers:{Authorization:'Bearer '+value.runtime.client_token}});}catch{}finally{clearTimeout(timer);}
}

export async function disposeDemoAvatar(element,value){
 // SDK initialization has no cancellation argument. Detach immediately, end its
 // runtime, and also destroy any late completion in the caller's version guard.
 element?.remove?.();
 const destroyed=await new Promise(resolve=>{
  const timer=setTimeout(()=>resolve(false),5000);
  Promise.resolve().then(async()=>{
   if(typeof element?.destroy!=='function')return false;
   await element.destroy();return true;
  }).catch(()=>false).then(ok=>{clearTimeout(timer);resolve(ok);});
 });
 if(!destroyed)await releaseDemoRuntime(value);
}

export async function voiceTicket(path,result,signal){
 const response=await fetch(path,{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({preparation:result.preparation})});
 if(!response.ok)throw new Error('demo_connection_failed');
 return (await response.json()).ticket;
}
