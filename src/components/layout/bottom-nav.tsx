
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bookmark, User, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/bookmark', label: 'Bookmarks', icon: Bookmark },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Skeleton Loader
  if (!mounted) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 md:hidden">
            <div className="container flex h-14 max-w-screen-2xl items-center justify-around px-2">
                {navItems.map((_, index) => (
                  <div key={index} className="flex flex-col items-center justify-center p-2">
                     <Skeleton className="h-5 w-5 mb-1 rounded-md" /> {/* Icon Skeleton */}
                     <Skeleton className="h-3 w-10 rounded-md" /> {/* Label Skeleton */}
                  </div>
                ))}
            </div>
        </nav>
    );
  }

  // Actual Nav
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            (pathname === '/' && item.href === '/') || // Exact match for home
            (pathname.startsWith(item.href) && item.href !== '/'); // Starts with for others, but not '/'

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center text-xs font-medium transition-colors p-2 rounded-md",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary/80"
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="h-5 w-5 mb-0.5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
