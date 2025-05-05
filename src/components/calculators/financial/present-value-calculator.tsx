
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Sigma, TrendingDown } from 'lucide-react'; // Use Sigma or TrendingDown
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Present Value Calculator
const pvSchema = z.object({
    futureValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Future value must be zero or positive.",
    }),
    discountRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual discount rate must be zero or positive.",
    }),
    periods: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Number of periods must be positive.",
    }),
    // Assuming rate and periods match (e.g., annual rate, periods in years)
    // Add compounding frequency if needed for more complex PV calculations
    // compoundingFrequency: z.enum(['annually', 'semi-annually', 'quarterly', 'monthly']).default('annually'),
});

type PvFormValues = z.infer<typeof pvSchema>;

interface PresentValueCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function PresentValueCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: PresentValueCalculatorProps) {
    const [presentValue, setPresentValue] = React.useState<number | null>(null);
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

    const form = useForm<PvFormValues>({
        resolver: zodResolver(pvSchema),
        defaultValues: {
            futureValue: '',
            discountRate: '',
            periods: '',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setPresentValue(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Present Value
    const calculatePresentValue = (values: PvFormValues): number | null => {
        const FV = parseFloat(values.futureValue);
        const rate = parseFloat(values.discountRate) / 100; // Rate per period
        const n = parseFloat(values.periods); // Number of periods

        if (isNaN(FV) || FV < 0 || isNaN(rate) || rate < 0 || isNaN(n) || n <= 0) {
            return null;
        }

        // PV = FV / (1 + rate)^n
        const pv = FV / Math.pow(1 + rate, n);
        return pv;
    };

    const onSubmit: SubmitHandler<PvFormValues> = (data) => {
        const result = calculatePresentValue(data);
        if (result !== null) {
            setPresentValue(result);

            const inputString = `FV: ${formatCurrency(parseFloat(data.futureValue))}, Rate: ${data.discountRate}%, Periods: ${data.periods}`;
            const resultString = `Present Value (PV): ${formatCurrency(result)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setPresentValue(null);
            form.setError("root", {message: "Calculation failed. Check inputs."});
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
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" /> {/* Button Skeleton */}
                    <Skeleton className="mt-6 h-20 w-full" /> {/* Result Skeleton */}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="relative">
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <FormField control={form.control} name="futureValue" render={({ field }) => (<FormItem><FormLabel>Future Value (FV) ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 10000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="discountRate" render={({ field }) => (<FormItem><FormLabel>Discount Rate per Period (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 5" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="periods" render={({ field }) => (<FormItem><FormLabel>Number of Periods</FormLabel><FormControl><Input type="number" placeholder="e.g., 10" {...field} step="any" min="0.01" /></FormControl><FormDescription className="text-xs">Ensure rate and periods match (e.g., annual rate, periods in years).</FormDescription><FormMessage /></FormItem>)} />
                          {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Present Value</Button>
                    </form>
                </Form>

                 {presentValue !== null && (
                    <Alert className="mt-6">
                         <TrendingDown className="h-4 w-4" />
                         <AlertTitle>Present Value (PV) Result ({currency.code})</AlertTitle>
                         <AlertDescription>
                             The Present Value (PV) of the future amount is: <strong>{formatCurrency(presentValue)}</strong>
                         </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
