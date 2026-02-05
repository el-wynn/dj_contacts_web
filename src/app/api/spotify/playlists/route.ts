// src/app/api/spotify/playlists/route.ts
import { NextResponse, NextRequest } from 'next/server';

type SpotifyPlaylist = {
  id: string,
  name: string,
  description: string | null,
  images: Array<{ url: string }>,
  owner: {
    display_name: string
  }
};

export async function GET(request: NextRequest) {
    // Get access token from cookies
    const accessToken = request.cookies.get('spotify_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Spotify' },
        { status: 401 }
      );
    }

  try {
    // First fetch user's playlists
    const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!playlistsResponse.ok) {
      throw new Error(`From Spotify API : ${playlistsResponse.json()}`);
    }

    const data = await playlistsResponse.json();
    const spotifyPlaylists: SpotifyPlaylist[] = data.items;

    // Transform to simpler format
    const playlists = spotifyPlaylists.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description || undefined,
      imageUrl: "/api/imageproxy?url=" + (playlist.images?.[0]?.url ? `${encodeURIComponent(playlist.images[0].url)}` : ""),
      owner: playlist.owner.display_name
    }));

    return NextResponse.json({ playlists });

  } catch (error) {
    console.error('Failed to fetch playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    );
  }
}