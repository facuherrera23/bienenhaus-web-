// ================================================================
// CLOUDINARY UPLOAD HELPER
// ================================================================
import axios from 'axios';
import { CONFIG } from './config.ts';
import { logError } from './utils/logger.ts';

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/image/upload`;

export async function uploadToCloudinary(file, folder, preset) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);
  formData.append('folder', folder);

  try {
    const response = await axios.post(CLOUDINARY_UPLOAD_URL, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return { url: response.data.secure_url, public_id: response.data.public_id };
  } catch (error) {
    logError('Error subiendo a Cloudinary', error, 'cloudinary');
    throw new Error('Error al subir imagen. Intenta de nuevo.', { cause: error });
  }
}

export async function uploadMultipleToCloudinary(files, folder, preset, maxFiles = 15) {
  const results = [];
  const filesToUpload = Array.from(files).slice(0, maxFiles);

  for (let i = 0; i < filesToUpload.length; i++) {
    const file = filesToUpload[i];
    try {
      const result = await uploadToCloudinary(file, folder, preset);
      results.push({ ...result, orden: i, es_principal: i === 0 });
    } catch (error) {
      logError(`Error subiendo archivo ${i + 1}`, error, 'cloudinary');
      throw error;
    }
  }
  return results;
}

export function validateImageFile(file) {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validTypes.includes(file.type)) {
    throw new Error(`Tipo de archivo no válido: ${file.type}. Usa JPG, PNG o WebP.`);
  }
  if (file.size > maxSize) {
    throw new Error(`Archivo demasiado grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo 10MB.`);
  }
  return true;
}