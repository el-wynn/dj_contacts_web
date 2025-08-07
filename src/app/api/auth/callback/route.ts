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
  const expectedState = request.cookies.get('soundcloud_oauth_state')?.value;

  // Verify state parameter matches expected value
  if (!state || !expectedState || state !== expectedState) {
    console.error('Invalid state parameter');
    return NextResponse.json({ error: 'Authentication failed' }, { status: 400 });
  }

  if (!code) {
    console.error('Missing authorization code.');
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  try {
    const codeVerifier = request.cookies.get('soundcloud_code_verifier')?.value;

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

    const response = NextResponse.redirect(new URL('/', getBaseURL(request)));
    response.cookies.delete('soundcloud_code_verifier');

    try {
      response.cookies.set({
        name: 'soundcloud_access_token',
        value: access_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 3600, // Token expires in 1 hour
      });
      response.cookies.set({
        name: 'soundcloud_refresh_token', 
        value: refresh_token, 
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 30 * 3600, // Token expires in 30 days
      });
    } catch (error) {
      console.error("Error setting cookies from callback", error);
    }

    return response;

    } catch (error) {
      console.error('Error during authentication:', error);
      return NextResponse.json(
        { error, message: 'Authentication failed' }, 
        { 
          status: 500,
          headers: {
            'Clear-Site-Data': '"cookies"'
          }
        }
      );
    }
}