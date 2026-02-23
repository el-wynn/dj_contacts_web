'use client';

import { FormEvent, KeyboardEvent, ChangeEvent } from 'react';

interface LegacySearchBarProps {
  label?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  query: string;
}

export function LegacySearchBar({
  label = 'Enter Artists (comma-separated):',
  placeholder = 'e.g., Disclosure, Gorgon City, MK, Jboi',
  onChange,
  onSearch,
  query,
}: LegacySearchBarProps) {

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/[^a-zA-Z0-9\s,\-_]/g, '');
    onChange(cleanValue);
  };
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return(
    <div className="mb-4">
      <label htmlFor="artist-input" className="block text-gray-700 text-sm font-bold mb-2">
        {label}
      </label>
      <input
        type="text"
        id="artist-input"
        className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        maxLength={500}
        onKeyUp={handleEnter}
        />
        <button className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline"
            onClick={handleSubmit}
        >
            Search
        </button>
    </div>
  )
}