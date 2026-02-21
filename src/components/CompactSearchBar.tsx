'use client';

import { useState, FormEvent } from 'react';

interface CompactSearchBarProps {
  label?: string;
  placeholder?: string;
  onSearch: (query: string) => void;
  defaultValue?: string;
}

export function CompactSearchBar({
  label = 'Enter Artists (comma-separated):',
  placeholder = 'e.g., Disclosure, Gorgon City, MK, Jboi',
  onSearch,
  defaultValue = '',
}: CompactSearchBarProps) {
  const [query, setQuery] = useState(defaultValue);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div className="compact-search">
      {label && <label className="search-label">{label}</label>}
      
      <form onSubmit={handleSubmit} className="search-form">
        <div className="input-container">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="search-input"
          />
          
          <button
            type="submit"
            className="search-button"
            disabled={!query.trim()}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="11"
                cy="11"
                r="6"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M20 20L16 16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </form>

      <style jsx>{`
        .compact-search {
          width: 100%;
          max-width: 600px;
        }

        .search-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #212529;
          margin-bottom: 8px;
        }

        .search-form {
          width: 100%;
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          transition: all 0.2s ease;
          overflow: hidden;
        }

        .input-container:focus-within {
          border-color: #adb5bd;
          box-shadow: 0 0 0 3px rgba(173, 181, 189, 0.1);
        }

        .search-input {
          flex: 1;
          padding: 12px 16px;
          border: none;
          background: transparent;
          font-size: 14px;
          color: #212529;
          outline: none;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
            'Helvetica Neue', Arial, sans-serif;
        }

        .search-input::placeholder {
          color: #adb5bd;
        }

        .search-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 16px;
          border: none;
          background: #495057;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.2s ease;
          height: 100%;
        }

        .search-button:hover:not(:disabled) {
          background: #343a40;
        }

        .search-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .search-button:active:not(:disabled) {
          background: #212529;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .search-input {
            padding: 10px 12px;
            font-size: 13px;
          }

          .search-button {
            padding: 10px 14px;
          }
        }
      `}</style>
    </div>
  );
}
