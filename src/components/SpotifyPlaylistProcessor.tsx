// src/components/SpotifyPlaylistProcessor.tsx
'use client';
import { useState } from 'react';

type Playlist = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
};

export default function SpotifyPlaylistProcessor() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [artists, setArtists] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [stage, setStage] = useState<'init' | 'playlists' | 'artists'>('init');

  // Fetch user's playlists when component mounts (or on button click)
  const fetchUserPlaylists = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/spotify/playlists');
      const data = await response.json();
      
      if (response.ok) {
        setPlaylists(data.playlists);
        setStage('playlists');
      } else {
        handleError(response.status);
      }
    } catch (error) {
      handleError();
    } finally {
      setIsLoading(false);
    }
  };

  // Process selected playlist
  const processPlaylist = async (playlistId: string) => {
    setIsLoading(true);
    setSelectedPlaylist(playlistId);
    
    try {
      const response = await fetch(`/api/spotify/artists?playlist=${playlistId}`);
      const data = await response.json();

      console.log(data);
      
      if (response.ok) {
        setArtists(data.artists.join(', '));
        setStage('artists');
        setIsError(false);
      } else {
        handleError(response.status);
      }
    } catch (error) {
      handleError();
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (status?: number) => {
    let errorMessage = 'An error occurred';
    switch (status) {
      case 401: 
        errorMessage = 'Please log in to Spotify first.';
        break;
      case 404:
        errorMessage = "I couldn't find any tracks here.";
        break;
      default:
        errorMessage = 'Something went wrong. Please try again.';
    }
    setArtists(errorMessage);
    setIsError(true);
    setStage('artists');
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {stage === 'init' && (
        <button
          onClick={fetchUserPlaylists}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Get My Spotify Playlists'}
        </button>
      )}

      {stage === 'playlists' && (
        <div className="space-y-2">
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {playlists.map(playlist => (
              <li
                key={playlist.id}
                onClick={() => processPlaylist(playlist.id)}
                className="p-3 border rounded hover:bg-gray-50 cursor-pointer flex items-center"
              >
                {playlist.imageUrl && (
                  <img 
                    src={playlist.imageUrl} 
                    alt={playlist.name}
                    className="w-12 h-12 rounded mr-3"
                  />
                )}
                <div>
                  <p className="font-medium">{playlist.name}</p>
                  {playlist.description && (
                    <p className="text-sm text-gray-500">{playlist.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stage === 'artists' && (
        <div className="space-y-4">
          <button
            onClick={() => setStage('playlists')}
            className="text-sm text-blue-500 hover:underline"
          >
            ← Back to playlists
          </button>

          {isError ? (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {artists}
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="font-medium">Artists in this playlist:</h3>
              <textarea
                value={artists}
                readOnly
                className="w-full p-2 border rounded min-h-24"
              />
              <button
                onClick={() => navigator.clipboard.writeText(artists)}
                className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Copy to Clipboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}