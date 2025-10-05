// src/app/api/spotify/artists/route.ts
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const playlistId = searchParams.get('playlist')
  if (!playlistId) {
    return NextResponse.json(
      { error: 'Invalid Spotify playlist ID' }, 
      { status: 400 }
    );
  }

  // Get access token from cookies
  const accessToken = request.cookies.get('spotify_access_token')?.value;
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated with Spotify' },
      { status: 401 }
    );
  }

  try {
    // Fetch playlist
    const tracks = await getPlaylistTracks(playlistId, accessToken);
    
    if (!tracks?.items) {
      return NextResponse.json(
        { error: 'No tracks found in playlist' },
        { status: 404 }
      );
    }

    const artists = extractUniqueArtists(tracks);

    if (!artists?.length) {
      return NextResponse.json(
        { error: 'No artists found in playlist' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({artists});

  } catch (error: any) {
    console.error('Playlist fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch playlist' },
      { status: error.status || 500 }
    );  
  }
}

// Helper functions
/* function extractSpotifyId(url: string): string | null {
  const regex = /spotify:playlist:([a-zA-Z0-9]+)|open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  return match?.[1] || match?.[2] || null;
} */

async function getPlaylistTracks(playlistId: string, token: string) {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    const error = new Error();
    (error as any).status = response.status || 400;
    (error as any).message = 'Spotify API error' + (" : " + errorData?.error?.message || '.')
    throw error;
  }

  const data = await response.json();
  
  // Handle empty or malformed response
  if (!data || typeof data !== 'object') {
    const error = new Error('Invalid Spotify response format');
    (error as any).status = 400;
    throw error;
  }

  return data;
}

function extractUniqueArtists(tracks: any): string[] {
  const artists = new Set<string>();
  tracks.items?.forEach((item: any) => {
    item.track?.artists?.forEach((artist: any) => {
      if (artist.name) artists.add(artist.name);
    });
  });
  return Array.from(artists);
}