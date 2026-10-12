const origin='https://kasamila.com',frame=document.querySelector('#avatar'),label=document.querySelector('#status');
const zh=chrome.i18n.getUILanguage().startsWith('zh');
const words=zh?{
 idle:'在有声音的网页点击工具栏中的 Kasamila 图标',connecting:'正在连接所选网页…',capturing:'声音来源：',failed:'未能捕获声音',replaced:'数字人已在另一个伴侣窗口中打开',
 source:'请选择普通网页，不能选择浏览器设置或伴侣页面。',permission:'请回到声音来源网页，再点击工具栏中的 Kasamila 图标授权。',
 'in-use':'此标签页正在被另一个扩展捕获。请结束其他捕获后重试。',offscreen:'音频后台不可用，请在扩展管理中重新加载本扩展。',capture:'浏览器无法打开此音频源，请刷新来源网页后重试。','audio-context':'浏览器音频引擎未能启动，请重新加载扩展。',
 float:'置顶小窗',back:'收起小窗',stop:'停止',hint:'点击“置顶小窗”，让数字人陪伴在其他窗口上方。',pip:'数字人在小窗运行 · 大窗已自动最小化',waiting:'请先在伴侣控制窗选择并启用数字人',live:'与网页声音同步',unsupported:'当前浏览器不支持置顶小窗，请更新桌面 Chrome / Edge。',pipError:'小窗未能打开，请重新点击；也可继续使用伴侣控制窗。'
}:{
 idle:'Click Kasamila in the toolbar on a page with audio',connecting:'Connecting to selected page…',capturing:'Audio from: ',failed:'Could not capture audio',replaced:'Avatar opened in another companion window',
 source:'Select a regular web page, not browser settings or the companion.',permission:'Return to the source page and click Kasamila in the toolbar to grant access.',
 'in-use':'Another extension is capturing this tab. Stop that capture and retry.',offscreen:'Audio background unavailable. Reload this extension.',capture:'Cannot open this audio source. Refresh the source page and retry.','audio-context':'Audio engine could not start. Reload the extension.',
 float:'Always-on-top window',back:'Close mini window',stop:'Stop',hint:'Keep your avatar above other windows with the mini window.',pip:'Avatar runs in the mini window · Controller minimized',waiting:'Select and enable an avatar in the companion window first',live:'Following your web audio',unsupported:'Always-on-top is unavailable. Update desktop Chrome / Edge.',pipError:'Could not open the mini window. Click again or use the companion window.'
};
// Only the visible window hosts an SDK renderer. No bitmap copies or background RAF.
let state={status:'idle'},replaced=false,pip=null,activeFrame=frame,pipFrame=null,closing=false,disposed=false,transition=false;
let outgoing=Promise.resolve(null),requestId=0;
const sessions=new WeakMap(),loaded=new WeakSet(),pending=new Map();
const port=chrome.runtime.connect({name:'panel'}),float=document.querySelector('#float'),hint=document.querySelector('#hint');
function relay(value){if(!replaced)try{port.postMessage(value);}catch{}}
function sendTo(target,value){if(!replaced&&target?.contentWindow)target.contentWindow.postMessage(value,origin);}
function publishCapture(){sendTo(activeFrame,{type:'capture-state',active:state.status==='capturing'});}
function restore(target,session){
 if(session)sessions.set(target,session);
 if(!loaded.has(target))return;
 sendTo(target,{type:'capture-state',active:state.status==='capturing'});
 if(session)sendTo(target,{type:'restore',session});
}
function handoff(target){
 if(!loaded.has(target))return Promise.resolve(sessions.get(target));
 const id=String(++requestId);
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{pending.delete(id);reject(new Error('handoff timeout'));},15000);
  pending.set(id,{target,resolve:session=>{clearTimeout(timeout);resolve(session);}});
  sendTo(target,{type:'handoff',id});
 });
}
async function closePip(){
 if(!pip||pip.closed||closing)return;
 closing=true;transition=true;float.disabled=true;
 try{outgoing=handoff(activeFrame);await outgoing;}catch{hint.textContent=words.pipError;}
 finally{pip?.close();closing=false;}
}
port.onMessage.addListener(message=>{
 if(message.type==='state'){
  state=message;document.body.dataset.state=state.status;
  label.textContent=(words[state.status]||words.failed)+(state.status==='capturing'?state.source:state.status==='failed'?' · '+(words[state.reason]||words.capture)+' ['+(state.reason||'capture')+']':'');
  publishCapture();
 }
 if(message.type==='pcm'||message.type==='tick')sendTo(activeFrame,message);
 if(message.type==='replaced'){replaced=true;disposed=true;pip?.close();frame.src='about:blank';label.textContent=words.replaced;float.disabled=true;document.querySelector('#stop').disabled=true;}
});
port.onDisconnect.addListener(()=>{if(!replaced){sendTo(activeFrame,{type:'capture-state',active:false});label.textContent=words.offscreen;disposed=true;pip?.close();}});
function onMessage(event){
 if(event.origin!==origin)return;
 const sender=[frame,pipFrame].find(f=>f&&event.source===f.contentWindow);if(!sender)return;
 const message=event.data;
 if(message?.type==='handoff-ready'){
  const request=pending.get(message.id);
  if(request?.target===sender){pending.delete(message.id);request.resolve(message.session);}return;
 }
 if(message?.type==='bridge-ready'){
  loaded.add(sender);if(sender===activeFrame)restore(sender,sessions.get(sender));return;
 }
 if(sender!==activeFrame)return;
 if(message?.type==='session-state'){
  if(!transition){sessions.set(sender,message.session);float.disabled=message.session?.busy===true;}
 }else if(message?.type==='ready'){
  transition=false;float.disabled=false;relay({type:'ready'});
  if(sender===pipFrame&&pip&&!pip.closed){hint.textContent=words.pip;relay({type:'minimize'});}
 }else if(message?.type==='not-ready')relay({type:'not-ready'});
 else if(message?.type==='ack'&&Number.isSafeInteger(message.sequence))relay({type:'ack',sequence:message.sequence});
 else if(message?.type==='stop'&&!transition)relay({type:'stop'});
}
window.addEventListener('message',onMessage);
document.documentElement.lang=zh?'zh':'en';document.querySelector('#subtitle').textContent=zh?'语音伴侣':'Voice Companion';
document.querySelector('#stop').textContent=words.stop;document.querySelector('#stop').onclick=()=>relay({type:'stop'});
float.textContent=words.float;hint.textContent=words.hint;
float.onclick=async()=>{
 if(pip&&!pip.closed){void closePip();return;}
 if(!window.documentPictureInPicture){hint.textContent=words.unsupported;return;}
 try{
  pip=await documentPictureInPicture.requestWindow({width:360,height:450});
  const current=pip,doc=pip.document;doc.documentElement.lang=zh?'zh':'en';doc.title='Kasamila';
  const css=doc.createElement('style');css.textContent=Array.from(document.styleSheets).flatMap(sheet=>Array.from(sheet.cssRules,rule=>rule.cssText)).join('\n');doc.head.append(css);doc.body.className='pip direct';
  const heading=document.querySelector('header').cloneNode(true),icon=heading.querySelector('img'),iconCanvas=document.createElement('canvas');iconCanvas.width=iconCanvas.height=76;
  if(document.querySelector('header img').complete)iconCanvas.getContext('2d').drawImage(document.querySelector('header img'),0,0,76,76);
  icon.src=iconCanvas.toDataURL();heading.querySelector('.version').remove();doc.body.append(heading);
  pipFrame=doc.createElement('iframe');pipFrame.title='Kasamila';pipFrame.allow='autoplay';pipFrame.referrerPolicy='no-referrer';
  const target=pipFrame;doc.body.append(target);
  const footer=doc.createElement('footer'),back=doc.createElement('button');back.textContent=words.back;back.onclick=closePip;footer.append(back);
  const stop=doc.createElement('button');stop.textContent=words.stop;stop.onclick=()=>relay({type:'stop'});footer.append(stop);doc.body.append(footer);
  current.addEventListener('message',onMessage);
  current.addEventListener('pagehide',()=>{
   const saved=sessions.get(target),wasClosing=closing;
   pip=null;pipFrame=null;activeFrame=frame;frame.hidden=false;float.textContent=words.float;
   if(disposed)return;
   relay({type:'restore-window'});relay({type:'not-ready'});
   // The native X cannot await shutdown; allow the old lease's close to reach Portal.
   void outgoing.catch(()=>null).then(async transferred=>{
    await new Promise(resolve=>setTimeout(resolve,600));
    if(disposed||pip)return;
    transition=false;float.disabled=false;hint.textContent=words.hint;restore(frame,wasClosing?transferred:(saved||transferred));
   });
  },{once:true});
  transition=true;float.disabled=true;float.textContent=words.back;
  outgoing=handoff(frame);const saved=await outgoing;
  if(current.closed)return;
  activeFrame=target;frame.hidden=true;restore(target,saved);
  target.src=origin+'/portal/apps/companion/embed?compact=1&lang='+encodeURIComponent(chrome.i18n.getUILanguage().split('-')[0]);
  // An unconnected mini window displays its own setup controls.
  if(!saved?.active){transition=false;float.disabled=false;}
 }catch{hint.textContent=words.pipError;transition=false;float.disabled=false;pip?.close();}
};
window.addEventListener('pagehide',()=>{disposed=true;pip?.close();});
frame.src=origin+'/portal/apps/companion/embed?lang='+encodeURIComponent(chrome.i18n.getUILanguage().split('-')[0]);
