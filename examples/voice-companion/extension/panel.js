const origin='https://kasamila.com', frame=document.querySelector('#avatar'), label=document.querySelector('#status');
const zh=chrome.i18n.getUILanguage().startsWith('zh');
const words=zh?{idle:'请在有声音的网页点击扩展图标。',connecting:'正在连接标签页…',capturing:'已选择：',failed:'捕获失败。请在普通网页重新点击扩展图标。',slow:'音频处理过慢，已停止。请重新连接。',replaced:'数字人已移至另一个窗口。'}:{idle:'Click the extension icon on a page with audio.',connecting:'Connecting to tab…',capturing:'Selected: ',failed:'Capture failed. Click the extension icon on a regular web page to retry.',slow:'Audio processing stalled. Capture stopped; reconnect to retry.',replaced:'Avatar moved to another window.'};
let state={status:'idle'}, replaced=false;
const port=chrome.runtime.connect({name:'panel'});
function send(value){if(!replaced)frame.contentWindow.postMessage(value,origin);}
port.onMessage.addListener(message=>{
  if(message.type==='state'){state=message;label.textContent=words[state.status]+(state.status==='capturing'?state.source:'');send({type:'capture-state',active:state.status==='capturing'});}
  if(message.type==='pcm')send(message);
  if(message.type==='replaced'){replaced=true;frame.src='about:blank';label.textContent=words.replaced;document.querySelector('#stop').disabled=true;}
});
port.onDisconnect.addListener(()=>{if(!replaced){send({type:'capture-state',active:false});label.textContent=words.failed;}});
window.addEventListener('message',event=>{
  if(event.source!==frame.contentWindow||event.origin!==origin)return;
  const message=event.data;
  if(message?.type==='bridge-ready')send({type:'capture-state',active:state.status==='capturing'});
  else if(message?.type==='ready')port.postMessage({type:'ready'});
  else if(message?.type==='ack'&&Number.isSafeInteger(message.sequence))port.postMessage({type:'ack',sequence:message.sequence});
  else if(message?.type==='stop')port.postMessage({type:'stop'});
});
document.querySelector('#stop').textContent=zh?'停止':'Stop';
document.querySelector('#stop').onclick=()=>port.postMessage({type:'stop'});
document.querySelector('#float').title=zh?'在独立小窗打开':'Open separate window';
document.querySelector('#float').hidden=location.search.includes('floating');
document.querySelector('#float').onclick=()=>port.postMessage({type:'float'});
frame.src=origin+'/portal/apps/companion/embed?lang='+encodeURIComponent(chrome.i18n.getUILanguage().split('-')[0]);
