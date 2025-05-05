
import type { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

// Define metadata specifically for the history page
export const metadata: Metadata = {
    title: `Calculation History | ${APP_NAME}`,
    description: `View your past calculation history on ${APP_NAME}. Review inputs and results from various calculators.`,
    keywords: ["calculation history", "past calculations", "calculator log", APP_NAME.toLowerCase()],
    openGraph: {
        title: `Calculation History | ${APP_NAME}`,
        description: `Review your calculation history on ${APP_NAME}.`,
        url: '/history',
    },
    twitter: {
        title: `Calculation History | ${APP_NAME}`,
        description: `Review your calculation history on ${APP_NAME}.`,
    },
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout primarily serves to apply the metadata to the /history route
  return <>{children}</>;
}
