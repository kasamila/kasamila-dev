const locales=new Set(['zh','en','fr','de','ru','es','it','ar','ja','ko','th','ms','vi','hi','id']);
export function mountAssistant(element,{store,language='en',baseURL='https://kasamila.com',height=850}={}){
  if(!element?.appendChild||!/^[a-z0-9-]{1,40}$/.test(store||'')||!locales.has(language))throw new TypeError('Valid target, demo store ID and language are required');
  const base=new URL(baseURL);
  if(base.protocol!=='https:'||base.username||base.password)throw new TypeError('HTTPS assistant host is required');
  const url=new URL('/portal/apps/shopify/embed',base);url.searchParams.set('store',store);url.searchParams.set('lang',language);
  const frame=document.createElement('iframe');frame.src=url.href;frame.title='Shopify Live Shop Assistant';frame.allow='microphone; autoplay';frame.loading='lazy';frame.referrerPolicy='no-referrer';frame.style.cssText='width:100%;border:0;border-radius:16px;';frame.style.height=Math.max(400,Math.min(2000,Number(height)||850))+'px';element.appendChild(frame);
  return {element:frame,destroy(){frame.remove();}};
}
