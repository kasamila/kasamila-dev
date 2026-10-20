import test from 'node:test';
import assert from 'node:assert/strict';
import {signSession,verifySession,assertInstance,mono16k,pcmPacket} from './protocol.mjs';
const key='test-only-bridge-secret-'.repeat(3);
test('session claims reject expiry, tampering and oversized bearer values',()=>{
 const claims={user_id:'123',expires:2000};const token=signSession(claims,key);
 assert.deepEqual(verifySession(token,key,1000),claims);
 assert.throws(()=>verifySession(token,key,2000));
 assert.throws(()=>verifySession(token+'x',key,1000));
 assert.throws(()=>verifySession(token,'other-key',1000));
 assert.throws(()=>verifySession('x'.repeat(2049),key,1000));
});
test('instance membership, application, guild and channel are independently verified',()=>{
 const config={application_id:'app',guild_id:'guild',channel_id:'voice'};
 const instance={application_id:'app',instance_id:'instance',location:{guild_id:'guild',channel_id:'voice'},users:['alice']};
 assert.doesNotThrow(()=>assertInstance(instance,config,'alice','instance'));
 for(const [field,value]of [['application_id','wrong'],['instance_id','wrong'],['users',['mallory']],['location',{guild_id:'guild',channel_id:'other'}]]){
  assert.throws(()=>assertInstance({...instance,[field]:value},config,'alice','instance'));
 }
});
test('48 kHz stereo conversion preserves DC amplitude and balances channels',()=>{
 const stereo=Buffer.alloc(3840);for(let i=0;i<stereo.length;i+=4){stereo.writeInt16LE(12000,i);stereo.writeInt16LE(-6000,i+2);}
 const mono=mono16k(stereo);assert.equal(mono.length,640);
 for(let i=0;i<mono.length;i+=2)assert.equal(mono.readInt16LE(i),3000);
 const packet=pcmPacket(mono,42,123456);assert.equal(packet.readUInt32LE(0),42);assert.equal(packet.readDoubleLE(4),123456);assert.deepEqual(packet.subarray(12),mono);
 assert.throws(()=>mono16k(Buffer.alloc(3)));
});
