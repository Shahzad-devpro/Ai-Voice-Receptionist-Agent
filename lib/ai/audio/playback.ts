export type AudioPlayback = {
  play: (base64Audio: string) => void;
  stop: () => void;
};

function base64ToInt16(base64: string): Int16Array {
  const binary = atob(base64);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Int16Array(bytes.buffer);
}

export function createAudioPlayback(): AudioPlayback {
  const audioContext = new AudioContext({
    sampleRate: 24000,
  });

  let nextStartTime = 0;
  let stopped = false;

  function play(base64Audio: string) {
    if (stopped) {
      return;
    }

    const pcm = base64ToInt16(base64Audio);

    const float32 = new Float32Array(
      pcm.length
    );

    for (let i = 0; i < pcm.length; i++) {
      float32[i] = pcm[i] / 32768;
    }

    const audioBuffer = audioContext.createBuffer(
      1,
      float32.length,
      24000
    );

    audioBuffer.copyToChannel(float32, 0);

    const source =
      audioContext.createBufferSource();

    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const startTime = Math.max(
      audioContext.currentTime,
      nextStartTime
    );

    source.start(startTime);

    nextStartTime =
      startTime + audioBuffer.duration;
  }

  function stop() {
    if (stopped) {
      return;
    }

    stopped = true;
    nextStartTime = 0;

    void audioContext.close();
  }

  return {
    play,
    stop,
  };
}