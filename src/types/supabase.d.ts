// Type declarations for @supabase/supabase-js
declare module '@supabase/supabase-js' {
export interface SupabaseClient<Schema = Database> {
    auth: SupabaseAuthClient;
    from<T extends keyof Schema['public']['Tables']>(table: T): PostgrestQueryBuilder<Schema['public']['Tables'][T]['Row']>;
    rpc<T = any>(fn: string, params?: any): Promise<PostgrestResponse<T>>;
    storage: StorageClient;
    functions: FunctionsClient;
    channel(name: string, options?: RealtimeChannelOptions): RealtimeChannel;
    removeChannel(channel: RealtimeChannel): void;
    realtime: RealtimeClient;
  }

  export interface SupabaseAuthClient {
    getSession(): Promise<AuthResponse>;
    signInWithPassword(credentials: { email: string; password: string }): Promise<AuthResponse>;
    signOut(): Promise<{ error: Error | null }>;
    onAuthStateChange(callback: (event: string, session: Session | null) => void): { data: { subscription: Subscription } };
  }

  export interface AuthResponse {
    data: { user: User | null; session: Session | null } | null;
    error: Error | null;
  }

  export interface Session {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    user: User;
  }

  export interface User {
    id: string;
    email?: string;
    user_metadata: Record<string, any>;
    app_metadata: Record<string, any>;
  }

  export interface PostgrestResponse<T> {
    data: T | null;
    error: PostgrestError | null;
    count: number | null;
    status: number;
    statusText: string;
  }

  export interface PostgrestError {
    message: string;
    code: string;
    details?: string;
    hint?: string;
  }

  export interface PostgrestQueryBuilder<T> {
    select<U = T>(columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated' }): PostgrestQueryBuilder<U>;
    eq(column: string, value: any): this;
    neq(column: string, value: any): this;
    gt(column: string, value: any): this;
    gte(column: string, value: any): this;
    lt(column: string, value: any): this;
    lte(column: string, value: any): this;
    like(column: string, pattern: string): this;
    ilike(column: string, pattern: string): this;
    is(column: string, value: null): this;
    in(column: string, values: any[]): this;
    contains(column: string, value: any): this;
    containedBy(column: string, value: any): this;
    order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): this;
    limit(count: number): this;
    range(from: number, to: number): this;
    single(): Promise<PostgrestResponse<T>>;
    maybeSingle(): Promise<PostgrestResponse<T>>;
    then<TResult>(onfulfilled?: (value: PostgrestResponse<T>) => TResult, onrejected?: (reason: any) => any): Promise<TResult>;
    update(data: any): this;
    insert(data: any): this;
    upsert(data: any): this;
    delete(): this;
  }

  export interface PostgrestError {
    message: string;
    code: string;
    details?: string;
    hint?: string;
  }

  export interface StorageClient {
    from(bucket: string): StorageBucketApi;
    createBucket(name: string, options?: { public?: boolean; file_size_limit?: number; allowed_mime_types?: string[] }): Promise<StorageResponse<Bucket>>;
    deleteBucket(name: string): Promise<StorageResponse<void>>;
    listBuckets(): Promise<StorageResponse<Bucket[]>>;
  }

  export interface StorageBucketApi {
    upload(path: string, file: File | Blob, options?: { cacheControl?: string; contentType?: string; upsert?: boolean }): Promise<StorageResponse<UploadResponse>>;
    download(path: string): Promise<StorageResponse<Blob>>;
    remove(paths: string[]): Promise<StorageResponse<void>>;
    list(path?: string, options?: { limit?: number; offset?: number; sortBy?: { column: string; order: 'asc' | 'desc' } }): Promise<StorageResponse<FileObject[]>>;
    getPublicUrl(path: string): { data: { publicUrl: string } };
    createSignedUrl(path: string, expiresIn: number): Promise<StorageResponse<{ signedUrl: string }>>;
    createSignedUrls(paths: string[], expiresIn: number): Promise<StorageResponse<SignedUrlResponse[]>>;
  }

  export interface StorageResponse<T> {
    data: T | null;
    error: StorageError | null;
  }

  export interface StorageError {
    message: string;
    statusCode: string;
  }

  export interface Bucket {
    id: string;
    name: string;
    owner: string;
    created_at: string;
    updated_at: string;
    public: boolean;
  }

  export interface UploadResponse {
    path: string;
    fullPath: string;
  }

  export interface FileObject {
    name: string;
    id: string;
    updated_at: string;
    created_at: string;
    last_accessed_at: string;
    metadata: { size: number; mimetype: string; cacheControl: string; };
  }

  export interface SignedUrlResponse {
    path: string;
    signedUrl: string;
  }

  export interface RealtimeClient {
    subscribe(): RealtimeChannel;
    unsubscribe(channel: RealtimeChannel): void;
  }

  export interface RealtimeChannel {
    on(event: string, filter: any, callback: (payload: any) => void): this;
    subscribe(): Promise<Subscription>;
    unsubscribe(): void;
  }

  export interface Subscription {
    unsubscribe(): void;
  }

  export interface FunctionsClient {
    invoke(name: string, options?: { body?: any; headers?: Record<string, string> }): Promise<{ data: any; error: Error | null }>;
  }

  export interface PostgrestClient {
    functions: FunctionsClient;
  }

  export interface FunctionsClient {
    invoke(name: string, options?: { body?: any; headers?: Record<string, string> }): Promise<{ data: any; error: Error | null }>;
  }

  export function createClient(url: string, key: string, options?: { auth?: { persistSession?: boolean; autoRefreshToken?: boolean; detectSessionInUrl?: boolean }; db?: { schema?: string }; global?: { headers?: Record<string, string> } }): SupabaseClient;
}

declare module '@supabase/supabase-js/dist/module/lib/types' {
  export * from '@supabase/supabase-js';
}

// Database table types
export interface Property {
  id: number;
  titulo: string;
  precio: number;
  moneda: 'ARS' | 'USD';
  operacion: 'venta' | 'alquiler';
  ubicacion: string;
  tipo: 'piso' | 'chalet' | 'atico' | 'local' | 'terreno';
  habitaciones: number;
  banos: number;
  m2: number;
  antiguedad: 'nuevo' | 'reformado' | 'viejo';
  destacado: boolean;
  caracteristicas: string[];
  descripcion: string;
  video_url: string | null;
  cochera: boolean;
  balcon: boolean;
  pileta: boolean;
  amueblado: boolean;
  mascotas: boolean;
  gastos_comunes: number;
  expensas: number;
  ml_item_id: string | null;
  ml_status: string | null;
  ml_permalink: string | null;
  ml_last_sync: string | null;
  created_at: string;
  updated_at: string;
  imagenes?: PropertyImage[];
}

export interface PropertyImage {
  id: number;
  propiedad_id: number;
  url: string;
  cloudinary_public_id: string;
  orden: number;
  es_principal: boolean;
  created_at: string;
}

export interface Agent {
  id: number;
  nombre: string;
  apellido: string | null;
  especialidad: string;
  email: string | null;
  telefono: string | null;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  avatar_url: string | null;
  avatar_public_id: string | null;
  redes_sociales: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  motivo: string;
  tipo_propiedad: string | null;
  mensaje: string | null;
  created_at: string;
}

export interface SiteContent {
  clave: string;
  valor: any;
  descripcion: string | null;
  updated_at: string;
}

export interface MLCredenciales {
  id: number;
  ml_user_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
  updated_at: string;
}

export interface MLSyncLog {
  id: number;
  propiedad_id: number;
  ml_item_id: string | null;
  accion: 'import' | 'create' | 'update' | 'pause' | 'error';
  detalle: Record<string, any> | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      propiedades: {
        Row: Property;
        Insert: Omit<Property, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Property, 'id' | 'created_at' | 'updated_at'>>;
      };
      imagenes: {
        Row: PropertyImage;
        Insert: Omit<PropertyImage, 'id' | 'created_at'>;
        Update: Partial<Omit<PropertyImage, 'id' | 'created_at'>>;
      };
      agentes: {
        Row: Agent;
        Insert: Omit<Agent, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Agent, 'id' | 'created_at' | 'updated_at'>>;
      };
      leads: {
        Row: Lead;
        Insert: Omit<Lead, 'id' | 'created_at'>;
        Update: Partial<Omit<Lead, 'id' | 'created_at'>>;
      };
      contenido_sitio: {
        Row: SiteContent;
        Insert: Omit<SiteContent, 'updated_at'>;
        Update: Partial<Omit<SiteContent, 'updated_at'>>;
      };
      ml_credenciales: {
        Row: MLCredenciales;
        Insert: Omit<MLCredenciales, 'id' | 'updated_at'>;
        Update: Partial<Omit<MLCredenciales, 'id' | 'updated_at'>>;
      };
      ml_sync_log: {
        Row: MLSyncLog;
        Insert: Omit<MLSyncLog, 'id' | 'created_at'>;
        Update: Partial<Omit<MLSyncLog, 'id' | 'created_at'>>;
      };
    };
  };
}