
import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Toaster } from "@/components/ui/toaster";
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';
import { JsonLd } from '@/components/seo/json-ld';
import { ThemeProvider } from "@/components/theme-provider"; 
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: `${APP_NAME} - All-in-One Calculators`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    "calculator",
    "online calculator",
    "free calculator",
    "financial calculator",
    "health calculator",
    "fitness calculator",
    "math calculator",
    APP_NAME.toLowerCase(),
  ],
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: {
        default: `${APP_NAME} - All-in-One Calculators`, // Default OG title
        template: `%s | ${APP_NAME}`, // OG Title template
    },
    description: APP_DESCRIPTION,
    type: 'website',
    url: '/', // Base URL
    siteName: APP_NAME,
     // Add a default OG image if available later
     // images: [ { url: '/og-image.png' } ],
  },
  twitter: {
     card: 'summary', // or 'summary_large_image'
     title: {
       default: `${APP_NAME} - All-in-One Calculators`, // Default Twitter title
       template: `%s | ${APP_NAME}`, // Twitter Title template
     },
     description: APP_DESCRIPTION,
     // Add Twitter-specific image if available later
     // images: ['/twitter-image.png'],
   },
  // icons: { // Add icons later if available
  //   shortcut: '/favicon.ico',
  //   apple: '/apple-touch-icon.png',
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Define WebSite schema
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": APP_NAME,
    "url": process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    "description": APP_DESCRIPTION
  };

  return (
    <html lang="en" suppressHydrationWarning>
       <head>
         {/* Render WebSite schema in the head */}
         <JsonLd data={websiteSchema} />
       </head>
       {/* Apply Jost font using CSS variable set in globals.css */}
       <body className={`antialiased font-sans`}>
           <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
           >
              <div className="relative flex flex-col h-screen bg-background overflow-hidden"> {/* Make parent screen height and hide overflow */}
                  <Header />
                  {/* Main layout container: Flex row, take remaining height, prevent parent scroll */}
                  <div className="flex flex-1 h-[calc(100vh-theme(spacing.14))] overflow-hidden"> {/* Fixed height based on viewport minus header */}
                     {/* Sidebar: Fixed width, full fixed height, internal scroll handled by SidebarNav */}
                     <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r border-border bg-sidebar flex-shrink-0 h-full overflow-hidden"> {/* Remove overflow-y-auto here, SidebarNav handles it */}
                       <SidebarNav />
                     </aside>
                     {/* Main content area: Takes remaining space, scrolls independently */}
                     <main className="flex-1 overflow-y-auto pb-14 md:pb-0"> {/* Main area scrolls */}
                        {children}
                     </main>
                  </div>
                  <BottomNav /> {/* BottomNav will overlay content on mobile */}
              </div>
              <Toaster />
            </ThemeProvider>
      </body>
    </html>
  );
}
