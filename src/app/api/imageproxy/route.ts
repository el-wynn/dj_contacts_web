// src/app/api/imageproxy/route.ts
import { NextResponse } from 'next/server';

const ALLOWED_DOMAINS = [
    'i.scdn.co',
    'mosaic.scdn.co', 
    'image-cdn-ak.spotifycdn.com',
    'image-cdn-fa.spotifycdn.com'
  ];

const FALLBACK_ICON = "https://developer-assets.spotifycdn.com/images/guidelines/design/icon3.svg";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  try {
    // If no URL provided, serve fallback
    if (!imageUrl) {
      throw new Error('No URL provided');
    }

    const urlObj = new URL(imageUrl);
    if (!ALLOWED_DOMAINS.includes(urlObj.hostname)) {
      throw new Error('Invalid image source');
    }

    const imageRes = await fetch(imageUrl);    
    if (!imageRes.ok) {
      throw new Error('Cannot fetch image');
    }
    
    const blob = await imageRes.blob();
    return new Response(blob, {
      headers: {
        'Content-Type': imageRes.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000' // 1 year cache
      }
    });
    
  } catch (error) {
    console.error("Image proxy: " + error)
    // On any error, redirect to fallback
    return NextResponse.redirect(FALLBACK_ICON);
  }
}