import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {runtimeProxy} from './runtime-proxy.mjs';
import {signSession} from './protocol.mjs';
const secret='test-activity-proxy-service-credential-'.repeat(2);
test('Portal adapter preserves Runtime auth, Origin, Range and bytes; denies unrelated routes and keys',async()=>{
 const cfg={enabled:true,application_id:'123456789012345678',guild_id:'guild',channel_id:'voice'},origin='https://123456789012345678.discordsays.com';
 const session=signSession({application_id:cfg.application_id,guild_id:'guild',channel_id:'voice',origin,expires:Date.now()+60000},secret);
 const seen=[];const upstream=http.createServer((req,res)=>{seen.push({path:req.url,origin:req.headers.origin,authorization:req.headers.authorization,range:req.headers.range,cookie:req.headers.cookie});res.writeHead(206,{'Content-Type':'application/octet-stream','Content-Range':'bytes 0-2/3'});res.end(Buffer.from([0,128,255]));});upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
 const server=http.createServer(runtimeProxy({secret,configuration:()=>cfg,upstreamPort:upstream.address().port}));server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 try{
  let response=await fetch(base+'/runtime/connect',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({session})});assert.equal(response.status,200);const setCookie=response.headers.get('set-cookie');assert.match(setCookie,/Secure; HttpOnly; SameSite=None; Partitioned/);assert.match(setCookie,/Path=\/portal\/apps\/discord\/runtime-proxy\//);const cookie=setCookie.split(';')[0];
  response=await fetch(base+'/runtime/manifest',{headers:{Cookie:cookie,Authorization:'Bearer ks_rt_fixture',Range:'bytes=0-2'}});assert.equal(response.status,206);assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[0,128,255]);assert.equal(seen[0].origin,origin);assert.equal(seen[0].authorization,'Bearer ks_rt_fixture');assert.equal(seen[0].range,'bytes=0-2');assert.equal(seen[0].cookie,undefined);
  response=await fetch(base+'/runtime/manifest',{headers:{Cookie:cookie,Authorization:'Bearer ks_live_forbidden'}});assert.equal(response.status,403);
  response=await fetch(base+'/runtime/manifest',{headers:{Cookie:cookie,Origin:'https://evil.example',Authorization:'Bearer ks_rt_fixture'}});assert.equal(response.status,403);
  response=await fetch(base+'/runtime/manifest',{headers:{Authorization:'Bearer ks_rt_fixture'}});assert.equal(response.status,403);
  response=await fetch(base+'/runtime/sessions',{method:'POST',headers:{Cookie:cookie,Authorization:'Bearer ks_rt_fixture'}});assert.equal(response.status,404);
  response=await fetch(base+'/runtime/assets/00000000-0000-0000-0000-000000000001?signature=fixture',{headers:{Cookie:cookie}});assert.equal(response.status,206);assert.equal(seen[1].path,'/api/v1/runtime/assets/00000000-0000-0000-0000-000000000001?signature=fixture');
  const other=signSession({application_id:cfg.application_id,guild_id:'other',channel_id:'voice',origin,expires:Date.now()+60000},secret);response=await fetch(base+'/runtime/connect',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({session:other})});assert.equal(response.status,403);
 }finally{server.closeAllConnections();upstream.closeAllConnections();server.close();upstream.close();}
});
