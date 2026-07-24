import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only the TTS relay still needs an unbundled native-ish dependency
  // (msedge-tts uses a WebSocket client). PDF rendering moved to the browser.
  serverExternalPackages: ["msedge-tts"],
};

export default nextConfig;
