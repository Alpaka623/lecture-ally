// Injects a Duration element into the WebM files produced by the TTS service.
//
// Edge TTS streams Opus-in-WebM through GStreamer's matroskamux in streaming
// mode, which omits the Duration element (0x4489) from the segment's Info
// section. Browsers then report `duration = Infinity`, which breaks the seek
// bar, seeking, and — worst — forces the player into a multi-seek probe dance
// before every playback just to discover the true length (see loadAndPlayMain
// in useLecture). We know the duration anyway (the TTS word timings end at the
// last spoken word), so we write it into the header ourselves.
//
// Structure of the files this runs on (verified against real GStreamer
// 1.24 output): EBML header, then a Segment with *unknown* size (streaming),
// whose Info child uses a fixed-width size VINT and contains TimecodeScale,
// MuxingApp, WritingApp, DateUTC — but no Duration. The patch inserts
// `4489 88 <float64>` after TimecodeScale and bumps Info's size in place.
//
// Every assumption is checked; anything unexpected returns the original
// buffer unchanged, so a weird file degrades to the old probe behavior
// instead of a broken one.

const SEGMENT_ID = Buffer.from([0x18, 0x53, 0x80, 0x67]);
const INFO_ID = Buffer.from([0x15, 0x49, 0xa9, 0x66]);
const DURATION_ID = Buffer.from([0x44, 0x89]);
const TIMECODE_SCALE_ID = Buffer.from([0x2a, 0xd7, 0xb1]);

// The Duration element we insert: ID 0x4489, 8-byte float payload marker 0x88.
const DURATION_PAYLOAD_BYTES = 8;
const DURATION_ELEMENT_BYTES = DURATION_ID.length + 1 + DURATION_PAYLOAD_BYTES;

interface Vint {
  value: number;
  width: number;
}

// EBML variable-size integer (used for element data sizes). The position of
// the first set bit in the leading byte encodes the width; "all data bits
// set" means unknown/indefinite size, reported here as value -1.
function readSizeVint(buf: Uint8Array, offset: number): Vint | null {
  if (offset >= buf.length) return null;
  const first = buf[offset];
  if (first === 0) return null;

  let width = 1;
  while (width <= 8 && (first & (0x80 >> (width - 1))) === 0) width++;
  if (width > 8 || offset + width > buf.length) return null;

  // Unknown size: every data bit set (marker bit excluded). Checked byte-wise
  // to stay exact even for 8-wide VINTs, whose 56-bit values exceed the safe
  // integer range.
  const lowMask = 0xff >> width;
  let unknown = (first & lowMask) === lowMask;
  for (let i = 1; unknown && i < width; i++) unknown = buf[offset + i] === 0xff;
  if (unknown) return { value: -1, width };

  let value = first & lowMask;
  for (let i = 1; i < width; i++) value = value * 256 + buf[offset + i];
  return { value, width };
}

// Writes `value` as a size VINT of exactly `width` bytes (so it can replace
// the original size field in place without shifting anything). Returns null
// if the value doesn't fit.
function writeSizeVint(value: number, width: number): Buffer | null {
  const out = Buffer.alloc(width);
  let rest = value;
  for (let i = width - 1; i >= 0; i--) {
    out[i] = rest & 0xff;
    rest = Math.floor(rest / 256);
  }
  if (rest > 0) return null; // value too large for this width
  out[0] |= 0x80 >> (width - 1); // set the width marker bit

  // Must not collide with the "unknown size" sentinel (all data bits set).
  const lowMask = 0xff >> width;
  let sentinel = (out[0] & lowMask) === lowMask;
  for (let i = 1; sentinel && i < width; i++) sentinel = out[i] === 0xff;
  if (sentinel) return null;

  return out;
}

// Width of an EBML element ID from its leading byte's first set bit.
function elementIdWidth(first: number): number {
  if (first & 0x80) return 1;
  if (first & 0x40) return 2;
  if (first & 0x20) return 3;
  if (first & 0x10) return 4;
  return 0;
}

function readUintBE(buf: Uint8Array, offset: number, size: number): number {
  let value = 0;
  for (let i = 0; i < size; i++) value = value * 256 + buf[offset + i];
  return value;
}

/**
 * Returns `bytes` with a Duration element added to the segment Info, or the
 * original buffer unchanged when the duration is already present or the
 * structure isn't the expected GStreamer streaming layout. `seconds` comes
 * from the end of the last TTS word boundary — a few 100ms of trailing
 * silence may follow it, which the player's `durationchange` handling and
 * natural `ended` event absorb without visible drift.
 */
export function injectWebmDuration(bytes: Buffer, seconds: number): Buffer {
  if (!Number.isFinite(seconds) || seconds <= 0 || bytes.length < 64) return bytes;

  // The segment must use unknown size (streaming) — otherwise inserting bytes
  // would desynchronize its declared length.
  const segmentAt = bytes.indexOf(SEGMENT_ID);
  if (segmentAt < 0) return bytes;
  const segmentSize = readSizeVint(bytes, segmentAt + SEGMENT_ID.length);
  if (!segmentSize || segmentSize.value !== -1) return bytes;

  const infoAt = bytes.indexOf(INFO_ID, segmentAt);
  if (infoAt < 0) return bytes;
  const infoSizeFieldAt = infoAt + INFO_ID.length;
  const infoSize = readSizeVint(bytes, infoSizeFieldAt);
  if (!infoSize || infoSize.value < 0) return bytes; // unknown Info size: bail
  const infoContentAt = infoSizeFieldAt + infoSize.width;
  const infoEnd = infoContentAt + infoSize.value;
  if (infoEnd > bytes.length) return bytes;

  // Walk Info's children: refuse to touch files that already carry a Duration,
  // and pick up the TimecodeScale (nanoseconds per duration unit) plus the
  // insertion point right after the TimecodeScale element.
  let timecodeScale = 1_000_000; // Matroska default: 1ms per unit
  let insertAt = infoContentAt;
  let cursor = infoContentAt;
  while (cursor < infoEnd) {
    const idWidth = elementIdWidth(bytes[cursor]);
    if (idWidth === 0) return bytes; // not a valid element start: bail
    const size = readSizeVint(bytes, cursor + idWidth);
    if (!size || size.value < 0) return bytes;
    const childId = bytes.subarray(cursor, cursor + idWidth);
    if (Buffer.compare(childId, DURATION_ID) === 0) return bytes; // already patched
    if (Buffer.compare(childId, TIMECODE_SCALE_ID) === 0 && size.value <= 8) {
      timecodeScale = readUintBE(bytes, cursor + idWidth + size.width, size.value);
      insertAt = cursor + idWidth + size.width + size.value;
    }
    cursor += idWidth + size.width + size.value;
  }
  if (cursor !== infoEnd) return bytes; // children didn't tile the Info exactly

  const duration = Buffer.alloc(DURATION_ELEMENT_BYTES);
  DURATION_ID.copy(duration, 0);
  duration[DURATION_ID.length] = 0x80 | DURATION_PAYLOAD_BYTES; // size VINT: 8 bytes
  duration.writeDoubleBE((seconds * 1e9) / timecodeScale, DURATION_ID.length + 1);

  const newInfoSize = writeSizeVint(infoSize.value + DURATION_ELEMENT_BYTES, infoSize.width);
  if (!newInfoSize) return bytes;

  return Buffer.concat([
    bytes.subarray(0, infoSizeFieldAt),
    newInfoSize,
    bytes.subarray(infoContentAt, insertAt),
    duration,
    bytes.subarray(insertAt),
  ]);
}
