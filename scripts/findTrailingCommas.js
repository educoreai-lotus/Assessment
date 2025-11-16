const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'artifacts', 'ROADMAP.json');
const s = fs.readFileSync(file, 'utf8');

function findIssues(str) {
  const issues = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === ']') {
      // find previous non-whitespace char
      let j = i - 1;
      while (j >= 0 && /[\\s]/.test(str[j])) j--;
      if (j >= 0 && str[j] === ',') {
        issues.push({ pos: i, prevCommaAt: j, context: str.slice(Math.max(0, j - 80), Math.min(str.length, i + 80)) });
      }
    }
  }
  return issues;
}

const issues = findIssues(s);
if (issues.length === 0) {
  console.log('No trailing comma before ] found.');
  process.exit(0);
}
console.log('Found possible trailing commas before ] at positions:', issues.map(i => i.pos).join(', '));
for (const issue of issues.slice(0, 5)) {
  console.log('--- context ---');
  console.log(issue.context);
}
process.exit(issues.length > 0 ? 1 : 0);


