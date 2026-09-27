'use strict';
// whyline selftest: proves each check can fail. In a throwaway repo it plants a case that must pass and a case that
// must fail for every check, runs the real code path (capture, commit, why, check, the gate and the Bob guard),
// and reports PROVEN only when every check told the two apart. Nothing outside the temp repo is touched.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const CLI = path.join(__dirname, '..', 'index.js');
const GUARD = path.join(__dirname, 'agents', 'bob', 'assets', 'hooks', 'whyline-guard.sh');

function run() {
  const env = { ...process.env, WHYLINE_BOB_DB: '/nonexistent', GITHUB_ACTIONS: '', GIT_AUTHOR_NAME: 'selftest', GIT_COMMITTER_NAME: 'selftest', GIT_AUTHOR_EMAIL: 'selftest@example.invalid', GIT_COMMITTER_EMAIL: 'selftest@example.invalid' };
  const saved = process.env.WHYLINE_BOB_DB;
  process.env.WHYLINE_BOB_DB = '/nonexistent';
  const capture = require('./capture'), commit = require('./commit'), lenses = require('./lenses');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-selftest-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, env, encoding: 'utf8' }).trim();
  const cli = (...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: dir, env, encoding: 'utf8' });
  const guard = (command) => spawnSync('sh', [GUARD], { input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'execute_command', tool_input: { command } }), encoding: 'utf8' }).status;
  const write = (file, content, session, prompt) => {
    const abs = path.join(dir, file);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    if (prompt) capture.handle({ hook_event_name: 'UserPromptSubmit', session_id: session, cwd: dir, prompt }, { cwd: dir });
    fs.writeFileSync(abs, content);
    capture.handle({ hook_event_name: 'PostToolUse', session_id: session, cwd: dir, tool_name: 'write_file', tool_input: { path: abs, content }, tool_response: 'ok' }, { cwd: dir });
  };
  const commitAll = (msg) => { git('add', '-A'); git('commit', '-q', '-m', msg); commit.run(dir); };
  const results = [];
  const check = (name, passCase, failCase) => {
    let ok = false, detail = '';
    try { ok = passCase() === true && failCase() === true; } catch (e) { detail = e.message; }
    results.push({ name, ok, detail });
  };
  try {
    git('init', '-q', '-b', 'main'); git('config', 'user.name', 'selftest'); git('config', 'user.email', 'selftest@example.invalid');
    fs.writeFileSync(path.join(dir, 'README.md'), '# shop\n'); commitAll('human readme');
    write('src/mock_gateway.py', 'class MockGateway:\n    def charge(self, total):\n        return True\n', 's1', 'Add a mock gateway until payments-v2 lands.');
    fs.writeFileSync(path.join(dir, 'src/checkout.py'), 'from mock_gateway import MockGateway\n\ndef checkout(total):\n    return MockGateway().charge(total)\n');
    commitAll('mock gateway');
    write('src/lib.py', 'def a():\n    return 1\n\ndef b():\n    return 2\n', 's2', 'Add helpers a and b.');
    fs.writeFileSync(path.join(dir, 'src/lib.py'), 'def a():\n    return 1\n\ndef b():\n    return 42\n');
    commitAll('helpers');

    check('why: an AI line shows the request that wrote it, and a line a person wrote is not called AI',
      () => { const w = lenses.why(dir, 'src/mock_gateway.py', 1); return w.origin === 'ai' && /mock gateway/.test(w.prompt); },
      () => lenses.why(dir, 'README.md', 1).origin === 'human');
    check('why: a line a person changed before the commit shows as "AI, then changed by a person"; untouched AI lines stay AI',
      () => lenses.why(dir, 'src/lib.py', 5).origin === 'ai-edited',
      () => lenses.why(dir, 'src/lib.py', 1).origin === 'ai');
    check('check: temporary code waits while something uses it, and is ready to delete once nothing does',
      () => lenses.check(dir).due.length === 0 && lenses.check(dir).active.some(i => i.file === 'src/mock_gateway.py'),
      () => { fs.writeFileSync(path.join(dir, 'src/checkout.py'), 'def checkout(total):\n    return True\n'); commitAll('real gateway'); return lenses.check(dir).due.some(i => i.file === 'src/mock_gateway.py'); });
    check('check --gate: fails the pull request check while something is ready to delete, and passes once it is decided',
      () => cli('check', '--gate').status === 2,
      () => cli('keep', 'mock_gateway.py', 'selftest keeps it').status === 0 && cli('check', '--gate').status === 0);
    check('Bob cannot edit the history Whyline keeps; ordinary commands still run',
      () => guard('git notes --ref=whyline remove HEAD') === 2 && guard('rm -rf .git/whyline') === 2,
      () => guard('git notes --ref=whyline show HEAD') === 0 && guard('git add -A && git commit -m done') === 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    if (saved === undefined) delete process.env.WHYLINE_BOB_DB; else process.env.WHYLINE_BOB_DB = saved;
  }
  const passed = results.filter(r => r.ok).length;
  return { results, passed, total: results.length, proven: passed === results.length };
}

module.exports = { run };
