#!/usr/bin/env node
/**
 * Record every step of a figure as a GIF, for a README.
 *
 *   node scripts/gif.mjs <figure> [<figure> …] --out <dir> [--width 1200] [--fps 24] [--lossy 30]
 *
 * Frames come from Chrome's own compositor as lossless PNGs (a screencast), not from a lossy video,
 * so everything that does not move stays pixel-identical between frames and the GIF only stores
 * what changed. That is what keeps a 20-second clip of a flat diagram small and sharp.
 *
 * Needs Chrome, ffmpeg and gifsicle on PATH.
 */
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const OUT = resolve(opt('--out', join(root, 'gifs')));
const WIDTH = Number(opt('--width', 1200));
const FPS = Number(opt('--fps', 24));
const LOSSY = Number(opt('--lossy', 30));
const figures = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const HOLD = 1.6; // seconds the last frame stays up before the GIF loops

/** Resolves when the step's progress line is full (or has wrapped around, i.e. the step looped). */
const waitForStep = (page) =>
  page.evaluate(async () => {
    const width = () => {
      const bar = document.querySelector('[role=tab][aria-selected=true] div');
      return bar ? parseFloat(bar.style.transform.slice(7)) || 0 : 0;
    };
    let prev = 0;
    for (let waited = 0; waited < 120_000; waited += 40) {
      const now = width();
      if (now > 0.995 || (prev > 0.5 && now < prev - 0.2)) return;
      prev = now;
      await new Promise((r) => setTimeout(r, 40));
    }
    throw new Error('the step never finished');
  });

const server = await createServer({ root, server: { port: 0 }, logLevel: 'warn' });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch({ channel: 'chrome' });
await mkdir(OUT, { recursive: true });

try {
  for (const figure of figures) {
    const url = `${base}/?export#${figure}`;
    // Measure the figure once, so every frame is exactly the figure and nothing else.
    const probe = await browser.newPage({ viewport: { width: 1800, height: 1400 } });
    await probe.goto(url);
    const steps = await probe.evaluate(() => window.exportSteps);
    await probe.evaluate(() => window.startExport(0));
    await probe.waitForSelector('.whyline-flow');
    await probe.waitForTimeout(500);
    const box = await probe.evaluate(() => {
      const r = document.querySelector('#root > div').getBoundingClientRect();
      return { width: 2 * Math.ceil(r.width / 2), height: 2 * Math.ceil(r.height / 2) };
    });
    await probe.close();

    for (const [i, label] of steps.entries()) {
      const name = `${figure}-${slug(label)}`;
      const tmp = join(OUT, `.frames-${name}`);
      await rm(tmp, { recursive: true, force: true });
      await mkdir(tmp, { recursive: true });

      const page = await browser.newPage({ viewport: box });
      await page.goto(url);
      const cdp = await page.context().newCDPSession(page);
      const frames = [];
      cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
        frames.push({ data, t: metadata.timestamp });
        cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      });
      await page.evaluate((n) => window.startExport(n), i);
      await page.waitForSelector('.whyline-flow');
      await page.waitForTimeout(300); // let the first layout and edge routing settle
      // Crop to the figure's frame plus a small margin: no empty page around it.
      const crop = await page.evaluate(() => {
        const r = document.querySelector('figure.whyline-flow').getBoundingClientRect();
        const m = 12;
        const x = Math.max(0, Math.floor(r.left - m)),
          y = Math.max(0, Math.floor(r.top - m));
        const w = Math.min(innerWidth - x, Math.ceil(r.width + 2 * m)),
          h = Math.min(innerHeight - y, Math.ceil(r.height + 2 * m));
        return { x, y, w: w - (w % 2), h: h - (h % 2) };
      });
      await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
      await waitForStep(page);
      await page.waitForTimeout(400);
      await cdp.send('Page.stopScreencast');
      await page.close();

      // Frames arrive only when something repaints: each one lasts until the next.
      const list = [];
      for (const [k, f] of frames.entries()) {
        const file = join(tmp, `${String(k).padStart(5, '0')}.png`);
        await writeFile(file, Buffer.from(f.data, 'base64'));
        const next = frames[k + 1];
        const dur = next ? Math.max(0.001, next.t - f.t) : HOLD;
        list.push(`file '${file}'`, `duration ${dur.toFixed(4)}`);
      }
      list.push(`file '${join(tmp, `${String(frames.length - 1).padStart(5, '0')}.png`)}'`); // concat needs the last file twice
      await writeFile(join(tmp, 'list.txt'), list.join('\n'));

      const gif = join(OUT, `${name}.gif`);
      await run('ffmpeg', [
        '-y',
        '-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'),
        '-vf',
        `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},fps=${FPS},scale=${WIDTH}:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`,
        '-loop', '0',
        gif,
      ]);
      await run('gifsicle', ['-O3', `--lossy=${LOSSY}`, '-b', gif]);
      await rm(tmp, { recursive: true, force: true });
      console.log(`${gif}  (${frames.length} frames captured)`);
    }
  }
} finally {
  await browser.close();
  await server.close();
}
