const prefix='/portal/apps/discord/runtime-proxy/';
export function runtimeUrl(value,origin){
 const url=new URL(value,origin);
 if(![new URL(origin).origin,'https://kasamila.com','https://www.kasamila.com'].includes(url.origin))return String(value);
 const match=url.pathname.match(/^\/(?:kasamila(?:-www)?\/)?api\/v1\/runtime\/(.+)$/);
 if(!match)return String(value);
 url.protocol=new URL(origin).protocol;url.host=new URL(origin).host;url.pathname=prefix+match[1];return url.href;
}
export function installRuntimeNetwork(getSession){
 const originalFetch=window.fetch.bind(window);
 window.fetch=async(input,options)=>{
  const raw=input instanceof Request?input.url:String(input),mapped=runtimeUrl(raw,location.origin);
  if(mapped===raw)return originalFetch(input,options);
  const request=new Request(input instanceof Request?input:new Request(new URL(raw,location.href)),options);
  const headers=new Headers(request.headers),session=getSession();if(session)headers.set('X-Kasamila-Activity-Session',session);
  return originalFetch(new Request(mapped,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer(),
   credentials:'same-origin',cache:request.cache,redirect:'error',signal:request.signal}));
 };
 const media=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'src');
 Object.defineProperty(HTMLMediaElement.prototype,'src',{...media,set(value){media.set.call(this,runtimeUrl(value,location.origin));}});
 const open=XMLHttpRequest.prototype.open;
 XMLHttpRequest.prototype.open=function(method,url,...args){return open.call(this,method,runtimeUrl(String(url),location.origin),...args);};
 return async session=>{
  const response=await originalFetch(prefix+'connect',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({session})});
  if(!response.ok)throw new Error('discord_runtime_bridge_failed');
 };
}
