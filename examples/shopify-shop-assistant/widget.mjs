const locales=new Set(['zh','en','fr','de','ru','es','it','ar','ja','ko','th','ms','vi','hi','id']);
export function mountAssistant(element,{store,language='en',baseURL='https://kasamila.com',floating=true,height=850}={}){
  if(!element?.appendChild||!/^[a-z0-9-]{1,40}$/.test(store||'')||!locales.has(language))throw new TypeError('Valid target, demo store ID and language are required');
  const base=new URL(baseURL);
  if(base.protocol!=='https:'||base.username||base.password)throw new TypeError('HTTPS assistant host is required');
  const url=new URL('/portal/apps/shopify/embed',base);url.searchParams.set('store',store);url.searchParams.set('lang',language);
  const frame=document.createElement('iframe');frame.src=url.href;frame.title='Shopify Live Shop Assistant';frame.allow='microphone; autoplay';frame.referrerPolicy='no-referrer';frame.style.border='0';frame.style.background='transparent';
  function resize(open){if(!floating){frame.style.cssText='width:100%;border:0;border-radius:16px;height:'+Math.max(400,Math.min(2000,Number(height)||850))+'px';return;}frame.style.cssText='position:fixed;z-index:2147483000;right:0;bottom:0;border:0;background:transparent;'+(open?'width:100%;height:100dvh;':'width:280px;max-width:100vw;height:270px;');}
  function receive(event){if(event.origin===base.origin&&event.source===frame.contentWindow&&event.data?.type==='kasamila-shop-panel'&&typeof event.data.expanded==='boolean')resize(event.data.expanded);}
  resize(false);window.addEventListener('message',receive);element.appendChild(frame);
  return {element:frame,destroy(){window.removeEventListener('message',receive);frame.remove();}};
}
