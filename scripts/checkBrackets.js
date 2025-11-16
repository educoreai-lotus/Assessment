const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'artifacts', 'ROADMAP.json');
const s = fs.readFileSync(file, 'utf8');

let inString = false;
let escape = false;
const stack = [];
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (inString) {
    if (escape) {
      escape = false;
    } else if (ch === '\\\\') {
      escape = true;
    } else if (ch === '\"') {
      inString = false;
    }
    continue;
  }
  if (ch === '\"') {
    inString = true;
    continue;
  }
  if (ch === '[' || ch === '{') {
    stack.push({ ch, pos: i });
  } else if (ch === ']' || ch === '}') {
    const last = stack.pop();
    if (!last || (ch === ']' && last.ch !== '[') || (ch === '}' && last.ch !== '{')) {
      const start = Math.max(0, i - 120);
      const end = Math.min(s.length, i + 120);
      console.log('Unmatched closing', ch, 'at', i);
      console.log('--- context ---');
      console.log(s.slice(start, end));
      process.exit(1);
    }
  }
}
if (inString) {
  console.log('Unterminated string detected');
  process.exit(1);
}
if (stack.length > 0) {
  console.log('Unclosed brackets/braces remain:', stack.slice(-5));
  const last = stack[stack.length - 1];
  const start = Math.max(0, last.pos - 120);
  const end = Math.min(s.length, last.pos + 120);
  console.log('--- context of last opened ---');
  console.log(s.slice(start, end));
  process.exit(1);
}
console.log('Brackets/braces balanced.');

