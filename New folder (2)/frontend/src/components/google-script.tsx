'use client';

import Script from 'next/script';

export function GoogleScript() {
  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="beforeInteractive"
      onLoad={() => {
        console.log('Google Identity Services script loaded');
      }}
      onError={(e) => {
        console.error('Error loading Google Identity Services script:', e);
      }}
    />
  );
} 