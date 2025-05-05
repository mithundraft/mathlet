
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CALCULATORS, CATEGORIES, FAVORITES_STORAGE_KEY, APP_NAME } from '@/lib/constants';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Home, History, User, Star, Search, Calculator, ChevronDown, Sun, Moon, Bookmark } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { FavoriteCalculators } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from 'next-themes'; // Import useTheme
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea

interface SidebarNavProps {
  onLinkClick?: () => void; // Optional callback for closing mobile sheet
}

export function SidebarNav({ onLinkClick }: SidebarNavProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme(); // Get theme state and setter
  const [favorites, setFavorites] = useLocalStorage<FavoriteCalculators>(FAVORITES_STORAGE_KEY, []);
  const [mounted, setMounted] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeAccordionItems, setActiveAccordionItems] = React.useState<string[]>([]);
  const searchInputRef = React.useRef<HTMLInputElement>(null); // Keep ref

  React.useEffect(() => {
    setMounted(true);
    // Attempt to blur the search input if it accidentally gets focus on mount (mobile sheet open)
    // This is a workaround for potential focus-stealing behavior.
    setTimeout(() => {
        if (document.activeElement === searchInputRef.current) {
            searchInputRef.current?.blur();
        }
    }, 50); // Small delay to allow focus to potentially shift
  }, []);

   React.useEffect(() => {
        // Determine default open accordions based on current path or search
        if (!mounted) return;

        if (searchTerm) {
            // If searching, open all categories that contain search results
            const categoriesWithResults = CATEGORIES.filter(category =>
                CALCULATORS.some(calc =>
                    calc.category === category.name &&
                    (calc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    calc.description.toLowerCase().includes(searchTerm.toLowerCase()))
                )
            ).map(cat => cat.name);
             setActiveAccordionItems(categoriesWithResults);
        } else {
            // If not searching, open the category of the current calculator
             const currentCalc = CALCULATORS.find(calc => `/calculator/${calc.slug}` === pathname);
            if (currentCalc) { // Always open current category
                 setActiveAccordionItems(currentCalc.category ? [currentCalc.category] : []);
            } else {
                 // If not on a calculator page, check for top-level matches like /history or /profile
                 const staticPages = ['/history', '/profile', '/bookmark'];
                 if (!staticPages.includes(pathname) && pathname !== '/') {
                    // Keep the previously active accordion open if navigating between calculators in the same category
                    // Or close all if navigating away from calculator section entirely
                    // setActiveAccordionItems([]); // Optionally close all non-matching
                 } else {
                     setActiveAccordionItems([]); // Close all for top-level pages or home
                 }

            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, mounted, searchTerm]);


  const toggleFavorite = (slug: string, event: React.MouseEvent) => {
    event.preventDefault(); // Prevent link navigation
    event.stopPropagation(); // Prevent accordion toggle
    setFavorites(prevFavorites =>
      prevFavorites.includes(slug)
        ? prevFavorites.filter(fav => fav !== slug)
        : [...prevFavorites, slug]
    );
  };

   const filteredCalculators = React.useMemo(() => {
        if (!mounted || !searchTerm) {
          return CALCULATORS; // Return all if not searching or not mounted
        }
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return CALCULATORS.filter(calc =>
          calc.name.toLowerCase().includes(lowerCaseSearchTerm) ||
          calc.description.toLowerCase().includes(lowerCaseSearchTerm) ||
          calc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          calc.slug.toLowerCase().includes(lowerCaseSearchTerm)
        );
    }, [searchTerm, mounted]);

   const groupedCalculators = React.useMemo(() => {
     if (!mounted) return { favorites: [], grouped: [] };

     const calcsToGroup = searchTerm ? filteredCalculators : CALCULATORS;
     const favoriteCalcs = calcsToGroup.filter(calc => favorites.includes(calc.slug)); // Still needed for toggle logic
     const regularCalcs = calcsToGroup;

     const grouped = CATEGORIES.map(category => ({
       ...category,
       calculators: regularCalcs.filter(calc => calc.category === category.name),
     })).filter(category => category.calculators.length > 0); // Only keep categories with items

     return { favorites: favoriteCalcs, grouped }; // Keep favorites for toggle logic
   }, [favorites, mounted, searchTerm, filteredCalculators]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleAccordionChange = (value: string[]) => {
        setActiveAccordionItems(value);
    };

    const toggleTheme = () => {
      setTheme(theme === 'light' ? 'dark' : 'light');
      if (onLinkClick) {
        onLinkClick(); // Close mobile sheet if open
      }
    };

   // Skeleton Loader
  if (!mounted) {
     return (
       <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground"> {/* Removed flex-1, relying on parent */}
         {/* Top Links Skeleton (Static part) */}
         <div className="p-4 space-y-2 border-b border-sidebar-border flex-shrink-0">
             {/* Search Skeleton */}
             <Skeleton className="h-9 w-full" /> {/* Removed rounded-md */}
         </div>
         {/* Scrollable Area Skeleton */}
          <ScrollArea className="flex-1 min-h-0"> {/* Use ScrollArea here */}
             <div className="p-4 space-y-4"> {/* Inner padding */}
               {/* Categories Accordion Skeleton */}
               <Skeleton className="h-9 w-full mb-1" /> {/* Home button - Removed rounded-md */}
               <div className="pt-2 space-y-1">
                 <Skeleton className="h-10 w-full mb-1" /> {/* Trigger - Removed rounded-md */}
                   <div className="pl-5 pb-1 pt-1 space-y-1 border-l ml-2 pl-4 border-sidebar-border">
                     <Skeleton className="h-9 w-full" /> {/* Removed rounded-md */}
                     <Skeleton className="h-9 w-full" /> {/* Removed rounded-md */}
                   </div>
                 <Skeleton className="h-10 w-full mb-1" /> {/* Trigger - Removed rounded-md */}
                 <Skeleton className="h-10 w-full mb-1" /> {/* Trigger - Removed rounded-md */}
                  <Skeleton className="h-10 w-full mb-1" /> {/* Trigger - Removed rounded-md */}
               </div>
             </div>
         </ScrollArea>
         {/* Bottom Links Skeleton (Static part) */}
         <div className="p-4 pt-2 space-y-1 border-t border-sidebar-border flex-shrink-0">
           <Skeleton className="h-9 w-full" /> {/* Removed rounded-md */}
           <Skeleton className="h-9 w-full" /> {/* Removed rounded-md */}
           <Skeleton className="h-9 w-full" /> {/* Bookmark skeleton - Removed rounded-md */}
           <Skeleton className="h-9 w-full" /> {/* Profile skeleton - Removed rounded-md */}
           <Skeleton className="h-9 w-full" /> {/* Theme toggle skeleton - Removed rounded-md */}
         </div>
       </div>
     );
  }

   // Actual Sidebar Content
  return (
    // The parent <aside> or SheetContent div now handles height
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
         {/* --- Static Top Section (Non-scrollable) --- */}
        <div className='p-4 border-b border-sidebar-border flex-shrink-0'>
             {/* --- Search Input --- */}
             <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                    ref={searchInputRef} // Add ref
                    type="search"
                    placeholder="Search calculators..."
                    className="pl-9 h-9 text-sm bg-background" // Added bg-background for contrast
                    value={searchTerm}
                    onChange={handleSearchChange}
                    aria-label="Search calculators"
                    // Explicitly disable autoFocus to prevent focus on mobile sheet open
                    autoFocus={false}
                    />
                </div>
        </div>


       {/* --- Scrollable Middle Section --- */}
       {/* Use ScrollArea for the middle section */}
       <ScrollArea className="flex-1 min-h-0"> {/* Takes remaining space and scrolls */}
         <nav className="flex flex-col space-y-1 p-4 text-sm font-medium">
           {/* --- Calculators Accordion (Filters based on search) --- */}
           <Accordion
              type="multiple"
              value={activeAccordionItems}
              onValueChange={handleAccordionChange}
              className="w-full space-y-1" // Removed pt-2
           >
                {groupedCalculators.grouped.map((category) => (
                   <AccordionItem value={category.name} key={category.name} className="border-b-0">
                     {/* Accordion Trigger styled */}
                     <AccordionTrigger
                        className={cn(
                            "flex w-full items-center px-2 py-1.5 text-sm font-medium transition-colors",
                            "hover:no-underline hover:bg-sidebar-accent",
                            "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                            "h-10 justify-start gap-2",
                            "[&[data-state=open]>svg:last-child]:rotate-180",
                             "focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-0"
                        )}
                    >
                       <category.icon className="h-5 w-5 text-sidebar-primary shrink-0" />
                       <span className="flex-1 text-left truncate">{category.name}</span>
                       {/* Chevron is added by default AccordionTrigger */}
                     </AccordionTrigger>
                     {/* Adjusted Accordion Content padding */}
                     <AccordionContent className="pl-4 pb-1 pt-1"> {/* Adjusted left padding */}
                       <div className="flex flex-col space-y-1 mt-1 border-l border-sidebar-border pl-3"> {/* Adjusted left padding */}
                         {category.calculators.map((calc) => {
                            const isFavorite = favorites.includes(calc.slug);
                            return (
                                <div key={calc.slug} className="relative group">
                                   <Link
                                       href={`/calculator/${calc.slug}`}
                                       passHref
                                       onClick={onLinkClick} // Close sheet on click
                                       className={cn(
                                           "flex items-center justify-between w-full pl-3 pr-8 text-sm font-medium transition-colors h-9 focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-0",
                                           pathname === `/calculator/${calc.slug}`
                                               ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                               : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                       )}
                                       aria-current={pathname === `/calculator/${calc.slug}` ? 'page' : undefined}
                                     >
                                       <span className="truncate">{calc.name}</span>
                                    </Link>
                                     <Button
                                         variant="ghost"
                                         size="icon"
                                         className={cn(
                                             "absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-sidebar-primary group-hover:opacity-100 z-10",
                                             isFavorite ? "text-sidebar-primary opacity-100" : "opacity-0"
                                         )}
                                         onClick={(e) => toggleFavorite(calc.slug, e)}
                                         aria-label={isFavorite ? `Remove ${calc.name} from bookmarks` : `Add ${calc.name} to bookmarks`}
                                     >
                                         <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
                                     </Button>
                                </div>
                             );
                         })}
                       </div>
                     </AccordionContent>
                   </AccordionItem>
                 ))}
                 {/* Show message if search yields no results in categories */}
                {searchTerm && groupedCalculators.grouped.length === 0 && groupedCalculators.favorites.length === 0 && (
                    <p className="px-3 text-xs text-muted-foreground text-center py-4">No results found for &quot;{searchTerm}&quot;.</p>
                )}
              </Accordion>
           </nav>
       </ScrollArea> {/* End of ScrollArea */}

        {/* --- Static Bottom Section (Non-scrollable) --- */}
        <div className="p-4 pt-2 space-y-1 border-t border-sidebar-border flex-shrink-0">
          <Link href="/" passHref onClick={onLinkClick}>
             <Button
                 variant={pathname === '/' ? 'secondary' : 'ghost'}
                 className="w-full justify-start h-9"
                 aria-current={pathname === '/' ? 'page' : undefined}
             >
                 <Home className="mr-2 h-4 w-4" />
                 Home
             </Button>
           </Link>
           <Link href="/bookmark" passHref onClick={onLinkClick}>
             <Button
                 variant={pathname === '/bookmark' ? 'secondary' : 'ghost'}
                 className="w-full justify-start h-9"
                 aria-current={pathname === '/bookmark' ? 'page' : undefined}
             >
                 <Bookmark className="mr-2 h-4 w-4" />
                 Bookmarks
             </Button>
           </Link>
           <Link href="/history" passHref onClick={onLinkClick}>
             <Button
                 variant={pathname === '/history' ? 'secondary' : 'ghost'}
                 className="w-full justify-start h-9"
                 aria-current={pathname === '/history' ? 'page' : undefined}
             >
                 <History className="mr-2 h-4 w-4" />
                 History
             </Button>
           </Link>
           {/* Theme Toggle Button */}
           <Button variant="ghost" onClick={toggleTheme} className="w-full justify-start h-9">
             {theme === 'light' ? (
               <Moon className="mr-2 h-4 w-4" />
             ) : (
               <Sun className="mr-2 h-4 w-4" />
             )}
             {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
           </Button>
           <Link href="/profile" passHref onClick={onLinkClick}>
             <Button
                 variant={pathname === '/profile' ? 'secondary' : 'ghost'}
                 className="w-full justify-start h-9"
                 aria-current={pathname === '/profile' ? 'page' : undefined}
             >
                 <User className="mr-2 h-4 w-4" />
                 Profile
             </Button>
           </Link>
        </div>
    </div>
  );
}
    
