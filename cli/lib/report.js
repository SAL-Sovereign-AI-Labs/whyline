'use strict';
// render(data) -> self-contained HTML string. Reads report-template.html and injects
// the data as JSON assigned to window.WHYLINE_DATA. The '<' in strings is escaped to
// \u003c so a prompt containing </script> cannot break out of the script block.
const fs = require('node:fs');
const path = require('node:path');

const TEMPLATE = path.join(__dirname, 'report-template.html');

function render(data) {
  const tmpl = fs.readFileSync(TEMPLATE, 'utf8');
  // Escape '<' as \u003c to prevent </script> in string values from ending the block.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const injection = '<script>window.WHYLINE_DATA = ' + json + ';<\/script>';
  // function replacement: a prompt containing $& or $' must not be read as a replacement pattern
  return tmpl.replace('<script>', () => injection + '\n<script>');
}

module.exports = { render };
