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

## Atiq

| task | what | Bobcoins | screenshot |
|---|---|---|---|
| B task01 | bom lens first implementation (cli/lib/bom.js, run and format; 35/35 tests green) | 0.605 | whyline_b_task01_bom.png |
| B task02 | report template wiring (cli/lib/report.js, report-template.html from the mockup, report.test.js; 41/41 tests green; same Bob thread as task01, badge 2.36 minus 0.605) | 1.755 | whyline_b_task02_report.png |
| B task03 | whyline-status skill (cli/lib/agents/bob/assets/skills/whyline-status/SKILL.md; 45/45 tests green; same Bob thread, badge 3.21 minus 2.36) | 0.85 | whyline_b_task03_status.png |
| B task04 | Why view as the mockup's code viewer: file map, blame-backed code, line detail with prompt and item (cli/lib/report-template.html; 49/49 tests green; same Bob thread, badge 7.45 minus 3.21) | 4.24 | whyline_b_task04_why_viewer.png |
| B task05 | Overview panels from the mockup: temporary code by kind, AI share by folder, last removal (cli/lib/report-template.html; 53/53 tests green; same Bob thread, badge 9.19 minus 7.45) | 1.74 | whyline_b_task05_overview_panels.png |

## Totals

Faisal: 6.56 · Atiq: 3.21 · team: 9.77 of 80.
