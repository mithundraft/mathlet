
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Repeat1, TrendingUp } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Average Return Calculator
const averageReturnSchema = z.object({
    initialValue: z.string().refine(val => !isNaN(parseFloat(val)), {
        message: "Initial value must be a number.", // Allow zero or negative for losses
    }),
    finalValue: z.string().refine(val => !isNaN(parseFloat(val)), {
        message: "Final value must be a number.",
    }),
    numberOfYears: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Number of years must be a positive number.",
    }),
});

type AverageReturnFormValues = z.infer<typeof averageReturnSchema>;

interface AverageReturnCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function AverageReturnCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: AverageReturnCalculatorProps) {
    const [averageAnnualReturn, setAverageAnnualReturn] = React.useState<number | null>(null);
    const [totalReturn, setTotalReturn] = React.useState<number | null>(null);
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

    const form = useForm<AverageReturnFormValues>({
        resolver: zodResolver(averageReturnSchema),
        defaultValues: {
            initialValue: '',
            finalValue: '',
            numberOfYears: '',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setAverageAnnualReturn(null);
            setTotalReturn(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]); // Reset on currency change as values are currency-dependent

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Average Annual Rate of Return (Geometric Mean)
    const calculateAverageReturn = (values: AverageReturnFormValues): { average: number; total: number } | null => {
        const initial = parseFloat(values.initialValue);
        const final = parseFloat(values.finalValue);
        const years = parseFloat(values.numberOfYears);

        if (isNaN(initial) || isNaN(final) || isNaN(years) || years <= 0) {
            return null;
        }

        if (initial === 0) {
             // Cannot calculate percentage return if initial value is zero
             form.setError("initialValue", { message: "Initial value cannot be zero for return calculation." });
             return null;
        }
         if (initial < 0 && final > 0) {
            // Handle case moving from negative to positive (complex interpretation)
            console.warn("Calculating return from negative initial to positive final value.")
            // Simple total return calculation might still be okay here
         }
         if (initial < 0 && final < 0 && final >= initial) {
             // Handle case from negative to less negative (a gain in relative terms)
              console.warn("Calculating return between two negative values.")
         }


        const totalReturnCalc = ((final - initial) / Math.abs(initial)) * 100; // Total return percentage based on absolute initial value

        // Calculate Average Annual Return (Compound Annual Growth Rate - CAGR)
        // CAGR = [(Ending Value / Beginning Value)^(1 / Number of Years)] - 1
         let averageAnnualReturnCalc: number | null = null;
         if (initial > 0 && final > 0) { // CAGR typically assumes positive values
             averageAnnualReturnCalc = (Math.pow(final / initial, 1 / years) - 1) * 100;
         } else if (initial < 0 && final < 0) {
             // CAGR interpretation is tricky with negative numbers.
             // One approach is to calculate based on absolute values but note the context.
             // Or calculate the average *change* rather than percentage rate.
             console.warn("CAGR calculation with negative values can be misleading. Reporting total return only.");
              averageAnnualReturnCalc = null; // Or provide a different metric
         } else {
             // Mixed signs or initial zero - CAGR formula problematic
             console.warn("CAGR calculation not applicable for zero or mixed sign values.");
             averageAnnualReturnCalc = null;
         }

        return {
            average: averageAnnualReturnCalc,
            total: totalReturnCalc
        };
    };

    const onSubmit: SubmitHandler<AverageReturnFormValues> = (data) => {
        const result = calculateAverageReturn(data);
        if (result) {
            setAverageAnnualReturn(result.average);
            setTotalReturn(result.total);

            const inputString = `Initial Value: ${formatCurrency(parseFloat(data.initialValue))}, Final Value: ${formatCurrency(parseFloat(data.finalValue))}, Years: ${data.numberOfYears}`;
            const resultString = `Total Return: ${result.total.toFixed(2)}%, Average Annual Return (CAGR): ${result.average !== null ? result.average.toFixed(2) + '%' : 'N/A'}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setAverageAnnualReturn(null);
            setTotalReturn(null);
            // Error might be set in calculate function
        }
    };

     // Skeleton Loader
    if (!mounted) {
        return (
            <Card className="w-full max-w-lg mx-auto">
                <CardHeader className="relative">
                    <Skeleton className="absolute top-3 right-3 h-7 w-7 rounded-full" />
                    <div className="flex items-center gap-2 pr-10">
                        <Skeleton className="h-6 w-6" />
                        <Skeleton className="h-6 w-3/4" />
                    </div>
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
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")}
                    onClick={toggleFavorite}
                    aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}
                >
                    <Star className={cn("h-5 w-5", isFavorite && "fill-current")} />
                </Button>
                <CardTitle className="flex items-center gap-2 pr-10">
                    <Icon className="h-6 w-6 text-primary" />
                    {name}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="initialValue"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Initial Investment Value ({currency.symbol})</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 10000" {...field} step="any" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="finalValue"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Final Investment Value ({currency.symbol})</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 15000" {...field} step="any" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="numberOfYears"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Years</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 5" {...field} step="any" min="0.01" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         {form.formState.errors.root && (
                            <FormMessage>{form.formState.errors.root.message}</FormMessage>
                         )}
                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate Average Return
                        </Button>
                    </form>
                </Form>

                {totalReturn !== null && (
                    <Alert className="mt-6">
                        <TrendingUp className="h-4 w-4" />
                        <AlertTitle>Investment Return Summary</AlertTitle>
                        <AlertDescription>
                            <p>Total Return: <strong>{totalReturn.toFixed(2)}%</strong></p>
                             {averageAnnualReturn !== null ? (
                                <p>Average Annual Return (CAGR): <strong>{averageAnnualReturn.toFixed(2)}%</strong></p>
                             ) : (
                                 <p className="text-xs text-muted-foreground">Average Annual Return (CAGR) could not be calculated due to input values (e.g., zero initial value, mixed signs).</p>
                             )}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
