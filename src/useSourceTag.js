import { useState } from 'react';

const STORAGE_KEY = 'hf_source';

export function useSourceTag(sourceParam) {
  const [source] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get(sourceParam);
      if (fromUrl) {
        sessionStorage.setItem(STORAGE_KEY, fromUrl);
        return fromUrl;
      }
      return sessionStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  return source;
}
