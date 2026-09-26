# Demo runbook

Tagline: git blame tells you who. Whyline tells you why.
Runtime: under 3 minutes. Reset between takes with `demo/reset.sh`. Everything shown comes from a real run on this demo repo.

Before every take: `cd ~/projects/whyline && npm test` green, `whyline --version` works, Bob IDE open on `~/projects/whyline-demo-shop` with the hackathon account, `demo/reset.sh` run.

## Act 1: the pain (0:00 to 0:20)
Screen: `git log --oneline` of the demo repo and `git blame src/payments/mock_gateway.py`.
Say: "Git tells you who wrote this mock and when. Nobody can tell you why it exists, or whether it was meant to stay. Faros measured 22,000 developers this year: pull requests merged with no review are up 31 percent. The agent that wrote the code forgets the reason the moment the task ends."

## Act 2: Bob writes, Whyline records (0:20 to 0:50)
Screen: Bob IDE, Agent mode, in the demo repo. Terminal 2 with `tail -f .git/whyline/session.jsonl`.
Type in Bob: `Add a small cart helper in src/shop/cart.py that returns the item count of an Order.`
What happens: Bob writes the file; the hook line appears in Terminal 2 with the exact line range and the prompt.
Then in the terminal: `git add . && git commit -m "cart helper (Bob)"` and `git log -1` shows the note under the commit.
Say: "A free lifecycle hook records exactly which lines Bob wrote and the prompt that caused them. On commit, that becomes a git note. Nothing to type, nothing to click, zero Bobcoins."

## Act 3: why (0:50 to 1:10)
Screen: `whyline why src/payments/checkout.py:2`
Say: "Weeks later, anyone can ask why. The prompt is the documentation. It also shows the item this line belongs to: a mock that was meant to go when payments-v2 lands."

## Act 4: the lifecycle, and Bob removes with approval (1:10 to 2:10)
Screen: `whyline check` (one item already due: the demo script nobody references). Then `git merge payments-v2`, the post-merge hook runs `whyline check`: the mock is now due.
Then in Bob IDE, Agent mode, a new task: type `remove the mock payment gateway`.
What happens: Bob runs `whyline check --json`, greps for the symbol, removes the ranges, runs pytest, shows the evidence table, asks for approval. Approve. Bob commits.
Say: "Whyline never guesses. The condition was recorded at birth: no references left. The merge made it true. Bob gathers the evidence, and a human approves. Nothing is deleted on its own."

## Act 5: what nobody reviewed (2:10 to 2:35)
Screen: `whyline unreviewed`, then `whyline session-start` to show what Bob is told at the start of a session.
Say: "For the lead: AI lines no human has edited since they were written, with test coverage where a report exists. Bob is told about it at the start of every session."

## Act 6: the bill of materials and the report (2:35 to 3:00)
Screen: `whyline bom` (the demo has no tags, so this covers the whole history) and the report page.
Say: "For the release manager: how much of this release is AI, how much was reviewed, what temporary code shipped, what it cost. It ships as Bob hooks and skills. With enforced hooks an organisation makes provenance mandatory. Speed with control."

## Reset
`demo/reset.sh` rebuilds `~/projects/whyline-demo-shop` from scratch. Bob's own task history is not touched.
