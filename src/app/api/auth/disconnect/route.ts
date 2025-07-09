// c:\\Users\\elwynn\\Documents\\Void0\\dj_contacts_web\\dj_research\\src\\app\\api\\auth\\disconnect\\route.ts
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('Disconnect endpoint accessed.');

  const response = NextResponse.redirect(new URL('/', request.url)); // Redirect to home page

  // Clear the access and refresh tokens by setting maxAge to 0
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
  return response;
}
