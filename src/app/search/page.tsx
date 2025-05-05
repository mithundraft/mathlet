
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { CALCULATORS, FAVORITES_STORAGE_KEY, APP_NAME } from '@/lib/constants';
import { Search, Calculator, Star } from 'lucide-react'; // Added Star
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Removed CardDescription
import { Button } from '@/components/ui/button'; // Added Button
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocalStorage } from '@/hooks/use-local-storage'; // Added useLocalStorage
import type { FavoriteCalculators } from '@/lib/types'; // Added FavoriteCalculators type
import { JsonLd } from '@/components/seo/json-ld'; // Import JsonLd component


export default function SearchPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [mounted, setMounted] = React.useState(false);
  const [favorites, setFavorites] = useLocalStorage<FavoriteCalculators>(FAVORITES_STORAGE_KEY, []); // Added favorites state

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const filteredCalculators = React.useMemo(() => {
    // No filtering needed if not mounted, but we'll return [] for skeleton purposes
    if (!mounted) {
      return [];
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim(); // Trim search term
     if (!lowerCaseSearchTerm) {
       return CALCULATORS; // Return all if search term is empty after trimming
     }
    return CALCULATORS.filter(calc =>
      calc.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      calc.description.toLowerCase().includes(lowerCaseSearchTerm) ||
      calc.category.toLowerCase().includes(lowerCaseSearchTerm) ||
      calc.slug.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [searchTerm, mounted]);

  // Function to toggle favorite status
  const toggleFavorite = (slug: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation(); // Prevent card link navigation when clicking the star
    setFavorites(prevFavorites =>
      prevFavorites.includes(slug)
        ? prevFavorites.filter(fav => fav !== slug)
        : [...prevFavorites, slug]
    );
  };

   // Define SearchResultsPage schema
  const searchPageSchema = {
    "@context": "https://schema.org",
    "@type": "SearchResultsPage",
    "name": "Calculator Search Results",
    "url": `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/search`,
    "description": `Search page for finding calculators on ${APP_NAME}. Enter keywords to find relevant tools.`,
    "isPartOf": {
        "@type": "WebSite",
        "url": process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002',
        "name": APP_NAME
    },
    // Can dynamically add mainEntity based on search results if needed for advanced SEO
    // "mainEntity": {
    //   "@type": "ItemList",
    //   "itemListElement": filteredCalculators.map((calc, index) => ({
    //     "@type": "ListItem",
    //     "position": index + 1,
    //     "item": {
    //       "@type": "HowToTool",
    //       "name": calc.name,
    //       "url": `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/calculator/${calc.slug}`
    //     }
    //   }))
    // }
  };

  return (
    <div className="p-4 md:p-8">
       <JsonLd data={searchPageSchema} />
       {/* Header Skeleton */}
       {!mounted && (
            <div className="flex items-center gap-2 mb-6">
                <Skeleton className="h-8 w-8" /> {/* Icon Skeleton - Removed rounded-md */}
                <Skeleton className="h-8 w-56" /> {/* Title Skeleton - Removed rounded-md */}
            </div>
       )}
       {mounted && (
          <>
             <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                 <Search className="h-8 w-8 text-primary" />
                 Search Calculators
             </h1>
             <p className="text-muted-foreground mb-6 text-sm">
                Enter keywords like &quot;loan&quot;, &quot;BMI&quot;, or &quot;percentage&quot; to find the calculator you need, or browse all available calculators below.
             </p>
          </>
       )}


      <div className="relative mb-6">
         {/* Search Input Skeleton */}
          {!mounted && <Skeleton className="h-11 w-full" />} {/* Removed rounded-md */}
          {mounted && (
              <>
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by name, category, or keyword..."
                    className="pl-10 h-11 text-base"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search calculators"
                    aria-controls="search-results" // Link input to results area
                  />
              </>
          )}
      </div>

      {/* Skeleton Loader for Results */}
       {!mounted && (
          <div id="search-results" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => ( // Display 8 skeleton cards
              <Card key={index} className="flex flex-col relative">
                 {/* Skeleton for Favorite toggle button */}
                 <Skeleton className="absolute top-2 right-2 h-7 w-7 rounded-full" /> {/* Keep rounded for icon button */}
                <CardHeader className="flex flex-row items-start gap-3 pb-3 pr-10">
                    <Skeleton className="h-6 w-6" /> {/* Icon Skeleton - Removed rounded-sm */}
                    <div className="flex-grow space-y-1.5">
                        <Skeleton className="h-5 w-3/4" /> {/* Title - Removed rounded-md */}
                        {/* Remove Description Skeleton */}
                     </div>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                   <Skeleton className="h-9 w-full mt-2" /> {/* Button - Removed rounded-md */}
                </CardContent>
              </Card>
            ))}
          </div>
      )}

      {/* Search Results */}
      {mounted && (
        <div id="search-results" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-live="polite">
          {filteredCalculators.length > 0 ? (
            filteredCalculators.map((calc) => {
               const isFavorite = favorites.includes(calc.slug); // Check if favorite
               return (
              <Card key={calc.slug} className="flex flex-col transition-subtle hover:shadow-md dark:hover:shadow-primary/20 relative group">
                 {/* Bookmark Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-primary z-10",
                      isFavorite && "text-primary" // Style if favorite
                    )}
                    onClick={(e) => toggleFavorite(calc.slug, e)}
                    aria-label={isFavorite ? `Remove ${calc.name} from bookmarks` : `Add ${calc.name} to bookmarks`}
                  >
                    <Star className={cn("h-5 w-5", isFavorite && "fill-current")} /> {/* Fill star if favorite */}
                  </Button>

                <CardHeader className="flex flex-row items-start gap-3 pb-3 pr-10"> {/* Added pr-10 for space */}
                    <calc.icon className="h-6 w-6 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-grow">
                        <CardTitle className="text-lg font-semibold leading-tight">{calc.name}</CardTitle>
                        {/* Remove CardDescription */}
                     </div>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  <Link
                    href={`/calculator/${calc.slug}`}
                    className={cn(
                       "block w-full text-center text-sm font-medium transition-colors py-2 px-3 mt-2", // Removed rounded-md
                       "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    )}
                  >
                    Open Calculator
                  </Link>
                </CardContent>
              </Card>
               );
            })
          ) : (
            // Show only if mounted and no results and user has typed something
            searchTerm.trim() && (
                <div className="col-span-full text-center py-10 text-muted-foreground">
                No calculators found for &quot;{searchTerm}&quot;. Try a different keyword.
                </div>
            )
          )}
           {/* Show message if no search term entered but no results (shouldn't happen with current logic) */}
            {/* {!searchTerm.trim() && filteredCalculators.length === 0 && (
                 <div className="col-span-full text-center py-10 text-muted-foreground">
                     No calculators available.
                 </div>
             )} */}
        </div>
      )}
    </div>
  );
}
