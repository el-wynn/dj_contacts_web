import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';
import { encrypt, decrypt } from '@/lib/crypto';

// Initialize database connection
const sql = neon(process.env.DATABASE_URL || '');

export async function POST(request: Request) {
  try {
    const config = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'soundcloudClientId',
      'soundcloudRedirectUri',
      'spotifyClientId',
      'spotifyRedirectUri'
    ];
    
    // Check that no field is empty
    for (const field of requiredFields) {
      if (!config[field]) {
        return NextResponse.json(
          { message: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    if(!process.env.DB_ENCRYPTION_KEY) {
      return NextResponse.json(
        { message: `Invalid database encryption key` },
        { status: 500 }
      );
    }
    
    // Upsert configuration, encrypting keys
    await sql`
      UPDATE config 
      SET 
        soundcloud_client_id = ${encrypt(config.soundcloudClientId, process.env.DB_ENCRYPTION_KEY)},
        soundcloud_redirect_uri = ${config.soundcloudRedirectUri},
        spotify_client_id = ${encrypt(config.spotifyClientId, process.env.DB_ENCRYPTION_KEY)},
        spotify_redirect_uri = ${config.spotifyRedirectUri},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `;
    
    return NextResponse.json({ message: 'Configuration saved successfully' });
  } catch (error : any) {
    console.error('Error saving configuration:', error);
    return NextResponse.json(
      { message: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await sql`
      SELECT 
        soundcloud_client_id AS "soundcloudClientId",
        soundcloud_redirect_uri AS "soundcloudRedirectUri",
        spotify_client_id AS "spotifyClientId",
        spotify_redirect_uri AS "spotifyRedirectUri"
      FROM config 
      WHERE id = 1
    `;

    const requiredFields = [
      'soundcloudClientId',
      'soundcloudRedirectUri',
      'spotifyClientId',
      'spotifyRedirectUri'
    ];
    
    // Check that no field is empty
    for (const field of requiredFields) {
      if (!result[0][field]) {
        return NextResponse.json(
          { message: `Missing required field on GET: ${field}` },
          { status: 400 }
        );
      }
    }

    if(!process.env.DB_ENCRYPTION_KEY) {
      return NextResponse.json(
        { message: `Invalid database encryption key` },
        { status: 500 }
      );
    }

    result[0]['soundcloudClientId'] = decrypt(result[0]['soundcloudClientId'], process.env.DB_ENCRYPTION_KEY)
    result[0]['spotifyClientId'] = decrypt(result[0]['spotifyClientId'], process.env.DB_ENCRYPTION_KEY)
    console.log(result[0])
    return NextResponse.json(result[0] || {
      soundcloudClientId: '',
      soundcloudRedirectUri: '',
      spotifyClientId: '',
      spotifyRedirectUri: ''
    });
  } catch (error : any) {
    console.error('Error reading configuration:', error);
    return NextResponse.json(
      { message: 'Failed to read configuration' },
      { status: 500 }
    );
  }
}
