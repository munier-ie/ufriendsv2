import React, { createContext, useContext, useState, useCallback } from 'react';
import { loadLandingContent, saveLandingContent } from '../lib/landingContent';

const LandingContentContext = createContext(null);

export function LandingContentProvider({ children }) {
  const [content, setContent] = useState(() => loadLandingContent());

  const updateContent = useCallback((updater) => {
    setContent((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveLandingContent(next);
      return next;
    });
  }, []);

  return (
    <LandingContentContext.Provider value={{ content, updateContent }}>
      {children}
    </LandingContentContext.Provider>
  );
}

export function useLandingContent() {
  const ctx = useContext(LandingContentContext);
  if (!ctx) throw new Error('useLandingContent must be used within LandingContentProvider');
  return ctx;
}
