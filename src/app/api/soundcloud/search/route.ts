import { NextResponse, NextRequest } from 'next/server';
import { rateLimiter } from '@/lib/rateLimit';

// Helper function to extract emails from text
function extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = (text.match(emailRegex) || [])
                     .filter(email => !/agency|management|entertainment|talent|mgmt|booking|press/i.test(email));
    return emails;
}

// Helper function to extract tstack.app links from text
function extractTstackLinks(text: string): string[] {
    const tstackRegex = /https:\/\/tstack\.app\/[a-zA-Z0-9_]+/g;
    return text.match(tstackRegex) || [];
}

export async function GET(request: NextRequest) {
    try {
        // Apply rate limiting
        const rateLimitResponse = await rateLimiter(request, 'soundcloud-search');
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const accessToken = request.cookies.get('accessToken')?.value;

        if (!accessToken) {
            console.error('No access token found. User is not authenticated.');
            return NextResponse.json({ error: 'Unauthorized - No access token' }, { status: 401 });
        }

        const searchQuery = request.nextUrl.searchParams.get('query');

        if (!searchQuery) {
            console.error('No search query provided.');
            return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
        }

        console.log('Received search query:', searchQuery);

        // 1. Search for SoundCloud users
        const userSearchApiUrl = `https://api.soundcloud.com/users?q=${encodeURIComponent(searchQuery)}&limit=1`;

        const userSearchResponse = await fetch(userSearchApiUrl, {
            headers: {
                'accept' : 'application/json; charset=utf-8',
                'Authorization' : `OAuth ${accessToken}`,
            },
        });

        if (!userSearchResponse.ok) {
            console.error('SoundCloud user search API request failed:', userSearchResponse.status, userSearchResponse.statusText);
            return NextResponse.json({ error: 'SoundCloud user search API request failed', details: { status: userSearchResponse.status, text: await userSearchResponse.text() } }, { status: userSearchResponse.status });
        }

        const userData = await userSearchResponse.json();
        console.log('SoundCloud user search response data:', userData);

        if (!userData || userData.length === 0) {
            console.log('No SoundCloud users found for query:', searchQuery);
            return NextResponse.json({ results: [] });
        }

        // 2. Extract user URN and description
        const firstUser = userData[0];
        const userUrn = firstUser.urn;
        const userDescription = firstUser.description || '';

        let webProfiles: any[] = [];

        // 3. Fetch web profiles
        if (userUrn) {
            const webProfilesApiUrl = `https://api.soundcloud.com/users/${userUrn}/web-profiles`;
            const webProfilesResponse = await fetch(webProfilesApiUrl, {
                headers: {
                    'accept' : 'application/json; charset=utf-8',
                    'Authorization' : `OAuth ${accessToken}`,
                },
            });

            if (!webProfilesResponse.ok) {
                console.error('SoundCloud web profiles API request failed:', webProfilesResponse.status, webProfilesResponse.statusText);
            } else {
                webProfiles = await webProfilesResponse.json();
                console.log('SoundCloud web profiles data:', webProfiles);
            }
        }

        // 4. Extract contact information
        const website = firstUser.website || '';
        const instagramUsername = webProfiles.find(profile => profile?.url && profile?.service?.includes('instagram'))?.username || '';
        const instagram = instagramUsername ? `https://instagram.com/${instagramUsername}` : '';
        const tstack = extractTstackLinks(userDescription).join('; ');
        const demoEmail = extractEmails(userDescription).join('; ');
        const soundcloudLink = firstUser.permalink_url || '';

        // 5. Construct the result object
        const result = {
            djName: firstUser.username,
            website: website,
            instagram: instagram,
            demoEmail: demoEmail,
            soundCloud: soundcloudLink,
            tstack: tstack,
            description: userDescription,
        };

        return NextResponse.json({ results: [result] });

    } catch (error) {
        console.error('Error in SoundCloud search API route:', error);
        return NextResponse.json({ error: 'Failed to search SoundCloud', details: String(error) }, { status: 500 });
    }
}
