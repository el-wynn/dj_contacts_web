import { NextResponse, NextRequest } from 'next/server';

function getBaseURL(request: NextRequest): string {
  const host = request.headers.get('host');
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest) {
  console.log('Disconnect endpoint accessed.');

  const response = NextResponse.redirect(new URL('/', getBaseURL(request))); // Redirect to home page

  // Clear the access and refresh tokens by setting maxAge to 0
  try {
    response.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    console.log('Access and refresh tokens cleared.');
  } catch (error) {
    console.error('Error clearing tokens:', error, response.status, response.statusText);
  }
  return response;
}
