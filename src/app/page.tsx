'use client';
import { useState, useEffect } from 'react';
import { ContactInfo } from '@/lib/types';
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/pkce';
import Papa from 'papaparse';
import DOMPurify from 'dompurify';
import { saveState } from '@/lib/statestore';
import SpotifyPlaylistProcessor from '@/components/SpotifyPlaylistProcessor';
import { ModernSearchBar } from '@/components/ModernSearchBar'
import { SortableTable } from '@/components/SortableTable';
import { FullPageLoader } from '@/components/FullPageLoader';


export default function Home() {
  const [isSoundCloudAuth, setIsSoundCloudAuth] = useState<boolean>(false); // State to control UI elements based on auth status
  const [isSpotifyAuth, setIsSpotifyAuth] = useState<boolean>(false); // State to control UI elements based on auth status
  const [isSearching, setIsSearching] = useState<boolean>(false); // State to control UI elements while searching
  const [currentArtist, setCurrentArtist] = useState<string>(''); // State to display current artist being searched
  const [hasSearched, setHasSerached] = useState<boolean>(false); // State to display table when search is done
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]); // Replace 'any' with a proper type
  const [sidebarOpen, setSidebarOpen] = useState(false);
const [isSoundCloudLoading, setIsSoundCloudLoading] = useState<boolean>(true)
  const [isSpotifyLoading, setIsSpotifyLoading] = useState<boolean>(true)
  //const [csvFile, setCsvFile] = useState<File | null>(null);
  //const [csvError, setCsvError] = useState<string | null>(null);
  const [notFoundArtists, setNotFoundArtists] = useState<string[]>([]);


  useEffect(() => {
    // Function to check authentication status using the server-side endpoint
    const checkSoundCloudAuthStatus = async () => {
      setIsSoundCloudLoading(true);
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
} finally {
        setIsSoundCloudLoading(false);
      }
    };

    // Check auth status on component mount
    checkSoundCloudAuthStatus();

    const checkSpotifyAuthStatus = async () => {
      setIsSpotifyLoading(true);
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
} finally {
        setIsSpotifyLoading(false);
      }
    };

    checkSpotifyAuthStatus();

    // Periodically trigger the server-side refresh token endpoint
    // The server will handle the actual token expiry check and refresh logic
    const accessTokenRefreshInterval = 60 * 60 * 1000; // Check every hour for testing

    const intervalId = setInterval(() => {
      // Call the status endpoint, which will internally trigger refresh if needed
      checkSoundCloudAuthStatus();
      checkSpotifyAuthStatus();
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
      `; path=/; secure; htppOnly; sameSite=lax; max-age=3600` :
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
    const params = {
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

  const terminateSpotifyAuth = async () => {
    try {
      const response = await fetch('/api/spotify/auth/disconnect');
      if (response.ok) {
        console.log('Successfully disconnected from Spotify.');
        // Refresh the page or update the isAuthenticated state (client side) to reflect disconnection.
        setIsSpotifyAuth(false);
      } else {
        console.error('Failed to disconnect from Spotify');
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
    } catch (error) {
      console.error(error);
      return "";
    }
  }

  const generateCSV = (data: ContactInfo[]): string => {
    // Define the headers explicitly to ensure correct order and inclusion
    const headers = ['DJ Name', 'Instagram', 'Promo/Demo Email', 'SoundCloud', 'TrackStack', 'Evaluation', 'Comments'];

    // Map the data to an array of objects with keys matching the desired CSV headers
    // Ensure all required fields are present, even if empty, for Papa.unparse
    const csvData = data.map(item => ({
      'DJ Name': item.djName || '',
      'Instagram': item.instagram || '',
      'Promo/Demo Email': item.demoEmail || '',
      'SoundCloud': item.soundCloud || '',
      'TrackStack': item.tstack || '',
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

  //if (isSoundCloudLoading) return <FullPageLoader isLoading = {isSoundCloudLoading}/>;

  return (
    <div className="flex min-h-screen bg-gray-50">
<FullPageLoader isLoading = {isSoundCloudLoading && isSpotifyLoading}/>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4 z-50">
        <button 
          className="p-2 text-gray-600 hover:text-gray-900"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">
          DJ Contact Researcher
        </h1>
      </header>

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 bottom-0 w-80 lg:w-96 bg-white border-r border-gray-200 
        flex flex-col overflow-y-auto z-50 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="px-6 py-8 border-b border-gray-100 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            DJ Contact Researcher
          </h1>
          <button
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Spotify Connection Status */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
            {isSpotifyAuth ? (
              <div 
                className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium mb-3 cursor-pointer"
                onClick={terminateSpotifyAuth}
                style={{ cursor: 'pointer' }}
                title="Click to disconnect"
              >
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Connected to Spotify
              </div>
            ) : (
              <button
                className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline"
                onClick={initiateSpotifyAuth}
                style={{ cursor: 'pointer' }}
              >Connect to Spotify</button>
            )}
          </div>

          {/* Spotify Playlists Component */}
          <div className="playlists-section">
            {isSpotifyAuth ? <SpotifyPlaylistProcessor onChange={setSearchQuery}/> : ''}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-96 min-h-screen pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 lg:px-10 py-6 lg:py-12">
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
            {isSoundCloudAuth ? (
              <div 
                className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium mb-3 cursor-pointer"
                onClick={terminateSoundCloudAuth}
                style={{ cursor: 'pointer' }}
                title="Click to disconnect"
              >
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
                Connected to SoundCloud
              </div>
            ) : (
              <button
                className="mt-2 bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline"
                onClick={initiateSoundCloudAuth}
                style={{ cursor: 'pointer' }}
              >Connect to SoundCloud</button>
            )}
          </div>

          {<ModernSearchBar onSearch={handleSearch} onChange={setSearchQuery} query={searchQuery} />}

          {/* Results table */}
          {searchResults.length > 0 && (
            <div className="results-section">
              {(hasSearched || isSearching) && (
                <SortableTable
                  data={searchResults}
                  columns={[
                    {
                      key: 'djName',
                      label: 'DJ Name',
                      sortable: true
                    },
                    {
                      key: 'website',
                      label: 'Website (not exported)',
                      sortable: false,
                      render: (value) => value ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Visit website"
                          className="text-blue-500 hover:underline">
                          {value}
                        </a>
                      ) : ''
                    },
                    {
                      key: 'instagram',
                      label: 'Instagram',
                      sortable: true,
                      render: (value) => value ? (
                        <a
                          href={`https://instagram.com/${value.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open Instagram"
                          className="text-purple-500 hover:underline">
                          @{value.replace('@', '')}
                        </a>
                      ) : ''
                    },
                    {
                      key: 'demoEmail',
                      label: 'Promo/Demo Email',
                      sortable: true,
                      render: (value) => value || ''
                    },
                    {
                      key: 'soundCloud',
                      label: 'SoundCloud',
                      sortable: true,
                      render: (value) => value ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open SoundCloud"
                          className="text-orange-500 hover:underline">
                          Profile
                        </a>
                      ) : ''
                    },
                    {
                      key: 'tstack',
                      label: 'TrackStack',
                      sortable: true,
                      render: (value) => value ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open TrackStack"
                          className="text-green-500 hover:underline">
                          Link
                        </a>
                      ) : ''
                    }
                  ]}
                  loading={isSearching}
                  skeletonRowCount={5}
                />
              )}
              {hasSearched && (
                <button
                  className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm focus:outline-none focus:shadow-outline"
                  onClick={handleExportCSV}
                >
                  Export CSV
                </button>
              )}
              {/* Not Found Artists */}
              {notFoundArtists.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
                  <h3 className="font-medium text-yellow-800">Not found:</h3>
                  <p className="text-yellow-700">{notFoundArtists.join(', ')}</p>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {hasSearched && searchResults.length === 0 && searchQuery && (
            <div className="bg-white rounded-2xl p-12 lg:p-20 shadow-sm text-center">
              <div className="text-5xl mb-4 opacity-50">🔍</div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                No results found
              </p>
              <p className="text-sm text-gray-400">
                Try searching for different artists
              </p>
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
              flexDirection: 'column',
              zIndex: 1000,
              cursor: 'wait', // Change cursor to wait
            }}>
              <div className={`animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto mb-4`}></div>
              <div className="animate-pulse text-white text-2xl">Searching for {currentArtist}...</div>
            </div>
          )}
        </div>
      </main>
      
    </div>
  );
}
