import { createRoot } from 'react-dom/client';
import { Story } from './story';
import { ExportPage } from './export';
import type { Figure } from '../src';

const params = new URLSearchParams(location.search);
const root = createRoot(document.getElementById('root')!);

if (params.has('export')) {
  // scripts/gif.mjs drives this: ?export#<figure file name>, one figure alone, one step at a time.
  const slug = decodeURIComponent(location.hash.slice(1));
  const figures = import.meta.glob<{ default: Figure }>('../figures/*.ts', { eager: true });
  const entry = Object.entries(figures).find(([path]) => path.endsWith(`/${slug}.ts`));
  if (!entry) throw new Error(`no figure named ${slug}`);
  root.render(<ExportPage figure={entry[1].default} dark={params.has('dark')} />);
} else {
  root.render(<Story />);
}
