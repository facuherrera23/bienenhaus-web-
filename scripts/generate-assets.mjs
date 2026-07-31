#!/usr/bin/env node
/**
 * Asset Generation Script for Bienenhaus
 * Uses NVIDIA API (FLUX for images, LLMs for SVG/Lottie)
 * Outputs optimized assets to public/assets/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'public', 'assets');
const PROMPTS_DIR = path.join(ROOT, 'scripts', 'asset-prompts');
const MANIFEST_PATH = path.join(ASSETS_DIR, 'assets-manifest.json');

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local');
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valParts] = trimmed.split('=');
        if (key && valParts.length) {
          process.env[key.trim()] = valParts.join('=').trim();
        }
      }
    }
  } catch {
    console.warn('⚠️  .env.local not found, using process.env only');
  }
}
loadEnv();

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
if (!NVIDIA_API_KEY) {
  console.error('❌ NVIDIA_API_KEY not set in environment');
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
  '896x1152': { width: 896, height: 1152 },
  '1216x832': { width: 1216, height: 832 }
};

const MAX_RETRIES = 3;
const BASE_DELAY = 2000;
const CONCURRENCY = 2;

const manifest = {
  generatedAt: new Date().toISOString(),
  images: {},
  illustrations: {},
  svgs: {},
  animations: {}
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API ${response.status}: ${errText}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Request timeout (180s)');
    throw err;
  }
}

async function generateImage(prompt, negativePrompt, resolution, seed) {
  const { width, height } = RESOLUTIONS[resolution] || RESOLUTIONS['1024x1024'];

  const payload = {
    prompt,
    negative_prompt: negativePrompt,
    width,
    height,
    steps: 4,
    cfg_scale: 3.5,
    sampler: 'euler',
    seed
  };

  const data = await callNvidiaAPI(FLUX_ENDPOINT, payload);
  const base64 = data.artifacts?.[0]?.base64;
  if (!base64) throw new Error('No image data in response');

  const buffer = Buffer.from(base64, 'base64');
  return buffer;
}

async function generateSVG(prompt) {
  const systemPrompt = `You are an expert SVG icon designer. Generate clean, minimal SVG code following these strict rules:
- ViewBox: "0 0 24 24"
- Stroke: currentColor, stroke-width: 1.5, stroke-linecap: round, stroke-linejoin: round
- Fill: none (outline style only)
- No gradients, no filters, no animations
- Geometrically precise, optically balanced
- Single <svg> root element with proper xmlns
- Output ONLY the SVG code, no markdown, no explanation`;

  const payload = {
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 2048
  };

  const data = await callNvidiaAPI(LLM_ENDPOINT, payload, true);
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) throw new Error('No SVG content in response');

  const svgMatch = content.match(/<svg[\s\S]*<\/svg>/i);
  if (!svgMatch) throw new Error('No valid SVG tag found in response');

  return svgMatch[0];
}

async function generateLottie(prompt) {
  const systemPrompt = `You are an expert Lottie animation creator. Generate valid Lottie JSON for simple animations.
Rules:
- 30fps, 60-90 frames (2-3 seconds)
- Only shape layers (no images, no precomps)
- Transform animations only (position, scale, rotation, opacity)
- Use easeOutCubic easing
- Viewport: 300x300
- Colors: terracotta #C66B3D, sage #7A9E7E, gold #D4A843
- Loop: true for ambient, false for single-play
- Output ONLY valid JSON, no markdown`;

  const payload = {
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 4096
  };

  const data = await callNvidiaAPI(LLM_ENDPOINT, payload, true);
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) throw new Error('No Lottie content in response');

  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error('Invalid JSON in Lottie response');
  }
}

async function optimizeImage(inputBuffer, outputPath, quality = 80) {
  return new Promise((resolve, reject) => {
    const sharp = spawn('npx', ['sharp', '-i', '-', '-o', outputPath, 'webp', `--quality=${quality}`], {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    sharp.stdin.write(inputBuffer);
    sharp.stdin.end();

    let stderr = '';
    sharp.stderr.on('data', d => stderr += d.toString());

    sharp.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`sharp failed: ${stderr}`));
    });
  });
}

async function optimizeSVG(svgString, outputPath) {
  return new Promise((resolve, reject) => {
    const svgo = spawn('npx', ['svgo', '--input=-', '--output', outputPath, '--multipass'], {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    svgo.stdin.write(svgString);
    svgo.stdin.end();

    let stderr = '';
    svgo.stderr.on('data', d => stderr += d.toString());

    svgo.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`svgo failed: ${stderr}`));
    });
  });
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80);
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function fileExists(path) {
  try {
    await fs.promises.access(path);
    return true;
  } catch {
    return false;
  }
}

async function processQueue(items, processor, label) {
  const results = [];
  const queue = [...items];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;

      const { name, skipIfExists = true } = item;
      const outputPath = item.outputPath;

      if (skipIfExists && await fileExists(outputPath)) {
        console.log(`  ⏭️  ${name} (exists)`);
        results.push({ ...item, status: 'skipped', path: outputPath });
        continue;
      }

      try {
        console.log(`  🔄 ${name}...`);
        const result = await withRetry(() => processor(item));
        console.log(`  ✅ ${name}`);
        results.push({ ...item, status: 'success', path: outputPath, ...result });
      } catch (err) {
        console.error(`  ❌ ${name}: ${err.message}`);
        results.push({ ...item, status: 'failed', error: err.message });
      }
    }
  }

  const workers = Array(Math.min(CONCURRENCY, items.length)).fill(null).map(() => worker());
  await Promise.all(workers);
  return results;
}

async function generatePhotos() {
  console.log('\n📸 Generating photos...');
  const promptsData = JSON.parse(await fs.promises.readFile(path.join(PROMPTS_DIR, 'photos.json'), 'utf-8'));
  const { styleSheet, negativePrompt, categories } = promptsData;

  await ensureDir(path.join(ASSETS_DIR, 'images'));

  const items = [];
  let seedBase = 1000;

  for (const cat of categories) {
    const { name, count, resolution, prompts } = cat;
    const dir = path.join(ASSETS_DIR, 'images', name);
    await ensureDir(dir);

    for (let i = 0; i < count; i++) {
      const prompt = prompts[i % prompts.length];
      const fullPrompt = `${prompt}, ${styleSheet}`;
      const seed = seedBase++;
      const filename = `${slugify(`${name}-${prompt.substring(0, 40)}`)}-${seed}.webp`;
      const outputPath = path.join(dir, filename);

      items.push({
        name: `${name}/${filename}`,
        outputPath,
        processor: async () => {
          const buffer = await generateImage(fullPrompt, negativePrompt, resolution, seed);
          await optimizeImage(buffer, outputPath, name === 'hero' ? 85 : 78);
          const stats = await fs.promises.stat(outputPath);
          return { size: stats.size, resolution };
        }
      });
    }
  }

  const results = await processQueue(items, i => i.processor(), 'photos');

  for (const r of results) {
    if (r.status === 'success') {
      const cat = r.name.split('/')[0];
      if (!manifest.images[cat]) manifest.images[cat] = [];
      manifest.images[cat].push({
        file: path.relative(ASSETS_DIR, r.path),
        size: r.size,
        resolution: r.resolution
      });
    }
  }

  const failed = results.filter(r => r.status === 'failed').length;
  console.log(`\n📸 Photos: ${results.filter(r => r.status === 'success').length} generated, ${failed} failed`);
}

async function generateIllustrations() {
  console.log('\n🎨 Generating illustrations...');
  const promptsData = JSON.parse(await fs.promises.readFile(path.join(PROMPTS_DIR, 'illustrations.json'), 'utf-8'));
  const { styleSheet, categories } = promptsData;

  await ensureDir(path.join(ASSETS_DIR, 'illustrations'));

  const items = [];
  let seedBase = 5000;

  for (const cat of categories) {
    const { name, count, resolution, prompts } = cat;
    const dir = path.join(ASSETS_DIR, 'illustrations');
    await ensureDir(dir);

    for (let i = 0; i < count; i++) {
      const prompt = prompts[i % prompts.length];
      const fullPrompt = `${prompt}, ${styleSheet}, flat vector illustration`;
      const seed = seedBase++;
      const filename = `${slugify(`${name}-${prompt.substring(0, 40)}`)}-${seed}.webp`;
      const outputPath = path.join(dir, filename);

      items.push({
        name: `${name}/${filename}`,
        outputPath,
        processor: async () => {
          const buffer = await generateImage(fullPrompt, promptsData.negativePrompt || '', resolution, seed);
          await optimizeImage(buffer, outputPath, 82);
          const stats = await fs.promises.stat(outputPath);
          return { size: stats.size, resolution };
        }
      });
    }
  }

  const results = await processQueue(items, i => i.processor(), 'illustrations');

  for (const r of results) {
    if (r.status === 'success') {
      const cat = r.name.split('/')[0];
      if (!manifest.illustrations[cat]) manifest.illustrations[cat] = [];
      manifest.illustrations[cat].push({
        file: path.relative(ASSETS_DIR, r.path),
        size: r.size,
        resolution: r.resolution
      });
    }
  }

  const failed = results.filter(r => r.status === 'failed').length;
  console.log(`\n🎨 Illustrations: ${results.filter(r => r.status === 'success').length} generated, ${failed} failed`);
}

async function generateSVGs() {
  console.log('\n📐 Generating SVGs...');
  const promptsData = JSON.parse(await fs.promises.readFile(path.join(PROMPTS_DIR, 'svgs.json'), 'utf-8'));
  const { styleSheet, categories } = promptsData;

  await ensureDir(path.join(ASSETS_DIR, 'svg'));

  const items = [];

  for (const cat of categories) {
    const { name, count, prompts } = cat;
    const dir = path.join(ASSETS_DIR, 'svg', name);
    await ensureDir(dir);

    for (let i = 0; i < count; i++) {
      const prompt = prompts[i % prompts.length];
      const fullPrompt = `${prompt}. Style: ${styleSheet}`;
      const filename = `${slugify(prompt)}.svg`;
      const outputPath = path.join(dir, filename);

      items.push({
        name: `svg/${name}/${filename}`,
        outputPath,
        processor: async () => {
          const svg = await generateSVG(fullPrompt);
          await optimizeSVG(svg, outputPath);
          const stats = await fs.promises.stat(outputPath);
          return { size: stats.size };
        }
      });
    }
  }

  const results = await processQueue(items, i => i.processor(), 'svgs');

  for (const r of results) {
    if (r.status === 'success') {
      const parts = r.name.split('/');
      const cat = parts[1];
      if (!manifest.svgs[cat]) manifest.svgs[cat] = [];
      manifest.svgs[cat].push({
        file: path.relative(ASSETS_DIR, r.path),
        size: r.size
      });
    }
  }

  const failed = results.filter(r => r.status === 'failed').length;
  console.log(`\n📐 SVGs: ${results.filter(r => r.status === 'success').length} generated, ${failed} failed`);
}

async function generateAnimations() {
  console.log('\n✨ Generating animations...');
  const promptsData = JSON.parse(await fs.promises.readFile(path.join(PROMPTS_DIR, 'animations.json'), 'utf-8'));
  const { styleSheet, categories } = promptsData;

  await ensureDir(path.join(ASSETS_DIR, 'animations'));

  const items = [];

  for (const cat of categories) {
    const { name, count, prompts } = cat;
    const dir = path.join(ASSETS_DIR, 'animations');
    await ensureDir(dir);

    for (let i = 0; i < count; i++) {
      const prompt = prompts[i % prompts.length];
      const fullPrompt = `${prompt}. Style: ${styleSheet}`;
      const filename = `${slugify(prompt)}.json`;
      const outputPath = path.join(dir, filename);

      items.push({
        name: `animations/${filename}`,
        outputPath,
        processor: async () => {
          const lottie = await generateLottie(fullPrompt);
          await fs.promises.writeFile(outputPath, JSON.stringify(lottie, null, 2));
          const stats = await fs.promises.stat(outputPath);
          return { size: stats.size };
        }
      });
    }
  }

  const results = await processQueue(items, i => i.processor(), 'animations');

  for (const r of results) {
    if (r.status === 'success') {
      if (!manifest.animations.general) manifest.animations.general = [];
      manifest.animations.general.push({
        file: path.relative(ASSETS_DIR, r.path),
        size: r.size
      });
    }
  }

  const failed = results.filter(r => r.status === 'failed').length;
  console.log(`\n✨ Animations: ${results.filter(r => r.status === 'success').length} generated, ${failed} failed`);
}

async function writeManifest() {
  await fs.promises.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\n📋 Manifest written to ${path.relative(ROOT, MANIFEST_PATH)}`);
}

async function validateAssets() {
  console.log('\n🔍 Validating assets...');
  let warnings = 0;

  const checkSize = (file, maxKB, type) => {
    const sizeKB = file.size / 1024;
    if (sizeKB > maxKB) {
      console.log(`  ⚠️  ${file.file}: ${sizeKB.toFixed(1)}KB exceeds ${maxKB}KB limit (${type})`);
      warnings++;
    }
  };

  for (const [cat, files] of Object.entries(manifest.images)) {
    const limit = cat === 'hero' ? 300 : 120;
    for (const f of files) checkSize(f, limit, 'image');
  }

  for (const [cat, files] of Object.entries(manifest.illustrations)) {
    for (const f of files) checkSize(f, 200, 'illustration');
  }

  for (const [cat, files] of Object.entries(manifest.svgs)) {
    for (const f of files) checkSize(f, 5, 'SVG');
  }

  for (const [cat, files] of Object.entries(manifest.animations)) {
    for (const f of files) checkSize(f, 50, 'animation');
  }

  if (warnings === 0) console.log('  ✅ All assets within size limits');
  else console.log(`  ⚠️  ${warnings} size warnings`);
}

async function main() {
  console.log('🚀 Starting Bienenhaus asset generation...');
  console.log(`📁 Output: ${ASSETS_DIR}`);

  const startTime = Date.now();

  try {
    await generatePhotos();
    await generateIllustrations();
    await generateSVGs();
    await generateAnimations();
    await writeManifest();
    await validateAssets();

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n✨ Generation complete in ${elapsed} minutes`);
    console.log(`📊 Summary:`);
    console.log(`   Images: ${Object.values(manifest.images).flat().length}`);
    console.log(`   Illustrations: ${Object.values(manifest.illustrations).flat().length}`);
    console.log(`   SVGs: ${Object.values(manifest.svgs).flat().length}`);
    console.log(`   Animations: ${Object.values(manifest.animations).flat().length}`);
  } catch (err) {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
  }
}

main();