#!/usr/bin/env node
/**
 * Sitemap Generator for Bienenhaus
 * Generates sitemap.xml with static pages, properties, and agents
 * Run with: node scripts/generate-sitemap.mjs
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const OUTPUT_FILE = 'public/sitemap.xml';
const BASE_URL = 'https://bienenhaus.com.ar';

// Static pages
const staticPages = [
  { url: 'https://bienenhaus.com.ar/', changefreq: 'weekly', priority: 1.0 },
  { url: 'https://bienenhaus.com.ar/#catalogo', changefreq: 'daily', priority: 0.9 },
  { url: 'https://bienenhaus.com.ar/#quienes-somos', changefreq: 'monthly', priority: 0.7 },
  { url: 'https://bienenhaus.com.ar/#servicios', changefreq: 'monthly', priority: 0.7 },
  { url: 'https://bienenhaus.com.ar/#equipo', changefreq: 'monthly', priority: 0.6 },
  { url: 'https://bienenhaus.com.ar/#contacto', changefreq: 'monthly', priority: 0.8 },
  { url: 'https://bienenhaus.com.ar/#faq', changefreq: 'monthly', priority: 0.5 },
];

async function generateSitemap() {
  try {
    console.log('🔄 Generating sitemap.xml...');

    // Fetch properties from Supabase
    const { data: properties, error: propError } = await supabase
      .from('propiedades')
      .select('id, updated_at')
      .order('updated_at', { ascending: false });

    if (propError) throw propError;

    // Fetch agents
    const { data: agents, error: agentError } = await supabase
      .from('agentes')
      .select('id, updated_at')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (agentError) throw agentError;

    const baseUrl = 'https://bienenhaus.com.ar';
    const today = new Date().toISOString().split('T')[0];

    // Static pages
    const staticPages = [
      { url: 'https://bienenhaus.com.ar/', changefreq: 'weekly', priority: '1.0' },
      { url: 'https://bienenhaus.com.ar/#catalogo', changefreq: 'daily', priority: '0.9' },
      { url: 'https://bienenhaus.com.ar/#quienes-somos', changefreq: 'monthly', priority: '0.7' },
      { url: 'https://bienenhaus.com.ar/#servicios', changefreq: 'monthly', priority: '0.7' },
      { url: 'https://bienenhaus.com.ar/#equipo', changefreq: 'monthly', priority: '0.6' },
      { url: 'https://bienenhaus.com.ar/#contacto', changefreq: 'monthly', priority: '0.8' },
      { url: 'https://bienenhaus.com.ar/#faq', changefreq: 'monthly', priority: '0.5' },
    ];

    // Property pages
    const propertyUrls = (properties || []).map(p => ({
      url: `https://bienenhaus.com.ar/#detalle/${p.id}`,
      lastmod: p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.8'
    }));

    // Agent pages
    const agentUrls = (agents || []).map(a => ({
      url: `https://bienenhaus.com.ar/#equipo/agente/${a.id}`,
      lastmod: a.updated_at ? new Date(a.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.6'
    });

    // Build all URLs
    const allUrls = [
      ...staticPages,
      ...(properties || []).map(p => ({
        url: `https://bienenhaus.com.ar/#detalle/${p.id}`,
        lastmod: p.updated_at ? p.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '0.8'
      })),
      ...((await supabase.from('agentes').select('id, updated_at').eq('activo', true)).data || []).map(a => ({
        url: `https://bienenhaus.com.ar/#equipo/agente/${a.id}`,
        lastmod: a.updated_at ? a.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: '0.6'
      }))
    ];

    // Build XML
    const urlsXml = [
      ...staticPages.map(p => `  <url>\n    <loc>${p.url}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`),
      ...(await supabase.from('propiedades').select('id, updated_at')).data?.map(p => `  <url>\n    <loc>https://bienenhaus.com.ar/#detalle/${p.id}</loc>\n    <lastmod>${p.updated_at ? p.updated_at.split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url`) || [],
      ...(await supabase.from('agentes').select('id, updated_at').eq('activo', true)).data?.map(a => `  <url>\n    <loc>https://bienenhaus.com.ar/#equipo/agente/${a.id}</loc>\n    <lastmod>${a.updated_at ? a.updated_at.split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url`) || []
    ].join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${[...staticPages, ...(await supabase.from('propiedades').select('id, updated_at')).data?.map(p => ({
  url: `https://bienenhaus.com.ar/#detalle/${p.id}`,
  lastmod: p.updated_at ? p.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
  changefreq: 'weekly',
  priority: '0.8'
})) || [], ...(await supabase.from('agentes').select('id, updated_at').eq('activo', true)).data?.map(a => ({
  url: `https://bienenhaus.com.ar/#equipo/agente/${a.id}`,
  lastmod: a.updated_at ? a.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
  changefreq: 'monthly',
  priority: '0.6'
})) || []].map(p => `  <url>\n    <loc>${p.url}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`).join('\n')}
</urlset>`;

    // Write file
    fs.writeFileSync('public/sitemap.xml', xml);
    console.log('✅ sitemap.xml generated at public/sitemap.xml');
    console.log('✅ Sitemap generated successfully!');

  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

generateSitemap();