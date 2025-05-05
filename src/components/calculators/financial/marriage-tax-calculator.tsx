
'use client';

// IMPORTANT: Marriage tax implications are EXTREMELY complex, vary wildly by jurisdiction
// (federal, state, local), depend on numerous factors (income sources, deductions, credits,
// filing status choice, etc.), and change frequently.
// This calculator CANNOT provide accurate tax advice. It's a conceptual placeholder.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Users2, Receipt, AlertTriangle } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema - Highly simplified, just getting incomes.
const marriageTaxSchema = z.object({
    income1: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Income 1 must be zero or positive.",
    }),
    income2: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Income 2 must be zero or positive.",
    }),
    // Add fields for deductions, credits, state etc. for a real calculator (extremely complex)
});

type MarriageTaxFormValues = z.infer<typeof marriageTaxSchema>;

interface MarriageTaxCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function MarriageTaxCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: MarriageTaxCalculatorProps) {
    // No actual calculation possible with this simplified setup
    const [showDisclaimer, setShowDisclaimer] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);

    const { name, description, icon: Icon } = calculatorInfo;
    const isFavorite = favorites.includes(slug);

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

    const form = useForm<MarriageTaxFormValues>({
        resolver: zodResolver(marriageTaxSchema),
        defaultValues: {
            income1: '',
            income2: '',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setShowDisclaimer(false);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Placeholder submit handler
    const onSubmit: SubmitHandler<MarriageTaxFormValues> = (data) => {
        setShowDisclaimer(true); // Show the disclaimer instead of calculating

        // Log basic info for history (optional, as no real calculation)
        const inputString = `Income 1: ${formatCurrency(parseFloat(data.income1))}, Income 2: ${formatCurrency(parseFloat(data.income2))}`;
        const resultString = "No calculation performed. See disclaimer.";

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
                    <Skeleton className="h-10 w-full" /> {/* Button Skeleton */}
                    <Skeleton className="mt-6 h-24 w-full" /> {/* Disclaimer Skeleton */}
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
                         <p className="text-sm text-muted-foreground">Enter incomes to see disclaimer.</p>
                        <FormField control={form.control} name="income1" render={({ field }) => (<FormItem><FormLabel>Partner 1 Annual Gross Income ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 60000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="income2" render={({ field }) => (<FormItem><FormLabel>Partner 2 Annual Gross Income ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 70000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <Button type="submit" className="w-full"><Receipt className="mr-2 h-4 w-4" /> Show Disclaimer</Button>
                    </form>
                </Form>

                {showDisclaimer && (
                    <Alert variant="destructive" className="mt-6">
                         <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Important Disclaimer: Tax Calculation Complexity</AlertTitle>
                        <AlertDescription>
                            Calculating the tax impact of marriage ("marriage penalty" or "bonus") is highly complex. It depends on:
                            <ul className="list-disc list-outside pl-5 mt-1 text-xs">
                                <li>Specific tax laws (federal, state, local) which change often.</li>
                                <li>Filing status chosen (Married Filing Jointly vs. Separately).</li>
                                <li>Tax brackets, standard vs. itemized deductions, available credits.</li>
                                <li>Income sources, types of deductions, and credits for each individual.</li>
                            </ul>
                             <strong className='block mt-2'>This calculator cannot provide an accurate estimate.</strong> Please consult with a qualified tax professional for advice specific to your situation.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
