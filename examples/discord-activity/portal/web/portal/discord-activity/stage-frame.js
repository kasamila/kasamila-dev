export function createRuntimeFrame(container){
 const frame=document.createElement('iframe');frame.title='Kasamila avatar';frame.allow='autoplay';
 Object.assign(frame.style,{display:'block',border:'0',width:'100%',height:'100%'});
 const ready=new Promise((resolve,reject)=>{
  frame.onload=()=>{try{if(!frame.contentWindow.kasamilaDiscordStage)throw new Error('discord_stage_load_failed');resolve();}catch(error){reject(error);}};
  frame.onerror=()=>reject(new Error('discord_stage_load_failed'));
 });
 frame.src='/web/portal/discord-activity/runtime-stage.html?v=1';container.replaceChildren(frame);
 return {frame,async create(admission,session){
  await ready;
  const view=frame.contentWindow,created=await view.kasamilaDiscordStage.create(admission,session);
  // PCM originates in the Activity's realm. Convert it in the renderer's realm
  // so the unmodified SDK's typed-array checks and streams see local objects.
  return {player:created.player,source:{
   push:samples=>created.source.push(new view.Int16Array(samples)),
   abort:()=>created.source.abort(),finished:created.source.finished
  }};
 }};
}
