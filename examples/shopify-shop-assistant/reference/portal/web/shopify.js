import {DemoVideo} from './demo-video.js?v=20261017';
import {DemoStartup,disposeDemoAvatar,releaseDemoRuntime,voiceTicket} from './demo-startup.js?v=20261017';
import {language,localizedPortalUrl} from './i18n.js?v=20261017';
import {demoText} from './demo-copy.js?v=20261017';
import {shopText as t} from './shopify-copy.js?v=20261017';
import {drivePcm} from './examples/audio-bridge/bridge.mjs';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search),embedded=location.pathname.endsWith('/embed');
document.body.classList.toggle('shop-embed',embedded);
// The published PCM player calls this optional host hook when playback drains.
// This app owns turns through Qwen events, so no additional round is started.
if(typeof window.start_new_round!=='function')window.start_new_round=async()=>{};
let stores=[],current=null,products=[],candidates=[],focus=null,next=null,requestVersion=0,focusVersion=0,selecting=null,syncedAt=null,manualPinned=false,expanded=false;
let player=null,socket=null,source=null,bootstrap=null,context=null,micStream=null,micNode=null,micInput=null,micSilent=null,output=null;
let running=false,starting=false,ending=false,ready=false,muted=false,sessionVersion=0,inputRate=16000,playedStart=0,receivedMs=0,sessionTimer=null,startup=null,pendingPlayer=null,media=null,mediaReady=false,idleTimer=null,lastInput=0,lastActivitySent=0;
let heartbeatTimer=null,reconnectTimer=null,reconnectDeadlineTimer=null,reconnecting=false,reconnectStarted=0,reconnectAttempts=0,lastPong=0;
function message(value){$('#shop-message').textContent=value;$('#shop-launch-status').textContent=expanded?'':value;}
function status(value){$('#shop-status').textContent=value;}
function copy(){document.querySelectorAll('[data-shop]').forEach(node=>node.textContent=t(node.dataset.shop));document.querySelectorAll('[data-demo]').forEach(node=>node.textContent=demoText(node.dataset.demo));$('#shop-search').placeholder=t('search');$('#shop-text').placeholder=demoText('input');document.title=t('title')+' · Kasamila';$('#shop-mic').textContent=demoText(micStream?'micOff':'mic');$('#shop-mute').textContent=demoText(muted?'unmute':'mute');}
async function api(path,body,signal){const response=await fetch('/portal/apps/shopify/'+path,{cache:'no-store',signal,...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok){const error=new Error(data.error?.code||'shop_connection_failed');throw error;}return data;}
function errorMessage(error){return demoText('failed')+' ('+(String(error.message).match(/^(shop_|demo_)[a-z_]+$/)?error.message:'shop_connection_failed')+')';}
function buyer(){return {store:current.id,country:$('#shop-country').value||current.default_country,locale:language()};}
function money(value){if(!value)return '';try{return new Intl.NumberFormat(language(),{style:'currency',currency:value.currencyCode}).format(Number(value.amount));}catch{return value.amount+' '+value.currencyCode;}}
function url(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function text(tag,content,className){const node=document.createElement(tag);node.textContent=content||'';if(className)node.className=className;return node;}
function image(value){const img=document.createElement('img');img.alt=value?.altText||'';img.loading='lazy';const src=url(value?.url);if(src)img.src=src;return img;}
function frameLauncher(){
 const img=$('#shop-launch-avatar');img.style.cssText='';document.body.classList.remove('shop-framed');
 try{const canvas=document.createElement('canvas');canvas.width=192;canvas.height=Math.max(1,Math.round(192*img.naturalHeight/img.naturalWidth));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
 let green=0,minX=canvas.width,minY=canvas.height,maxX=0,maxY=0;
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4,[r,g,b,a]=pixels.slice(i,i+4);if(g>60&&g>r*1.35&&g>b*1.35){green++;continue;}if(a>20){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}
 if(green>canvas.width*canvas.height*.4&&maxX>minX&&maxY>minY){document.body.classList.toggle('shop-framed',minY>canvas.height*.12);const side=Math.max((maxX-minX)*.8,(maxY-minY)*.38),left=(minX+maxX-side)/2,top=Math.max(0,minY-side*.08);img.style.cssText=`width:${canvas.width/side*100}%;height:${canvas.height/side*100}%;left:${-left/side*100}%;top:${-top/side*100}%;object-fit:fill;`;}
 }catch{/* Standard portrait framing remains available for opaque/cross-origin images. */}
}
function showPoster(){if(!current)return;const src=new URL(current.avatar.poster_url||'/web/portal/media/demo-portrait-friendly-v1.webp',location.origin).href;$('#shop-stage').replaceChildren(image({url:src}));const portrait=$('#shop-launch-avatar');portrait.onload=frameLauncher;portrait.src=src;if(portrait.complete&&portrait.naturalWidth)frameLauncher();$('#shop-avatar-name').textContent=current.avatar.names?.[language()]||current.avatar.name;}
function policies(shop){const root=$('#shop-policies');root.replaceChildren();for(const key of ['shippingPolicy','refundPolicy','termsOfService','privacyPolicy']){const item=shop?.[key];if(!item)continue;const a=text('a',item.title);const href=url(item.url);if(href){a.href=href;a.target='_blank';a.rel='noopener noreferrer';}root.append(a,text('p',(item.body||'').replace(/<[^>]*>/g,' ')));}}
function productCards(){const list=$('#shop-product-list');list.replaceChildren();for(const product of products){const button=document.createElement('button');button.type='button';button.className='shop-product-card';button.append(image(product.featuredImage),text('strong',product.title),text('span',money(product.priceRange.minVariantPrice)));button.onclick=()=>void selectProduct(product);list.append(button);}$('#shop-more').hidden=next===null;}
function renderDetails(product,checkedAt=syncedAt){const root=$('#shop-product-details'),media=document.createElement('div'),info=document.createElement('div');root.replaceChildren(media,info);const main=image(product.featuredImage);media.append(main);const gallery=document.createElement('div');gallery.className='shop-gallery';media.append(gallery);
 for(const item of product.media||[]){if(item.mediaContentType==='IMAGE'&&item.image){const button=document.createElement('button');button.type='button';button.append(image(item.image));button.onclick=()=>{main.src=url(item.image.url)||'';main.alt=item.image.altText||'';media.querySelector('video')?.remove();main.hidden=false;};gallery.append(button);}else if(item.mediaContentType==='VIDEO'){const source=item.sources?.find(s=>s.mimeType==='video/mp4'&&url(s.url));if(source){const button=document.createElement('button');button.type='button';button.append(image(item.previewImage));button.onclick=()=>{media.querySelector('video')?.remove();const video=document.createElement('video');video.src=url(source.url);video.controls=true;video.playsInline=true;video.preload='metadata';main.hidden=true;media.prepend(video);};gallery.append(button);}}}
 info.append(text('p',product.vendor,'eyebrow'),text('h2',product.title));const price=text('p','','shop-price');info.append(price);const availability=text('p');info.append(availability);const variantLabel=text('label',t('variants')),variants=document.createElement('select');variants.setAttribute('aria-label',t('variants'));for(const item of product.variants)variants.append(new Option(item.title+' · '+money(item.price)+(item.availableForSale?'':' · '+t('out')),item.id));variantLabel.append(variants);info.append(variantLabel);
 const first=product.variants.find(v=>v.availableForSale)||product.variants[0];if(first)variants.value=first.id;
 const quantityLabel=text('label',t('quantity')),quantity=document.createElement('input');quantity.type='number';quantity.min='1';quantity.max='10';quantity.value='1';quantity.setAttribute('aria-label',t('quantity'));quantityLabel.append(quantity);info.append(quantityLabel);
 const buy=text('button',t('buy'));buy.type='button';buy.className='shop-buy';info.append(buy);const checked=text('p',t('checked')+' · '+new Date(checkedAt||Date.now()).toLocaleTimeString(language()),'shop-note');info.append(checked);
 const details=document.createElement('details');details.append(text('summary',t('details')),text('p',product.description,'shop-details'));info.append(details);
 const update=()=>{const variant=product.variants.find(v=>v.id===variants.value);price.textContent=money(variant?.price||product.priceRange.minVariantPrice);availability.textContent=t(variant?.availableForSale?'stock':'out');buy.disabled=!variant?.availableForSale;if(variant?.image?.url)main.src=url(variant.image.url)||'';};variants.onchange=update;update();
 buy.onclick=async()=>{const amount=Number(quantity.value);if(!Number.isInteger(amount)||amount<1||amount>10){quantity.reportValidity();return;}const popup=window.open('about:blank','_blank');if(popup)popup.opener=null;buy.disabled=true;message(t('checkout'));try{const result=await api('cart',{...buyer(),product:product.id,variant:variants.value,quantity:amount});if(popup)popup.location.replace(result.checkout_url);else{const link=text('a',t('buy'));link.href=result.checkout_url;link.target='_blank';link.rel='noopener noreferrer';$('#shop-message').replaceChildren(link);}renderFocus(result.product,Date.now());if(popup)message(t('ready'));}catch(error){popup?.close();message(errorMessage(error));buy.disabled=false;}};
}

function renderFocus(product,checkedAt=Date.now()){
 focus=product;focusVersion++;const root=$('#shop-focus');root.hidden=false;$('#shop-welcome').hidden=true;
 const img=image(product.featuredImage);img.className='shop-product-image';const info=document.createElement('div');info.className='shop-focus-info';
 const bottom=document.createElement('div');bottom.className='shop-focus-bottom';const buy=text('button',t('viewBuy'),'shop-buy');buy.type='button';buy.onclick=()=>void openDetails(product);
 bottom.append(text('p',money(product.priceRange.minVariantPrice),'shop-price'),buy);info.append(text('h2',product.title),text('p',[product.vendor,t(product.availableForSale?'stock':'out'),t('checked')+' '+new Date(checkedAt).toLocaleTimeString(language())].filter(Boolean).join(' · '),'shop-summary'),bottom);root.replaceChildren(img,info);
 const rail=$('#shop-recommendations');rail.replaceChildren();for(const item of candidates){const b=text('button',item.title);b.type='button';b.setAttribute('aria-current',String(item.id===product.id));b.onclick=()=>void selectProduct(item);rail.append(b);}$('#shop-next').hidden=candidates.length<2;
}
async function selectProduct(product){manualPinned=true;interrupt();const version=sessionVersion,selection=++focusVersion;$('#shop-drawer').close();message(t('loading'));try{const b=buyer();const value=await api('product?'+new URLSearchParams({...b,lang:b.locale,product:product.id}));if(!expanded||version!==sessionVersion||selection!==focusVersion)return;renderFocus(value.product);send({type:'product_context',product:product.id});message('');}catch(error){message(errorMessage(error));}}
async function openDetails(product){const version=sessionVersion,selection=++focusVersion;$('#shop-product-dialog').showModal();$('#shop-product-details').replaceChildren(text('p',t('loading')));try{const b=buyer();const value=await api('product?'+new URLSearchParams({...b,lang:b.locale,product:product.id}));if(!expanded||version!==sessionVersion||selection!==focusVersion)return;renderDetails(value.product,Date.now());}catch(error){$('#shop-product-details').replaceChildren(text('p',errorMessage(error)));}}
async function loadCountries(){try{const data=await api('countries?'+new URLSearchParams({store:current.id,lang:language()}));$('#shop-country').replaceChildren(...data.countries.map(c=>new Option(c.name+' · '+c.currency.isoCode,c.isoCode)));$('#shop-country').value=data.countries.some(c=>c.isoCode===current.default_country)?current.default_country:data.countries[0]?.isoCode||'';}catch(error){message(errorMessage(error));}}
async function loadProducts(append=false){if(!current)return;const version=++requestVersion,b=buyer();message(t('loading'));try{const data=await api('products?'+new URLSearchParams({store:b.store,country:b.country,lang:b.locale,offset:append?next||0:0,query:$('#shop-search').value}));if(version!==requestVersion)return;syncedAt=data.synced_at*1000;products=append?[...products,...data.products]:data.products;next=data.next_offset;productCards();policies(data.shop);message(products.length?'':t('empty'));}catch(error){if(version===requestVersion)message(errorMessage(error));}}
function controls(){for(const id of ['shop-mic','shop-interrupt','shop-mute','shop-send','shop-text'])$('#'+id).disabled=!ready||ending;$('#shop-launch').disabled=starting||ending||!current;$('#shop-end').disabled=ending;$('#shop-retry').hidden=starting||running||ending;$('#shop-store').disabled=starting||running||ending;$('#shop-country').disabled=starting||running||ending;}
function panel(open){expanded=open;$('#shop-panel').hidden=!open;$('#shop-launcher').hidden=open;$('#shop-launch').setAttribute('aria-expanded',String(open));document.body.classList.toggle('shop-open',open);if(embedded)parent.postMessage({type:'kasamila-shop-panel',expanded:open},'*');}
function activity(notify=true){if(!expanded||ending||!running)return;lastInput=Date.now();clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(Date.now()-lastInput>=120000)void end(t('idle'),true);},120050);if(notify&&ready&&lastInput-lastActivitySent>=5000){lastActivitySent=lastInput;send({type:'activity'});}}
function bubble(role,value=''){const node=text('p',value,'shop-bubble '+role);node.dir='auto';const root=$('#shop-history');root.append(node);while(root.children.length>60)root.firstChild.remove();root.scrollTop=root.scrollHeight;return node;}
function send(value){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(value));}
function stopAudio(){const old=source;source=null;old?.abort();player?.stop();output=null;playedStart=0;receivedMs=0;}
function interrupt(){send({type:'interrupt',audio_end_ms:Math.floor(playedStart?Math.min(receivedMs,Math.max(0,performance.now()-playedStart)):0)});stopAudio();}
async function stopMic(){micNode?.disconnect();micInput?.disconnect();micSilent?.disconnect();micStream?.getTracks().forEach(t=>t.stop());micNode=micInput=micSilent=micStream=null;send({type:'audio_end'});$('#shop-mic').setAttribute('aria-pressed','false');$('#shop-mic').textContent=demoText('mic');}
// Use the same continuous PCM capture as the realtime chat demo. Qwen VAD
// owns speech boundaries; a browser volume gate must not clip quiet syllables.
function microphoneFrame(samples){
 if((socket?.bufferedAmount||0)>=65536){message(t('audioSlow'));return;}
 const bytes=new Uint8Array(samples.buffer,samples.byteOffset,samples.byteLength);let encoded='';for(const byte of bytes)encoded+=String.fromCharCode(byte);send({type:'audio',data:btoa(encoded)});
}
async function toggleMic(){const attempt=sessionVersion,audioContext=context;if(micStream){await stopMic();return;}try{await audioContext.audioWorklet.addModule('/web/portal/demo-microphone.js');const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});if(!ready||attempt!==sessionVersion){stream.getTracks().forEach(track=>track.stop());return;}micStream=stream;micInput=context.createMediaStreamSource(micStream);micNode=new AudioWorkletNode(context,'demo-microphone',{processorOptions:{sampleRate:inputRate}});micSilent=context.createGain();micSilent.gain.value=0;micInput.connect(micNode).connect(micSilent).connect(context.destination);micNode.port.onmessage=event=>{if(attempt!==sessionVersion||!ready){return;}microphoneFrame(new Int16Array(event.data));};$('#shop-mic').setAttribute('aria-pressed','true');$('#shop-mic').textContent=demoText('micOff');}catch{if(attempt===sessionVersion){await stopMic();status(demoText('failed'));}}}


async function end(note=demoText('ended'),collapse=false){
 if(collapse){panel(false);for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();}
 if(ending)return;send({type:'leave'});ending=true;sessionVersion++;requestVersion++;focusVersion++;ready=running=starting=false;clearTimeout(sessionTimer);startup?.close();startup=null;media?.close();media=null;mediaReady=false;clearTimeout(idleTimer);clearInterval(heartbeatTimer);clearTimeout(reconnectTimer);clearTimeout(reconnectDeadlineTimer);reconnecting=false;controls();
 const oldBootstrap=bootstrap;bootstrap=null;const old=player||pendingPlayer;player=pendingPlayer=null;const oldContext=context;context=null;const oldSocket=socket;socket=null;
 await stopMic();oldSocket?.close();stopAudio();await disposeDemoAvatar(old,oldBootstrap);try{await oldContext?.close();}catch{}

 ending=false;showPoster();status(note);message(collapse?note:'');controls();if(!collapse&&expanded)activity(false);if(collapse)$('#shop-launch').focus();
}
async function start(){if(running||starting||ending||!current)return;starting=true;panel(true);activity();const attempt=++sessionVersion;controls();status(demoText('connecting'));message('');$('#shop-history').replaceChildren();$('#shop-subtitle').textContent='';$('#shop-user-turn').hidden=true;$('#shop-focus').hidden=true;$('#shop-welcome').hidden=false;$('#shop-recommendations').replaceChildren();$('#shop-next').hidden=true;focus=null;candidates=[];manualPinned=false;lastActivitySent=0;
 const guard=startup=new DemoStartup($('#shop-status'),status,note=>{if(attempt===sessionVersion)void end(note);});
 try{context=new AudioContext();guard.bind(null,context);await context.resume();if(attempt!==sessionVersion)return;const result=await api('sessions',{...buyer(),consent:true});if(attempt!==sessionVersion){await releaseDemoRuntime(result);return;}bootstrap=result;
 const apiBase=result.api_base||location.origin;const {loadKasamila}=await import(new URL('/sdk/bootstrap/1/loader.mjs',apiBase).href);const Kasamila=await loadKasamila(result.runtime.sdk,apiBase);if(attempt!==sessionVersion)return;
 const element=document.createElement('kasamila-avatar');pendingPlayer=element;guard.bind(element,context);$('#shop-stage').replaceChildren(element);element.addEventListener('kasamila-error',()=>{if(attempt===sessionVersion)void end(demoText('failed'));});
 const presentation=media=new DemoVideo($('#shop-stage'),current.avatar.poster_url||'/web/portal/media/demo-portrait-friendly-v1.webp',{
  onState(available){if(attempt!==sessionVersion||ending)return;mediaReady=available;if(running){if(!available)interrupt();ready=available&&!reconnecting;status(demoText(available?(reconnecting?'connectingVoice':'connected'):'videoBuffering'));controls();}},
  onFailure(note){if(attempt===sessionVersion)void end(note);}
 });
 const created=await Kasamila.create({element,sessionToken:result.runtime.client_token,templateMedia:result.template_media,providerPreview:!result.template_media});if(attempt!==sessionVersion){await disposeDemoAvatar(created,result);return;}player=created;pendingPlayer=null;
 guard.video(presentation);await presentation.wait(created);if(attempt!==sessionVersion)return;
 guard.connecting();const ticket=await voiceTicket('/portal/apps/shopify/voice-ticket',result,guard.signal);if(attempt!==sessionVersion)return;
 function connectSocket(resume=false){
 const ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/portal/apps/shopify/socket');socket=ws;ws.onopen=()=>{if(attempt===sessionVersion&&socket===ws)send({ticket,resume});};
 const retry=()=>{if(attempt!==sessionVersion||socket!==ws||ending)return;if(!running){void end(demoText('failed'));return;}if(!reconnecting){reconnecting=true;reconnectStarted=Date.now();reconnectAttempts=0;reconnectDeadlineTimer=setTimeout(()=>{if(attempt===sessionVersion&&reconnecting&&!ending)void end(t('connectionLost'));},15000);stopAudio();ready=false;controls();status(t('reconnecting'));}if(Date.now()-reconnectStarted>=15000){void end(t('connectionLost'));return;}socket=null;ws.close();clearTimeout(reconnectTimer);reconnectTimer=setTimeout(()=>{if(attempt===sessionVersion&&!ending)connectSocket(true);},Math.min(500*2**reconnectAttempts++,3000));};
 ws.onmessage=event=>{if(attempt!==sessionVersion||socket!==ws)return;lastPong=Date.now();try{const value=JSON.parse(event.data);
 if(value.type==='ready'){guard.complete();clearTimeout(reconnectTimer);clearTimeout(reconnectDeadlineTimer);const resumed=reconnecting;reconnecting=false;running=true;ready=mediaReady;starting=false;inputRate=value.input_rate;status(demoText(mediaReady?'connected':'videoBuffering'));controls();if(!resumed){activity();sessionTimer=setTimeout(()=>void end(t('sessionLimit')),result.duration*1000);}else{message(t('reconnected'));if(lastInput>lastActivitySent){lastActivitySent=lastInput;send({type:'activity'});}}clearInterval(heartbeatTimer);heartbeatTimer=setInterval(()=>{if(attempt!==sessionVersion||ending)return;if(reconnecting){if(Date.now()-reconnectStarted>=15000)void end(t('connectionLost'));return;}send({type:'ping'});},10000);}
 else if(value.type==='pong'){}
 else if(value.type==='focus'&&value.products?.length&&!manualPinned){candidates=value.products.slice(0,3);renderFocus(candidates[0],value.checked_at);}
 else if(value.type==='policies'){policies(value.shop);}
 else if(value.type==='user_activity'){manualPinned=false;activity(false);message('');}
 else if(value.type==='user_text'){manualPinned=false;activity(false);bubble('user',value.text);$('#shop-user-turn').textContent=value.text;$('#shop-user-turn').hidden=false;}
 else if(value.type==='text'){output=output||bubble('assistant');output.textContent+=value.delta;$('#shop-subtitle').textContent=output.textContent.slice(-240);$('#shop-welcome').hidden=true;}
 else if(value.type==='audio'){if(!ready||!player)return;if(!source){source=drivePcm(player,{sampleRate:value.sample_rate,maxQueuedMs:10000,playback:!muted});const playback=source;playback.finished.catch(()=>{if(source===playback&&!ending){stopAudio();message(t('turnRetry'));}});playedStart=performance.now();receivedMs=0;}const bytes=Uint8Array.from(atob(value.data),c=>c.charCodeAt(0));source.push(new Int16Array(bytes.buffer));receivedMs+=bytes.length/2/value.sample_rate*1000;}
 else if(value.type==='done'){source?.close();source=null;output=null;}
 else if(value.type==='interrupted'){stopAudio();}
 else if(value.type==='idle'){void end(t('idle'),true);}
 else if(value.type==='warning'){if(value.code==='shop_audio_backpressure')message(t('audioSlow'));else{stopAudio();message(t('turnRetry'));}}
 else if(value.type==='ended'){void end(t('sessionLimit'));}
 else if(value.type==='error'){void end(errorMessage(new Error(value.code)));}
 }catch{stopAudio();message(t('turnRetry'));}};
 ws.onclose=retry;ws.onerror=retry;
 }
 connectSocket();
 }catch(error){if(attempt===sessionVersion)await end(errorMessage(error));}
}
$('#shop-launch').onclick=()=>void start();$('#shop-retry').onclick=()=>void start();$('#shop-end').onclick=()=>void end(demoText('ended'),true);$('#shop-mic').onclick=()=>void toggleMic();$('#shop-interrupt').onclick=interrupt;
$('#shop-mute').onclick=()=>{muted=!muted;stopAudio();$('#shop-mute').setAttribute('aria-pressed',String(muted));copy();};
$('#shop-chat-form').onsubmit=event=>{event.preventDefault();const value=$('#shop-text').value.trim();if(!value||!ready)return;activity();message('');manualPinned=false;interrupt();bubble('user',value);$('#shop-user-turn').textContent=value;$('#shop-user-turn').hidden=false;send({type:'text',text:value});$('#shop-text').value='';};
$('#shop-text').onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('#shop-chat-form').requestSubmit();}};
$('#shop-browse').onclick=()=>{$('#shop-drawer').showModal();void loadProducts();};$('#shop-history-toggle').onclick=()=>$('#shop-history-dialog').showModal();
$('#shop-next').onclick=()=>{const index=candidates.findIndex(p=>p.id===focus?.id);if(candidates.length)void selectProduct(candidates[(index+1)%candidates.length]);};
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>$('#'+button.dataset.close).close();
for(const event of ['pointerdown','input','change','keydown'])document.addEventListener(event,e=>{if(expanded&&e.isTrusted)activity();},{passive:true});
$('#shop-search-form').onsubmit=event=>{event.preventDefault();void loadProducts();};$('#shop-more').onclick=()=>void loadProducts(true);
$('#shop-store').onchange=async()=>{await end();current=stores.find(s=>s.id===$('#shop-store').value);$('#shop-country').replaceChildren(new Option(current.default_country,current.default_country));showPoster();await loadCountries();controls();};
$('#shop-country').onchange=()=>{focus=null;focusVersion++;$('#shop-focus').hidden=true;$('#shop-recommendations').replaceChildren();$('#shop-next').hidden=true;};
window.addEventListener('kasamila:language-changed',async()=>{history.replaceState(history.state,'',localizedPortalUrl(location.href,location.href));await end();copy();showPoster();});
window.addEventListener('pagehide',()=>void end('',true));
copy();controls();try{const data=await api('catalog');stores=data.stores;if(embedded)stores=stores.filter(s=>s.id===params.get('store'));$('#shop-store').replaceChildren(...stores.map(s=>new Option(s.names?.[language()]||s.title,s.id)));current=stores.find(s=>s.id===params.get('store'))||stores[0];if(current){$('#shop-store').value=current.id;$('#shop-country').replaceChildren(new Option(current.default_country,current.default_country));showPoster();await loadCountries();}else message(t('empty'));}catch(error){message(errorMessage(error));}controls();
