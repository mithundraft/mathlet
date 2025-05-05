
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
import { Calculator, Star, Gauge, TrendingUp, TrendingDown } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Inflation Calculator
const inflationSchema = z.object({
    initialAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Initial amount must be zero or positive.",
    }),
    startYear: z.string().refine(val => /^\d{4}$/.test(val), {
        message: "Enter a valid 4-digit start year.",
    }),
    endYear: z.string().refine(val => /^\d{4}$/.test(val), {
        message: "Enter a valid 4-digit end year.",
    }),
    // Optionally allow manual inflation rate entry, otherwise need CPI data (complex)
    averageInflationRate: z.string().refine(val => !isNaN(parseFloat(val)), { // Can be negative for deflation
        message: "Average inflation rate must be a number.",
    }),
});
// Add refinement: endYear >= startYear?

type InflationFormValues = z.infer<typeof inflationSchema>;

interface InflationCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function InflationCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: InflationCalculatorProps) {
    const [futureValue, setFutureValue] = React.useState<number | null>(null); // Value in end year dollars
    const [purchasingPowerChange, setPurchasingPowerChange] = React.useState<number | null>(null); // % change
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

    const form = useForm<InflationFormValues>({
        resolver: zodResolver(inflationSchema),
        defaultValues: {
            initialAmount: '',
            startYear: new Date().getFullYear().toString(), // Default start year to current year
            endYear: (new Date().getFullYear() + 10).toString(), // Default end year 10 years out
            averageInflationRate: '3', // Default average rate
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({
                startYear: new Date().getFullYear().toString(),
                endYear: (new Date().getFullYear() + 10).toString(),
                averageInflationRate: '3',
            });
            setFutureValue(null);
            setPurchasingPowerChange(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Inflation Adjusted Value
    const calculateInflation = (values: InflationFormValues): { fv: number; ppChange: number } | null => {
        const P = parseFloat(values.initialAmount);
        const start = parseInt(values.startYear);
        const end = parseInt(values.endYear);
        const rate = parseFloat(values.averageInflationRate) / 100;

        if (isNaN(P) || P < 0 || isNaN(start) || isNaN(end) || isNaN(rate)) {
            return null;
        }

        if (end < start) {
            form.setError("endYear", { message: "End year must be same as or after start year." });
            return null;
        }

        const years = end - start;

        // FV = PV * (1 + InflationRate)^Years
        const futureValueCalc = P * Math.pow(1 + rate, years);

        // Purchasing Power Change % = ((PV / FV) - 1) * 100   or ((FV/PV)^(1/years) - 1)*100 to get annual? Let's do total change.
         // Purchasing power of the initial amount in the end year: PV / (1+rate)^years
        const endYearValue = P / Math.pow(1 + rate, years); // How much end-year money is needed for start-year value P
        // Percentage Change = ( (FV/PV) - 1 ) * 100? No, that's total value change.
        // Purchasing Power Change = ( (Start Year Value / End Year Equivalent) - 1) * 100 ?
        // Or simply: Percentage change = ((FV - PV) / PV) * 100 for the value itself.
        // Let's calculate the % decrease in purchasing power of the original amount.
        // (Initial Amount / Future Equivalent - 1) * 100
         const ppChange = years === 0 ? 0 : ((P / futureValueCalc) - 1) * 100; // % decrease

        return { fv: futureValueCalc, ppChange: ppChange };
    };

    const onSubmit: SubmitHandler<InflationFormValues> = (data) => {
        const result = calculateInflation(data);
        if (result) {
            setFutureValue(result.fv);
            setPurchasingPowerChange(result.ppChange);

            const inputString = `Amount: ${formatCurrency(parseFloat(data.initialAmount))} in ${data.startYear}, Avg Rate: ${data.averageInflationRate}% to ${data.endYear}`;
            const resultString = `Equivalent value in ${data.endYear}: ${formatCurrency(result.fv)}. Purchasing power change: ${result.ppChange.toFixed(2)}%`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setFutureValue(null);
            setPurchasingPowerChange(null);
             // Error might be set in calculate function
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
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
                         <FormField control={form.control} name="initialAmount" render={({ field }) => (<FormItem><FormLabel>Initial Amount ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 1000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="startYear" render={({ field }) => (<FormItem><FormLabel>Start Year</FormLabel><FormControl><Input type="number" placeholder="e.g., 2020" {...field} step="1" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="endYear" render={({ field }) => (<FormItem><FormLabel>End Year</FormLabel><FormControl><Input type="number" placeholder="e.g., 2030" {...field} step="1" /></FormControl><FormMessage /></FormItem>)} />
                         </div>
                         <FormField control={form.control} name="averageInflationRate" render={({ field }) => (<FormItem><FormLabel>Average Annual Inflation Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 3" {...field} step="any" /></FormControl><FormDescription className="text-xs">Use average rate for the period. Historical data varies.</FormDescription><FormMessage /></FormItem>)} />
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Adjust for Inflation</Button>
                    </form>
                </Form>

                {futureValue !== null && purchasingPowerChange !== null && (
                    <Alert className="mt-6">
                        <Gauge className="h-4 w-4" />
                        <AlertTitle>Inflation Adjustment Results ({currency.code})</AlertTitle>
                        <AlertDescription>
                             <p>An amount of <strong>{formatCurrency(parseFloat(form.getValues('initialAmount')))}</strong> in {form.watch('startYear')} would have the same buying power as approximately <strong>{formatCurrency(futureValue)}</strong> in {form.watch('endYear')}.</p>
                              <p className={cn("mt-1 flex items-center gap-1", purchasingPowerChange < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                                 {purchasingPowerChange < 0 ? <TrendingDown className="h-4 w-4"/> : <TrendingUp className="h-4 w-4"/>}
                                Change in Purchasing Power: <strong>{purchasingPowerChange.toFixed(2)}%</strong>
                             </p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
