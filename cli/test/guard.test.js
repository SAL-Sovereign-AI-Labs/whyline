'use strict';
// The Bob PreToolUse guard: Bob may not rewrite or delete Whyline's record; every ordinary command runs.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const GUARD = path.join(__dirname, '..', 'lib', 'agents', 'bob', 'assets', 'hooks', 'whyline-guard.sh');
const guard = command => spawnSync('sh', [GUARD], { input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'execute_command', tool_input: { command } }), encoding: 'utf8' });

test('guard blocks commands that rewrite or delete the record, with the reason on stderr', () => {
  for (const c of ['git notes --ref=whyline remove HEAD', 'git notes --ref whyline add -f -m x HEAD', 'git notes --ref=refs/notes/whyline edit HEAD',
    'git notes --ref=whyline list | xargs -n1 git notes --ref=whyline remove', 'git update-ref -d refs/notes/whyline', 'git push origin :refs/notes/whyline',
    'rm -rf .git/whyline', 'git config --unset notes.rewriteRef']) {
    const r = guard(c);
    assert.equal(r.status, 2, c);
    assert.match(r.stderr, /^whyline: blocked\./, c);
  }
});

test('guard lets ordinary commands run, including the whole removal flow and read-only notes commands', () => {
  for (const c of ['git notes --ref=whyline show HEAD', 'git notes --ref=whyline list', 'git log --notes=whyline -3', 'rm src/payments/mock_gateway.py',
    'git add -A && git commit -m "remove mock_gateway.py: until payments-v2 lands"', 'whyline check --json', 'whyline keep flags.yaml "beta"', 'pytest -q', 'git status']) {
    assert.equal(guard(c).status, 0, c);
  }
});

test('selftest proves every check can fail and exits 0', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'index.js'), 'selftest'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /(\d+) of \1 checks told the two cases apart\. Whyline works on this machine\./);
  assert.doesNotMatch(r.stdout, /^FAIL/m);
});
