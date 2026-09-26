# Bobcoin log

One row per Bob IDE task. Each developer edits only their own section, so parallel commits never conflict.
Cost is the task's own figure from its task summary (click New task before each task so the badge is not a running total).

## Faisal

| task | what | Bobcoins | screenshot |
|---|---|---|---|
| A task01 | cart module in the demo shop; proved hooks, note and cost from Bob IDE 2.2 (21.3k context tokens) | 0.768 | whyline_a_task01_cart.png |
| A task02 | whyline-why skill (cli/lib/agents/bob/assets/skills/whyline-why/SKILL.md) plus init test; one thread with tasks 03 to 05, badge 1.18 | 1.18 | whyline_a_task02_why_skill.png |
| A task03 | whyline-decide skill (keep, until, watch in plain words, never guesses an id); badge 1.67 minus 1.18 | 0.49 | whyline_a_task03_manage_skill.png |
| A task04 | whyline-setup skill (user-invocable, checks the binary, runs init, tells what to commit); badge 2.35 minus 1.67 | 0.68 | whyline_a_task04_setup_skill.png |
| A task05 | dogfood: whyline installed on whyline itself, used on Bob's own work, 5 issues reported (see docs/04 section 11); badge 5.79 minus 2.35 | 3.44 | whyline_a_task05_dogfood.png |
| A task06 | removal take in the whyline-remover mode on the demo shop: evidence, dry run, approval, commit bdf52fd, item recorded removed; new task, cost from Bob's database | 0.687 | whyline_a_task06_removal.png |
| A task07 | removal in plain Agent mode via the whyline-remove skill (no custom mode): "remove the mock payment gateway", evidence, approval, commit 75b84b6, item recorded removed; new task | 0.794 | whyline_a_task07_removal_skill.png |
| A tasks02-05 | the task session summary panel (Task, Context Length, Task Id, Workspace, Bobcoins) of the shared thread behind tasks 02 to 05: 67.7k of 270k context tokens; per-task costs above come from the badge deltas and Bob's task database (5.786 total) | (sum of rows above) | whyline_a_tasks02-05_thread_summary.png |

## Atiq

| task | what | Bobcoins | screenshot |
|---|---|---|---|
| B task01 | bom lens first implementation (cli/lib/bom.js, run and format; 35/35 tests green) | 0.605 | whyline_b_task01_bom.png |
| B task02 | report template wiring (cli/lib/report.js, report-template.html from the mockup, report.test.js; 41/41 tests green; same Bob thread as task01, badge 2.36 minus 0.605) | 1.755 | whyline_b_task02_report.png |
| B task03 | whyline-status skill (cli/lib/agents/bob/assets/skills/whyline-status/SKILL.md; 45/45 tests green; same Bob thread, badge 3.21 minus 2.36) | 0.85 | whyline_b_task03_status.png |
| B task04 | Why view as the mockup's code viewer: file map, blame-backed code, line detail with prompt and item (cli/lib/report-template.html; 49/49 tests green; same Bob thread, badge 7.45 minus 3.21) | 4.24 | whyline_b_task04_why_viewer.png |
| B task05 | Overview panels from the mockup: temporary code by kind, AI share by folder, last removal (cli/lib/report-template.html; 53/53 tests green; same Bob thread, badge 9.19 minus 7.45) | 1.74 | whyline_b_task05_overview_panels.png |
| B task06 | report usable by keyboard and screen reader: focusable code lines with arrow keys, aria-current, aria-pressed, aria-live detail, focus outlines (cli/lib/report-template.html; 54/54 tests green; same Bob thread, badge 11.63 minus 9.19) | 2.44 | whyline_b_task06_keyboard_a11y.png |
| B task07 | GitHub Pages workflow that builds the demo shop, merges payments-v2 and publishes its report (.github/workflows/pages.yml; ran the steps locally, 54K page; same Bob thread at 180k context, badge 16.89 minus 11.63) | 5.26 | whyline_b_task07_pages.png |
| B tasks01-07 | the shared thread behind tasks 01 to 07: 180.3k of 270k context tokens, badge 16.89 (the sum of the rows above); context breakdown screenshot | (sum above) | whyline_b_tasks01-07_thread_summary.png |
| B task08 | Bob code review of bom.js, report.js, report-template.html: 9 findings, 2 real (overview showed "no data" for a real zero) fixed with a test, 7 explained as not bugs; first task in a new thread (72.5k context) | 4.22 | whyline_b_task08_review.png |
| B task09 | Whyline used from Bob in the demo shop: a plain question loaded the whyline-status skill, which ran whyline unreviewed, bom and report; answers matched the CLI (47 unreviewed lines in 12 files; 59 of 93 lines AI, 2 due at that build); report opened in Bob's browser (new thread, 17.9k context) | 0.132 | whyline_b_task09_status_1_skill_approval.png to _4_answer.png, whyline_b_task09_report_overview.png, _why.png, _expiry.png |

## Totals

Faisal: 8.04 · Atiq: 21.11 · team: 29.15 of 80 (the "B tasks01-07" row is a thread summary, not added twice).
