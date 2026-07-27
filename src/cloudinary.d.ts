// cloudinary.js type declarations
export async function uploadToCloudinary(file: File, folder: string, preset: string): Promise<{ url: string; public_id: string }>;
export async function uploadMultipleToCloudinary(files: FileList, folder: string, preset: string, maxFiles?: number): Promise<Array<{ url: string; public_id: string; orden: number; es_principal: boolean }>>;
export function validateImageFile(file: File): boolean;