// Runs in AudioWorklet scope. Mono PCM16, bounded 100 ms messages.
class DemoMicrophone extends AudioWorkletProcessor {
  constructor(options){super();this.target=options.processorOptions.sampleRate;this.phase=0;this.sum=0;this.count=0;this.samples=[];}
  process(inputs){
    const mono=inputs[0]?.[0];
    if(mono)for(const value of mono){
      this.sum+=value;this.count++;this.phase+=this.target;
      if(this.phase>=sampleRate){this.phase-=sampleRate;const sample=this.sum/this.count;this.samples.push(Math.round(Math.max(-1,Math.min(1,sample))*(sample<0?32768:32767)));this.sum=0;this.count=0;}
      if(this.samples.length>=this.target/10){const pcm=new Int16Array(this.samples);this.port.postMessage(pcm.buffer,[pcm.buffer]);this.samples=[];}
    }
    return true;
  }
}
registerProcessor('demo-microphone',DemoMicrophone);
