import { logWarn } from './utils/logger.ts';
// NO commitear valores reales. Copia a .env.local

export const CONFIG = {
  // Supabase (obligatorio)
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://TU_PROYECTO.supabase.co',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'TU_CLAVE_ANONIMA',

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