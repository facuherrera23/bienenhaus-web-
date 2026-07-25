const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\facuh\\OneDrive\\Escritorio\\Mis Proyectos\\Landing Page\\bienenhaus\\src\\admin-app.ts', 'utf8');
let braces = 0;
let parens = 0;
let brackets = 0;
let inString = false;
let stringChar = '';
let escaped = false;

for (let i = 0; i < content.length; i++) {
  const c = content[i];
  const next = content[i+1];
  
  if (inString) {
    if (escaped) {
      escaped = false;
    } else if (c === '\\') {
      escaped = true;
    } else if (c === stringChar) {
      inString = false;
    }
    continue;
  }
  
  if (c === '"' || c === "'" || c === '`') {
    inString = true;
    stringChar = c;
    continue;
  }
  
  if (c === '{') braces++;
  else if (c === '}') braces--;
  else if (c === '(') parens++;
  else if (c === ')') parens--;
  else if (c === '[') brackets++;
  else if (c === ']') brackets--;
  
  if (braces < 0) {
    console.log('Negative braces at', i, content.slice(Math.max(0,i-20), i+20));
    break;
  }
  if (parens < 0) {
    console.log('Negative parens at', i, content.slice(Math.max(0,i-20), i+20));
    break;
  }
  if (brackets < 0) {
    console.log('Negative brackets at', i, content.slice(Math.max(0,i-20), i+20));
    break;
  }
}

console.log('Final braces:', braces);
console.log('Final parens:', parens);
console.log('Final brackets:', brackets);