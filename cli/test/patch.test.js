'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const patch = require('../lib/patch');
const payloads = require('./fixtures/bob-payloads.json');

test('parses the real apply_diff response from Bob 2.0.5', () => {
  const p = payloads.find(x => x.tool_name === 'apply_diff' && x.hook_event_name === 'PostToolUse');
  const text = patch.patchFromResponse(p.tool_response);
  assert.ok(text.includes('@@'), 'patch block present');
  const ranges = patch.addedRanges(text);
  assert.ok(ranges.length >= 1);
  // sub() was added after add(): the hunk must cover the new lines 5-8
  assert.deepEqual(ranges, [[5, 8]]);
});

test('parseHunks yields zero-context runs from a diff with context lines', () => {
  const diff = '@@ -1,4 +1,8 @@\n a\n \n def add():\n     return 1\n+\n+\n+def sub():\n+    return 2\n';
  assert.deepEqual(patch.parseHunks(diff), [{ oldStart: 5, oldLen: 0, newStart: 5, newLen: 4 }]);
  assert.deepEqual(patch.addedRanges(diff), [[5, 8]]);
  const two = '@@ -3,2 +3,3 @@\n-old\n+new1\n+new2\n x\n@@ -10,0 +12,1 @@\n+ins\n';
  assert.deepEqual(patch.parseHunks(two), [{ oldStart: 3, oldLen: 1, newStart: 3, newLen: 2 }, { oldStart: 11, oldLen: 0, newStart: 12, newLen: 1 }]);
});

test('mapRanges shifts untouched ranges and marks overlapped ones as edited', () => {
  // human inserted 2 lines at the top (old 0 lines -> new 1-2), and rewrote old lines 5-6 into new 7-9
  const hunks = [{ oldStart: 0, oldLen: 0, newStart: 1, newLen: 2 }, { oldStart: 5, oldLen: 2, newStart: 7, newLen: 3 }];
  const r = patch.mapRanges([[1, 3], [4, 8]], hunks);
  assert.deepEqual(r.kept, [[3, 6], [10, 11]]);
  assert.deepEqual(r.edited, [[7, 9]]);
});

test('mapRanges with no hunks is identity', () => {
  assert.deepEqual(patch.mapRanges([[2, 4]], []), { kept: [[2, 4]], edited: [] });
});

test('merge joins adjacent and overlapping ranges', () => {
  assert.deepEqual(patch.merge([[5, 6], [1, 2], [3, 4], [10, 12], [11, 15]]), [[1, 6], [10, 15]]);
});
