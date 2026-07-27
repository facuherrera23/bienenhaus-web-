// Type declarations for Cloudinary
declare module 'cloudinary' {
  export interface CloudinaryConfig {
    cloud_name: string;
    api_key: string;
    api_secret: string;
    secure?: boolean;
    cdn_subdomain?: boolean;
    private_cdn?: boolean;
    secure_distribution?: string;
    cname?: string;
    shorten_urls?: boolean;
  }

  export interface UploadApiOptions {
    folder?: string;
    public_id?: string;
    overwrite?: boolean;
    invalidate?: boolean;
    resource_type?: 'image' | 'raw' | 'video' | 'auto';
    type?: 'upload' | 'private' | 'authenticated';
    access_mode?: 'public' | 'private';
    use_filename?: boolean;
    unique_filename?: boolean;
    filename_override?: string;
    display_name?: string;
    tags?: string[];
    context?: Record<string, string>;
    metadata?: Record<string, string>;
    transformation?: TransformationOptions | TransformationOptions[];
    format?: string;
    quality?: string | number;
    width?: number;
    height?: number;
    crop?: string;
    gravity?: string;
    x?: number;
    y?: number;
    background?: string;
    color?: string;
    opacity?: number;
    opacity_mode?: string;
    opacity_trim?: number;
    opacity_trim_color?: string;
    opacity_trim_tolerance?: number;
    radius?: string | number;
    angle?: string | number;
    effect?: string;
    border?: string;
    border_width?: number;
    border_color?: string;
    opacity?: number;
    background?: string;
    background_color?: string;
    flags?: string;
    dpr?: string | number;
    quality?: string | number;
    fetch_format?: string;
    client_hints?: boolean;
    responsive?: boolean;
    responsive_breakpoints?: ResponsiveBreakpoint[];
    eager?: EagerTransformation[];
    eager_async?: boolean;
    eager_notification_url?: string;
    proxy?: string;
    backup?: boolean;
    return_delete_token?: boolean;
    invalidate?: boolean;
    phash?: string;
    colors?: boolean;
    image_metadata?: boolean;
    faces?: boolean;
    pages?: boolean;
    moderation?: 'manual' | 'webpurify' | 'aws_rek' | 'metascan';
    auto_tagging?: number;
    categorization?: string;
    detection?: string;
    similarity_search?: boolean;
    ocr?: string;
    raw_convert?: string;
    notification_url?: string;
  }

  export interface TransformationOptions {
    width?: number | string;
    height?: number | string;
    crop?: string;
    gravity?: string;
    x?: number;
    y?: number;
    background?: string;
    color?: string;
    opacity?: number;
    opacity_mode?: string;
    opacity_trim?: number;
    opacity_trim_color?: string;
    opacity_trim_tolerance?: number;
    radius?: string | number;
    angle?: string | number;
    effect?: string;
    border?: string;
    border_width?: number;
    border_color?: string;
    opacity?: number;
    background?: string;
    background_color?: string;
    flags?: string;
    dpr?: string | number;
    quality?: string | number;
    fetch_format?: string;
    client_hints?: boolean;
    responsive?: boolean;
    responsive_breakpoints?: ResponsiveBreakpoint[];
    eager?: EagerTransformation[];
    eager_async?: boolean;
    eager_notification_url?: string;
    proxy?: string;
    backup?: boolean;
    return_delete_token?: boolean;
    invalidate?: boolean;
    phash?: string;
    colors?: boolean;
    image_metadata?: boolean;
    faces?: boolean;
    pages?: boolean;
    moderation?: 'manual' | 'webpurify' | 'aws_rek' | 'metascan';
    auto_tagging?: number;
    categorization?: string;
    detection?: string;
    similarity_search?: boolean;
    ocr?: string;
    raw_convert?: string;
    notification_url?: string;
  }

  export interface ResponsiveBreakpoint {
    create_derived?: boolean;
    bytes_step?: number;
    max_width?: number;
    min_width?: number;
    max_height?: number;
    min_height?: number;
    bytes_limit?: number;
  }

  export interface EagerTransformation {
    transformation: TransformationOptions | string;
    width?: number;
    height?: number;
    crop?: string;
    gravity?: string;
    format?: string;
    quality?: string | number;
  }

  export interface UploadApiResponse {
    public_id: string;
    version: number;
    signature: string;
    width: number;
    height: number;
    format: string;
    resource_type: string;
    created_at: string;
    tags: string[];
    bytes: number;
    type: string;
    etag: string;
    placeholder: boolean;
    url: string;
    secure_url: string;
    folder: string;
    original_filename: string;
    asset_id: string;
    created_at: string;
    placeholder_version: number;
    resource_type: string;
    access_mode: string;
    folder: string;
    metadata: Record<string, any>;
    tags: string[];
    context: Record<string, any>;
    moderation: Moderation[];
    eager: UploadApiResponse[];
    pages: number;
    phash: string;
    duration: number;
    bit_rate: number;
    duration_sec: number;
    playback_url: string;
  }

  export interface Moderation {
    status: string;
    kind: string;
    response: string;
    updated_at: string;
  }

  export interface DeleteApiResponse {
    result: string;
    partial?: boolean;
  }

  export interface DestroyApiResponse {
    result: string;
    deleted: Record<string, string>;
    partial?: boolean;
  }

  export interface SearchApiResponse {
    total_count: number;
    time: number;
    resources: UploadApiResponse[];
    next_cursor: string;
  }

  export interface Tag {
    tag: string;
    count: number;
  }

  export interface Folder {
    name: string;
    path: string;
    subfolders: Folder[];
    files: FolderFile[];
  }

  export interface FolderFile {
    public_id: string;
    folder: string;
  }

  export interface UploadStream {
    write(data: Buffer | string): boolean;
    end(data?: Buffer | string): void;
    on(event: 'finish' | 'error' | 'data', callback: (error?: Error) => void): this;
  }

  export interface Cloudinary {
    config(config: CloudinaryConfig): CloudinaryConfig;
    config(): CloudinaryConfig;
    uploader: {
      upload(file: string | Buffer | ReadableStream, options?: UploadApiOptions): Promise<UploadApiResponse>;
      upload_stream(options?: UploadApiOptions): UploadStream;
      destroy(public_id: string, options?: { resource_type?: string; type?: string; invalidate?: boolean }): Promise<DestroyApiResponse>;
      explicit(public_ids: string[], options?: { type?: string; resource_type?: string; tags?: boolean; context?: boolean; metadata?: boolean }): Promise<{ results: UploadApiResponse[] }>;
      add_tag(tag: string, public_ids: string[]): Promise<{ results: UploadApiResponse[] }>;
      remove_tag(tag: string, public_ids: string[]): Promise<{ results: UploadApiResponse[] }>;
      rename(from_public_id: string, to_public_id: string, options?: { overwrite?: boolean }): Promise<{ result: string }>;
      text(text: string, options?: { font_family?: string; font_size?: number; font_weight?: string; font_style?: string; text_decoration?: string; text_align?: string; letter_spacing?: number; line_spacing?: number; background?: string; color?: string; opacity?: number; stroke?: string; stroke_width?: number; width?: number; height?: number; x?: number; y?: number; gravity?: string }): string;
    };
    api: {
      delete_resources(public_ids: string[], options?: { resource_type?: string; type?: string }): Promise<DestroyApiResponse>;
      delete_resources_by_prefix(prefix: string, options?: { resource_type?: string; type?: string }): Promise<DestroyApiResponse>;
      delete_resources_by_tag(tag: string, options?: { resource_type?: string; type?: string }): Promise<DestroyApiResponse>;
      update(public_id: string, options: { tags?: string[]; context?: Record<string, string>; metadata?: Record<string, string>; moderation_status?: string }): Promise<UploadApiResponse>;
      resource(public_id: string, options?: { resource_type?: string; type?: string; colors?: boolean; image_metadata?: boolean; faces?: boolean; pages?: boolean; phash?: boolean; max_results?: number }): Promise<UploadApiResponse>;
      resources(options?: { resource_type?: string; type?: string; prefix?: string; tag?: string; max_results?: number; next_cursor?: string; direction?: 'asc' | 'desc' }): Promise<SearchApiResponse>;
      resources_by_tag(tag: string, options?: { resource_type?: string; type?: string; max_results?: number; next_cursor?: string; direction?: 'asc' | 'desc' }): Promise<SearchApiResponse>;
      resources_by_context(context: Record<string, string>, options?: { resource_type?: string; type?: string; max_results?: number; next_cursor?: string; direction?: 'asc' | 'desc' }): Promise<SearchApiResponse>;
      resources_by_moderation(kind: string, status: string, options?: { resource_type?: string; type?: string; max_results?: number; next_cursor?: string; direction?: 'asc' | 'desc' }): Promise<SearchApiResponse>;
      search(expression: string, options?: { max_results?: number; next_cursor?: string; with_field?: string }): Promise<SearchApiResponse>;
      tags(options?: { prefix?: string; max_results?: number; next_cursor?: string }): Promise<{ tags: Tag[] }>;
      delete_folder(folder: string): Promise<{ result: string }>;
      root_folders(): Promise<{ folders: Folder[] }>;
      sub_folders(folder: string): Promise<{ folders: Folder[] }>;
      ping(): Promise<{ status: string }>;
      usage(): Promise<{ plan: string; last_updated: string; objects: { used: number; limit: number }; bandwidth: { used: number; limit: number }; storage: { used: number; limit: number }; requests: number; resources: number; derived_resources: number }>;
    };
    image(public_id: string, options?: TransformationOptions & { secure?: boolean; format?: string; type?: string; sign_url?: boolean; auth_token?: string }): string;
    url(public_id: string, options?: TransformationOptions & { resource_type?: string; type?: string; sign_url?: boolean; auth_token?: string; version?: number; secure?: boolean }): string;
    video(public_id: string, options?: TransformationOptions & { resource_type?: 'video'; format?: string; type?: string; sign_url?: boolean; auth_token?: string }): string;
  }

  export const v2: Cloudinary;
  export const v2beta: Cloudinary;
  export function cloudinary(config?: CloudinaryConfig): Cloudinary;
}

declare module 'cloudinary/v2' {
  export * from 'cloudinary';
}

declare module 'cloudinary/uploader' {
  export * from 'cloudinary';
}

declare module 'cloudinary/api' {
  export * from 'cloudinary';
}

declare module 'cloudinary/search' {
  export * from 'cloudinary';
}

declare module 'cloudinary/provisioning' {
  export * from 'cloudinary';
}