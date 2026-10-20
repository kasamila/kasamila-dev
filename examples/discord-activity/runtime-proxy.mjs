import http from 'node:http';
import {verifySession} from './protocol.mjs';
const cookieName='kasamila_discord_runtime';
const publicPath='/portal/apps/discord/runtime-proxy/';
function reject(res,status,code){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:{code,message:code}}));}
function claims(token,config,secret){
 const value=verifySession(token,secret);
 if(!config.enabled||value.application_id!==config.application_id||value.guild_id!==config.guild_id||value.channel_id!==config.channel_id||value.origin!=='https://'+config.application_id+'.discordsays.com')throw new Error('discord_session_invalid');
 return value;
}
export function runtimeProxy({secret,configuration,upstreamPort=8000}){
 return async(req,res)=>{
  const config=configuration(),expected='https://'+config.application_id+'.discordsays.com';
  const url=new URL(req.url,'http://localhost');
  if(req.headers.origin&&req.headers.origin!==expected)return reject(res,403,'discord_origin_denied');
  if(req.method==='POST'&&url.pathname==='/runtime/connect'){
   try{
    if(req.headers.origin!==expected)throw new Error('discord_origin_denied');
    let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw new Error('discord_request_too_large');}
    const token=JSON.parse(body).session,value=claims(token,config,secret);
    res.setHeader('Set-Cookie',`${cookieName}=${token}; Domain=${config.application_id}.discordsays.com; Path=${publicPath}; Max-Age=${Math.max(1,Math.floor((value.expires-Date.now())/1000))}; Secure; HttpOnly; SameSite=None; Partitioned`);
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end('{"ready":true}');
   }catch{return reject(res,403,'discord_session_invalid');}
   return;
  }
  let identity;
  try{
   const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
   identity=claims(req.headers['x-kasamila-activity-session']||cookie,config,secret);
  }catch{return reject(res,403,'discord_session_required');}
  const tail=url.pathname.replace(/^\/runtime\//,'');
  const read=/^(?:manifest|commands|assets\/[0-9a-f-]{36})$/;
  const write=/^(?:license-grants|events|sessions\/end|commands\/[a-zA-Z0-9_-]+\/ack)$/;
  if(!((['GET','HEAD'].includes(req.method)&&read.test(tail))||(req.method==='POST'&&write.test(tail))))return reject(res,404,'discord_proxy_route_denied');
  const auth=req.headers.authorization||'';
  if(auth&&!/^Bearer ks_rt_[A-Za-z0-9_-]+$/.test(auth))return reject(res,403,'discord_runtime_token_required');
  if(!tail.startsWith('assets/')&&!auth)return reject(res,401,'discord_runtime_token_required');
  const headers={Origin:identity.origin,Host:'127.0.0.1:8000'};
  for(const name of ['authorization','content-type','content-length','range','if-range','if-none-match','if-modified-since'])if(req.headers[name])headers[name]=req.headers[name];
  // Fixed loopback target, bounded routes and no redirects; upstream keeps all token/signature checks.
  const upstream=http.request({hostname:'127.0.0.1',port:upstreamPort,path:'/api/v1/runtime/'+tail+url.search,method:req.method,headers},response=>{
   const outgoing={};for(const name of ['content-type','content-length','content-range','accept-ranges','etag','last-modified','cache-control','cross-origin-resource-policy'])if(response.headers[name])outgoing[name]=response.headers[name];
   res.writeHead(response.statusCode,outgoing);response.pipe(res);
  });
  upstream.setTimeout(30000,()=>upstream.destroy());
  upstream.on('error',()=>{if(!res.headersSent)reject(res,502,'discord_runtime_upstream_failed');else res.destroy();});
  req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());req.pipe(upstream);
 };
}
