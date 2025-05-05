
'use client';

import * as React from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { HISTORY_STORAGE_KEY, CALCULATORS, APP_NAME } from '@/lib/constants';
import type { HistoryEntry } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card'; // Removed CardHeader, CardTitle, CardDescription
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Trash2, History } from 'lucide-react';
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

export default function HistoryPage() {
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(HISTORY_STORAGE_KEY, []);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const getCalculatorName = (slug: string) => {
    return CALCULATORS.find(calc => calc.slug === slug)?.name || 'Unknown Calculator';
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const deleteEntry = (id: string) => {
    setHistory(prevHistory => prevHistory.filter(entry => entry.id !== id));
  };

  // Define CollectionPage schema for history
   const historyPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Calculation History",
    "url": `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/history`,
    "description": `A log of past calculations performed by the user on ${APP_NAME}.`,
    "isPartOf": {
        "@type": "WebSite",
        "url": process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002',
        "name": APP_NAME
    },
    // Could add hasPart based on history if needed, similar to bookmarks
  };

  // Improved Skeleton Loader
  if (!mounted) {
    return (
         <div className="p-4 md:p-8">
            <JsonLd data={historyPageSchema} />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                 <div className="flex items-center gap-2">
                     <Skeleton className="h-8 w-8" /> {/* Icon Skeleton - Removed rounded-md */}
                     <Skeleton className="h-8 w-56" /> {/* Title Skeleton - Removed rounded-md */}
                 </div>
                 {/* Skeleton for Clear Button */}
                 <Skeleton className="h-9 w-28" /> {/* Removed rounded-md */}
            </div>
             <Skeleton className="h-4 w-3/4 mb-6" /> {/* Description Skeleton - Removed rounded-md */}
             <Card>
                <CardContent className="p-0">
                   <ScrollArea className="h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)]">
                    <div className="divide-y divide-border">
                        {/* Skeleton for 5 history entries */}
                        {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="p-4 flex justify-between items-start gap-4">
                            <div className="flex-grow space-y-1.5">
                            <Skeleton className="h-4 w-1/3" /> {/* Calculator Name - Removed rounded-md */}
                            <Skeleton className="h-3 w-1/4" /> {/* Timestamp - Removed rounded-md */}
                            <Skeleton className="h-3 w-3/4" /> {/* Input - Removed rounded-md */}
                            <Skeleton className="h-3 w-2/3" /> {/* Result - Removed rounded-md */}
                            </div>
                            <Skeleton className="h-7 w-7" /> {/* Delete Button Icon - Removed rounded-md */}
                        </div>
                        ))}
                    </div>
                   </ScrollArea>
                </CardContent>
             </Card>
         </div>
    );
  }

  // Render Actual Content
  return (
    <div className="p-4 md:p-8">
       <JsonLd data={historyPageSchema} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-8 w-8 text-primary" />
          Calculation History
        </h1>
        {history.length > 0 && (
           <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" /> Clear All
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all
                  your calculation history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, clear history
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
         Review your recent calculations. History is stored locally in your browser.
      </p>

      <Card>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No calculation history yet. Start calculating!
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)]">
              <div className="divide-y divide-border">
                {history.map((entry) => (
                  <div key={entry.id} className="p-4 flex justify-between items-start gap-4 hover:bg-muted/50 transition-colors">
                    <div className="flex-grow">
                      <p className="font-semibold text-sm mb-1">
                        {getCalculatorName(entry.calculatorSlug)}
                      </p>
                      <p className="text-xs text-muted-foreground mb-1">
                         {format(new Date(entry.timestamp), "PPpp")}
                      </p>
                       <p className="text-xs break-all"><strong>Input:</strong> {entry.input}</p>
                       <p className="text-xs break-all"><strong>Result:</strong> {entry.result}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive h-7 w-7 mt-1 flex-shrink-0"
                      onClick={() => deleteEntry(entry.id)}
                      aria-label={`Delete history entry from ${format(new Date(entry.timestamp), "PPp")}`}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete entry</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
