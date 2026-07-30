import { logWarn } from './utils/logger.ts';
// NO commitear valores reales. Copia a .env.local

export const CONFIG = {
  // Supabase (obligatorio)
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://rnldqiwwzhjnurkguihu.supabase.co',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubGRxaXd3emhqbnVya2d1aWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzNzU5NjgsImV4cCI6MjA1NDk1MTk2OH0.7J7b8s0Qx5FJ-fR_6u2V9cF2nL8sX4Q8Y4L8Y7cQ7Jk',

  // Cloudinary (obligatorio para subir imágenes)
  CLOUDINARY_CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'TU_CLOUD_NAME',
  CLOUDINARY_UPLOAD_PRESET_PROPS: 'inmoconecta_propiedades',
  CLOUDINARY_UPLOAD_PRESET_AGENTES: 'inmoconecta_agentes',

  // Admin
  ADMIN_EMAIL: import.meta.env.VITE_ADMIN_EMAIL || 'admin@bienenhaus.com.ar',

  // WhatsApp
  WHATSAPP_NUMBER: import.meta.env.VITE_WHATSAPP_NUMBER || '5493511234567',

  // Feature flags
  ENABLE_ADMIN_PANEL: import.meta.env.VITE_ENABLE_ADMIN === 'true' || false
};

// Validación en desarrollo
if (import.meta.env.DEV) {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'CLOUDINARY_CLOUD_NAME'];
  required.forEach(key => {
    if (!CONFIG[key] || CONFIG[key].includes('TU_')) {
      logWarn(`Config faltante: ${key} - Define en .env.local`, undefined, 'config');
    }
  });
}