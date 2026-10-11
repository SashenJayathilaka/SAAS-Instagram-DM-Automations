import { afterEach, expect, it, vi } from "vitest";
import { startWavRecording } from "./record-audio";

afterEach(() => vi.unstubAllGlobals());
function microphone() {
  const stop = vi.fn(), close = vi.fn().mockResolvedValue(undefined);
  const processor = { connect: vi.fn(), disconnect: vi.fn(), onaudioprocess: null as null | ((event: { inputBuffer: { getChannelData: () => Float32Array } }) => void) };
  const node = { connect: vi.fn(), disconnect: vi.fn() };
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  vi.stubGlobal("AudioContext", class {
    sampleRate = 48000; destination = {}; close = close;
    resume = vi.fn().mockResolvedValue(undefined);
    createMediaStreamSource = () => node;
    createScriptProcessor = () => processor;
    createGain = () => ({ ...node, gain: { value: 1 } });
  });
  return { stop, close, processor };
}
it("reports real amplitude and elapsed time, then returns playable WAV for local review and releases the microphone", async () => {
  const { processor, stop, close } = microphone();
  const progress = vi.fn(), limit = vi.fn();
  const recorder = await startWavRecording(limit, progress);
  processor.onaudioprocess!({ inputBuffer: { getChannelData: () => new Float32Array(4800).fill(0.1) } });
  expect(progress.mock.calls[0][0].seconds).toBeCloseTo(0.1);
  expect(progress.mock.calls[0][0].level).toBeCloseTo(0.5);
  const wav = recorder.stop();
  expect(wav.type).toBe("audio/wav");
  expect(wav.size).toBe(44 + 4800 * 2);
  const header = new DataView(await wav.arrayBuffer());
  expect(header.getUint32(24, true)).toBe(48000);
  expect(header.getUint16(22, true)).toBe(1);
  expect(limit).not.toHaveBeenCalled();
  expect(stop).toHaveBeenCalledOnce();
  expect(close).toHaveBeenCalledOnce();
  expect(processor.onaudioprocess).toBeNull();
  recorder.cancel();
  expect(stop).toHaveBeenCalledOnce();
});
it("shows silence as a flat waveform and clamps loud samples", async () => {
  const { processor } = microphone(), progress = vi.fn();
  const recorder = await startWavRecording(vi.fn(), progress);
  processor.onaudioprocess!({ inputBuffer: { getChannelData: () => new Float32Array(4800) } });
  processor.onaudioprocess!({ inputBuffer: { getChannelData: () => new Float32Array(4800).fill(1) } });
  expect(progress.mock.calls.map(([p]) => p.level)).toEqual([0, 1]);
  expect(progress.mock.calls[1][0].seconds).toBeCloseTo(0.2);
  recorder.cancel();
});
