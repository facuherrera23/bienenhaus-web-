const fs = require('fs');
let content = fs.readFileSync('src/content.js', 'utf8');

// Fix renderHeroCtaPrimario
content = content.replace(
  'el.innerHTML = `<i class="fas fa-search</i> ${value}`;',
  'el.innerHTML = `<i class="fas fa-search" aria-hidden="true</i> ${escapeHtml(String(value))}`;'
);

// Fix renderHeroCtaSecundario
content = content.replace(
  'el.innerHTML = `<i class="fas fa-comment-dots</i> ${value}`;',
  'el.innerHTML = `<i class="fas fa-comment-dots" aria-hidden="true</i> ${escapeHtml(String(value))}`;'
);

// Fix renderHeroStats - valor
content = content.replace(
  '${stat.valor || stat.valor === 0 ? stat.valor : '—'}',
  '${escapeHtml(String(stat.valor ?? "—"))}'
);

// Fix renderHeroStats - label
content = content.replace(
  '${stat.label || \'\'}',
  '${escapeHtml(String(stat.label ?? ""))}'
);

fs.writeFileSync('src/content.js', content);
console.log('Fixed CTA and Stats renderers');