'use client';
import { useState, useEffect } from 'react';
import { ContactInfo } from '@/lib/types';
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/pkce';
import Papa from 'papaparse';
import DOMPurify from 'dompurify';
import { saveState } from '@/lib/statestore';
import SpotifyPlaylistProcessor from '@/components/SpotifyPlaylistProcessor';


export default function Home() {
    const [isSoundCloudAuth, setIsSoundCloudAuth] = useState<boolean>(false); // State to control UI elements based on auth status
    const [isSpotifyAuth, setIsSpotifyAuth] = useState<boolean>(false); // State to control UI elements based on auth status
    const [isSearching, setIsSearching] = useState<boolean>(false); // State to control UI elements while searching
    const [currentArtist, setCurrentArtist] = useState<string>(''); // State to display current artist being searched
    const [hasSearched, setHasSerached] = useState<boolean>(false); // State to display table when search is done
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]); // Replace 'any' with a proper type
    //const [csvFile, setCsvFile] = useState<File | null>(null);
    //const [csvError, setCsvError] = useState<string | null>(null);
    const [notFoundArtists, setNotFoundArtists] = useState<string[]>([]);
    

    useEffect(() => {
        // Function to check authentication status using the server-side endpoint
        const checkSoundCloudAuthStatus = async () => {
            // TODO : Loading state
            try {
                const response = await fetch('/api/soundcloud/auth/status');
                if (response.ok) {
                    const data = await response.json();
                    setIsSoundCloudAuth(data.authenticated);
                } else {
                    setIsSoundCloudAuth(false);
                }
            } catch (error) {
                console.error('Error checking SoundCloud auth status : ' + error);
                setIsSoundCloudAuth(false);
            }
        };

        // Check auth status on component mount
        checkSoundCloudAuthStatus();

        const checkSpotifyAuthStatus = async () => {
            // TODO : Loading state
            try {
                const response = await fetch('/api/spotify/auth/status');
                if (response.ok) {
                    const data = await response.json();
                    setIsSpotifyAuth(data.authenticated);
                } else {
                    setIsSpotifyAuth(false);
                }
            } catch (error) {
                console.error('Error checking Spotify auth status : ' + error);
                setIsSpotifyAuth(false);
            }
        };

        checkSpotifyAuthStatus();

        // Periodically trigger the server-side refresh token endpoint
        // The server will handle the actual token expiry check and refresh logic
        const accessTokenRefreshInterval = 360000; // Check every hour for testing

        const intervalId = setInterval(() => {
             // Call the status endpoint, which will internally trigger refresh if needed
             checkSoundCloudAuthStatus();
         }, accessTokenRefreshInterval);


        return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }, []); // Empty dependency array to run once on mount

    useEffect(() => {
        document.body.style.cursor = isSearching ? 'wait' : 'default';
        return () => {
            document.body.style.cursor = 'default'; // Clean up on unmount
        };
    }, [isSearching]);

    const initiateSoundCloudAuth = async () => {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const state = generateCodeVerifier(32);

        const clientId = process.env.NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID;
        const redirectUri = process.env.NEXT_PUBLIC_SOUNDCLOUD_REDIRECT_URI;

        // Set secure cookies for PKCE and state parameters
        const cookieOptions = process.env.NODE_ENV === 'production' ? 
            `; path=/; secure; sameSite=lax; max-age=3600` : 
            `; path=/; max-age=3600`;

        document.cookie = `soundcloud_code_verifier=${codeVerifier}${cookieOptions}`;
        document.cookie = `soundcloud_oauth_state=${state}${cookieOptions}`;

        const authorizationEndpoint = `https://secure.soundcloud.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri ?? '')}&response_type=code&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`;

        window.location.href = authorizationEndpoint;
    };

    const initiateSpotifyAuth = async () => {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const state = generateCodeVerifier(32);

        const sessionId = crypto.randomUUID(); // or use a simple timestamp
        saveState(sessionId, state);

        console.log(state);

        const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";
        const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "";

        // Set secure cookies for PKCE and state parameters
        const cookieOptions = process.env.NODE_ENV === 'production' ? 
            `; path=/; secure; sameSite=lax; max-age=3600` : 
            `; path=/; domain=127.0.0.1; max-age=3600`; 
        document.cookie = `spotify_code_verifier=${codeVerifier}${cookieOptions}`;
        document.cookie = `spotify_oauth_state=${state}${cookieOptions}`;

        const authUrl = new URL("https://accounts.spotify.com/authorize");
        const params =  {
            response_type: 'code',
            client_id: clientId,
            scope: 'playlist-read-private playlist-read-collaborative',
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            redirect_uri: redirectUri,
            state: state,
            session_id: sessionId,
        }

        authUrl.search = new URLSearchParams(params).toString();
        window.location.href = authUrl.toString();
    };

    const terminateSoundCloudAuth = async () => {
        try {
            const response = await fetch('/api/soundcloud/auth/disconnect');
            if (response.ok) {
                console.log('Successfully disconnected from SoundCloud.');
                // Refresh the page or update the isAuthenticated state (client side) to reflect disconnection.
                setIsSoundCloudAuth(false);
            } else {
                console.error('Failed to disconnect from SoundCloud');
            }
        } catch (error) {
            console.error('Error calling disconnect endpoint : ' + error);
        }
    };

    /*
    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'text/csv') {
            setCsvFile(file);
            setCsvError(null);
        } else {
            setCsvFile(null);
            setCsvError('Invalid file type. Please select a CSV file.');
        }
    };
    
    const parseImportedCSV = async () => {
        if (!csvFile) {
            setCsvError('Please select a CSV file.');
            return;
        }
    
        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvText = event.target?.result as string;
            // TODO: Implement CSV parsing and validation logic here
            // For example, using a library like "papaparse"
            // After parsing, update the "searchResults" state

            console.log('CSV Content:', csvText);
            alert('Parsing logic to be implemented. Check console for CSV content.');
        };
        reader.onerror = () => {
            setCsvError('Error reading CSV file.');
        };
        reader.readAsText(csvFile);
    };
    */

    const sanitizeArtistInput = (input: string): string => {
        return input
            .replace(/[^a-zA-Z0-9\s,\-_]/g, '')
            //.substring(0, 100);
    };

    const handleEnter = (e: { key: string; }) => {
        if (e.key === 'Enter') handleSearch();
    }

    const handleSearch = async () => {
        const sanitizedQuery = sanitizeArtistInput(searchQuery);
        const artistList = sanitizedQuery.split(',')
            .map(artist => artist.trim())
            .filter(artist => artist.length > 0);

        if (artistList.length === 0) {
            alert('Please enter valid artist names');
            return;
        }

        setIsSearching(true);

        let allResults: any[] = [];
        const uniqueArtists = [...new Set(artistList)];
        const notFound: string[] = [];

        for (const artist of uniqueArtists) {
            setCurrentArtist(artist);
            try {
                const response = await fetch(`/api/soundcloud/search?query=${encodeURIComponent(artist)}`);
                const { success, data } = await response.json()
                if (success && data && data.length > 0) {                    
                    allResults = allResults.concat(data);
                } else if (response.status == 429) {
                    alert("Too many requests. Please wait for a minute or retry tomorrow.");
                    console.error("Too many requests")
                    break;
                } else {
                    console.log(`Artist not found: ${artist}`);
                    notFound.push(artist);
                }
            } catch (error) {
                console.error(`Error calling SoundCloud search API for ${artist}`, error);
            }
        }
        setNotFoundArtists(notFound);
        setSearchResults(allResults);
        setIsSearching(false);
        setHasSerached(true);
    };

    // Sanitize API output using DOMPurify
    const sanitize = (dirty: string): string => {
        try {
            return DOMPurify.sanitize(dirty || '');
        } catch(error) {
            console.error(error);
            return "";
        }
    }

    const generateCSV = (data: ContactInfo[]): string => {
        // Define the headers explicitly to ensure correct order and inclusion
        const headers = ['DJ Name', 'Instagram', 'Promo/Demo Email', 'SoundCloud', 'TrackStack', 'Evaluation','Comments'];
    
        // Map the data to an array of objects with keys matching the desired CSV headers
        // Ensure all required fields are present, even if empty, for Papa.unparse
        const csvData = data.map(item => ({
            'DJ Name' : item.djName || '',
            'Instagram' : item.instagram || '',
            'Promo/Demo Email' : item.demoEmail || '',
            'SoundCloud' : item.soundCloud || '',
            'TrackStack' : item.tstack || '',
        }));
    
        // Use Papa.unparse to generate the CSV string
        const csvString = Papa.unparse(csvData, {
            columns: headers, // Specify columns to ensure order
            header: true,     // Include the header row
            quotes: true,      // Always quote fields
            delimiter: ',',   // Ensure comma delimiter
        });
        console.log("Generating CSV");
    
        return csvString;
    };

    const downloadCSV = (csv: string) => {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); // Added charset
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dj_contacts.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("Downloading CSV");
    };

    const handleExportCSV = () => {
        const csvData = generateCSV(searchResults);
        downloadCSV(csvData);
    };

    return (
        <div className="container mx-auto p-4">
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
                {isSpotifyAuth ? (
                    <p>Connected to Spotify</p>
                ) : (
                    <button 
                        className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        onClick={initiateSpotifyAuth}
                        style={{ cursor: 'pointer' }} 
                    >Connect to Spotify</button>
                )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
                {isSoundCloudAuth ? (
                    <img
                        src="https://connect.soundcloud.com/2/btn-disconnect-l.png"
                        onClick={terminateSoundCloudAuth}
                        style={{ cursor: 'pointer' }}
                        alt="Disconnect from SoundCloud"
                    ></img>
                ) : (
                    <img
                        src="https://connect.soundcloud.com/2/btn-connect-sc-l.png"
                        onClick={initiateSoundCloudAuth}
                        style={{ cursor: 'pointer' }} 
                        alt="Connect to SoundCloud"
                    ></img>
                )}
            </div>

            <h1 className="text-2xl font-bold mb-4">DJ Contact Researcher</h1>
           
            {/* CSV import form */}
            {/*
            <div className="mb-4">
                <label htmlFor="csv-input" className="block text-gray-700 text-sm font-bold mb-2">
                    Import Contacts from CSV:
                </label>
                <input
                    type="file"
                    id="csv-input"
                    accept=".csv"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    onChange={handleImportCSV}
                />
                <button className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    onClick={parseImportedCSV}
                    disabled={!csvFile}
                >
                    Import
                </button>
                {csvError && <p className="text-red-500 text-xs italic">{csvError}</p>}
            </div>
            */}

            {/* Artist input form */}

            <SpotifyPlaylistProcessor/>

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
                    onKeyUp={handleEnter}
                />
                <button className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  onClick={handleSearch}
                >
                    Search
                </button>
            </div>

            {/* Results table */}
            {hasSearched && (
                <div>
                    <h2 className="text-xl font-semibold mb-2">Search Results</h2>
                    <table className="table-auto w-full">
                        <thead>
                            <tr>
                                <th className="px-4 py-2">DJ Name</th>
                                <th className="px-4 py-2">Website (not exported)</th>
                                <th className="px-4 py-2">Instagram</th>
                                <th className="px-4 py-2">Promo/Demo Email</th>
                                <th className="px-4 py-2">SoundCloud</th>
                                <th className="px-4 py-2">TrackStack</th>
                            </tr>
                        </thead>
                        <tbody>
                            {searchResults.map((result: any, index: number) => (
                                result ? (
                                    <tr key={index}>
                                        <td className="border px-4 py-2 font-semibold">
                                            {sanitize(result.djName)}
                                        </td>
                                        <td className="border px-4 py-2">
                                            {result.website ? (
                                                <a 
                                                    href={sanitize(result.website)} 
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
                                                    href={sanitize(result.instagram)} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-blue-500"
                                                >
                                                    {sanitize(result.instagram)}
                                                </a>
                                            ) : null}
                                        </td>
                                        <td className="border px-4 py-2">
                                            {sanitize(result.demoEmail)}
                                        </td>
                                        <td className="border px-4 py-2">
                                            {result.soundCloud ? (
                                                <a 
                                                    href={sanitize(result.soundCloud)} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-blue-500"
                                                >
                                                    {sanitize(result.soundCloud)}
                                                </a>
                                            ) : null}
                                        </td>
                                        <td className="border px-4 py-2">
                                            {result.tstack ? (
                                                <a 
                                                    href={sanitize(result.tstack)} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-blue-500"
                                                >
                                                    {sanitize(result.tstack)}
                                                    </a>
                                            ) : null}
                                        </td>
                                    </tr>
                                ) : (
                                    <tr key={`empty-${index}`}>
                                        <td colSpan={6} className="border px-4 py-2 text-center text-gray-500">
                                            Invalid result data
                                        </td>
                                    </tr>
                                )
                            ))}
                        </tbody>
                    </table>
                    <button
                        className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        onClick={handleExportCSV}
                    >
                        Export CSV
                    </button>
                </div>
            )}
            {/* Not Found Artists */}
            {notFoundArtists.length > 0 && (
                <div className="mt-4">
                    <h3 className="text-lg font-semibold text-orange-600">Artists Not Found:</h3>
                    <ul className="list-disc list-inside text--600">
                        {notFoundArtists.map((artist, index) => (
                            <li key={index}>{artist}</li>
                        ))}
                    </ul>
                </div>
            )}
            {/* Searching Overlay */}
            {isSearching && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    cursor: 'wait', // Change cursor to wait
                }}>
                    <div className="animate-pulse text-white text-2xl">Searching for {currentArtist}...</div>
                </div>
            )}
        </div>
    );
}
