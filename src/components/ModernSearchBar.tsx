'use client';

import { FormEvent, KeyboardEvent, ChangeEvent } from 'react';

interface ModernSearchBarProps {
  placeholder?: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  query: string;
}

export function ModernSearchBar({
  placeholder = 'Enter Artists (comma-separated), e.g., Disclosure, Gorgon City, MK, Jboi',
  onChange,
  onSearch,
  query,
}: ModernSearchBarProps) {

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const cleanValue = e.target.value.replace(/[^a-zA-Z0-9\s,\-_]/g, '');
    onChange(cleanValue);
  };

  const handleEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="search-container mb-5">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-wrapper">
          <textarea
            value={query}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="search-input"
            rows={3}
            onKeyDown={handleEnter}
          />
          
          <div className="button-group">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="clear-btn"
                aria-label="Clear"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 4L4 12M4 4L12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
            
            <button
              type="submit"
              className="search-btn"
              aria-label="Search"
              disabled={!query.trim()}
            >
              <svg
                width="18"
                height="18"
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
        </div>
      </form>

      <style jsx>{`
        .search-container {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .search-form {
          width: 100%;
          max-width: 900px;
        }

        .search-input-wrapper {
          position: relative;
          width: 100%;
          background: #ffffff;
          border: 1px solid #dee2e6;
          border-radius: 12px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .search-input-wrapper:focus-within {
          border-color: #adb5bd;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .search-input {
          width: 100%;
          padding: 16px 80px 16px 20px;
          border: none;
          background: transparent;
          font-size: 15px;
          color: #212529;
          resize: none;
          outline: none;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
            'Helvetica Neue', Arial, sans-serif;
          line-height: 1.5;
        }

        .search-input::placeholder {
          color: #adb5bd;
        }

        .button-group {
          position: absolute;
          right: 12px;
          bottom: 12px;
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .clear-btn,
        .search-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: #f8f9fa;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 8px;
          padding: 8px;
          color: #6c757d;
        }

        .clear-btn {
          width: 32px;
          height: 32px;
        }

        .search-btn {
          width: 40px;
          height: 40px;
          background: #495057;
          color: #ffffff;
        }

        .clear-btn:hover {
          background: #e9ecef;
          color: #495057;
        }

        .search-btn:hover:not(:disabled) {
          background: #343a40;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .search-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .search-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        /* Smooth animations */
        .clear-btn {
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .search-input {
            padding: 14px 70px 14px 16px;
            font-size: 14px;
          }

          .button-group {
            right: 10px;
            bottom: 10px;
          }

          .search-btn {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </div>
  );
}
