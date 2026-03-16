import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';
import { ConfigService } from '@/lib/config-service';

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
    
    for (const field of requiredFields) {
      if (!config[field]) {
        return NextResponse.json(
          { message: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate redirect URIs
    if (!isValidRedirectUri(config.soundcloudRedirectUri) || 
        !isValidRedirectUri(config.spotifyRedirectUri)) {
      return NextResponse.json(
        { message: 'Invalid redirect URI format' },
        { status: 400 }
      );
    }

    const configService = new ConfigService(sql);
    await configService.saveConfig(config);

    return NextResponse.json({ message: 'Configuration saved successfully' });
  } catch (error: any) {
    console.error('Error saving configuration:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const configService = new ConfigService(sql);
    const config = await configService.getConfig();
    
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Error reading configuration:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to read configuration' },
      { status: 500 }
    );
  }
}

function isValidRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}