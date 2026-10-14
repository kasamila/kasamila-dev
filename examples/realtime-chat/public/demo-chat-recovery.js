// Portal-only recovery. Never change provider, replay user input, or retry
// authorization, quota, integrity, configuration or user-cancelled failures.
export function recoverableChatStart(error){
 if(['demo_connection_failed','provider_error'].includes(error?.code))return true;
 if(error?.code)return false;
 return /failed to fetch|networkerror|network request failed|worker initialization timeout|runtime video (?:metadata timed out|failed to load)/i.test(error?.message||'');
}
export function chatFailurePhase(phase){
 return ['session','avatar','video','voice'].includes(phase)?phase:'connection';
}

export async function closeChatSocket(socket){
 if(!socket||socket.readyState===3)return;
 // Wait for the close handshake before readmitting the same provider. The
 // server releases its upstream channel in response to that disconnect.
 if(typeof socket.addEventListener!=='function'){socket.close();return;}
 await new Promise(resolve=>{
  const done=()=>{clearTimeout(timer);socket.removeEventListener('close',done);resolve();};
  const timer=setTimeout(done,4000);socket.addEventListener('close',done,{once:true});
  try{socket.close();}catch{done();}
 });
}
