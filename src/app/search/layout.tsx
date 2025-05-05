
import type { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

// Define metadata specifically for the search page
export const metadata: Metadata = {
    title: `Search Calculators | ${APP_NAME}`,
    description: `Find the perfect calculator for your needs. Search through financial, health, fitness, and math calculators on ${APP_NAME}.`,
    keywords: ["search calculators", "find calculator", "calculator search", APP_NAME.toLowerCase()],
    openGraph: {
        title: `Search Calculators | ${APP_NAME}`,
        description: `Find the calculator you need on ${APP_NAME}.`,
        url: '/search',
    },
    twitter: {
        title: `Search Calculators | ${APP_NAME}`,
        description: `Find the calculator you need on ${APP_NAME}.`,
    },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout primarily serves to apply the metadata to the /search route
  return <>{children}</>;
}
