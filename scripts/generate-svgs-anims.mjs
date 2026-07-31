#!/usr/bin/env node
/**
 * Generate SVGs + Animations via NVIDIA API
 * Fast LLM generation (~3-5 min total)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'public', 'assets');
const MANIFEST_PATH = path.join(ASSETS_DIR, 'assets-manifest.json');

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local');
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valParts] = trimmed.split('=');
        if (key && valParts.length) process.env[key.trim()] = valParts.join('=').trim();
      }
    }
  } catch {}
}
loadEnv();

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
if (!NVIDIA_API_KEY) { console.error('❌ NVIDIA_API_KEY not set'); process.exit(1); }

const LLM_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const LLM_MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct';

const manifest = { generatedAt: new Date().toISOString(), images: {}, illustrations: {}, svgs: {}, animations: {} };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function callLLM(systemPrompt, userPrompt, maxTokens = 4096) {
  const payload = { model: LLM_MODEL, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: 0.1, max_tokens: maxTokens };
  const res = await fetch(LLM_ENDPOINT, { method: 'POST', headers: { 'Authorization': `Bearer ${NVIDIA_API_KEY}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim();
}

async function generateSVG(prompt) {
  const systemPrompt = `Expert SVG icon designer. Output ONLY valid SVG code. Strict rules:
- ViewBox: "0 0 24 24"
- stroke: currentColor
- stroke-width: 1.5
- stroke-linecap: round
- stroke-linejoin: round
- fill: none (outline style only)
- NO gradients, NO filters, NO animations, NO fills
- Single <svg> root with xmlns="http://www.w3.org/2000/svg"
- Geometrically precise, optically balanced, Lucide-inspired aesthetic
- No markdown, no explanation, no comments`;
  const content = await callLLM(systemPrompt, prompt, 2048);
  const match = content.match(/<svg[\s\S]*<\/svg>/i);
  if (!match) throw new Error('No valid SVG tag');
  return match[0];
}

async function generateLottie(prompt) {
  const systemPrompt = `Expert Lottie animation creator. Output ONLY valid JSON. Rules:
- 30fps, duration per spec
- Shape layers ONLY (no images, no precomps)
- Transform animations only: position, scale, rotation, opacity
- Easing: easeOutCubic (cubic-bezier(0.33, 1, 0.68, 1))
- Viewport: 300x300
- Colors HARDCODED in JSON: #20B8AB (primary), #17A094 (hover), #5FD7CD (light), #56E7DE (glow), #0F5F63 (dark accent)
- Loop per spec
- Reduced motion safe: opacity/transform only, NO scale(0) starts
- No markdown`;
  const content = await callLLM(systemPrompt, prompt, 4096);
  try { return JSON.parse(content); } catch { const m = content.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('Invalid JSON'); }
}

async function ensureDir(dir) { await fs.promises.mkdir(dir, { recursive: true }); }
function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 80); }
async function writeManifest() { await fs.promises.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2)); console.log(`\n📋 Manifest: ${path.relative(ROOT, MANIFEST_PATH)}`); }

// ===== SVGs (14) =====
const SVGS = [
  // Navigation (4)
  { cat: 'navigation', name: 'chevron-left', prompt: 'chevron-left: simple left-pointing chevron, two strokes forming arrow' },
  { cat: 'navigation', name: 'chevron-right', prompt: 'chevron-right: simple right-pointing chevron, two strokes forming arrow' },
  { cat: 'navigation', name: 'menu', prompt: 'menu: three horizontal lines (hamburger), equal spacing, 24x24 centered' },
  { cat: 'navigation', name: 'close', prompt: 'close: X mark, two crossing strokes, 24x24 centered' },
  // Property (6)
  { cat: 'property', name: 'house', prompt: 'house: standalone house icon, roof triangle + square base, door, window, clean silhouette' },
  { cat: 'property', name: 'building', prompt: 'building: multi-story apartment building, multiple windows aligned in grid, entrance' },
  { cat: 'property', name: 'key', prompt: 'key: traditional key shape, bow head, blade, teeth, symbolic access' },
  { cat: 'property', name: 'door', prompt: 'door: entry door with handle, slight ajar negative space, welcoming' },
  { cat: 'property', name: 'window', prompt: 'window: four-pane window cross mullion, clean architectural' },
  { cat: 'property', name: 'floor-plan', prompt: 'floor-plan: simplified floor plan walls with door swing arcs, clean geometric' },
  // UI (4)
  { cat: 'ui', name: 'heart', prompt: 'heart: outline heart shape, favorites/wishlist' },
  { cat: 'ui', name: 'star', prompt: 'star: five-point star outline, featured/rating' },
  { cat: 'ui', name: 'share', prompt: 'share: three connected dots with lines, sharing action' },
  { cat: 'ui', name: 'map-pin', prompt: 'map-pin: location marker tear drop, property location' },
];

// ===== Animations (4) =====
const ANIMS = [
  { name: 'hero-float', prompt: 'hero-float: house icon gentle vertical float (0 to -8px to 0), 3s easeInOutSine loop, subtle breathing motion. 90 frames (3s), loop true.' },
  { name: 'card-hover-lift', prompt: 'card-hover-lift: card shape translateY(0 to -4px) with shadow scale(1 to 1.02), 300ms easeOutCubic, reverse on out. 9 frames (300ms), loop false, single play.' },
  { name: 'skeleton-shimmer', prompt: 'skeleton-shimmer: left-to-right gradient sweep across card placeholder, 1.5s linear infinite, reduced motion = static. 45 frames (1.5s), loop true.' },
  { name: 'heart-beat', prompt: 'heart-beat: heart icon scale(1 to 1.2 to 1) on favorite toggle, 400ms easeOutBack, single play. 12 frames (400ms), loop false. Scale sequence: 1 -> 1.2 -> 1 -> 1.15 -> 1' },
];

async function main() {
  console.log('🚀 Generating SVGs (14) + Animations (4) via API...');
  console.log(`📁 Output: ${ASSETS_DIR}`);
  const start = Date.now();

  // SVGs
  console.log('\n📐 Generating SVGs...');
  await ensureDir(path.join(ASSETS_DIR, 'svg'));
  for (const item of SVGS) {
    const dir = path.join(ASSETS_DIR, 'svg', item.cat);
    await ensureDir(dir);
    const outputPath = path.join(dir, `${item.name}.svg`);
    try {
      console.log(`  🔄 ${item.cat}/${item.name}.svg...`);
      const svg = await generateSVG(`${item.prompt}. Style: SVG icons, 24x24 viewBox, 1.5px stroke, stroke-linecap round, stroke-linejoin round, currentColor strokes, no fills, outline style, Lucide-inspired.`);
      await fs.promises.writeFile(outputPath, svg);
      const stats = await fs.promises.stat(outputPath);
      if (!manifest.svgs[item.cat]) manifest.svgs[item.cat] = [];
      manifest.svgs[item.cat].push({ file: path.relative(ASSETS_DIR, outputPath), size: stats.size });
      console.log(`  ✅ ${item.cat}/${item.name}.svg`);
    } catch (e) {
      console.error(`  ❌ ${item.cat}/${item.name}: ${e.message}`);
    }
  }

  // Animations
  console.log('\n✨ Generating animations...');
  await ensureDir(path.join(ASSETS_DIR, 'animations'));
  for (const item of ANIMS) {
    const outputPath = path.join(ASSETS_DIR, 'animations', `${item.name}.json`);
    try {
      console.log(`  🔄 ${item.name}.json...`);
      const lottie = await generateLottie(`${item.prompt}. Style: Lottie JSON, 30fps, 300x300 viewport, shape layers only, transform animations only, easeOutCubic easing, colors: #20B8AB (primary), #17A094 (hover), #5FD7CD (light), #56E7DE (glow), #0F5F63 (dark accent). Output ONLY valid JSON.`);
      await fs.promises.writeFile(outputPath, JSON.stringify(lottie, null, 2));
      const stats = await fs.promises.stat(outputPath);
      if (!manifest.animations.general) manifest.animations.general = [];
      manifest.animations.general.push({ file: path.relative(ASSETS_DIR, outputPath), size: stats.size });
      console.log(`  ✅ ${item.name}.json`);
    } catch (e) {
      console.error(`  ❌ ${item.name}: ${e.message}`);
    }
  }

  // Add existing hero to manifest
  const heroPath = path.join(ASSETS_DIR, 'images', 'hero', 'hero-main.webp');
  try {
    const stats = await fs.promises.stat(heroPath);
    manifest.images.hero = [{ file: 'images/hero/hero-main.webp', size: stats.size, resolution: '1344x768' }];
  } catch {}

  await writeManifest();
  const elapsed = ((Date.now() - start) / 60000).toFixed(1);
  console.log(`\n✨ Done in ${elapsed} min`);
  console.log(`📊 SVGs: ${Object.values(manifest.svgs).flat().length} | Animations: ${Object.values(manifest.animations).flat().length} | Hero: ${manifest.images.hero?.length || 0}`);
}

main().catch(e => { console.error('\n💥 Fatal:', e); process.exit(1); });