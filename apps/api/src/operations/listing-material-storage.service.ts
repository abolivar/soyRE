import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const BUCKET = 'listing-materials';

@Injectable()
export class ListingMaterialStorageService {
  private client?: SupabaseClient;

  async upload(input: {
    organizationId: string;
    listingId: string;
    fileName: string;
    mimeType: string;
    contents: Buffer;
  }) {
    const safeName =
      input.fileName
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(-120) || 'material';
    const path = `${input.organizationId}/${input.listingId}/${randomUUID()}-${safeName}`;
    const { error } = await this.storage()
      .from(BUCKET)
      .upload(path, input.contents, {
        cacheControl: '3600',
        contentType: input.mimeType,
        upsert: false,
      });
    if (error) {
      throw new ServiceUnavailableException(
        'Commercial material could not be stored.',
      );
    }
    return path;
  }

  async remove(path: string) {
    await this.storage().from(BUCKET).remove([path]);
  }

  async signedUrl(path: string) {
    const { data, error } = await this.storage()
      .from(BUCKET)
      .createSignedUrl(path, 60);
    if (error || !data.signedUrl) {
      throw new ServiceUnavailableException(
        'Commercial material preview is unavailable.',
      );
    }
    return data.signedUrl;
  }

  private storage() {
    if (this.client) return this.client.storage;
    const url = process.env.SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!url || !secret) {
      throw new ServiceUnavailableException(
        'Private material storage is not configured.',
      );
    }
    this.client = createClient(url, secret, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    return this.client.storage;
  }
}
