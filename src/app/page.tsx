// c:\\Users\\elwynn\\Documents\\Void0\\dj_contacts_web\\dj_research\\src\\app\\page.tsx
'use client';

import { useState, useEffect } from 'react';

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
                console.error('Error checking auth status:', error);
                setIsAuthenticated(false);
            }
        };

        // Check auth status on component mount
        checkAuthStatus();

        // Periodically trigger the server-side refresh token endpoint
        // The server will handle the actual token expiry check and refresh logic
        const accessTokenRefreshInterval = 59 * 60 * 1000; // Check every 10 seconds for testing

        const intervalId = setInterval(() => {
             console.log('Client-side triggering server-side token refresh attempt...');
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

        document.cookie = `code_verifier=${codeVerifier}; path=/; max-age=3600`;

        const authorizationEndpoint = `https://secure.soundcloud.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri ?? '')}&response_type=code&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`;

        window.location.href = authorizationEndpoint;
    };

    // TODO: Implement terminateAuth function for disconnecting

    return (
        <div className="container mx-auto p-4">
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
                {isAuthenticated ? (
                    <img
                        src="https://connect.soundcloud.com/2/btn-disconnect-l.png"
                        // TODO : onClick={terminateAuth} to disconnect from SoundCloud
                        style={{ cursor: 'not-allowed' }}
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

            <h1 className="text-2xl font-bold mb-4">DJ Contact Scraper</h1>

            {/* Placeholder for genre input form */}
            <div className="mb-4">
                <label htmlFor="genre-input" className="block text-gray-700 text-sm font-bold mb-2">
                    Enter Genre:
                </label>
                <input
                    type="text"
                    id="genre-input"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="e.g., Bassline, UK Garage"
                />
                <button className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                    Search
                </button>
            </div>

            {/* Placeholder for results table */}
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
                        {/* Table rows will be populated with search results */}
                        <tr>
                            <td className="border px-4 py-2"></td>
                            <td className="border px-4 py-2"></td>
                            <td className="border px-4 py-2"></td>
                            <td className="border px-4 py-2"></td>
                            <td className="border px-4 py-2"></td>
                            <td className="border px-4 py-2"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
