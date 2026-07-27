// src/supabase.js type declarations
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../config.js';

export const supabase: SupabaseClient<any>;

export function handleSupabaseError(error: any, context: string): never;