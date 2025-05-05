
'use client';

// IMPORTANT: Real estate investment analysis is complex, involving many factors like
// financing, operating expenses, vacancy rates, appreciation, depreciation, taxes, etc.
// This calculator is a MAJOR SIMPLIFICATION, possibly calculating a basic metric like Cap Rate or Cash-on-Cash Return.
// THIS IS FOR ILLUSTRATIVE PURPOSES ONLY AND NOT INVESTMENT ADVICE.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Building2, Percent, AlertTriangle } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema - Example: Calculating Simple Cap Rate
const realEstateSchema = z.object({
    propertyValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Property value must be positive.",
    }),
    netOperatingIncome: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Net Operating Income (NOI) must be zero or positive.",
    }), // NOI = Gross Rental Income - Operating Expenses (excl. mortgage/depreciation)
});

type RealEstateFormValues = z.infer<typeof realEstateSchema>;

interface RealEstateCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function RealEstateCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: RealEstateCalculatorProps) {
    const [capRate, setCapRate] = React.useState<number | null>(null);
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

    const form = useForm<RealEstateFormValues>({
        resolver: zodResolver(realEstateSchema),
        defaultValues: {
            propertyValue: '',
            netOperatingIncome: '',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset();
            setCapRate(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Cap Rate
    const calculateCapRate = (values: RealEstateFormValues): number | null => {
        const value = parseFloat(values.propertyValue);
        const noi = parseFloat(values.netOperatingIncome);

        if (isNaN(value) || value <= 0 || isNaN(noi) || noi < 0) {
            return null;
        }

        // Cap Rate = Net Operating Income / Current Market Value (or Purchase Price)
        const rate = (noi / value) * 100;
        return rate;
    };

    const onSubmit: SubmitHandler<RealEstateFormValues> = (data) => {
        const result = calculateCapRate(data);
        if (result !== null) {
            setCapRate(result);

            const inputString = `Value: ${formatCurrency(parseFloat(data.propertyValue))}, NOI: ${formatCurrency(parseFloat(data.netOperatingIncome))}`;
            const resultString = `Estimated Capitalization Rate (Cap Rate): ${result.toFixed(2)}%`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setCapRate(null);
             form.setError("root", {message: "Calculation failed. Check inputs."})
            console.error("Calculation failed. Check inputs.");
        }
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
                    <Skeleton className="mt-6 h-20 w-full" /> {/* Result */}
                    <Skeleton className="h-16 w-full" /> {/* Disclaimer */}
                </CardContent>
            </Card>
        );
    }


    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="relative">
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description} <strong className='text-destructive'>(Simplified Cap Rate Example)</strong></CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="propertyValue" render={({ field }) => (<FormItem><FormLabel>Property Value / Purchase Price ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 500000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="netOperatingIncome" render={({ field }) => (<FormItem><FormLabel>Annual Net Operating Income (NOI) ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 30000" {...field} step="any" min="0" /></FormControl><FormDescription className="text-xs">Gross Income minus Operating Expenses (excl. loan/depreciation).</FormDescription><FormMessage /></FormItem>)} />
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Cap Rate</Button>
                    </form>
                </Form>

                 {capRate !== null && (
                    <Alert className="mt-6">
                         <Percent className="h-4 w-4" />
                         <AlertTitle>Estimated Capitalization Rate (Cap Rate)</AlertTitle>
                         <AlertDescription>
                             <p>The estimated Cap Rate is <strong>{capRate.toFixed(2)}%</strong>.</p>
                             <p className="text-xs mt-2 text-muted-foreground">Cap Rate = NOI / Value. It represents the potential rate of return before financing costs. Higher generally indicates higher return (and potentially higher risk).</p>
                         </AlertDescription>
                    </Alert>
                )}
                 {!capRate && (
                     <Alert variant="destructive" className="mt-6">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Important Disclaimer</AlertTitle>
                         <AlertDescription>
                              Real estate investment analysis requires considering many factors beyond a simple Cap Rate (e.g., financing, cash flow after debt service, taxes, appreciation potential, market conditions, property condition). This calculator is highly simplified. Consult with real estate professionals and financial advisors before making investment decisions.
                         </AlertDescription>
                    </Alert>
                  )}
            </CardContent>
        </Card>
    );
}
