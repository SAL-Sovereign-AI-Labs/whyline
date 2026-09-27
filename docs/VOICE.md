# How Whyline talks

One voice for every surface: README, CLI messages and help, Bob skills, the dashboard, the video, the submission, npm and GitHub descriptions. A reader starts with zero knowledge. Write for a working developer who has never heard of Whyline or IBM Bob.

## The promise (use these exact lines)

- Headline: **Know why your AI wrote every line, and clean up what it left behind.**
- Second line: `git blame` tells you who. Whyline tells you why.
- Who it is for: works with IBM Bob, IBM's AI coding assistant.
- Short description (one sentence): Whyline saves the request behind every line IBM Bob writes, right in your git history, and tells you when its temporary code is safe to delete.

## The problem (the reader's own words)

1. Your AI assistant writes a big share of your code, but the request behind each change lives in a chat that gets closed. Git keeps the code and loses the reason.
2. It also leaves throwaway code behind: a mock "until the real API lands", a demo script, a feature flag. It is meant to go, nothing reminds anyone, so it ships and stays.
3. And nobody can say which AI-written lines a person actually looked at.

## The one example (use it everywhere, same details)

Sara, a backend developer at a payments startup, finds a mock payment gateway in production. `git blame` says she committed it three weeks ago. Whyline shows the request she gave Bob ("a mock gateway so checkout works until payments-v2 lands"), that payments-v2 has now landed, and that nothing uses the mock any more. She asks Bob to remove it. Bob shows the proof, asks, she says yes, and it is gone.

## Words

| Do not say (to people) | Say |
|---|---|
| provenance, attribution, lineage | who wrote this, and why |
| prompt (on first use) | the request you gave Bob (after that, "request" or "prompt" is fine) |
| git notes, refs/notes/whyline, note | saved in your git history. Explain once: "a git note, extra data attached to the commit; your files are not touched" |
| ledger, record, evidence tiers | the history Whyline keeps |
| lifecycle hooks, SessionStart, UserPromptSubmit, PostToolUse, PreToolUse | small scripts Bob runs automatically: when you send a request, after Bob edits a file, before Bob runs a command, when a Bob chat starts |
| item, temporary item | temporary code |
| lifecycle, condition, state | expiry |
| active | waiting |
| due | ready to delete |
| kept | kept on purpose |
| removed | deleted |
| no references left, no_references | nothing uses it any more |
| date condition | after a date |
| gate, --gate | fail the pull request check |
| unreviewed | AI code no person has changed since |
| ai-edited | written by AI, then changed by a person |
| bill of materials, bom | AI report for a release |
| session | a Bob chat |
| skills | ask Bob in plain English (say "skills" only in the Bob section) |
| evidence table | proof it is safe to delete |
| guard | Bob cannot edit the history Whyline keeps |
| selftest, PROVEN | built-in self check |
| symbol | class or function name |
| siblings | other files the same request changed |
| Bobcoins | Bob usage credits (only in the Bob and hackathon sections) |
| Pedigree, judges, lablab | only in the hackathon section at the bottom |

## Rules

- Problem before solution. Example before mechanism. Mechanism before internals.
- Introduce IBM Bob on first use: "IBM Bob, IBM's AI coding assistant".
- Every sentence a developer would say out loud to a colleague. If it needs a glossary, rewrite it.
- Keep command names and JSON keys as they are (`whyline why`, `check`, `unreviewed`, `bom`; `due`, `active`, `items` in `--json`). They are the stable interface. Change only the words people read.
- No em dashes. Numbers only from real runs.
