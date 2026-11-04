import { describe, expect, it, mock } from "bun:test";

mock.module("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "test-session" } }, error: null }) } },
}));

const { mediaUrlFromResponse, uploadMedia, validateMediaFile } = await import("./media-upload");

describe("media upload contract", () => {
  it("uses the requested media host and preserves nested object keys", () => {
    expect(mediaUrlFromResponse({ key: "media/example.png" })).toBe("https://media.livingfellowship2026.com/media/media/example.png");
    expect(() => mediaUrlFromResponse({ url: "https://example.com/media/file.png" })).toThrow();
  });
  it("preserves the 10 MB image limit", () => {
    expect(() => validateMediaFile({ type: "image/png", size: 10 * 1024 * 1024 }, "image")).not.toThrow();
    expect(() => validateMediaFile({ type: "image/png", size: 10 * 1024 * 1024 + 1 }, "image")).toThrow();
  });
  it("respects the media service 100 MB video limit", () => {
    expect(() => validateMediaFile({ type: "video/mp4", size: 100 * 1024 * 1024 }, "video")).not.toThrow();
    expect(() => validateMediaFile({ type: "video/mp4", size: 100 * 1024 * 1024 + 1 }, "video")).toThrow();
  });
  it("sends multipart file via POST with the session bearer token", async () => {
    let method = "", endpoint = "", auth = "";
    let sent: FormData | undefined;
    class Request {
      upload = {};
      status = 200;
      responseText = JSON.stringify({ key: "media/video.mp4" });
      onload?: () => void;
      open(m: string, url: string) { method = m; endpoint = url; }
      setRequestHeader(name: string, value: string) { expect(name).toBe("Authorization"); auth = value; }
      send(body: FormData) { sent = body; this.onload?.(); }
    }
    const previous = globalThis.XMLHttpRequest;
    globalThis.XMLHttpRequest = Request as unknown as typeof XMLHttpRequest;
    try {
      const file = new File(["video"], "video.mp4", { type: "video/mp4" });
      expect(await uploadMedia(file, "video")).toBe("https://media.livingfellowship2026.com/media/media/video.mp4");
      expect(method).toBe("POST");
      expect(endpoint).toBe("https://media.livingfellowship2026.com/upload");
      expect(auth).toBe("Bearer test-session");
      expect(sent?.get("file")).toBe(file);
    } finally { globalThis.XMLHttpRequest = previous; }
  });
});