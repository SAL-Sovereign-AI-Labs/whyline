# Whyline architecture

The source of the animated architecture figures in the main README: an interactive page and the recorder that turns it into GIFs. It is not part of the npm package and the CLI does not depend on it.

```sh
cd architecture
npm install
npm run dev      # the interactive page: tabs, hover, full screen, 0.5× / 1× / 2×
npm run gifs     # re-record docs/figures/*.gif (needs Chrome, ffmpeg and gifsicle)
```

| Path | What it is |
|---|---|
| `figures/whyline-1-editor.ts` | Figure 1, "In your editor": record, commit, why, lifecycle, remove |
| `figures/whyline-2-team.ts` | Figure 2, "Across the team": share, CI gate, dashboard, team tier |
| `src/` | The player: lays out the boxes, routes the arrows, plays each chapter as packets moving along them |
| `app/story.tsx` | The page: the idea in one screen, then both figures |
| `scripts/gif.mjs` | Records each chapter from Chrome's compositor as lossless frames, then one GIF per chapter |

A figure is plain data: boxes and groups in `layout`, arrows in `edges`, and chapters in `steps`, each a list of beats (`edges` to animate, `show` to fill a box's card, `say` for the caption). Edit a figure, check it with `npm run dev`, then `npm run gifs`.

The player is adapted from an MIT-licensed library; its notice is in [LICENSE-player](LICENSE-player).
