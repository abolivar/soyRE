import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const BUSINESS_DOCUMENTS_BUCKET = 'business-documents';

@Injectable()
export class SupabaseDocumentStorageService {
  private client: SupabaseClient | null = null;

  async upload(path: string, content: Buffer, contentType: string) {
    const { error } = await this.storage().upload(path, content, {
      cacheControl: '3600',
      contentType,
      upsert: false,
    });
    if (error) {
      throw new ServiceUnavailableException(
        `Private document storage upload failed: ${error.message}`,
      );
    }
  }

  async remove(path: string) {
    const { error } = await this.storage().remove([path]);
    if (error) {
      throw new ServiceUnavailableException(
        `Private document storage cleanup failed: ${error.message}`,
      );
    }
  }

  async createSignedDownload(path: string, fileName: string, expiresIn = 60) {
    const { data, error } = await this.storage().createSignedUrl(
      path,
      expiresIn,
      { download: fileName },
    );
    if (error || !data?.signedUrl) {
      throw new ServiceUnavailableException(
        `Private document download signing failed: ${error?.message ?? 'No URL returned.'}`,
      );
    }
    return { signedUrl: data.signedUrl, expiresIn };
  }

  private storage() {
    return this.getClient().storage.from(BUSINESS_DOCUMENTS_BUCKET);
  }

  private getClient() {
    if (this.client) return this.client;
    const url = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!url || !secretKey) {
      throw new ServiceUnavailableException(
        'Private document storage is not configured on this API instance.',
      );
    }
    this.client = createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return this.client;
  }
}
