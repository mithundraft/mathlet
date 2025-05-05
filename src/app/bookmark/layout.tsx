
import type { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

// Define metadata specifically for the bookmark page
export const metadata: Metadata = {
    title: `Bookmarked Calculators | ${APP_NAME}`,
    description: `Access your saved favorite calculators for quick use. Manage your bookmarked tools on ${APP_NAME}.`,
    keywords: ["bookmarked calculators", "favorite calculators", "saved tools", APP_NAME.toLowerCase()],
     openGraph: {
        title: `Bookmarked Calculators | ${APP_NAME}`,
        description: `Access your saved favorite calculators on ${APP_NAME}.`,
        url: '/bookmark',
    },
    twitter: {
        title: `Bookmarked Calculators | ${APP_NAME}`,
        description: `Access your saved favorite calculators on ${APP_NAME}.`,
    },
};

export default function BookmarkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout primarily serves to apply the metadata to the /bookmark route
  return <>{children}</>;
}
