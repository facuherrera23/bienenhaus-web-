#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const OUTPUT_FILE = 'public/sitemap.xml';
const BASE_URL = 'https://facuh.github.io/bienenhaus';

function escapeXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function lastmodStr(date) {
  if (!date) return todayStr();
  try { return new Date(date).toISOString().split('T')[0]; } catch { return todayStr(); }
}

async function generateSitemap() {
  console.log('Generating sitemap.xml...');

  const { data: properties } = await supabase
    .from('propiedades')
    .select('id, updated_at')
    .order('updated_at', { ascending: false });

  if (!properties) {
    console.error('Failed to fetch properties');
    process.exit(1);
  }

  const { data: agents } = await supabase
    .from('agentes')
    .select('id, updated_at')
    .eq('activo', true)
    .order('orden', { ascending: true });

  const staticPages = [
    { loc: `${BASE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${BASE_URL}/seccion/catalogo`, changefreq: 'daily', priority: '0.9' },
    { loc: `${BASE_URL}/seccion/nosotros`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${BASE_URL}/seccion/servicios`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${BASE_URL}/seccion/equipo`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${BASE_URL}/seccion/contacto`, changefreq: 'monthly', priority: '0.8' },
    { loc: `${BASE_URL}/seccion/faq`, changefreq: 'monthly', priority: '0.5' },
  ];

  const propertyUrls = (properties || []).map(p => ({
    loc: `${BASE_URL}/detalle/${p.id}`,
    lastmod: lastmodStr(p.updated_at),
    changefreq: 'weekly',
    priority: '0.8',
  }));

  const agentUrls = (agents || []).map(a => ({
    loc: `${BASE_URL}/equipo/agente/${a.id}`,
    lastmod: lastmodStr(a.updated_at),
    changefreq: 'monthly',
    priority: '0.6',
  }));

  const allUrls = [...staticPages, ...propertyUrls, ...agentUrls];

  const urlsXml = allUrls.map(p => {
    const lastmod = p.lastmod || todayStr();
    const changefreq = p.changefreq || 'monthly';
    const priority = p.priority || '0.5';
    return `  <url>\n    <loc>${escapeXml(p.loc)}</loc>\n    <lastmod>${escapeXml(lastmod)}</lastmod>\n    <changefreq>${escapeXml(changefreq)}</changefreq>\n    <priority>${escapeXml(priority)}</priority>\n  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlsXml}
</urlset>`;

  fs.writeFileSync(OUTPUT_FILE, xml);
  console.log(`sitemap.xml generated at ${OUTPUT_FILE} (${allUrls.length} URLs)`);
}

generateSitemap();