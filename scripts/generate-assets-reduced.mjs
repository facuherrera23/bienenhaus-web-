#!/usr/bin/env node
/**
 * Reduced Asset Generation - ~40 priority items only
 * Runs in ~15-20 minutes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

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
if (!NVIDIA_API_KEY) {
  console.error('❌ NVIDIA_API_KEY not set');
  process.exit(1);
}

const FLUX_ENDPOINT = 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell';
const LLM_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const LLM_MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct';

const RESOLUTIONS = {
  '1344x768': { width: 1344, height: 768 },
  '1152x896': { width: 1152, height: 896 },
  '768x1344': { width: 768, height: 1344 },
  '1024x1024': { width: 1024, height: 1024 },
};

const MAX_RETRIES = 2;
const BASE_DELAY = 1500;
const CONCURRENCY = 2;

const manifest = {
  generatedAt: new Date().toISOString(),
  images: {},
  illustrations: {},
  svgs: {},
  animations: {}
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function withRetry(fn, retries = MAX_RETRIES, delay = BASE_DELAY) {
  return fn().catch(err => {
    if (retries <= 0) throw err;
    console.log(`  ⚠️  Retry in ${delay}ms... (${retries} left)`);
    return sleep(delay).then(() => withRetry(fn, retries - 1, delay * 1.5));
  });
}

async function callNvidiaAPI(endpoint, payload, isLLM = false) {
  const headers = {
    'Authorization': `Bearer ${NVIDIA_API_KEY}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
    return await response.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Request timeout (180s)');
    throw err;
  }
}

async function generateImage(prompt, negativePrompt, resolution, seed) {
  const { width, height } = RESOLUTIONS[resolution] || RESOLUTIONS['1024x1024'];
  const payload = { prompt, width, height, steps: 4, seed };
  const data = await callNvidiaAPI(FLUX_ENDPOINT, payload);
  const base64 = data.artifacts?.[0]?.base64;
  if (!base64) throw new Error('No image data');
  return Buffer.from(base64, 'base64');
}

async function generateSVG(prompt) {
  const systemPrompt = `Expert SVG icon designer. ViewBox: "0 0 24 24", stroke: currentColor, stroke-width: 1.5, stroke-linecap: round, stroke-linejoin: round, fill: none. No gradients/filters. Single <svg> root. Output ONLY SVG code.`;
  const payload = { model: LLM_MODEL, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], temperature: 0.1, max_tokens: 2048 };
  const data = await callNvidiaAPI(LLM_ENDPOINT, payload, true);
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('No SVG content');
  const match = content.match(/<svg[\s\S]*<\/svg>/i);
  if (!match) throw new Error('No valid SVG tag');
  return match[0];
}

async function generateLottie(prompt) {
  const systemPrompt = `Expert Lottie creator. 30fps, 60-90 frames, shape layers only, transform animations only, easeOutCubic, 300x300 viewport. Colors: terracotta #C66B3D, sage #7A9E7E, gold #D4A843. Output ONLY valid JSON.`;
  const payload = { model: LLM_MODEL, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], temperature: 0.2, max_tokens: 4096 };
  const data = await callNvidiaAPI(LLM_ENDPOINT, payload, true);
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('No Lottie content');
  try { return JSON.parse(content); } catch { const m = content.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('Invalid JSON'); }
}

async function optimizeImage(inputBuffer, outputPath, quality = 80) {
  return new Promise((resolve, reject) => {
    const sharp = spawn('npx', ['sharp', '-i', '-', '-o', outputPath, 'webp', `--quality=${quality}`], { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
    sharp.stdin.write(inputBuffer); sharp.stdin.end();
    let stderr = ''; sharp.stderr.on('data', d => stderr += d.toString());
    sharp.on('close', code => code === 0 ? resolve() : reject(new Error(`sharp: ${stderr}`)));
  });
}

async function optimizeSVG(svgString, outputPath) {
  return new Promise((resolve, reject) => {
    const svgo = spawn('npx', ['svgo', '--input=-', '--output', outputPath, '--multipass'], { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
    svgo.stdin.write(svgString); svgo.stdin.end();
    let stderr = ''; svgo.stderr.on('data', d => stderr += d.toString());
    svgo.on('close', code => code === 0 ? resolve() : reject(new Error(`svgo: ${stderr}`)));
  });
}

function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 80); }
async function ensureDir(dir) { await fs.promises.mkdir(dir, { recursive: true }); }
async function fileExists(p) { try { await fs.promises.access(p); return true; } catch { return false; } }

async function processQueue(items, processor, label) {
  const results = []; const queue = [...items];
  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift(); if (!item) continue;
      const { name, outputPath, skipIfExists = true } = item;
      if (skipIfExists && await fileExists(outputPath)) { console.log(`  ⏭️  ${name} (exists)`); results.push({ ...item, status: 'skipped', path: outputPath }); continue; }
      try { console.log(`  🔄 ${name}...`); const result = await withRetry(() => processor(item)); console.log(`  ✅ ${name}`); results.push({ ...item, status: 'success', path: outputPath, ...result }); }
      catch (err) { console.error(`  ❌ ${name}: ${err.message}`); results.push({ ...item, status: 'failed', error: err.message }); }
    }
  }
  await Promise.all(Array(Math.min(CONCURRENCY, items.length)).fill(null).map(() => worker()));
  return results;
}

// ===== REDUCED DATA SETS =====

const PHOTO_STYLE = "warm natural golden hour light, premium modern architecture, earthy beige terracotta sage palette, editorial real estate photography, architectural digest aesthetic, no people, no text, no watermarks, no cars, immaculate landscaping, high dynamic range, 8k detail, photorealistic, Canon R5 24mm f1.4 style";
const PHOTO_NEG = "people, text, watermarks, logos, cars, clutter, overexposed, underexposed, blurry, low quality, cartoon, illustration, painting, sketch, ugly, deformed, noisy, grainy, dark, gloomy, cold blue tones";

const PHOTOS = [
  // Hero: 3 (was 5)
  { cat: 'hero', resolution: '1344x768', prompts: [
    "stunning modern villa exterior at golden hour, floor-to-ceiling glass walls reflecting warm sunset, infinity pool mirroring sky, manicured mediterranean garden with olive trees and lavender, architectural masterpiece, aerial perspective",
    "luxury penthouse terrace at sunset, panoramic city skyline view, sleek glass railing, designer outdoor furniture with neutral linen cushions, string lights overhead, sophisticated urban living, wide angle",
    "contemporary beach house at golden hour, elevated on stilts, weathered wood cladding, expansive deck with built-in seating, ocean horizon stretching to infinity, serene coastal luxury, drone perspective"
  ]},
  // Properties exterior: 5 (was 25)
  { cat: 'properties_exterior', resolution: '1152x896', prompts: [
    "modern two-story family home, clean white stucco, black window frames, landscaped front yard with native grasses, welcoming entry, bright mid-morning light",
    "scandinavian-inspired cabin, light timber cladding, large picture windows, stone foundation, pine forest backdrop, cozy hygge atmosphere, diffused northern light",
    "mediterranean villa, terracotta roof, arched loggias, bougainvillea climbing walls, courtyard fountain, old-world charm modern comfort, warm southern light",
    "japanese-inspired residence, shou sugi ban charred wood, shoji screens, engawa veranda, koi pond, maple trees, serene minimalism, misty morning light",
    "courtyard house, inward-facing rooms around central garden, privacy walls, fountain centerpiece, indoor-outdoor rooms, sanctuary in city, soft filtered light"
  ]},
  // Properties interior: 5 (was 25)
  { cat: 'properties_interior', resolution: '1152x896', prompts: [
    "open concept living room, double-height ceiling, floor-to-ceiling windows, designer sectional in warm neutral, sculptural coffee table, statement lighting, curated art, warm ambient glow",
    "gourmet kitchen, waterfall quartz island, professional range, integrated panel-ready appliances, walk-in pantry visible, pendant lights, herbs on sill, bright functional beauty",
    "primary suite retreat, sitting area with fireplace, private balcony access, custom built-ins, neutral linen bedding, layered textures, sanctuary atmosphere, soft morning light",
    "spa bathroom, freestanding soaking tub with view, frameless glass shower, dual vanity, natural stone slab walls, heated floors, candlelight serenity, golden hour",
    "indoor-outdoor living room, disappearing glass walls, matched flooring continues to patio, outdoor kitchen visible, seamless flow, entertaining dream, sunset glow"
  ]},
  // Agents: 3 (was 10)
  { cat: 'agents', resolution: '768x1344', prompts: [
    "professional real estate agent portrait, warm confident smile, modern blazer in earth tone, natural outdoor background with blurred luxury property, golden hour lighting, approachable expertise",
    "real estate professional headshot, friendly direct gaze, crisp white shirt under neutral cardigan, soft bokeh city skyline, morning light, trustworthy competent",
    "senior broker portrait, distinguished presence, tailored jacket, panoramic office window view, dramatic side lighting, authoritative yet warm"
  ]},
  // Sections: 2 (was 12)
  { cat: 'sections', resolution: '1152x896', prompts: [
    "about us section hero, modern office interior with team collaborating, glass walls, branded subtle, natural light, transparency trust",
    "testimonials section hero, happy family at new home threshold, keys in hand, genuine joy, warm authentic moment, golden hour"
  ]},
  // CTA: 2 (was 5)
  { cat: 'cta', resolution: '1344x768', prompts: [
    "call to action hero, stunning property silhouette at sunset, Find Your Dream Home implied, emotional aspirational, golden hour magic",
    "cta banner, keys on modern entry table with fresh flowers, new beginnings symbolism, clean minimal, bright hopeful"
  ]}
];

const ILLUSTRATION_STYLE = "flat vector illustration style, warm earthy palette (terracotta #C66B3D, sage #7A9E7E, cream #F5F0E8, charcoal #2D2D2D, soft gold #D4A843), clean geometric shapes, subtle textures, architectural digest editorial illustration aesthetic, consistent stroke weight 2px, rounded corners 8px, no gradients only flat colors, minimal detail maximum clarity";

const ILLUSTRATIONS = [
  "hero illustration: stylized modern house with garden, warm sun rays, birds flying, welcoming path leading to front door, flat vector, earthy palette",
  "search illustration: magnifying glass over stylized map with house pins, location markers glowing, clean flat design, sage and terracotta",
  "favorites illustration: heart-shaped house outline, warm glow emanating, small sparkles, emotional connection, flat vector style",
  "mortgage calculator illustration: abstract calculator with house silhouette display, numbers floating, clean financial trust aesthetic",
  "agent matching illustration: two puzzle pieces fitting together (agent + client), handshake negative space, partnership metaphor, warm tones",
  "market trends illustration: upward trending chart made of tiny house icons, steady growth, confident optimistic, terracotta accent"
];

const SVG_STYLE = "SVG icons, 24x24 viewBox, 1.5px stroke weight, stroke-linecap round, stroke-linejoin round, currentColor for strokes, no fills (outline style), consistent geometric precision, optical alignment, Lucide-inspired aesthetic";

const SVGS = [
  // Navigation: 4 (was 8)
  { cat: 'navigation', prompts: ["chevron-left: simple left-pointing chevron", "chevron-right: simple right-pointing chevron", "menu: three horizontal lines (hamburger)", "close: X mark, two crossing strokes"] },
  // Property: 6 (was 12) - most used
  { cat: 'property', prompts: ["house: standalone house icon, roof, walls, door, window", "building: multi-story apartment building, multiple windows", "key: traditional key shape, bow head, blade, teeth", "door: entry door with handle, slight ajar", "window: four-pane window cross mullion", "floor-plan: simplified floor plan walls + door swing arcs"] },
  // UI: essential 4
  { cat: 'ui', prompts: ["heart: outline heart shape, favorites", "star: five-point star outline, featured", "share: three connected dots with lines", "map-pin: location marker tear drop"] }
];

const ANIM_STYLE = "Lottie JSON, 30fps, 2-3s, loopable, shape layers only, transform only, easeOutCubic, 300x300 viewport, colors: terracotta #C66B3D, sage #7A9E7E, gold #D4A843";

const ANIMATIONS = [
  "hero-float: house icon gentle vertical float (0 to -8px to 0), 3s easeInOutSine loop",
  "card-hover-lift: card shape translateY(0 to -4px) with shadow scale(1 to 1.02), 300ms easeOutCubic",
  "skeleton-shimmer: left-to-right gradient sweep across card placeholder, 1.5s linear infinite",
  "heart-beat: heart icon scale(1 to 1.2 to 1) on favorite toggle, 400ms easeOutBack, single play"
];

async function generatePhotos() {
  console.log('\n📸 Generating photos (18 reduced from 82)...');
  await ensureDir(path.join(ASSETS_DIR, 'images'));
  const items = []; let seedBase = 1000;
  for (const c of PHOTOS) {
    const dir = path.join(ASSETS_DIR, 'images', c.cat); await ensureDir(dir);
    for (let i = 0; i < c.prompts.length; i++) {
      const fullPrompt = `${c.prompts[i]}, ${PHOTO_STYLE}`;
      const seed = seedBase++; const filename = `${slugify(`${c.cat}-${c.prompts[i].substring(0,30)}`)}-${seed}.webp`;
      const outputPath = path.join(dir, filename);
      items.push({ name: `${c.cat}/${filename}`, outputPath, processor: async () => {
        const buf = await generateImage(fullPrompt, PHOTO_NEG, c.resolution, seed);
        await optimizeImage(buf, outputPath, c.cat === 'hero' ? 85 : 78);
        const stats = await fs.promises.stat(outputPath); return { size: stats.size, resolution: c.resolution };
      }});
    }
  }
  const results = await processQueue(items, i => i.processor(), 'photos');
  for (const r of results) if (r.status === 'success') { const cat = r.name.split('/')[0]; if (!manifest.images[cat]) manifest.images[cat] = []; manifest.images[cat].push({ file: path.relative(ASSETS_DIR, r.path), size: r.size, resolution: r.resolution }); }
  console.log(`\n📸 Photos: ${results.filter(r => r.status === 'success').length} generated, ${results.filter(r => r.status === 'failed').length} failed`);
}

async function generateIllustrations() {
  console.log('\n🎨 Generating illustrations (6 reduced from 18)...');
  await ensureDir(path.join(ASSETS_DIR, 'illustrations'));
  const items = []; let seedBase = 5000;
  for (let i = 0; i < ILLUSTRATIONS.length; i++) {
    const fullPrompt = `${ILLUSTRATIONS[i]}, ${ILLUSTRATION_STYLE}, flat vector illustration`;
    const seed = seedBase++; const filename = `illustration-${slugify(ILLUSTRATIONS[i].substring(0,30))}-${seed}.webp`;
    const outputPath = path.join(ASSETS_DIR, 'illustrations', filename);
    items.push({ name: `illustrations/${filename}`, outputPath, processor: async () => {
      const buf = await generateImage(fullPrompt, '', '1024x1024', seed);
      await optimizeImage(buf, outputPath, 82);
      const stats = await fs.promises.stat(outputPath); return { size: stats.size, resolution: '1024x1024' };
    }});
  }
  const results = await processQueue(items, i => i.processor(), 'illustrations');
  for (const r of results) if (r.status === 'success') { if (!manifest.illustrations.general) manifest.illustrations.general = []; manifest.illustrations.general.push({ file: path.relative(ASSETS_DIR, r.path), size: r.size, resolution: r.resolution }); }
  console.log(`\n🎨 Illustrations: ${results.filter(r => r.status === 'success').length} generated, ${results.filter(r => r.status === 'failed').length} failed`);
}

async function generateSVGs() {
  console.log('\n📐 Generating SVGs (14 reduced from 40)...');
  await ensureDir(path.join(ASSETS_DIR, 'svg'));
  const items = [];
  for (const c of SVGS) {
    const dir = path.join(ASSETS_DIR, 'svg', c.cat); await ensureDir(dir);
    for (const p of c.prompts) {
      const fullPrompt = `${p}. Style: ${SVG_STYLE}`; const filename = `${slugify(p)}.svg`; const outputPath = path.join(dir, filename);
      items.push({ name: `svg/${c.cat}/${filename}`, outputPath, processor: async () => {
        const svg = await generateSVG(fullPrompt); await optimizeSVG(svg, outputPath); const stats = await fs.promises.stat(outputPath); return { size: stats.size };
      }});
    }
  }
  const results = await processQueue(items, i => i.processor(), 'svgs');
  for (const r of results) if (r.status === 'success') { const parts = r.name.split('/'); const cat = parts[1]; if (!manifest.svgs[cat]) manifest.svgs[cat] = []; manifest.svgs[cat].push({ file: path.relative(ASSETS_DIR, r.path), size: r.size }); }
  console.log(`\n📐 SVGs: ${results.filter(r => r.status === 'success').length} generated, ${results.filter(r => r.status === 'failed').length} failed`);
}

async function generateAnimations() {
  console.log('\n✨ Generating animations (4 reduced from 12)...');
  await ensureDir(path.join(ASSETS_DIR, 'animations'));
  const items = [];
  for (let i = 0; i < ANIMATIONS.length; i++) {
    const fullPrompt = `${ANIMATIONS[i]}. Style: ${ANIM_STYLE}`; const filename = `anim-${slugify(ANIMATIONS[i].substring(0,30))}.json`; const outputPath = path.join(ASSETS_DIR, 'animations', filename);
    items.push({ name: `animations/${filename}`, outputPath, processor: async () => {
      const lottie = await generateLottie(fullPrompt); await fs.promises.writeFile(outputPath, JSON.stringify(lottie, null, 2)); const stats = await fs.promises.stat(outputPath); return { size: stats.size };
    }});
  }
  const results = await processQueue(items, i => i.processor(), 'animations');
  for (const r of results) if (r.status === 'success') { if (!manifest.animations.general) manifest.animations.general = []; manifest.animations.general.push({ file: path.relative(ASSETS_DIR, r.path), size: r.size }); }
  console.log(`\n✨ Animations: ${results.filter(r => r.status === 'success').length} generated, ${results.filter(r => r.status === 'failed').length} failed`);
}

async function writeManifest() { await fs.promises.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2)); console.log(`\n📋 Manifest: ${path.relative(ROOT, MANIFEST_PATH)}`); }

async function main() {
  console.log('🚀 Starting REDUCED Bienenhaus asset generation (~40 items)...');
  console.log(`📁 Output: ${ASSETS_DIR}`);
  const start = Date.now();
  try {
    await generatePhotos();
    await generateIllustrations();
    await generateSVGs();
    await generateAnimations();
    await writeManifest();
    const elapsed = ((Date.now() - start) / 60000).toFixed(1);
    console.log(`\n✨ Done in ${elapsed} min`);
    console.log(`📊 Images: ${Object.values(manifest.images).flat().length} | Illustrations: ${Object.values(manifest.illustrations).flat().length} | SVGs: ${Object.values(manifest.svgs).flat().length} | Animations: ${Object.values(manifest.animations).flat().length}`);
  } catch (e) { console.error('\n💥 Fatal:', e); process.exit(1); }
}
main();