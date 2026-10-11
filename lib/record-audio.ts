export function encodeWav(samples: Float32Array[], sampleRate: number): Blob {
  const length = samples.reduce((n, s) => n + s.length, 0),
    buffer = new ArrayBuffer(44 + length * 2),
    view = new DataView(buffer);
  const text = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++)
      view.setUint8(offset + i, s.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, length * 2, true);
  let offset = 44;
  for (const chunk of samples)
    for (let index = 0; index < chunk.length; index++) {
      const value = chunk[index];
      const s = Math.max(-1, Math.min(1, value));
      view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
      offset += 2;
    }
  return new Blob([buffer], { type: "audio/wav" });
}
export async function startWavRecording(
  onLimit: () => void,
  onProgress?: (progress: { seconds: number; level: number }) => void,
) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  let context: AudioContext | undefined;
  try {
    context = new AudioContext({ sampleRate: 48000 });
    await context.resume();
    const source = context.createMediaStreamSource(stream),
      processor = context.createScriptProcessor(4096, 1, 1),
      gain = context.createGain();
    gain.gain.value = 0;
    const chunks: Float32Array[] = [];
    let samples = 0,
      closed = false;
    processor.onaudioprocess = (e) => {
      if (closed) return;
      const data = e.inputBuffer.getChannelData(0).slice();
      chunks.push(data);
      samples += data.length;
      const seconds = samples / context!.sampleRate;
      let energy = 0;
      for (let i = 0; i < data.length; i++) energy += data[i] * data[i];
      onProgress?.({ seconds, level: Math.min(1, Math.sqrt(energy / data.length) * 5) });
      if (seconds >= 180) onLimit();
    };
    source.connect(processor);
    processor.connect(gain);
    gain.connect(context.destination);
    const cleanup = () => {
      if (closed) return;
      closed = true;
      processor.onaudioprocess = null;
      source.disconnect();
      processor.disconnect();
      gain.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      void context!.close();
    };
    return {
      stop: () => {
        const blob = encodeWav(chunks, context!.sampleRate);
        cleanup();
        return blob;
      },
      cancel: cleanup,
    };
  } catch (error) {
    stream.getTracks().forEach((t) => t.stop());
    void context?.close();
    throw error;
  }
}
