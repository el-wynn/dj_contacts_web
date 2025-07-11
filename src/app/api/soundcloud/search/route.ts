import { NextResponse, NextRequest } from 'next/server';
import { rateLimiter } from '@/lib/rateLimit';
import { scrapeEmails } from '@/lib/scraper';
import { extractEmails } from '@/lib/scraper';
import { ContactInfo } from '@/lib/types';
import * as cheerio from 'cheerio';

// Simple in-memory cache with 5 minute TTL
const scrapeCache = new Map<string, {data: any, timestamp: number}>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

function getCachedResult(url: string) {
    const cached = scrapeCache.get(url);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log(`Using cached data for ${url}`);
        return cached.data;
    }
    return null;
}

function setCachedResult(url: string, data: any) {
    scrapeCache.set(url, {
        data,
        timestamp: Date.now()
    });
    console.log(`Cached data for ${url}`);
}

// Helper function to extract tstack.app links from text
function extractTstackLinks(text: string): string[] {
    const tstackRegex = /https:\/\/(www\.)?tstack\.app\/[a-zA-Z0-9_]+/g;
    return text.match(tstackRegex) || [];
}

// Helper function to scrape a website and extract contact information
async function scrapeWebsite(url: string): Promise<ContactInfo> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ContactFinder/1.0)'
            }
        })

        if (!response.ok) {
            console.error(`Failed to fetch website: ${url} - Status: ${response.status} ${response.statusText}`);
            return {};
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        let website = '';
        let instagram = '';
        let demoEmail = '';
        let tstack = '';

        // Extract Instagram link from meta tags (more reliable)
        $('meta[property="og:url"]').each((i, elem) => {
            const content = $(elem).attr('content');
            if (content && content.includes('instagram.com')) {
                instagram = content;
                return false; // Stop after first match
            }
        });

        // Extract all links and search for contact info
        const links: string[] = [];
        $('a').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href) {
                links.push(href);
            }
        });

        const emails: string[] = [];
        for (const link of links) {
            if (link.includes("instagram.com") && !instagram) instagram = link;
            if (link.includes("tstack.app") && !tstack) tstack = link;
        }

        //Extract email addresses
        const extractedEmails = await scrapeEmails(url);
        demoEmail = extractedEmails.join('; ');

        const result = { website, instagram, demoEmail, tstack };
        
        // Update cache
        scrapeCache.set(url, {
            data: result,
            timestamp: Date.now()
        });
        console.log(`Cached data for ${url}`);
        return result;

    } catch (error) {
        console.error(`Error scraping website ${url}:`, error);
        return {};
    }
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
        const tstack = extractTstackLinks(userDescription);
        const demoEmail = extractEmails(userDescription).join('; ');
        const soundcloudLink = firstUser.permalink_url || '';

        // 5. Scrape the website if available and missing info
        let scrapedData: { website?: string; instagram?: string; demoEmail?: string; tstack?: string } = {};
        if (website && (!instagram || !demoEmail || !tstack)) {
            console.log(`Checking website for additional info: ${website}`);
            // Try cache first
            scrapedData = getCachedResult(website) || await scrapeWebsite(website);
        }

        // 6. Construct the result object, prioritize SoundCloud API data
        const result = {
            djName: firstUser.username,
            website: website || scrapedData.website || '', // Prefer API website
            instagram: instagram || scrapedData.instagram || '', // Prefer API instagram
            demoEmail: [demoEmail, scrapedData.demoEmail].filter(Boolean).join('; '), // Add either or concat both
            soundCloud: soundcloudLink,
            tstack: tstack || scrapedData.tstack || '', // Prefer API tstack
            description: userDescription,
        };

        // 4. API Response Consolidation
        const buildApiResponse = (results: ContactInfo[]) => ({
            success: true,
            data: results,
            timestamp: new Date().toISOString()
        });

        // Usage in GET: 
        return NextResponse.json(buildApiResponse([result]));

    } catch (error) {
        console.error('Error in SoundCloud search API route:', error);
        return NextResponse.json({ error: 'Failed to search SoundCloud', details: String(error) }, { status: 500 });
    }
}
