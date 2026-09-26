import {
  downsampleTo16kHz,
  float32ToInt16,
  int16ToBase64,
} from "./pcm";

export type AudioCapture = {
  stop: () => void;
};

export async function startAudioCapture(
  stream: MediaStream,
  onAudioChunk: (base64Audio: string) => void
): Promise<AudioCapture> {
  const audioContext = new AudioContext();

  let stopped = false;

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  await audioContext.audioWorklet.addModule(
    "/audio/pcm-processor.js"
  );

  if (stopped) {
    await audioContext.close();

    return {
      stop: () => {},
    };
  }

  const source =
    audioContext.createMediaStreamSource(stream);

  const workletNode = new AudioWorkletNode(
    audioContext,
    "pcm-processor",
    {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
    }
  );

  const silentGain = audioContext.createGain();

  silentGain.gain.value = 0;

  workletNode.port.onmessage = (
    event: MessageEvent
  ) => {
    if (stopped) {
      return;
    }

    const input = event.data;

    if (!(input instanceof Float32Array)) {
      return;
    }

    const downsampled = downsampleTo16kHz(
      input,
      audioContext.sampleRate
    );

    const pcm = float32ToInt16(downsampled);

    const base64 = int16ToBase64(pcm);

    onAudioChunk(base64);
  };

  source.connect(workletNode);

  workletNode.connect(silentGain);
  silentGain.connect(audioContext.destination);

  return {
    stop: () => {
      if (stopped) {
        return;
      }

      stopped = true;

      workletNode.port.onmessage = null;
      workletNode.port.close();

      workletNode.disconnect();
      source.disconnect();
      silentGain.disconnect();

      void audioContext.close();
    },
  };
}