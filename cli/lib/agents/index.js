'use strict';
// Adapter registry. One folder per agent under cli/lib/agents/<id>/ exporting the adapter contract below.
// Adding an agent: create the folder, implement the contract, add one line to REGISTRY, add a fixture test.
//
// Adapter contract (see docs/08-adapters.md):
//   id            'bob' | 'claude-code' | ...
//   name          display name
//   matches(p)    true when a raw hook payload came from this agent (used when --agent is absent)
//   parseEvent(p) raw payload -> normalized event or null:
//                   { type: 'prompt',  session, prompt, cwd }
//                   { type: 'write',   session, tool, file, patch, cwd }   file absolute or repo-relative; patch: unified diff text or ''
//                   { type: 'session-start' | 'stop', session, cwd }
//   install(root) write this agent's config into the repo; returns [written paths]
//   installedIn(root) true when its config is present (used by `init` summary and tests)
//   sessionCost(session) Bobcoins/dollars for a session id, or null
//   isWholeFileTool(tool) true when the tool rewrites the entire file (ranges = whole file)

const REGISTRY = [
  require('./bob'),
];

function all() { return REGISTRY; }
function byId(id) { return REGISTRY.find(a => a.id === id) || null; }
function detect(payload) { return REGISTRY.find(a => a.matches(payload)) || null; }

module.exports = { all, byId, detect };
