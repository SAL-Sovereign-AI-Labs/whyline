'use strict';
// Bob Shell keeps per-task cost in ~/.bob/db/bob.db (tasks.costs). Read it with the sqlite3 CLI, read-only. Null when unavailable.
const { execFileSync } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

function forSession(sessionId) {
  const db = process.env.WHYLINE_BOB_DB || path.join(os.homedir(), '.bob', 'db', 'bob.db');
  if (!fs.existsSync(db) || !/^[0-9a-f]{8,64}$/.test(sessionId)) return null;
  try {
    const out = execFileSync('sqlite3', ['-readonly', db, `select costs from tasks where id='${sessionId}' limit 1;`], { encoding: 'utf8', timeout: 2000 }).trim();
    if (!out) return null;
    const j = JSON.parse(out);
    return typeof j.cost === 'number' ? j.cost : null;
  } catch { return null; }
}

module.exports = { forSession };
