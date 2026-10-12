// Mono 16 kHz PCM in real-time 40 ms packets. Box-filter resampling preserves
// fractional input/output positions across callbacks (including 44.1 kHz).
class Capture extends AudioWorkletProcessor {
  constructor(){super();this.sum=0;this.weight=0;this.packet=new Int16Array(640);this.offset=0;}
  process(inputs, outputs){
    for(const output of outputs)for(const channel of output)channel.fill(0);
    const channels=inputs[0];if(!channels?.length)return true;
    const ratio=sampleRate/16000;
    for(let index=0;index<channels[0].length;index++){
      let value=0;for(const channel of channels)value+=(channel[index]||0)/channels.length;
      let remaining=1;
      while(remaining>1e-8){
        const used=Math.min(remaining,ratio-this.weight);this.sum+=value*used;this.weight+=used;remaining-=used;
        if(this.weight>=ratio-1e-8){
          this.packet[this.offset++]=Math.round(Math.max(-1,Math.min(1,this.sum/ratio))*32767);
          this.sum=0;this.weight=0;
          if(this.offset===640){this.port.postMessage(this.packet.buffer,[this.packet.buffer]);this.packet=new Int16Array(640);this.offset=0;}
        }
      }
    }
    return true;
  }
}
registerProcessor('companion-capture',Capture);
