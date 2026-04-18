import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';
import { ConfigService } from '@/lib/config-service';
import { generateCodeVerifier, generateState, generateCodeChallenge } from '@/lib/pkce';

const sql = neon(process.env.DATABASE_URL || '');

export async function GET(request: Request) {
  try {
    // Extract provider from query params
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    
    if (!provider || !['spotify', 'soundcloud'].includes(provider)) {
        return NextResponse.json(
            { error: 'Invalid provider' }, 
            { status: 400 }
        );
    }

    const configService = ConfigService.getInstance(sql);
    const config = await configService.getConfig();

    const isProd = process.env.NODE_ENV === 'production';
    const soundcloudClientId = isProd ? config.soundcloudClientId : process.env.NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID || '';
    const soundcloudRedirectUri = isProd ? config.soundcloudRedirectUri : process.env.NEXT_PUBLIC_SOUNDCLOUD_REDIRECT_URI || '';
    const spotifyClientId = isProd ? config.spotifyClientId : process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
    const spotifyRedirectUri = isProd ? config.spotifyRedirectUri : process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || '';

    // Generate code challenge for PKCE
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const codeVerifierKey = `${provider}_code_verifier`;

    // Generate state for CSRF protection
    const state = generateState();
    const stateKey = `${provider}_oauth_state`;

    // Build authorization URL
    let authUrl;
    if (provider === 'soundcloud') {
        authUrl = new URL('https://secure.soundcloud.com/authorize');
        authUrl.searchParams.append('client_id', soundcloudClientId );
        authUrl.searchParams.append('redirect_uri', soundcloudRedirectUri);
    } else if (provider === 'spotify') {
        authUrl = new URL('https://accounts.spotify.com/authorize');
        authUrl.searchParams.append('client_id', spotifyClientId);
        authUrl.searchParams.append('redirect_uri', spotifyRedirectUri);
        authUrl.searchParams.append('scope', 'playlist-read-private user-read-private');
    } else {
        return NextResponse.json(
            { message: 'Error initializating auth URL' },
            { status: 500 }
        );
    }
    
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('state', state);

    // Set state cookie (critical for security)
    const response = NextResponse.redirect(authUrl);
    response.cookies.set({
        name: stateKey,
        value: state,
        //httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 // 60 minutes
    });
    response.cookies.set({
        name: codeVerifierKey,
        value: codeVerifier,
        //httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 // 60 minutes
    });

    return response;
  } catch (error: any) {
    console.error('Error initializating authentication:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to init authentication' },
      { status: 500 }
    );
  }
}