// src/components/SpotifyPlaylistProcessor.tsx
'use client';
import { useState } from 'react';

type Playlist = {
	id: string;
	name: string;
	description?: string;
	imageUrl?: string;
};

interface SpotifyPlaylistProcessorProps {
	onChange: (value: string) => void;
}

export default function SpotifyPlaylistProcessor({ onChange } : SpotifyPlaylistProcessorProps ) {
	const [playlists, setPlaylists] = useState<Playlist[]>([]);
	const [artists, setArtists] = useState<string>('');
	const [isLoading, setIsLoading] = useState(false);
	const [isError, setIsError] = useState(false);
	const [hasCopy, setHasCopy] = useState(false);
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
		} catch  {
			handleError(500);
		} finally {
			setIsLoading(false);
		}
	};

	// Process selected playlist
	const processPlaylist = async (playlistId: string) => {
		setHasCopy(false)
		setIsLoading(true);

		try {
			const response = await fetch(`/api/spotify/artists?playlist=${playlistId}`);
			const data = await response.json();

			if (response.ok) {
				setArtists(data.artists.join(', '));
				setStage('artists');
				setIsError(false);
			} else {
				handleError(response.status);
			}
		} catch {
			handleError(500);
		} finally {
			setIsLoading(false);
		}
	};

	const handleError = (status?: number) => {
		let errorMessage = 'An error occurred';
		switch (status) {
			case 400:
				errorMessage = 'Something went wrong on Spotify side. Please try again later.';
				break;
			case 401:
				errorMessage = 'Please log in to Spotify first.';
				break;
			case 404:
				errorMessage = "I couldn't find any tracks here.";
				break;
			case 500:
				errorMessage = "Something went wrong with this playlist. Please try again.";
				break;
			default:
				errorMessage = 'Something went wrong. Please try again.';
		}
		setArtists(errorMessage);
		setIsError(true);
		setStage('artists');
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(artists);
		setHasCopy(true);
	}

	const handleQuery = () => {
		onChange(artists)
	}

	return (
		<div className="space-y-4 max-w-md mx-auto">
			{stage === 'init' && (
				<button
					onClick={fetchUserPlaylists}
					disabled={isLoading}
					className="w-full mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
				>
					{isLoading ? 'Loading...' : 'Show playlists'}
				</button>
			)}

			{stage === 'playlists' && (
				<div className="space-y-2">
					<ul className="space-y-2 overflow-y-auto">
						{playlists.map(playlist => (
							<li
								key={playlist.id}
								onClick={() => processPlaylist(playlist.id)}
								className={`
									flex items-center gap-3 p-3 rounded-xl cursor-pointer 
									transition-all duration-200 border shadow-sm text-gray-600 
									bg-gray-50 border-gray-100 hover:bg-gray-100 hover:border-gray-200
								  `}
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
						className="rounded-lg px-3 py-2 bg-gray-50 text-gray-700 text-sm font-medium mb-3 cursor-pointer shadow-sm"
					>
						&lt; Back
					</button>

					{isError ? (
						<div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-sm">
							{artists}
						</div>
					) : (
						<div className="space-y-2 shadow-sm bg-gray-50 border-gray-100 rounded-xl p-2">
							<h3 className="font-small text-gray-700">Artists in this playlist:</h3>
							<textarea
								value={artists}
								readOnly
								className="w-full p-2 rounded-lg min-h-24 resize-none focus:outline-none focus:shadow-outline"
							/>
							<button
								onClick={handleCopy}
								className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline"
							>
								{hasCopy ? 'Copied !' : 'Copy to Clipboard'}
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}