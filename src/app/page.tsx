'use client';
import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';

// Functions for SoundCloud PKCE Auth (kept as they are used by initiateAuth)
function generateCodeVerifier(length: number = 128): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
    const digest = await sha256(codeVerifier);
    const buffer = new Uint8Array(digest);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    return challenge;
}

async function sha256(plain: string) {
    const utf8 = new TextEncoder().encode(plain);
    const digest = await window.crypto.subtle.digest('SHA-256', utf8);
    return digest;
}
// End SoundCloud PKCE Auth functions


export default function Home() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // State to control UI elements based on auth status
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]); // Replace 'any' with a proper type

    useEffect(() => {
        // Function to check authentication status using the server-side endpoint
        const checkAuthStatus = async () => {
            try {
                const response = await fetch('/api/auth/status');
                if (response.ok) {
                    const data = await response.json();
                    setIsAuthenticated(data.authenticated);
                } else {
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Error checking auth status');
                setIsAuthenticated(false);
            }
        };

        // Check auth status on component mount
        checkAuthStatus();

        // Periodically trigger the server-side refresh token endpoint
        // The server will handle the actual token expiry check and refresh logic
        const accessTokenRefreshInterval = 360000; // Check every hour for testing

        const intervalId = setInterval(() => {
             // Call the status endpoint, which will internally trigger refresh if needed
             checkAuthStatus();
         }, accessTokenRefreshInterval);


        return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }, []); // Empty dependency array to run once on mount

    const initiateAuth = async () => {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        const clientId = process.env.NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID;
        const redirectUri = process.env.NEXT_PUBLIC_SOUNDCLOUD_REDIRECT_URI;
        const state = generateCodeVerifier(32);

        // Set secure cookies for PKCE and state parameters
        const cookieOptions = process.env.NODE_ENV === 'production' ? 
            `; path=/; secure; sameSite=strict; max-age=3600` : 
            `; path=/; max-age=3600`;

        document.cookie = `code_verifier=${codeVerifier}${cookieOptions}`;
        document.cookie = `oauth_state=${state}${cookieOptions}`;

        const authorizationEndpoint = `https://secure.soundcloud.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri ?? '')}&response_type=code&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`;

        window.location.href = authorizationEndpoint;
    };

    const terminateAuth = async () => {
        try {
            const response = await fetch('/api/auth/disconnect');
            if (response.ok) {
                console.log('Successfully disconnected from SoundCloud.');
                // Refresh the page or update the isAuthenticated state (client side) to reflect disconnection.
                setIsAuthenticated(false);
            } else {
                console.error('Failed to disconnect from SoundCloud');
            }
        } catch (error) {
            console.error('Error calling disconnect endpoint');
        }
    };

    const sanitizeArtistInput = (input: string): string => {
        return input
            .replace(/[^a-zA-Z0-9\s,\-_]/g, '')
            .substring(0, 100);
    };

    const handleSearch = async () => {
        const sanitizedQuery = sanitizeArtistInput(searchQuery);
        const artistList = sanitizedQuery.split(',')
            .map(artist => artist.trim().toLowerCase())
            .filter(artist => artist.length > 0);

        if (artistList.length === 0) {
            alert('Please enter valid artist names');
            return;
        }

        let allResults: any[] = [];
        const uniqueArtists = [...new Set(artistList)];

        for (const artist of uniqueArtists) {
            try {
                const response = await fetch(`/api/soundcloud/search?query=${encodeURIComponent(artist)}`);
                if (response.ok && response.status == 200) {
                    const data = await response.json();
                    allResults = allResults.concat(data.results);
                } else if (response.status == 429) {
                    alert("Too many requests. Please wait for a minute or retry tomorrow.");
                } else {
                    console.error(`SoundCloud search API error for ${artist}:`);
                }
            } catch (error) {
                console.error(`Error calling SoundCloud search API for ${artist}:`);
            }
        }
        setSearchResults(allResults);
    };

    return (
        <div className="container mx-auto p-4">
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
                {isAuthenticated ? (
                    <img
                        src="https://connect.soundcloud.com/2/btn-disconnect-l.png"
                        onClick={terminateAuth}
                        style={{ cursor: 'pointer' }}
                        alt="Disconnect from SoundCloud"
                    ></img>
                ) : (
                    <img
                        src="https://connect.soundcloud.com/2/btn-connect-sc-l.png"
                        onClick={initiateAuth}
                        style={{ cursor: 'pointer' }} 
                        alt="Connect to SoundCloud"
                    ></img>
                )}
            </div>

            <h1 className="text-2xl font-bold mb-4">DJ Contact Researcher</h1>

            {/* Artist input form */}
            <div className="mb-4">
                <label htmlFor="artist-input" className="block text-gray-700 text-sm font-bold mb-2">
                    Enter Artists (comma-separated):
                </label>
                <input
                    type="text"
                    id="artist-input"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="e.g., Disclosure, Gorgon City, MK, JBoi"
                    value={searchQuery}
                    onChange={(e) => {
                        const cleanValue = e.target.value
                            .replace(/[^a-zA-Z0-9\s,\-_]/g, '');
                        setSearchQuery(cleanValue);
                    }}
                    maxLength={500}
                />
                <button className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  onClick={handleSearch}
                >
                    Search
                </button>
            </div>

            {/* Results table */}
            <div>
                <h2 className="text-xl font-semibold mb-2">Search Results</h2>
                <table className="table-auto w-full">
                    <thead>
                        <tr>
                            <th className="px-4 py-2">DJ Name</th>
                            <th className="px-4 py-2">Website</th>
                            <th className="px-4 py-2">Instagram</th>
                            <th className="px-4 py-2">Promo/Demo Email</th>
                            <th className="px-4 py-2">SoundCloud</th>
                            <th className="px-4 py-2">tstack.app</th>
                        </tr>
                    </thead>
                    <tbody>
                        {searchResults.map((result: any, index: number) => (
                            <tr key={index}>
                                <td className="border px-4 py-2">
                                    {DOMPurify.sanitize(result.djName || '')}
                                </td>
                                <td className="border px-4 py-2">
                                    {result.website ? (
                                        <a 
                                            href={DOMPurify.sanitize(result.website)} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-blue-500"
                                        >
                                            Website
                                        </a>
                                    ) : null}
                                </td>
                                <td className="border px-4 py-2">
                                    {result.instagram ? (
                                        <a 
                                            href={DOMPurify.sanitize(result.instagram)} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-blue-500"
                                        >
                                            {DOMPurify.sanitize(result.instagram)}
                                        </a>
                                    ) : null}
                                </td>
                                <td className="border px-4 py-2">
                                    {DOMPurify.sanitize(result.demoEmail || '')}
                                </td>
                                <td className="border px-4 py-2">
                                    {result.soundCloud ? (
                                        <a 
                                            href={DOMPurify.sanitize(result.soundCloud)} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-blue-500"
                                        >
                                            {DOMPurify.sanitize(result.soundCloud)}
                                        </a>
                                    ) : null}
                                </td>
                                <td className="border px-4 py-2">
                                    {DOMPurify.sanitize(result.tstack || '')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
