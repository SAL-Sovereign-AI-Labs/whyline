# Whyline

Provenance for AI-written code. Every line keeps the prompt that caused it.

`git blame` tells you who. Whyline tells you why: the prompt, the session, the cost, the other files that
task touched, whether a human reviewed it, and whether the code was meant to be temporary.

Built for IBM Bob 2.0. Bob's free lifecycle hooks record every write; Whyline turns that into answers.

## Install in a repo

```sh
npm install -g whyline        # or: npx whyline init
cd your-repo
whyline init                  # writes .bob/ (hooks, a mode, skills) and git hooks
git add .bob && git commit -m "add whyline"
```

Then work in Bob as usual. Nothing new to type.

## Ask

```sh
whyline why src/payments/checkout.py:12   # who wrote it, and why
whyline check                             # temporary code that is due for removal
whyline keep L-787fa4 "kept: beta flag stays until Q1 review"
whyline until L-787fa4 2027-01-01
```

In Bob: `/whyline-check` lists due items, and the `whyline-remover` mode removes one with evidence and your approval.

## How it works

1. `UserPromptSubmit` and `PostToolUse` hooks record the prompt and the exact lines each write touched (`.git/whyline/session.jsonl`).
2. On commit, a git hook compares what the agent wrote with what was committed: `ai`, `ai-edited`, or human. It attaches one JSON note to the commit on `refs/notes/whyline`. Nothing lands in your working tree.
3. Writes that look temporary (mock, demo, flag, shim, fixture, "until ...") become items with a removal condition: a date, or "no references left".
4. `whyline check` evaluates the conditions. Removal happens in Bob, through its normal approval prompt.

Costs 0 Bobcoins. Hooks are deterministic; Bob is only used for removals.

## Develop

```sh
npm test                      # node:test, builds temp git repos
npm link                      # puts `whyline` on your PATH
```

Requires Node 20+ and git. Bob Shell 2.x or Bob IDE 2.2+.

## Status

Hackathon build (IBM Bob 2.0 Hackathon, 25 to 27 Sep 2026). See docs/ for the research, evidence and architecture.
