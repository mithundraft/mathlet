
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { FAVORITES_STORAGE_KEY, CALCULATORS, APP_NAME } from '@/lib/constants';
import type { FavoriteCalculators, CalculatorInfo } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Removed CardDescription
import { Button } from '@/components/ui/button';
import { Bookmark, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from '@/components/ui/skeleton';
import { JsonLd } from '@/components/seo/json-ld'; // Import JsonLd component


export default function BookmarkPage() {
  const [favorites, setFavorites] = useLocalStorage<FavoriteCalculators>(FAVORITES_STORAGE_KEY, []);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const favoriteCalculators: CalculatorInfo[] = React.useMemo(() => {
    if (!mounted) return [];
    return CALCULATORS.filter(calc => favorites.includes(calc.slug));
  }, [favorites, mounted]);

  const removeFavorite = (slug: string) => {
    setFavorites(prevFavorites => prevFavorites.filter(fav => fav !== slug));
  };

  const clearAllFavorites = () => {
    setFavorites([]);
  };

   // Define CollectionPage schema for bookmarks
  const bookmarkPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Bookmarked Calculators",
    "url": `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/bookmark`,
    "description": `A collection of calculators bookmarked by the user on ${APP_NAME}.`,
    "isPartOf": {
        "@type": "WebSite",
        "url": process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002',
        "name": APP_NAME
    },
  };

  // Skeleton Loader
  if (!mounted) {
    return (
      <div className="p-4 md:p-8">
        <JsonLd data={bookmarkPageSchema} />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8" /> {/* Icon Skeleton - Removed rounded-md */}
                <Skeleton className="h-8 w-64" /> {/* Title Skeleton - Removed rounded-md */}
            </div>
             {/* Skeleton for Clear Button */}
             <Skeleton className="h-9 w-44" /> {/* Removed rounded-md */}
        </div>
          <Skeleton className="h-4 w-3/4 mb-6" /> {/* Description Skeleton - Removed rounded-md */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Display 4 Skeleton cards */}
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="flex flex-col relative">
                 {/* Skeleton for Favorite toggle button */}
                 <Skeleton className="absolute top-2 right-2 h-7 w-7 rounded-full" /> {/* Keep rounded for icon */}

                <CardHeader className="flex flex-row items-start gap-3 pb-3 pr-10">
                    <Skeleton className="h-6 w-6" /> {/* Icon Skeleton - Removed rounded-sm */}
                    <div className="flex-grow space-y-1.5">
                      <Skeleton className="h-5 w-3/4" /> {/* Title - Removed rounded-md */}
                      {/* Removed Description Skeleton */}
                   </div>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                   <Skeleton className="h-9 w-full mt-2" /> {/* Button - Removed rounded-md */}
                </CardContent>
              </Card>
            ))}
          </div>
      </div>
    );
  }

  // Actual Content
  return (
    <div className="p-4 md:p-8">
      <JsonLd data={bookmarkPageSchema} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bookmark className="h-8 w-8 text-primary" />
            Bookmarked Calculators
          </h1>
           {favoriteCalculators.length > 0 && (
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" /> Clear All Bookmarks
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently remove all
                      your bookmarked calculators.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAllFavorites} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, clear bookmarks
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
           )}
      </div>
       <p className="text-muted-foreground mb-6 text-sm">
           Here are the calculators you've saved for quick access. Click the star again to remove them.
       </p>

      {favoriteCalculators.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed"> {/* Removed rounded-lg */}
          <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="font-semibold mb-1">No Bookmarks Yet</p>
          <p className="text-sm">Click the star icon on a calculator card or page to save it here.</p>
          <Button variant="link" asChild className="mt-2">
            <Link href="/">Browse Calculators</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favoriteCalculators.map((calc) => (
            <Card key={calc.slug} className="flex flex-col transition-subtle hover:shadow-md dark:hover:shadow-primary/20 relative group">
               <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 text-primary hover:text-primary/80 z-10"
                  onClick={() => removeFavorite(calc.slug)}
                  aria-label={`Remove ${calc.name} from bookmarks`}
                >
                  <Star className="h-5 w-5 fill-current" />
              </Button>

              <CardHeader className="flex flex-row items-start gap-3 pb-3 pr-10">
                <calc.icon className="h-6 w-6 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                 <div className="flex-grow">
                   <CardTitle className="text-lg font-semibold leading-tight">{calc.name}</CardTitle>
                    {/* Removed CardDescription */}
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
          ))}
        </div>
      )}
    </div>
  );
}
