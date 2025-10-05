# Artist Researcher

A high-integrity Next.js application for discovering DJs by genre and collecting publicly available contact information. Based on SoundCloud API. Exports results to CSV.

## Requirements

[![Node.js Version](https://img.shields.io/badge/node.js-%3E%3D18-informational)](https://nodejs.org/) [![MIT License](https://img.shields.io/badge/license-MIT-brown.svg)](https://opensource.org/licenses/MIT)

You need to have a SoundCloud account and to register a [SoundCloud App](https://developers.soundcloud.com/docs/api).
You can optionnaly use a Spotify account to extract artist from a playlist.

## Get Started

1.  **Clone the repository:**
    ```bash
    git clone git@github.com:el-wynn/dj_contacts_web.git
    cd dj_contacts_web
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add the following (replace with your actual values):
    ```env
    NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID=YOUR_SOUNDCLOUD_CLIENT_ID
    SOUNDCLOUD_CLIENT_SECRET=YOUR_SOUNDCLOUD_CLIENT_SECRET
    NEXT_PUBLIC_SOUNDCLOUD_REDIRECT_URI=http://127.0.0.1:3000/api/soundcloud/auth/callback

    NEXT_PUBLIC_SPOTIFY_CLIENT_ID=YOUR_SPOTIFY_CLIENT_ID
    SPOTIFY_CLIENT_SECRET=YOUR_SPOTIFY_CLIENT_SECRET
    NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/spotify/auth/callback
    ```
4.  **Run the development server:**
    ```bash
    npm run dev
    ```

## Usage

1.  **Connect to SoundCloud:** Click the "Connect to SoundCloud" button to authorize the application.
2.  **Connect to Spotify:** "Connect to Spotify" button to authorize the application (optionnal).
3.  **Search for Artists:** Enter a comma-separated list of artist names in the input field and click "Search."
4.  **View Results:** The search results will be displayed in a table, including DJ Name, Website, Instagram, Promo/Demo Email, SoundCloud profile, and tstack.app links. Artists not found will be listed separately.
5.  **Export Data:** Click the "Export CSV" button to download the collected data as a CSV file.
