
'use client';

import * as React from 'react';

interface JsonLdProps {
  data: object; // The structured data object
}

/**
 * Renders JSON-LD structured data within a <script> tag for SEO purposes.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
