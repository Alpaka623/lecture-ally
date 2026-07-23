import { NextResponse } from "next/server";

// Serves a media buffer with HTTP Range support (RFC 7233). <audio> elements
// need this for seeking within the file, and — less obviously — for the
// player's duration probe on WebM files that carry no duration metadata.
// New files get the duration written into their header at synthesis time
// (with a one-time backfill when first served), but unpatched files still
// exist: the browser learns their length by fetching the tail of the file,
// and without Range support it can only probe what has downloaded so far,
// which reports a too-short duration while the body is still streaming.
export function mediaResponse(
  request: Request,
  bytes: Uint8Array<ArrayBuffer>,
  contentType: string,
): NextResponse {
  const total = bytes.byteLength;
  const headers = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const unsatisfiable = () =>
    new NextResponse(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${total}` },
    });

  const rawRange = request.headers.get("range")?.trim();
  if (!rawRange) {
    return new NextResponse(bytes, {
      headers: { ...headers, "Content-Length": String(total) },
    });
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rawRange);
  if (!match) return unsatisfiable();

  let start: number;
  let end: number;
  if (match[1] === "" && match[2] !== "") {
    // Suffix range ("bytes=-N"): the final N bytes.
    const suffix = Number(match[2]);
    if (suffix === 0) return unsatisfiable();
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else if (match[1] !== "") {
    start = Number(match[1]);
    // Open-ended ("bytes=N-") runs to the last byte; an explicit end is
    // clamped to the file size per the RFC.
    end = match[2] === "" ? total - 1 : Math.min(Number(match[2]), total - 1);
  } else {
    // "bytes=-" is malformed.
    return unsatisfiable();
  }

  if (start >= total || start > end) return unsatisfiable();

  return new NextResponse(bytes.slice(start, end + 1), {
    status: 206,
    headers: {
      ...headers,
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Content-Length": String(end - start + 1),
    },
  });
}
