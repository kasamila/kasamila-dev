const origin='https://kasamila.com',frame=document.querySelector('#avatar'),label=document.querySelector('#status');
const zh=chrome.i18n.getUILanguage().startsWith('zh');
const words=zh?{settings:'配置数字人',stop:'停止',idle:'已停止 · 点击网页上的扩展图标重新开始',connecting:'正在连接网页声音…',capturing:'已捕获网页声音',waiting:'等待网页声音',failed:'连接失败',permission:'请在声音来源网页重新点击扩展图标',pip:'无法打开置顶小窗，请更新浏览器',offscreen:'请重新加载扩展后再试',source:'请在普通网页使用扩展',capture:'请刷新声音来源网页后重试','in-use':'该网页正在被其他扩展捕获',saved:'配置会保存在此浏览器，下次自动连接'}:{settings:'Avatar settings',stop:'Stop',idle:'Stopped · Click the toolbar icon on the source page to restart',connecting:'Connecting to web audio…',capturing:'Receiving web audio',waiting:'Waiting for web audio',failed:'Connection failed',permission:'Click the toolbar icon again on the source page',pip:'Cannot open mini window. Update your browser',offscreen:'Reload the extension and try again',source:'Use the extension on a regular web page',capture:'Refresh the source page and try again','in-use':'Another extension is capturing this page',saved:'Settings stay in this browser. Next time, connect automatically'};
let state={status:'idle'},loaded=false,preferences=null,disposed=false;
const port=chrome.runtime.connect({name:'panel'});
function relay(value){try{port.postMessage(value);}catch{}}
function send(value){frame.contentWindow?.postMessage(value,origin);}
function capture(){if(loaded)send({type:'capture-state',active:state.status==='capturing'});}
document.documentElement.lang=zh?'zh':'en';
const settings=document.querySelector('#settings'),stop=document.querySelector('#stop');
settings.title=words.settings;settings.setAttribute('aria-label',words.settings);stop.title=words.stop;stop.setAttribute('aria-label',words.stop);
settings.onclick=()=>send({type:'settings'});stop.onclick=()=>relay({type:'stop'});
document.querySelector('#hint').textContent=words.saved;
port.onMessage.addListener(message=>{
 if(message.type==='preferences'){
  preferences=message.value;const params=new URLSearchParams({mini:'1',compact:'1',host:message.host,lang:chrome.i18n.getUILanguage().split('-')[0]});
  frame.src=origin+'/portal/apps/companion/embed?'+params;
 }
 if(message.type==='state'){
  state=message;document.body.dataset.state=state.status;
  label.textContent=state.status==='failed'?words.failed+' · '+(words[state.reason]||words.capture):(words[state.status]||words.idle);
  capture();
 }
 if(message.type==='pcm'||message.type==='tick')send(message);
 if(message.type==='level'){
  document.body.dataset.audible=String(message.audible);
  if(state.status==='capturing')label.textContent=message.audible?words.capturing:words.waiting;
 }
 if(message.type==='replaced'){disposed=true;send({type:'capture-state',active:false});frame.src='about:blank';}
});
window.addEventListener('message',event=>{
 if(event.source!==frame.contentWindow||event.origin!==origin)return;
 const message=event.data;
 if(message?.type==='bridge-ready'){loaded=true;capture();send({type:'preferences',value:preferences});}
 if(message?.type==='ready'){document.body.classList.add('connected');relay({type:'ready'});}
 if(message?.type==='not-ready'){document.body.classList.remove('connected');relay({type:'not-ready'});}
 if(message?.type==='ack'&&Number.isSafeInteger(message.sequence))relay({type:'ack',sequence:message.sequence});
 if(message?.type==='save')relay({type:'save',avatar:message.avatar,consent:message.consent});
 if(message?.type==='stop')relay({type:'stop'});
 if(message?.type==='settings-state')document.body.classList.toggle('settings-open',message.open===true);
});
port.onDisconnect.addListener(()=>{if(!disposed){send({type:'capture-state',active:false});label.textContent=words.offscreen;}});
window.addEventListener('pagehide',()=>{disposed=true;relay({type:'stop'});});
