export function float32ToInt16(
  input: Float32Array
): Int16Array {
  const output = new Int16Array(input.length);

  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i]));

    output[i] =
      sample < 0
        ? sample * 0x8000
        : sample * 0x7fff;
  }

  return output;
}

export function downsampleTo16kHz(
  input: Float32Array,
  inputSampleRate: number
): Float32Array {
  if (inputSampleRate === 16000) {
    return input;
  }

  const ratio = inputSampleRate / 16000;
  const outputLength = Math.round(
    input.length / ratio
  );

  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(
      left + 1,
      input.length - 1
    );

    const weight = position - left;

    output[i] =
      input[left] * (1 - weight) +
      input[right] * weight;
  }

  return output;
}

export function int16ToBase64(
  input: Int16Array
): string {
  const bytes = new Uint8Array(input.buffer);

  let binary = "";

  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(
      i,
      Math.min(i + chunkSize, bytes.length)
    );

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}