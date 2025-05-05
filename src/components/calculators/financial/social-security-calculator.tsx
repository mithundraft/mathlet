
'use client';

// IMPORTANT: Social Security benefit calculations are extremely complex, based on lifetime
// earnings records, specific retirement age, potential spousal/survivor benefits, COLAs,
// and are subject to legislative changes. This calculator CANNOT provide an accurate estimate.
// Use the official SSA calculators (ssa.gov) or consult with them directly.
// THIS IS FOR ILLUSTRATIVE PURPOSES ONLY AND NOT FINANCIAL ADVICE.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Users, HandCoins, AlertTriangle } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema - Highly simplified, maybe asking for expected FRA benefit
const ssSchema = z.object({
    estimatedFraBenefit: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Estimated benefit at Full Retirement Age (FRA) must be positive.",
    }), // User gets this from SSA statement
    retirementAge: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 62 && parseInt(val) <= 70, { // Benefit claiming age
        message: "Retirement age for claiming benefits must be between 62 and 70.",
    }),
     // Need user's Full Retirement Age (FRA) based on birth year - complex logic needed
     // For simplification, we'll just show a disclaimer
});

type SsFormValues = z.infer<typeof ssSchema>;

interface SocialSecurityCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData; // Likely USD
}

export function SocialSecurityCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: SocialSecurityCalculatorProps) {
    // No real calculation possible here without complex rules/tables
    const [showDisclaimer, setShowDisclaimer] = React.useState(true); // Always show disclaimer
     const [mounted, setMounted] = React.useState(false);

    const { name, description, icon: Icon } = calculatorInfo;
    const isFavorite = favorites.includes(slug);
    const displayCurrency = currency.code === 'USD' ? currency : { ...currency, code: 'USD', symbol: '$' }; // Default to USD

     React.useEffect(() => {
        setMounted(true);
    }, []);

    const toggleFavorite = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setFavorites(prevFavorites =>
            prevFavorites.includes(slug)
                ? prevFavorites.filter(fav => fav !== slug)
                : [...prevFavorites, slug]
        );
    };

    const form = useForm<SsFormValues>({
        resolver: zodResolver(ssSchema),
        defaultValues: {
            estimatedFraBenefit: '',
            retirementAge: '67', // Common FRA, but varies
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({ retirementAge: '67'});
            setShowDisclaimer(true);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayCurrency.code, mounted]); // Use displayCurrency

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${displayCurrency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [displayCurrency.symbol]);

    // Placeholder Submit - Just logs input, shows disclaimer
    const onSubmit: SubmitHandler<SsFormValues> = (data) => {
        setShowDisclaimer(true); // Ensure disclaimer is shown

        const inputString = `Est. FRA Benefit: ${formatCurrency(parseFloat(data.estimatedFraBenefit))}, Claiming Age: ${data.retirementAge}`;
        const resultString = "Cannot calculate accurately. Refer to official SSA resources.";

        const historyEntry: HistoryEntry = {
            id: Date.now().toString(),
            calculatorSlug: slug,
            timestamp: new Date(),
            input: inputString,
            result: resultString,
        };
        onCalculation(historyEntry);
    };

     // Skeleton Loader
    if (!mounted) {
        return (
            <Card className="w-full max-w-lg mx-auto">
                <CardHeader className="relative">
                    <Skeleton className="absolute top-3 right-3 h-7 w-7 rounded-full" />
                    <div className="flex items-center gap-2 pr-10"><Skeleton className="h-6 w-6" /><Skeleton className="h-6 w-3/4" /></div>
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                 <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" /> {/* Button */}
                    <Skeleton className="mt-6 h-28 w-full" /> {/* Disclaimer */}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="relative">
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description} <strong className='text-destructive'>(Informational Only)</strong></CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Inputs are just for show/history logging */}
                        <FormField control={form.control} name="estimatedFraBenefit" render={({ field }) => (<FormItem><FormLabel>Estimated Benefit at Full Retirement Age (FRA) ({displayCurrency.symbol})</FormLabel><FormControl><Input type="number" placeholder="From your SSA statement" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="retirementAge" render={({ field }) => (<FormItem><FormLabel>Age You Plan to Claim Benefits</FormLabel><FormControl><Input type="number" placeholder="62-70" {...field} step="1" min="62" max="70" /></FormControl><FormMessage /></FormItem>)} />
                        <Button type="submit" className="w-full"><Users className="mr-2 h-4 w-4" /> Show Disclaimer</Button>
                    </form>
                </Form>

                {showDisclaimer && (
                    <Alert variant="destructive" className="mt-6">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Important Disclaimer: Use Official SSA Resources</AlertTitle>
                        <AlertDescription>
                            Social Security benefit calculations are complex and personalized based on your entire earnings history, your specific Full Retirement Age (FRA), the age you claim benefits, potential spousal or survivor benefits, and ongoing legislative changes.
                            <strong className='block mt-1'>This calculator cannot provide an accurate estimate.</strong>
                            <ul className="list-disc list-outside pl-5 mt-1 text-xs">
                                <li>For the most accurate estimate, create an account on the official Social Security Administration website: <a href="https://www.ssa.gov/myaccount/" target="_blank" rel="noopener noreferrer" className='underline hover:text-destructive-foreground'>www.ssa.gov/myaccount</a>.</li>
                                <li>Explore the detailed calculators available on the SSA website.</li>
                                <li>Consult directly with the Social Security Administration for personalized advice.</li>
                            </ul>
                            Do not rely on this simplified tool for retirement planning regarding Social Security benefits.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
