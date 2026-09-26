'use strict';
// Reads a coverage report if the repo has one: Cobertura coverage.xml (pytest-cov, istanbul) or lcov.info.
// Returns null when none exists ("no data"), else { files: Map<repoRelativePath, { covered:Set<line>, measured:Set<line> }> }.
const fs = require('node:fs');
const path = require('node:path');

const CANDIDATES = ['coverage.xml', 'coverage/coverage.xml', 'coverage/cobertura-coverage.xml', 'lcov.info', 'coverage/lcov.info'];

function load(root) {
  for (const rel of CANDIDATES) {
    const f = path.join(root, rel);
    if (!fs.existsSync(f)) continue;
    const text = fs.readFileSync(f, 'utf8');
    return { source: rel, files: rel.endsWith('.xml') ? parseCobertura(text) : parseLcov(text) };
  }
  return null;
}

function parseCobertura(xml) {
  const files = new Map();
  const classRe = /<class\b[^>]*filename="([^"]+)"[^>]*>([\s\S]*?)<\/class>/g;
  let m;
  while ((m = classRe.exec(xml))) {
    const file = m[1].replace(/\\/g, '/');
    const entry = files.get(file) || { covered: new Set(), measured: new Set() };
    const lineRe = /<line\b[^>]*number="(\d+)"[^>]*hits="(\d+)"/g;
    let l;
    while ((l = lineRe.exec(m[2]))) { entry.measured.add(+l[1]); if (+l[2] > 0) entry.covered.add(+l[1]); }
    files.set(file, entry);
  }
  return files;
}

function parseLcov(text) {
  const files = new Map();
  let cur = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('SF:')) { const f = line.slice(3).trim().replace(/\\/g, '/'); cur = files.get(f) || { covered: new Set(), measured: new Set() }; files.set(f, cur); }
    else if (line.startsWith('DA:') && cur) { const [n, hits] = line.slice(3).split(','); cur.measured.add(+n); if (+hits > 0) cur.covered.add(+n); }
    else if (line === 'end_of_record') cur = null;
  }
  return files;
}

// Coverage of specific lines in a file: {covered, measured} counts, or null when the file is not in the report.
function forLines(cov, file, lines) {
  if (!cov) return null;
  const entry = cov.files.get(file) || [...cov.files.entries()].find(([k]) => k.endsWith('/' + file) || file.endsWith('/' + k))?.[1];
  if (!entry) return null;
  let covered = 0, measured = 0;
  for (const n of lines) if (entry.measured.has(n)) { measured++; if (entry.covered.has(n)) covered++; }
  return { covered, measured };
}

module.exports = { load, forLines, parseCobertura, parseLcov };
