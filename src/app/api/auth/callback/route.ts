import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code');

  if (!code) {
    console.error('Missing authorization code.');
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  try {
    const codeVerifier = request.cookies.get('code_verifier')?.value;

    const tokenResponse = await fetch('https://secure.soundcloud.com/oauth/token', {
      method: 'POST',
      headers: {
        'accept' : 'application/json; charset=utf-8',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID || '',
        client_secret: process.env.SOUNDCLOUD_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.NEXT_PUBLIC_SOUNDCLOUD_REDIRECT_URI || '',
        code_verifier: codeVerifier || '',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Failed to obtain access token:', tokenResponse.status, tokenResponse.statusText);
      return NextResponse.json({ error: 'Failed to obtain access token' }, { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token } = tokenData;

    const redirectURL = new URL('/', request.url);
    redirectURL.searchParams.set('access_token', access_token);
    redirectURL.searchParams.set('refresh_token', refresh_token);

    const response = NextResponse.redirect(redirectURL);
    response.cookies.delete('code_verifier');

    try {
      response.cookies.set('accessToken', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 3600, // Token expires in 1 hour
      });
      response.cookies.set('refreshToken', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 3600, // Token expires in 1 hour
      });
    } catch (error) {
      console.error("Error setting cookies from callback");
    }

    return response;

  } catch (error) {
    console.error('Error exchanging authorization code for access token:', error);
    return NextResponse.json({ error: 'Failed to exchange authorization code' }, { status: 500 });
  }
}