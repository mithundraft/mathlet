
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Remove CardDescription
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ArrowRight, Star } from 'lucide-react';
import { CATEGORIES, CALCULATORS, FAVORITES_STORAGE_KEY, APP_NAME, APP_DESCRIPTION } from '@/lib/constants';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { JsonLd } from '@/components/seo/json-ld';

export default function Home() {
  const [mounted, setMounted] = React.useState(false);
  const [favorites, setFavorites] = useLocalStorage<FavoriteCalculators>(FAVORITES_STORAGE_KEY, []);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleFavorite = (slug: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setFavorites(prevFavorites =>
      prevFavorites.includes(slug)
        ? prevFavorites.filter(fav => fav !== slug)
        : [...prevFavorites, slug]
    );
  };

  // Define WebPage schema for the homepage
  const homePageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `Homepage - ${APP_NAME}`,
    "url": process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002',
    "description": `Explore a wide range of calculators for finance, fitness, health, and math on ${APP_NAME}. ${APP_DESCRIPTION}`,
    "isPartOf": {
        "@type": "WebSite",
        "url": process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002',
        "name": APP_NAME
    }
  };


  // Skeleton Loader
  if (!mounted) {
    return (
      <div className="p-4 md:p-8 space-y-8">
         {/* Add JSON-LD Schema */}
         <JsonLd data={homePageSchema} />
         {/* Skeleton for Hero Section */}
         <section className="text-center py-10 md:py-16"> {/* Removed rounded-lg and gradient */}
             <Skeleton className="h-10 w-3/4 mx-auto mb-4" /> {/* Title */}
             <Skeleton className="h-5 w-1/2 mx-auto mb-3" /> {/* Description */}
             <Skeleton className="h-4 w-full max-w-xl mx-auto" /> {/* Additional Description */}
             <Skeleton className="h-4 w-3/4 max-w-lg mx-auto mt-1" /> {/* Additional Description */}
         </section>

        {/* Skeleton for Category Sections */}
        {Array.from({ length: CATEGORIES.length }).map((_, catIndex) => (
          <section key={catIndex}>
            <div className="flex justify-between items-center mb-4">
              <Skeleton className="h-8 w-1/3" /> {/* Category Title */}
              <Skeleton className="h-6 w-20" /> {/* View All Skeleton */}
            </div>
            <div className="relative">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex space-x-4 pb-4">
                  {/* Skeleton for Calculator Cards */}
                  {Array.from({ length: 4 }).map((_, cardIndex) => (
                     <Card key={cardIndex} className="w-[280px] sm:w-[320px] flex-shrink-0 flex flex-col"> {/* Adjusted width */}
                        <CardHeader className="flex flex-row items-start gap-3 pb-3 pr-10 relative flex-shrink-0">
                           <Skeleton className="absolute top-2 right-2 h-6 w-6 rounded-full" /> {/* Favorite button skeleton */}
                           <Skeleton className="h-6 w-6 rounded-sm mt-1 flex-shrink-0" /> {/* Icon Skeleton */}
                           <div className="flex-grow space-y-1.5">
                             <Skeleton className="h-5 w-3/4" /> {/* Title */}
                             {/* Remove Description Skeleton */}
                          </div>
                        </CardHeader>
                         <CardContent className="pt-0 mt-auto flex flex-col"> {/* Adjusted CardContent */}
                             <div className="flex-grow mb-2" /> {/* Spacer */}
                             <Skeleton className="h-9 w-full" /> {/* Button - Removed rounded-md */}
                         </CardContent>
                      </Card>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </section>
        ))}
      </div>
    );
  }

  // Actual Content
  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Add JSON-LD Schema */}
      <JsonLd data={homePageSchema} />

      {/* Hero Section */}
      <section className="text-center py-10 md:py-16"> {/* Removed rounded-lg and gradient */}
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">{APP_NAME}</h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-4">{APP_DESCRIPTION}</p>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Quickly access a variety of calculators covering financial planning, fitness tracking, health metrics, and mathematical problems. Bookmark your favorites for easy access.
        </p>
      </section>

      {CATEGORIES.map((category) => {
        const categoryCalculators = CALCULATORS.filter(
          (calc) => calc.category === category.name
        );
        if (categoryCalculators.length === 0) return null;

        return (
          <section key={category.name} aria-labelledby={`category-title-${category.name.toLowerCase().replace(/ /g, '-')}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 id={`category-title-${category.name.toLowerCase().replace(/ /g, '-')}`} className="text-xl lg:text-2xl font-semibold tracking-tight flex items-center gap-2">
                <category.icon className="hidden sm:block h-6 w-6 text-primary" aria-hidden="true" />
                {`Explore ${category.name}`}
              </h2>
               {/* "View All" link to search page */}
               <Link href="/search" className="text-xs lg:text-sm font-medium text-primary hover:underline flex items-center gap-1">
                   View All
                   <ArrowRight className="h-4 w-4" />
               </Link>
            </div>
            {/* Remove Description Paragraph */}
            <div className="relative">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex space-x-4 pb-4">
                  {categoryCalculators.map((calc) => {
                    const isFavorite = favorites.includes(calc.slug);
                    return (
                       <Card key={calc.slug} className="w-[280px] sm:w-[320px] flex flex-col flex-shrink-0 transition-subtle hover:shadow-md dark:hover:shadow-primary/20"> {/* Adjusted width */}
                          <CardHeader className="flex flex-row items-start gap-3 pb-3 pr-10 relative flex-shrink-0"> {/* Keep relative for button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-primary z-10", // Adjusted size
                                isFavorite && "text-primary"
                              )}
                              onClick={(e) => toggleFavorite(calc.slug, e)}
                              aria-label={isFavorite ? `Remove ${calc.name} from bookmarks` : `Add ${calc.name} to bookmarks`}
                            >
                              <Star className={cn("h-5 w-5", isFavorite && "fill-current")} />
                            </Button>
                             <calc.icon className="h-6 w-6 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                            <div className="flex-grow">
                              <CardTitle className="text-lg font-semibold leading-tight">{calc.name}</CardTitle>
                               {/* Remove CardDescription */}
                            </div>
                          </CardHeader>
                           <CardContent className="pt-0 mt-auto flex flex-col"> {/* Make content flex col */}
                              <div className="flex-grow mb-2" /> {/* Push button down */}
                             <Link
                                href={`/calculator/${calc.slug}`}
                                 className={cn(
                                    "block w-full text-center text-sm font-medium transition-colors py-2 px-3", // Removed rounded-md, mt-2
                                    "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                                  )}
                              >
                                Open Calculator
                              </Link>
                           </CardContent>
                        </Card>
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </section>
        );
      })}
    </div>
  );
}
