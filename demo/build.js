#!/usr/bin/env node
'use strict';
// Builds the Whyline demo repo from scratch so every laptop and every video take starts identically.
//   node demo/build.js [target]        default target: ../whyline-demo-shop (next to this repo)
// Steps: copy shop-backend, git init, `whyline init`, replay recorded Bob sessions through `whyline capture`
// (prompt + write_file payloads in the exact Bob 2.0.5 hook shape), commit each session, create branch payments-v2.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const HERE = __dirname;
const CLI = path.join(HERE, '..', 'cli', 'index.js');
const TEMPLATE = path.join(HERE, 'shop-backend');
const SESSIONS = JSON.parse(fs.readFileSync(path.join(HERE, 'payloads', 'sessions.json'), 'utf8'));
const MARKER = '.whyline-demo';

function main(argv) {
  const target = path.resolve(argv[0] || path.join(HERE, '..', '..', 'whyline-demo-shop'));
  const env = { ...process.env, GIT_AUTHOR_NAME: 'demo', GIT_COMMITTER_NAME: 'demo', GIT_AUTHOR_EMAIL: 'demo@example.invalid', GIT_COMMITTER_EMAIL: 'demo@example.invalid', WHYLINE_BOB_DB: process.env.WHYLINE_BOB_DB || '/nonexistent' };
  const git = (...a) => execFileSync('git', a, { cwd: target, encoding: 'utf8', env }).trim();
  const whyline = (args, input) => { const r = spawnSync(process.execPath, [CLI, ...args], { cwd: target, input, encoding: 'utf8', env }); if (r.status !== 0 && r.status !== 2) throw new Error(`whyline ${args[0]} failed: ${r.stderr}`); return r.stdout; };
  const sessionLines = () => { const f = path.join(target, '.git', 'whyline', 'session.jsonl'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).length : 0; };
  const captureOrFail = (payload, what) => { const before = sessionLines(); whyline(['capture', '--agent', 'bob'], JSON.stringify(payload)); if (sessionLines() !== before + 1) throw new Error(`capture recorded nothing for ${what}`); };

  if (fs.existsSync(target)) {
    if (!fs.existsSync(path.join(target, MARKER))) throw new Error(`${target} exists and is not a whyline demo folder; refusing to delete it`);
    // Empty the folder but keep the folder itself and .bob/ in place: an open Bob IDE window keeps its index of
    // .bob (skills, hooks) and loses it when the directory is deleted and recreated. Files inside .bob are refreshed by init.
    // A background `whyline report` from the previous build's post-commit hook may still be writing: retry briefly.
    for (let attempt = 0; ; attempt++) {
      try {
        for (const entry of fs.readdirSync(target)) if (entry !== '.bob') fs.rmSync(path.join(target, entry), { recursive: true, force: true });
        break;
      } catch (e) {
        if (attempt >= 10) throw e;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
      }
    }
  }
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(TEMPLATE, target, { recursive: true });
  fs.writeFileSync(path.join(target, MARKER), 'built by whyline demo/build.js\n');
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'demo'); git('config', 'user.email', 'demo@example.invalid');
  git('add', '.', ':!.bob'); git('commit', '-q', '-m', 'init shop-backend'); // .bob may survive from an earlier build
  whyline(['init']);
  // keep raw hook payloads from IDE sessions in .git/whyline/raw/ so they become fixtures
  const settingsFile = path.join(target, '.bob', 'settings.json');
  fs.writeFileSync(settingsFile, fs.readFileSync(settingsFile, 'utf8').replace(/whyline\.sh capture --agent bob/g, 'whyline.sh capture --dump --agent bob'));
  git('add', '.bob'); git('commit', '-q', '-m', 'add whyline');
  fs.rmSync(path.join(target, '.git', 'whyline', 'session.jsonl'), { force: true }); // nothing from before this build

  for (const s of SESSIONS) {
    captureOrFail({ hook_event_name: 'UserPromptSubmit', session_id: s.id, cwd: target, prompt: s.prompt }, `prompt of ${s.id.slice(0, 8)}`);
    for (const w of s.writes) {
      const abs = path.join(target, w.file);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, w.content);
      captureOrFail({ hook_event_name: 'PostToolUse', session_id: s.id, cwd: target, tool_name: 'write_file',
        tool_input: { path: abs, content: w.content, line_count: w.content.split('\n').length - 1 }, tool_response: `Created file: ${w.file}`, tool_use_id: `tooluse_${s.id.slice(0, 8)}` }, w.file);
    }
    git('add', '.'); git('commit', '-q', '-m', s.commit);
    whyline(['commit']); // the post-commit hook also runs when whyline is on PATH; a second run is a no-op
    if (!git('notes', '--ref=whyline', 'list', 'HEAD')) throw new Error(`no note attached for session ${s.id.slice(0, 8)}`);
  }

  // payments-v2: the real gateway lands and the mock is no longer referenced
  git('checkout', '-q', '-b', 'payments-v2');
  fs.writeFileSync(path.join(target, 'src/payments/gateway.py'), 'class Gateway:\n    def charge(self, total):\n        # real provider call goes here\n        return {"ok": True, "amount": total}\n');
  fs.writeFileSync(path.join(target, 'src/payments/checkout.py'), 'from ..shop.pricing import with_tax\nfrom .gateway import Gateway\n\n\ndef checkout(order, region="pk"):\n    total = with_tax(order.total(), region)\n    Gateway().charge(total)\n    return total\n');
  git('add', '.'); git('commit', '-q', '-m', 'payments-v2: real gateway');
  git('checkout', '-q', 'main');

  const check = whyline(['check']);
  console.log(`demo built at ${target}\n${check}`);
  return 0;
}

if (require.main === module) {
  try { process.exit(main(process.argv.slice(2))); } catch (e) { process.stderr.write(`build failed: ${e.message}\n`); process.exit(1); }
}
module.exports = { main };
