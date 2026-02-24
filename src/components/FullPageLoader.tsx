'use client';

interface FullPageLoaderProps {
    isLoading : boolean;
    message?: string;
    color?: string;
  }

export function FullPageLoader ({ isLoading, message = "Loading...", color = "orange" } : FullPageLoaderProps) {
    return (
      <div className={`
        fixed inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-60 
        transition-opacity duration-300 ease-in-out ${ isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        <div className="text-gray-900 text-center">
          <div className={`animate-spin rounded-full h-32 w-32 border-b-2 border-${color}-500 mx-auto mb-4`}></div>
          <p className="text-lg font-semibold">{message}</p>
        </div>
      </div>
    );
  };