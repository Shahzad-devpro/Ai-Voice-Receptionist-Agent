class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];

    if (!input || !input[0]) {
      return true;
    }

    const channel = input[0];

    this.port.postMessage(channel.slice());

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);