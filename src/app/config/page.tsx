'use client';
import { FullPageLoader } from '@/components/FullPageLoader';
import React, { useState, useEffect } from 'react';

export default function ConfigPage() {
  const [config, setConfig] = useState({
    soundcloudClientId: '',
    soundcloudRedirectUri: '',
    spotifyClientId: '',
    spotifyRedirectUri: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load existing configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        }
      } catch (error) {
        setMessage('Failed to load configuration : ' + error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        setMessage('Configuration saved successfully!');
        window.location.href = "/"
      } else {
        const error = await response.json();
        setMessage(`Error: ${error.message}`);
      }
    } catch (error) {
      setMessage('Network error occurred : ' + error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <FullPageLoader isLoading={isLoading} color="blue" />
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Application Configuration</h1>
      
      {message && (
        <div className={`p-3 mb-4 rounded ${
          message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-4">SoundCloud Configuration</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Client ID
            </label>
            <input
              type="text"
              value={config.soundcloudClientId}
              onChange={(e) => setConfig({...config, soundcloudClientId: e.target.value})}
              className="w-full p-2 border border-gray-200 rounded-lg"
              placeholder="Enter SoundCloud Client ID"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Redirect URI
            </label>
            <input
              type="text"
              value={config.soundcloudRedirectUri}
              onChange={(e) => setConfig({...config, soundcloudRedirectUri: e.target.value})}
              className="w-full p-2 border border-gray-200 rounded-lg"
              placeholder="http://localhost:3000/api/soundcloud/auth/callback"
              required
            />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-4">Spotify Configuration</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Client ID
            </label>
            <input
              type="text"
              value={config.spotifyClientId}
              onChange={(e) => setConfig({...config, spotifyClientId: e.target.value})}
              className="w-full p-2 border border-gray-200 rounded-lg"
              placeholder="Enter Spotify Client ID"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Redirect URI
            </label>
            <input
              type="text"
              value={config.spotifyRedirectUri}
              onChange={(e) => setConfig({...config, spotifyRedirectUri: e.target.value})}
              className="w-full p-2 border border-gray-200 rounded-lg"
              placeholder="http://localhost:3000/api/spotify/auth/callback"
              required
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isSaving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
      <style jsx global>
        {`
          body {
            background: #cccccc;
          }
        `}
      </style>
    </div>
  );
}