'use strict';
// Pure functions over unified diffs and line ranges. No I/O.

// Extract the patch Bob returns in an apply_diff / insert_content / search_and_replace response.
function patchFromResponse(text) {
  if (typeof text !== 'string') return '';
  const m = text.match(/<patch>([\s\S]*?)<\/patch>/);
  return m ? m[1] : text;
}

// Parse a unified diff into zero-context hunks {oldStart, oldLen, newStart, newLen}, one per run of changed lines.
// Works with any context width, so it is exact for Bob's apply_diff responses and for `git diff --unified=0`.
function parseHunks(text) {
  const out = [];
  const lines = String(text).split('\n');
  let oldLine = 0, newLine = 0, inHunk = false, run = null;
  const flush = () => { if (run) { out.push(run); run = null; } };
  for (const raw of lines) {
    const h = raw.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (h) {
      flush();
      oldLine = +h[1]; newLine = +h[3]; inHunk = true;
      if (h[2] === '0') oldLine += 1; // pure insertion: first old line after the anchor
      if (h[4] === '0') newLine += 1;
      continue;
    }
    if (!inHunk) continue;
    const c = raw[0];
    if (c === '-') { if (!run) run = { oldStart: oldLine, oldLen: 0, newStart: newLine, newLen: 0 }; run.oldLen++; oldLine++; }
    else if (c === '+') { if (!run) run = { oldStart: oldLine, oldLen: 0, newStart: newLine, newLen: 0 }; run.newLen++; newLine++; }
    else if (c === ' ' || raw === '') { flush(); if (raw === '' ) continue; oldLine++; newLine++; }
    else if (c === '\\') continue; // "\ No newline at end of file"
    else { flush(); inHunk = false; }
  }
  flush();
  return out;
}

// New-side ranges that contain added lines.
function addedRanges(patchText) {
  return merge(parseHunks(patchText).filter(h => h.newLen > 0).map(h => [h.newStart, h.newStart + h.newLen - 1]));
}

// Map old-side ranges through zero-context hunks.
// kept: old lines untouched by any hunk, shifted to their new numbers. edited: new-side extents of hunks overlapping a range.
function mapRanges(ranges, hunks) {
  const kept = [], edited = [];
  const sorted = [...hunks].sort((a, b) => a.oldStart - b.oldStart);
  for (const [s, e] of ranges) {
    let cur = s;
    for (const h of sorted) {
      if (h.oldLen === 0) continue; // insertions never overlap old lines
      const hs = h.oldStart, he = h.oldStart + h.oldLen - 1;
      if (he < cur) continue;
      if (hs > e) break;
      if (hs > cur) pushMapped(kept, cur, hs - 1, sorted);
      if (h.newLen > 0) edited.push([h.newStart, h.newStart + h.newLen - 1]);
      cur = he + 1;
    }
    if (cur <= e) pushMapped(kept, cur, e, sorted);
  }
  return { kept: merge(kept), edited: merge(edited) };
}

// Net shift applied to old line `line` by hunks that end before it.
function offsetAt(line, hunks) {
  let off = 0;
  for (const h of hunks) {
    if (h.oldLen === 0) { if (h.oldStart < line) off += h.newLen; }
    else if (h.oldStart + h.oldLen - 1 < line) off += h.newLen - h.oldLen;
  }
  return off;
}

function pushMapped(out, s, e, hunks) {
  // an insertion strictly inside [s,e] splits it; handle by mapping line by line only when offsets differ
  const os = offsetAt(s, hunks), oe = offsetAt(e, hunks);
  if (os === oe) { out.push([s + os, e + oe]); return; }
  for (let l = s; l <= e; l++) out.push([l + offsetAt(l, hunks), l + offsetAt(l, hunks)]);
}

function merge(ranges) {
  const r = ranges.filter(([s, e]) => e >= s).sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [s, e] of r) {
    const last = out[out.length - 1];
    if (last && s <= last[1] + 1) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

function rangeLen(ranges) { return ranges.reduce((n, [s, e]) => n + (e - s + 1), 0); }
function contains(ranges, line) { return ranges.some(([s, e]) => line >= s && line <= e); }

module.exports = { patchFromResponse, parseHunks, addedRanges, mapRanges, merge, rangeLen, contains };
