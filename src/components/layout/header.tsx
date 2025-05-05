
'use client'; // Required for hooks and interactivity

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'; // Import SheetTitle
import { Menu, Check, ChevronsUpDown } from 'lucide-react'; // Removed Search
import { APP_NAME, CURRENCIES, PROFILE_STORAGE_KEY } from '@/lib/constants';
import { SidebarNav } from './sidebar-nav';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList, CommandItem } from "@/components/ui/command";
// Removed Input import as it's no longer used here
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserProfile } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
// Removed useRouter import as it's no longer used here
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

export function Header() {
  const [profile, setProfile] = useLocalStorage<UserProfile>(PROFILE_STORAGE_KEY, { preferredCurrency: 'USD' });
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false); // State for mobile sheet
  // Removed searchTerm state
  // Removed router initialization
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentCurrencyCode = profile?.preferredCurrency || 'USD';
  const currentCurrency = CURRENCIES.find(c => c.code === currentCurrencyCode);

  const handleCurrencyChange = (currencyCode: string) => {
     if (currencyCode) {
       setProfile(prevProfile => ({ ...prevProfile, preferredCurrency: currencyCode }));
       const currencyName = CURRENCIES.find(c => c.code === currencyCode)?.name || currencyCode;
       toast({
          title: "Currency Updated",
          description: `Preferred currency set to ${currencyName}.`,
        });
        setPopoverOpen(false);
     }
  };

  // Callback to close the sheet
  const handleLinkClick = () => {
    setSheetOpen(false);
  };


   // Removed handleSearchChange and handleSearchSubmit

   // Skeleton Loader
   if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center px-4">
          {/* Mobile Menu Trigger Skeleton */}
          <div className="md:hidden mr-2">
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>

          {/* App Name / Logo Skeleton */}
          <div className="flex flex-1 items-center justify-center md:justify-start">
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>

          {/* Removed Search Bar Skeleton */}

          {/* Currency Selector Skeleton */}
          <div className="flex items-center justify-end space-x-2 ml-auto"> {/* Added ml-auto */}
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
      </header>
    );
  }

   // Actual Header Content
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4">
        {/* Mobile Menu Trigger */}
        <div className="md:hidden">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}> {/* Control sheet state */}
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 h-8 w-8">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            {/* Apply flex flex-col to SheetContent */}
            <SheetContent side="left" className="pr-0 w-72 flex flex-col">
               {/* Add accessible title */}
               <SheetTitle className="sr-only">Main Navigation</SheetTitle>
              <Link href="/" className="flex items-center px-6 pt-4 mb-4 flex-shrink-0" onClick={handleLinkClick}>
                <span className="font-bold text-lg">{APP_NAME}</span>
              </Link>
              {/* Make this div grow and manage overflow */}
              <div className="flex-grow overflow-hidden">
                 {/* Pass callback to SidebarNav */}
                 <SidebarNav onLinkClick={handleLinkClick} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* App Name / Logo */}
        <div className="flex flex-1 items-center justify-center md:justify-start">
           <Link href="/" className="flex items-center space-x-2">
             <span className="font-bold sm:inline-block">{APP_NAME}</span>
           </Link>
        </div>

         {/* Search Bar (Removed from Header) */}


        {/* Right Aligned Items */}
        <div className="flex items-center justify-end space-x-2 ml-auto"> {/* Added ml-auto to push currency to the right */}
           {/* Currency Selector with Search */}
           <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                 <Button
                  variant="ghost"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-auto h-9 text-xs px-2 justify-between hover:bg-accent focus:ring-0 focus:ring-offset-0 sm:text-sm sm:px-3"
                  aria-label="Select currency"
                >
                    <span className="flex items-center gap-1">
                       {currentCurrency ? (
                         <>
                            <span className="font-medium">{currentCurrency.symbol}</span>
                            <span className="text-muted-foreground">{currentCurrency.code}</span>
                         </>
                       ) : (
                         "Select currency..."
                       )}
                    </span>
                  <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search currency..." />
                  <CommandList>
                      <CommandEmpty>No currency found.</CommandEmpty>
                      <CommandGroup>
                        {CURRENCIES.map((currency) => (
                          <CommandItem
                            key={currency.code}
                            value={`${currency.code} ${currency.name} ${currency.symbol}`}
                            onSelect={() => {
                              handleCurrencyChange(currency.code);
                            }}
                             className="text-xs sm:text-sm"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                currentCurrencyCode === currency.code ? "opacity-100" : "opacity-0"
                              )}
                            />
                             <span className="mr-2 font-medium w-4 text-center">{currency.symbol}</span>
                             <span className="flex-1 truncate">{currency.name} ({currency.code})</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                   </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
        </div>
      </div>
    </header>
  );
}
