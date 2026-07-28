const fs = require('fs');
const path = require('path');
const file = process.argv[2];
const content = fs.readFileSync(file, 'utf8');
let inString = null, inComment = false, inRegex = false;
let depth = { '{': 0, '(': 0, '[': 0 };
let line = 1, col = 0;
let lastDepths = [];
for (let i = 0; i < content.length; i++) {
  const c = content[i];
  const c2 = content[i+1] || '';
  col++;
  if (c === '\n') { line++; col = 0; }
  if (inComment) {
    if (c === '*' && c2 === '/') { inComment = false; i++; col++; }
    continue;
  }
  if (inString) {
    if (c === '\\') { i++; col++; continue; }
    if (c === inString) inString = null;
    continue;
  }
  if (inRegex) {
    if (c === '\\') { i++; col++; continue; }
    if (c === '/') inRegex = false;
    continue;
  }
  if (c === '/' && c2 === '/') { while (i < content.length && content[i] !== '\n') i++; continue; }
  if (c === '/' && c2 === '*') { inComment = true; i++; col++; continue; }
  if (c === '/' ) { inRegex = true; continue; }
  if (c === '"' || c === "'" || c === '`') { inString = c; continue; }
  if (c === '{') depth['{']++;
  if (c === '}') depth['{']--;
  if (c === '(') depth['(']++;
  if (c === ')') depth['(']--;
  if (c === '[') depth['[']++;
  if (c === ']') depth['[']--;
}
console.log('Final depths:', depth);
console.log('Line:', line, 'Col:', col);