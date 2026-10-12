const origin='https://kasamila.com',frame=document.querySelector('#avatar'),label=document.querySelector('#status');
const zh=chrome.i18n.getUILanguage().startsWith('zh');
const words=zh?{
 idle:'在有声音的网页点击工具栏中的 Kasamila 图标',connecting:'正在连接所选网页…',capturing:'声音来源：',failed:'未能捕获声音',replaced:'数字人已在另一个伴侣窗口中打开',
 source:'请选择普通网页，不能选择浏览器设置或伴侣页面。',permission:'请回到声音来源网页，再点击工具栏中的 Kasamila 图标授权。',
 'in-use':'此标签页正在被另一个扩展捕获。请结束其他捕获后重试。',offscreen:'音频后台不可用，请在扩展管理中重新加载本扩展。',capture:'浏览器无法打开此音频源，请刷新来源网页后重试。','audio-context':'浏览器音频引擎未能启动，请重新加载扩展。',
 float:'置顶小窗',back:'收起小窗',stop:'停止',hint:'点击“置顶小窗”，让数字人陪伴在其他窗口上方。',pip:'小窗运行中 · 保持此伴侣控制窗打开',waiting:'请先在伴侣控制窗选择并启用数字人',live:'与网页声音同步',unsupported:'当前浏览器不支持置顶小窗，请更新桌面 Chrome / Edge。',pipError:'小窗未能打开，请重新点击；也可继续使用伴侣控制窗。',mirrorError:'无法读取数字人画面，请收起小窗并使用伴侣控制窗。'
}:{
 idle:'Click Kasamila in the toolbar on a page with audio',connecting:'Connecting to selected page…',capturing:'Audio from: ',failed:'Could not capture audio',replaced:'Avatar opened in another companion window',
 source:'Select a regular web page, not browser settings or the companion.',permission:'Return to the source page and click Kasamila in the toolbar to grant access.',
 'in-use':'Another extension is capturing this tab. Stop that capture and retry.',offscreen:'Audio background unavailable. Reload this extension.',capture:'Cannot open this audio source. Refresh the source page and retry.','audio-context':'Audio engine could not start. Reload the extension.',
 float:'Always-on-top window',back:'Close mini window',stop:'Stop',hint:'Keep your avatar above other windows with the mini window.',pip:'Mini window active · Keep this companion window open',waiting:'Select and enable an avatar in the companion window first',live:'Following your web audio',unsupported:'Always-on-top is unavailable. Update desktop Chrome / Edge.',pipError:'Could not open the mini window. Click again or use the companion window.',mirrorError:'Avatar preview unavailable. Close the mini window and use the companion window.'
};
let state={status:'idle'},replaced=false,pip=null,pipCanvas=null,pipStatus=null,active=false;
const port=chrome.runtime.connect({name:'panel'}),float=document.querySelector('#float'),hint=document.querySelector('#hint');
function send(value){if(!replaced)frame.contentWindow.postMessage(value,origin);}
function relay(value){if(!replaced)try{port.postMessage(value);}catch{}}
function updatePip(){if(pipStatus)pipStatus.textContent=active?words.live:words.waiting;}
function closePip(){if(pip&&!pip.closed)pip.close();}
port.onMessage.addListener(message=>{
 if(message.type==='state'){
  state=message;document.body.dataset.state=state.status;
  label.textContent=(words[state.status]||words.failed)+(state.status==='capturing'?state.source:state.status==='failed'?' · '+(words[state.reason]||words.capture)+' ['+(state.reason||'capture')+']':'');
  send({type:'capture-state',active:state.status==='capturing'});
 }
 if(message.type==='pcm'||message.type==='tick')send(message);
 if(message.type==='replaced'){replaced=true;closePip();frame.src='about:blank';label.textContent=words.replaced;float.disabled=true;document.querySelector('#stop').disabled=true;}
});
port.onDisconnect.addListener(()=>{if(!replaced){send({type:'capture-state',active:false});label.textContent=words.offscreen;closePip();}});
window.addEventListener('message',event=>{
 if(event.source!==frame.contentWindow||event.origin!==origin)return;
 const message=event.data;
 if(message?.type==='bridge-ready'){send({type:'capture-state',active:state.status==='capturing'});send({type:'mirror',active:!!pip&&!pip.closed});}
 else if(message?.type==='ready'){active=true;updatePip();relay({type:'ready'});}
 else if(message?.type==='not-ready'){active=false;updatePip();relay({type:'not-ready'});}
 else if(message?.type==='ack'&&Number.isSafeInteger(message.sequence))relay({type:'ack',sequence:message.sequence});
 else if(message?.type==='stop')relay({type:'stop'});
 else if(message?.type==='mirror-frame'&&message.bitmap instanceof ImageBitmap){
  // Transfer-only image frames; no token, audio replay, second Runtime or page-script execution.
  try{if(pipCanvas&&pip&&!pip.closed){const c=pipCanvas.getContext('2d');c.clearRect(0,0,384,384);const b=message.bitmap,scale=Math.max(384/b.width,384/b.height);c.drawImage(b,(384-b.width*scale)/2,(384-b.height*scale)/2,b.width*scale,b.height*scale);}}
  finally{message.bitmap.close();send({type:'mirror-ack'});}
 }else if(message?.type==='mirror-error'&&pipStatus)pipStatus.textContent=words.mirrorError;
});
document.documentElement.lang=zh?'zh':'en';document.querySelector('#subtitle').textContent=zh?'语音伴侣':'Voice Companion';
document.querySelector('#stop').textContent=words.stop;document.querySelector('#stop').onclick=()=>relay({type:'stop'});
float.textContent=words.float;hint.textContent=words.hint;
float.onclick=async()=>{
 if(pip&&!pip.closed){closePip();return;}
 if(!window.documentPictureInPicture){hint.textContent=words.unsupported;return;}
 try{
  pip=await documentPictureInPicture.requestWindow({width:360,height:450});
  const doc=pip.document;doc.documentElement.lang=zh?'zh':'en';doc.title='Kasamila';
  // PiP's about:blank document cannot load extension subresources in all Chromium builds.
  // Copy our already-loaded packaged CSS, never remote styles/scripts.
  const css=doc.createElement('style');css.textContent=Array.from(document.styleSheets).flatMap(sheet=>Array.from(sheet.cssRules,rule=>rule.cssText)).join('\n');doc.head.append(css);doc.body.className='pip';
  const heading=document.querySelector('header').cloneNode(true);const icon=heading.querySelector('img');const iconCanvas=document.createElement('canvas');iconCanvas.width=iconCanvas.height=76;iconCanvas.getContext('2d').drawImage(document.querySelector('header img'),0,0,76,76);icon.src=iconCanvas.toDataURL();heading.querySelector('.version').remove();doc.body.append(heading);
  const orb=doc.createElement('div');orb.className='orb';pipCanvas=doc.createElement('canvas');pipCanvas.width=pipCanvas.height=384;orb.append(pipCanvas);doc.body.append(orb);
  const footer=doc.createElement('footer');pipStatus=doc.createElement('p');footer.append(pipStatus);
  const back=doc.createElement('button');back.textContent=words.back;back.onclick=closePip;footer.append(back);doc.body.append(footer);updatePip();
  float.textContent=words.back;hint.textContent=words.pip;send({type:'mirror',active:true});
  pip.addEventListener('pagehide',()=>{pip=null;pipCanvas=null;pipStatus=null;float.textContent=words.float;hint.textContent=words.hint;send({type:'mirror',active:false});},{once:true});
 }catch{hint.textContent=words.pipError;closePip();}
};
window.addEventListener('pagehide',closePip);
frame.src=origin+'/portal/apps/companion/embed?lang='+encodeURIComponent(chrome.i18n.getUILanguage().split('-')[0]);
