import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
      "style-src 'self' 'unsafe-inline'", // Required for CSS-in-JS
      "img-src 'self' data: blob https://*.soundcloud.com https://connect.soundcloud.com https://*.scdn.co https://platform-lookaside.fbsbx.com https://*.spotifycdn.com",
      "font-src 'self'",
      "frame-src 'self' https://soundcloud.com",
      "connect-src 'self' https://api.soundcloud.com https://accounts.spotify.com https://api.spotify.com",
      "media-src 'self' https://*.soundcloud.com",
      "form-action 'self'"
    ].join('; ')
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()' // Disable sensitive APIs
  }
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  }
};

export default nextConfig;
