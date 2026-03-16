import { NeonQueryFunction } from '@neondatabase/serverless';
import { encrypt, decrypt } from './crypto';

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || '';

if (!ENCRYPTION_KEY) {
  console.error('DB_ENCRYPTION_KEY is not set in environment variables');
  throw new Error('Missing encryption key');
}

export type AppConfig = {
  soundcloudClientId: string;
  soundcloudRedirectUri: string;
  spotifyClientId: string;
  spotifyRedirectUri: string;
};

export class ConfigService {
  private sql: NeonQueryFunction<false,false>;

  constructor(sql: NeonQueryFunction<false,false>) {
    this.sql = sql;
  }

  async getConfig(): Promise<AppConfig> {
    try {
      const result = await this.sql`
        SELECT 
          soundcloud_client_id,
          soundcloud_redirect_uri,
          spotify_client_id,
          spotify_redirect_uri
        FROM config 
        WHERE id = 1
      `;

      if (result.length === 0) {
        return this.getDefaultConfig();
      }

      return {
        soundcloudClientId: result[0].soundcloud_client_id ? 
          decrypt(result[0].soundcloud_client_id, ENCRYPTION_KEY) : '',
        soundcloudRedirectUri: result[0].soundcloud_redirect_uri || '',
        spotifyClientId: result[0].spotify_client_id ? 
          decrypt(result[0].spotify_client_id, ENCRYPTION_KEY) : '',
        spotifyRedirectUri: result[0].spotify_redirect_uri || ''
      };
    } catch (error) {
      console.error('Database error in getConfig:', error);
      return this.getDefaultConfig();
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    // Encrypt sensitive data
    const encryptedConfig = {
      soundcloudClientId: encrypt(config.soundcloudClientId, ENCRYPTION_KEY),
      soundcloudRedirectUri: config.soundcloudRedirectUri,
      spotifyClientId: encrypt(config.spotifyClientId, ENCRYPTION_KEY),
      spotifyRedirectUri: config.spotifyRedirectUri
    };

    try {
      // Use upsert pattern instead of separate update/insert
      await this.sql`
        INSERT INTO config (
          id,
          soundcloud_client_id,
          soundcloud_redirect_uri,
          spotify_client_id,
          spotify_redirect_uri
        ) VALUES (
          1,
          ${encryptedConfig.soundcloudClientId},
          ${encryptedConfig.soundcloudRedirectUri},
          ${encryptedConfig.spotifyClientId},
          ${encryptedConfig.spotifyRedirectUri}
        )
        ON CONFLICT (id) DO UPDATE SET
          soundcloud_client_id = EXCLUDED.soundcloud_client_id,
          soundcloud_redirect_uri = EXCLUDED.soundcloud_redirect_uri,
          spotify_client_id = EXCLUDED.spotify_client_id,
          spotify_redirect_uri = EXCLUDED.spotify_redirect_uri,
          updated_at = CURRENT_TIMESTAMP
      `;
    } catch (error) {
      console.error('Database error in saveConfig:', error);
      throw new Error('Database error while saving configuration');
    }
  }

  private getDefaultConfig(): AppConfig {
    return {
      soundcloudClientId: '',
      soundcloudRedirectUri: '',
      spotifyClientId: '',
      spotifyRedirectUri: ''
    };
  }
}