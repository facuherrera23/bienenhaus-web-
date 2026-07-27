// Type declarations for config module
export interface Config {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_UPLOAD_PRESET_PROPS: string;
  CLOUDINARY_UPLOAD_PRESET_AGENTES: string;
  ADMIN_EMAIL: string;
  WHATSAPP_NUMBER: string;
  ENABLE_ADMIN_PANEL: boolean;
}

export const CONFIG: Config;