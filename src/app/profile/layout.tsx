
import type { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

// Define metadata specifically for the profile page
export const metadata: Metadata = {
    title: `User Profile & Preferences | ${APP_NAME}`,
    description: `Manage your display name, preferred units (metric/imperial), and default currency for calculations on ${APP_NAME}.`,
    keywords: ["profile settings", "user preferences", "currency settings", "unit settings", APP_NAME.toLowerCase()],
     openGraph: {
        title: `User Profile & Preferences | ${APP_NAME}`,
        description: `Manage your calculation preferences on ${APP_NAME}.`,
        url: '/profile',
    },
    twitter: {
        title: `User Profile & Preferences | ${APP_NAME}`,
        description: `Manage your calculation preferences on ${APP_NAME}.`,
    },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout primarily serves to apply the metadata to the /profile route
  return <>{children}</>;
}
