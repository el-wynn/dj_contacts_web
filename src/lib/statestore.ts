// src/lib/stateStore.ts
interface StateStore {
    [key: string]: {
      state: string;
      timestamp: number;
    };
  }
  
  const store: StateStore = {};
  
  // 5 minute TTL for stored states
  const STATE_TTL_MS = 5 * 60 * 1000; 
  
  export function saveState(sessionId: string, state: string) {
    store[sessionId] = {
      state,
      timestamp: Date.now()
    };
    // Auto-cleanup
    Object.keys(store).forEach(key => {
      if (Date.now() - store[key].timestamp > STATE_TTL_MS) {
        delete store[key];
      }
    });
  }
  
  export function getState(sessionId: string): string | null {
    const entry = store[sessionId];
    if (!entry || (Date.now() - entry.timestamp > STATE_TTL_MS)) {
      return null;
    }
    return entry.state;
  }