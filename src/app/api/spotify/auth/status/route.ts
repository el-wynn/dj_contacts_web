import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const accessToken = request.cookies.get('spotify_access_token')?.value;
    const refreshToken = request.cookies.get('spotify_refresh_token')?.value;

    //console.log('[SP] Access token found:', accessToken ? 'Exists' : 'Does not exist');
    //console.log('[SP] Refresh token found:', refreshToken ? 'Exists' : 'Does not exist');

    // TODO : Validate access token expiry
    if (accessToken) {
        console.log('[SP] Access token exists. User is authenticated.');
        return NextResponse.json({ authenticated: true });
    }

    // If no access token but refresh token exists, try to refresh
    if (refreshToken) {
        console.log('[SP] No access token found, but refresh token exists. Attempting to refresh token with Spotify API directly.');
        try {
             const requestBody = new URLSearchParams({
                refresh_token: refreshToken,
                client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '',
                grant_type: 'refresh_token',
            });

            //console.log('Request body for token refresh:', requestBody.toString());

            const tokenResponse = await fetch('https://secure.soundcloud.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: requestBody,
            });

            console.log('SC: API refresh response status:', tokenResponse.status);
            const responseBody = await tokenResponse.text();
            //console.log('SoundCloud API refresh response body:', responseBody);


            if (tokenResponse.ok) {
                console.log('Token refreshed successfully.');
                const tokenData = JSON.parse(responseBody);
                const { access_token: accessToken, refresh_token: newRefreshToken } = tokenData;

                // Create a response object to set cookies
                const response = NextResponse.json({ authenticated: true });

                // Always set the new access token cookie
                response.cookies.set('spotify_access_token', accessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 3600, // Token expires in 1 hour
                });

                // **Explicitly update the refresh token cookie if a new one is provided**
                if (newRefreshToken) {
                    console.log('[SP] New refresh token received. Updating refresh token cookie.');
                    response.cookies.set('spotify_refresh_token', newRefreshToken, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        path: '/',
                        maxAge: 3600 * 24 * 30, // 30 days
                    });
                } else {
                    console.log('[SP] No new refresh token received. Keeping existing refresh token cookie.');
                    // If no new refresh token is provided, the existing one might still be valid,
                    // but in many implementations, it's a rolling window.
                    // We'll keep the existing one for now if no new one is sent.
                }

                return response;

            } else {
                console.error('Failed to refresh token with Spotify API.');
                 // Attempt to parse JSON error body if available
                try {
                    const errorData = JSON.parse(responseBody);
                    console.error('Spotify API error details:', errorData);
                    // If refresh fails, the refresh token might be invalid/expired. Clear cookies.
                    const errorResponse = NextResponse.json({ authenticated: false, error: 'Failed to refresh token', details: errorData }, { status: tokenResponse.status });
                    errorResponse.cookies.delete('spotify_access_token');
                    errorResponse.cookies.delete('spotify_refresh_token');
                    return errorResponse;
                } catch (error) {
                    const errorResponse = NextResponse.json({ authenticated: false, error, details: responseBody }, { status: tokenResponse.status });
                    errorResponse.cookies.delete('spotify_access_token');
                    errorResponse.cookies.delete('spotify_refresh_token');
                    return errorResponse;
                }
            }
        } catch (error) {
            console.error('[SP] Error during token refresh process:', error);
            const errorResponse = NextResponse.json({ authenticated: false, error, details: 'Error during refresh process' }, { status: 500 });
            errorResponse.cookies.delete('spotify_access_token');
            errorResponse.cookies.delete('spotify_refresh_token');
            return errorResponse;
        }
    }

    // If neither token exists
    console.log('[SP] Neither access nor refresh token found. User is not authenticated.');
    const response = NextResponse.json({ authenticated: false });
    response.cookies.delete('spotify_access_token'); // Ensure no stale cookies remain
    //response.cookies.delete('spotify_refresh_token');
    return response;
}