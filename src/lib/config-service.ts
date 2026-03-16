import { NeonQueryFunction } from '@neondatabase/serverless';
import { encrypt, decrypt } from './crypto';

// Type definition for the configuration object
export type AppConfig = {
  soundcloudClientId: string;
  soundcloudRedirectUri: string;
  spotifyClientId: string;
  spotifyRedirectUri: string;
};

/* // Type definition for the raw database row
type ConfigRow = {
  soundcloud_client_id: string | null;
  soundcloud_redirect_uri: string | null;
  spotify_client_id: string | null;
  spotify_redirect_uri: string | null;
}; */

// Cache structure
interface CacheEntry {
  config: AppConfig;
  timestamp: number;
}

export class ConfigService {
  private sql: NeonQueryFunction<false, false>;
  private static instance: ConfigService | null = null;
  
  // Instance-level cache to survive hot-reloads better than module scope
  private cache: CacheEntry | null = null;
  private readonly MAX_AGE = 60 * 60 * 1000; // 60 minutes

  private constructor(sql: NeonQueryFunction<false, false>) {
    this.sql = sql;
  }

  /**
   * Factory method to get or create the singleton instance
   * In Next.js Server Actions, you might instantiate this directly per call
   * depending on your pooling strategy.
   */
  static getInstance(sql: NeonQueryFunction<false, false>): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService(sql);
    }
    return ConfigService.instance;
  }

  private getEncryptionKey(): string {
    const key = process.env.DB_ENCRYPTION_KEY;
    if (!key) {
      console.error('DB_ENCRYPTION_KEY is not set in environment variables');
      throw new Error('Missing encryption key');
    }
    return key;
  }

  async getConfig(): Promise<AppConfig> {
    // Check cache
    if (this.cache && Date.now() - this.cache.timestamp < this.MAX_AGE) {
      console.log("[CONFIG] Using Cache")
      return this.cache.config;
    }

    try {
      const key = this.getEncryptionKey();

      const result = await this.sql`
        SELECT 
          soundcloud_client_id,
          soundcloud_redirect_uri,
          spotify_client_id,
          spotify_redirect_uri
        FROM config 
        WHERE id = 1
        LIMIT 1
      `;

      let config: AppConfig;

      if (result.length === 0 || !result[0]) {
        config = this.getDefaultConfig();
      } else {
        const row = result[0];
        config = {
          soundcloudClientId: row.soundcloud_client_id 
            ? decrypt(row.soundcloud_client_id, key) 
            : '',
          soundcloudRedirectUri: row.soundcloud_redirect_uri || '',
          spotifyClientId: row.spotify_client_id 
            ? decrypt(row.spotify_client_id, key) 
            : '',
          spotifyRedirectUri: row.spotify_redirect_uri || ''
        };
      }

      // Update cache
      this.cache = {
        config,
        timestamp: Date.now()
      };

      console.log("[CONFIG] New Confing")
      return config;
    } catch (error) {
      console.error('Database error in getConfig:', error);
      // Fallback to default config on error to prevent app crash
      console.log("[CONFIG] Empty Confing")
      return this.getDefaultConfig();
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    const key = this.getEncryptionKey();

    // Invalidate cache immediately
    this.cache = null;

    const encryptedConfig = {
      soundcloudClientId: encrypt(config.soundcloudClientId, key),
      soundcloudRedirectUri: config.soundcloudRedirectUri,
      spotifyClientId: encrypt(config.spotifyClientId, key),
      spotifyRedirectUri: config.spotifyRedirectUri
    };

    try {
      await this.sql`
        INSERT INTO config (
          id,
          soundcloud_client_id,
          soundcloud_redirect_uri,
          spotify_client_id,
          spotify_redirect_uri,
          updated_at
        ) VALUES (
          1,
          ${encryptedConfig.soundcloudClientId},
          ${encryptedConfig.soundcloudRedirectUri},
          ${encryptedConfig.spotifyClientId},
          ${encryptedConfig.spotifyRedirectUri},
          CURRENT_TIMESTAMP
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
      throw new Error('Failed to save configuration');
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