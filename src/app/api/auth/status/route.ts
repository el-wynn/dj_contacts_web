import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const accessToken = request.cookies.get('accessToken')?.value;
    const refreshToken = request.cookies.get('refreshToken')?.value;

    console.log('Auth status endpoint accessed.');
    console.log('Access token found:', accessToken ? 'Exists' : 'Does not exist');
    console.log('Refresh token found:', refreshToken ? 'Exists' : 'Does not exist');


    // In a real app, you'd validate access token expiry here.
    // For simplicity, we'll assume if accessToken exists, it's valid for this check.
    // TODO : Validate access token expiry
    if (accessToken) {
        console.log('Access token exists. User is authenticated.');
        return NextResponse.json({ authenticated: true });
    }

    // If no access token but refresh token exists, try to refresh
    if (refreshToken) {
        console.log('No access token found, but refresh token exists. Attempting to refresh token with SoundCloud API directly.');
        try {
             const requestBody = new URLSearchParams({
                refresh_token: refreshToken,
                client_id: process.env.NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID || '',
                client_secret: process.env.SOUNDCLOUD_CLIENT_SECRET || '',
                grant_type: 'refresh_token',
                 // SoundCloud might require redirect_uri even for refresh - removed based on previous code structure
                // redirect_uri: process.env.NEXT_PUBLIC_SOUNDCLOUD_REDIRECT_URI || '',
            });

            console.log('Request body for token refresh:', requestBody.toString());

            const tokenResponse = await fetch('https://secure.soundcloud.com/oauth/token', {
                method: 'POST',
                headers: {
                    'accept': 'application/json; charset=utf-8',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: requestBody,
            });

            console.log('SoundCloud API refresh response status:', tokenResponse.status);
             const responseBody = await tokenResponse.text();
             console.log('SoundCloud API refresh response body:', responseBody);


            if (tokenResponse.ok) {
                console.log('Token refreshed successfully.');
                const tokenData = JSON.parse(responseBody);
                const { access_token, refresh_token: newRefreshToken } = tokenData;

                // Create a response object to set cookies
                const response = NextResponse.json({ authenticated: true });

                // Always set the new access token cookie
                 response.cookies.set('accessToken', access_token, {
                     httpOnly: true,
                     secure: process.env.NODE_ENV === 'production',
                     path: '/',
                     maxAge: 3600, // Token expires in 1 hour
                 });

                // **Explicitly update the refresh token cookie if a new one is provided**
                 if (newRefreshToken) {
                     console.log('New refresh token received. Updating refresh token cookie.');
                     response.cookies.set('refreshToken', newRefreshToken, {
                         httpOnly: true,
                         secure: true,
                         sameSite: 'lax',
                         path: '/',
                          // Set appropriate maxAge for refresh token (or leave as session)
                          // maxAge: 3600 * 24 * 30, // Example: 30 days
                     });
                 } else {
                     console.log('No new refresh token received. Keeping existing refresh token cookie.');
                     // If no new refresh token is provided, the existing one might still be valid,
                     // but in many implementations, it's a rolling window.
                     // We'll keep the existing one for now if no new one is sent.
                 }

                 return response;

            } else {
                console.error('Failed to refresh token with SoundCloud API.');
                 // Attempt to parse JSON error body if available
                try {
                    const errorData = JSON.parse(responseBody);
                     console.error('SoundCloud API error details:', errorData);
                     // If refresh fails, the refresh token might be invalid/expired. Clear cookies.
                     const errorResponse = NextResponse.json({ authenticated: false, error: 'Failed to refresh token', details: errorData }, { status: tokenResponse.status });
                     errorResponse.cookies.delete('accessToken');
                     errorResponse.cookies.delete('refreshToken');
                     return errorResponse;
                } catch (e) {
                     const errorResponse = NextResponse.json({ authenticated: false, error: 'Failed to refresh token', details: responseBody }, { status: tokenResponse.status });
                     errorResponse.cookies.delete('accessToken');
                     errorResponse.cookies.delete('refreshToken');
                     return errorResponse;
                }
            }
        } catch (error: any) {
            console.error('Error during token refresh process:', error);
             const errorResponse = NextResponse.json({ authenticated: false, error: 'Error during refresh process', details: error.message }, { status: 500 });
             errorResponse.cookies.delete('accessToken');
             errorResponse.cookies.delete('refreshToken');
            return errorResponse;
        }
    }

    // If neither token exists
    console.log('Neither access nor refresh token found. User is not authenticated.');
     const response = NextResponse.json({ authenticated: false });
     response.cookies.delete('accessToken'); // Ensure no stale cookies remain
     response.cookies.delete('refreshToken');
    return response;
}