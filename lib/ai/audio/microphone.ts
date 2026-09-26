export type MicrophoneStream = {
  stream: MediaStream;
  stop: () => void;
};

export async function startMicrophone(): Promise<MicrophoneStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Microphone access is not supported by this browser."
    );
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  return {
    stream,
    stop: () => {
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}