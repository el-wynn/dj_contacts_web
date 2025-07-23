import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors first
  if (error) {
    console.error('Spotify OAuth error:', error);
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
  }

  // Verify state matches cookie
  const savedState = request.cookies.get('spotify_oauth_state')?.value;
  if (!state || !savedState || state !== savedState) {
    console.error('State mismatch or missing');
    return NextResponse.redirect(new URL('/?error=state_mismatch', request.url));
  }

  if (!code) {
    console.error('Missing authorization code');
    return NextResponse.redirect(new URL('/?error=missing_code', request.url));
  }

  try {
    const authString = Buffer.from(
      `${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || '',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      throw new Error(errorData.error_description || 'Token exchange failed');
    }

    const { access_token, refresh_token, expires_in } = await tokenResponse.json();

    const response = NextResponse.redirect(new URL('/', request.url));
    
    // Set cookies using request.cookies
    response.cookies.set({
      name: 'spotify_access_token',
      value: access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expires_in,
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

    // Clean up state cookie
    response.cookies.delete('spotify_oauth_state');

    return response;

  } catch (err) {
    console.error('Spotify callback error:', err);
    const response = NextResponse.redirect(
      new URL('/?error=authentication_failed', request.url)
    );
    // Clear auth cookies on error
    response.cookies.delete('spotify_access_token');
    response.cookies.delete('spotify_refresh_token');
    return response;
  }
}