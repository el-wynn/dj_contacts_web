import { NextResponse, NextRequest } from 'next/server';

function getBaseURL(request: NextRequest): string {
  const host = request.headers.get('host');
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const baseURL = getBaseURL(request);

  /*console.log('Incoming Request:', {
     url: baseURL,
    requestURL: request.url,
    headers: Object.fromEntries(request.headers),
    cookies: request.cookies.getAll()
  }); */

  // Handle OAuth errors first
  if (error) {
    console.error('Spotify OAuth error:', error);
    return NextResponse.redirect(new URL(`/?error=${error}`, baseURL));
  }

  // Verify state matches cookie
  let expectedState = request.cookies.get('spotify_oauth_state')?.value;

  // if not in cookies, use local statestore
  /* if (!savedState) {
    const sessionId = searchParams.get('session_id');
    const manualState = (sessionId && process.env.NODE_ENV === 'development')
      ? (await import('@/lib/statestore')).getState(sessionId)
      : null;
    
    if (manualState) {
      console.warn('Using manual state fallback');
      expectedState = manualState;
    }
  } */

  if (!state || !expectedState || state !== expectedState) {
    console.error('State mismatch or missing');
    request.cookies.delete('spotify_oauth_state');
    return NextResponse.redirect(new URL('/?error=state_mismatch', baseURL));
  }

  if (!code) {
    console.error('Missing authorization code');
    return NextResponse.redirect(new URL('/?error=missing_code', baseURL));
  }

  try {
    const codeVerifier = request.cookies.get('spotify_code_verifier')?.value;

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id : process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '',
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || '',
        code_verifier: codeVerifier || '',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      throw new Error(errorData.error_description || 'Token exchange failed');
    }

    const { access_token, refresh_token, expires_in } = await tokenResponse.json();

    const response = NextResponse.redirect(new URL('/', baseURL));
    
    // Set cookies using request.cookies
    response.cookies.set({
      name: 'spotify_access_token',
      value: access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expires_in || 3600, // 1 hour
    });

    if (refresh_token) {
      response.cookies.set({
        name: 'spotify_refresh_token',
        value: refresh_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    // Clean up cookies
    response.cookies.delete('spotify_oauth_state');
    response.cookies.delete('spotify_code_verifier');

    return response;

  } catch (err) {
    console.error('Spotify callback error:', err);
    const response = NextResponse.redirect(
      new URL('/?error=authentication_failed', baseURL)
    );
    // Clear auth cookies on error
    response.cookies.delete('spotify_access_token');
    response.cookies.delete('spotify_refresh_token');
    return response;
  }
}