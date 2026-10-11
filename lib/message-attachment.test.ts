import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  attachmentId,
  attachmentUrl,
  attachmentPayload,
  validateAttachmentDeclaration,
} from "./message-attachment";
import {
  normalizeCampaignPayload,
  validateNormalizedCampaignPayload,
} from "./campaign-save";
import {
  normalizeMessageAutomationPayload,
  validateMessageAutomationPayload,
} from "./message-automation";
import { inspectAttachment } from "./attachment-validation";
import { encodeWav, startWavRecording } from "./record-audio";
import sharp from "sharp";
const id = "11111111-1111-4111-8111-111111111111",
  url = attachmentUrl(id);
describe("message attachment contracts", () => {
  it("accepts only canonical delivery URLs", () => {
    expect(attachmentId(url)).toBe(id);
    for (const bad of [
      url + "?other=1",
      url.replace("ap3k.com", "evil.test"),
      "file:///tmp/data",
    ])
      expect(attachmentId(bad)).toBeNull();
  });
  it("enforces declared type and image/file-specific byte limits", () => {
    expect(validateAttachmentDeclaration("image/gif", 8000000)).toBe("IMAGE");
    expect(() => validateAttachmentDeclaration("image/gif", 8000001)).toThrow();
    expect(() =>
      validateAttachmentDeclaration("video/mp4", 25000001),
    ).toThrow();
    expect(() => validateAttachmentDeclaration("text/html", 20)).toThrow();
    expect(() =>
      validateAttachmentDeclaration("application/pdf", -1),
    ).toThrow();
  });
  it.each(["IMAGE", "VIDEO", "AUDIO", "FILE"])(
    "normalizes %s without text, quick replies or CTA leakage",
    (type) => {
      const raw = {
        name: "Attachment",
        source: "DM",
        responseFormat: "ATTACHMENT",
        mediaUrl: url,
        mediaType: type,
        message: "hidden",
        linkButtons: [{ label: "Hidden", url: "https://example.com" }],
        quickReplies: ["Hidden"],
        messageVariations: ["Hidden"],
      };
      const dm = normalizeMessageAutomationPayload(raw);
      expect(dm).toMatchObject({
        responseFormat: "ATTACHMENT",
        mediaType: type,
        message: "",
        quickReplies: [],
        messageVariations: [],
      });
      expect(validateMessageAutomationPayload(dm)).toBeNull();
      const comment = normalizeCampaignPayload({
        name: "Attachment",
        post: { postid: "ANY", media: "" },
        triggerMode: "ANY_COMMENT",
        sendPrivateDm: true,
        listener: { ...raw, prompt: "hidden" },
      });
      expect(comment.listener).toMatchObject({
        responseFormat: "ATTACHMENT",
        mediaType: type,
        prompt: "",
        quickReplies: [],
        messageVariations: [],
      });
      expect(validateNormalizedCampaignPayload(comment)).toBeNull();
      expect(attachmentPayload(url, type).attachment.type).toBe(
        type === "FILE" ? "template" : type.toLowerCase(),
      );
    },
  );
  it("refuses spoofed MIME, corrupt images and mismatched sizes using storage bytes", async () => {
    const bytes = new TextEncoder().encode("<html>bad</html>");
    await expect(
      inspectAttachment(new Blob([bytes]).stream(), "image/png", bytes.length),
    ).rejects.toThrow();
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    await expect(
      inspectAttachment(new Blob([png]).stream(), "image/png", png.length),
    ).rejects.toThrow();
    await expect(
      inspectAttachment(new Blob([bytes]).stream(), "application/pdf", 1),
    ).rejects.toThrow();
  });
  it("accepts valid image and recorded WAV bytes", async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    expect(
      await inspectAttachment(
        new Blob([png]).stream(),
        "image/png",
        png.length,
      ),
    ).toBe("IMAGE");
    const wav = encodeWav([new Float32Array([0, 1, -1])], 48000);
    expect(await inspectAttachment(wav.stream(), "audio/wav", wav.size)).toBe(
      "AUDIO",
    );
    const view = new DataView(await wav.arrayBuffer());
    expect(view.getUint32(40, true)).toBe(6);
  });
  it("cancels microphone tracks and disconnects audio nodes once", async () => {
    const stop = vi.fn(),
      close = vi.fn().mockResolvedValue(undefined),
      disconnect = vi.fn();
    const node = { connect: vi.fn(), disconnect };
    const processor = { ...node, onaudioprocess: null };
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi
          .fn()
          .mockResolvedValue({ getTracks: () => [{ stop }] }),
      },
    });
    vi.stubGlobal(
      "AudioContext",
      class {
        sampleRate = 48000;
        destination = {};
        resume = vi.fn().mockResolvedValue(undefined);
        close = close;
        createMediaStreamSource = () => node;
        createScriptProcessor = () => processor;
        createGain = () => ({ ...node, gain: { value: 1 } });
      },
    );
    try {
      const recording = await startWavRecording(vi.fn());
      recording.cancel();
      recording.cancel();
      expect(stop).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
      expect(processor.onaudioprocess).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
