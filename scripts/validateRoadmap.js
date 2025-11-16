const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'artifacts', 'ROADMAP.json');
const s = fs.readFileSync(file, 'utf8');
try {
  JSON.parse(s);
  console.log('OK');
} catch (e) {
  console.log(e.message);
  // Try to extract position if present
  const m = (e && e.message && e.message.match(/position (\\d+)/)) || null;
  if (m) {
    const p = Number(m[1]);
    const start = Math.max(0, p - 120);
    const end = Math.min(s.length, p + 120);
    console.log('--- context ---');
    console.log(s.slice(start, end));
    console.log('^'.padStart(Math.max(1, p - start)));
  }
  process.exit(1);
}


