
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
import { Calculator, Star, PercentSquare, Sigma } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Interest Rate Calculator (solving for 'r')
const rateSchema = z.object({
    presentValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Present value must be positive.", // Rate calc often undefined if PV=0
    }),
    futureValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Future value must be zero or positive.",
    }),
    timePeriod: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Time period must be positive.",
    }),
    timeUnit: z.enum(['years', 'months', 'days']).default('years'),
    // Assuming simple calculation for now, compounding adds complexity
    // interestType: z.enum(['simple', 'compound']).default('simple'),
});

type RateFormValues = z.infer<typeof rateSchema>;

interface InterestRateCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function InterestRateCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: InterestRateCalculatorProps) {
    const [calculatedRate, setCalculatedRate] = React.useState<number | null>(null);
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

    const form = useForm<RateFormValues>({
        resolver: zodResolver(rateSchema),
        defaultValues: {
            presentValue: '',
            futureValue: '',
            timePeriod: '',
            timeUnit: 'years',
            // interestType: 'simple',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset({ timeUnit: 'years' });
            setCalculatedRate(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Interest Rate (Simplified: assumes simple interest or solves for CAGR)
    const calculateRate = (values: RateFormValues): number | null => {
        const PV = parseFloat(values.presentValue);
        const FV = parseFloat(values.futureValue);
        const time = parseFloat(values.timePeriod);
        const timeUnit = values.timeUnit;

        if (isNaN(PV) || PV <= 0 || isNaN(FV) || FV < 0 || isNaN(time) || time <= 0) {
            return null;
        }

        // Convert time to years
        let t_years: number;
        switch (timeUnit) {
            case 'years': t_years = time; break;
            case 'months': t_years = time / 12; break;
            case 'days': t_years = time / 365; break;
            default: return null;
        }

        if (t_years <= 0) return null; // Need positive time in years

        // Calculate Compound Annual Growth Rate (CAGR)
        // r = (FV / PV)^(1/t) - 1
         if (FV < PV && PV > 0) { // Handle cases where FV < PV (loss)
            // CAGR formula still works mathematically but results in a negative rate
            console.log("Calculating negative rate as FV < PV");
         }

         // Avoid issues with Math.pow if FV/PV is negative (shouldn't happen if PV>0, FV>=0)
         if (FV/PV < 0) return null;


        const rate = Math.pow(FV / PV, 1 / t_years) - 1;

        return rate * 100; // Return as percentage
    };


    const onSubmit: SubmitHandler<RateFormValues> = (data) => {
        const result = calculateRate(data);
        if (result !== null) {
            setCalculatedRate(result);

            const timeText = `${data.timePeriod} ${data.timeUnit}`;
            const inputString = `PV: ${formatCurrency(parseFloat(data.presentValue))}, FV: ${formatCurrency(parseFloat(data.futureValue))}, Time: ${timeText}`;
            const resultString = `Calculated Annual Interest Rate (CAGR): ${result.toFixed(4)}%`; // Show more precision

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setCalculatedRate(null);
             form.setError("root", {message: "Calculation failed. Check inputs (e.g., PV > 0)."})
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
                      <div className="flex gap-4"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-1/3" /></div>
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
                <CardDescription>{description} (Calculates CAGR)</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="presentValue" render={({ field }) => (<FormItem><FormLabel>Present Value (PV) ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 1000" {...field} step="any" min="0.01" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="futureValue" render={({ field }) => (<FormItem><FormLabel>Future Value (FV) ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 1500" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         <div className="flex flex-col sm:flex-row gap-4">
                            <FormField control={form.control} name="timePeriod" render={({ field }) => (<FormItem className="flex-1"><FormLabel>Time Period</FormLabel><FormControl><Input type="number" placeholder="e.g., 5" {...field} step="any" min="0.01" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="timeUnit" render={({ field }) => (<FormItem className="w-full sm:w-auto"><FormLabel>Time Unit</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl><SelectContent><SelectItem value="years">Years</SelectItem><SelectItem value="months">Months</SelectItem><SelectItem value="days">Days</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                         </div>
                          {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Interest Rate</Button>
                    </form>
                </Form>

                {calculatedRate !== null && (
                    <Alert className="mt-6">
                         <Sigma className="h-4 w-4" />
                         <AlertTitle>Calculated Interest Rate</AlertTitle>
                         <AlertDescription>
                             The calculated effective annual interest rate (CAGR) required to grow from {formatCurrency(parseFloat(form.watch('presentValue')))} to {formatCurrency(parseFloat(form.watch('futureValue')))} over {form.watch('timePeriod')} {form.watch('timeUnit')} is approximately <strong>{calculatedRate.toFixed(4)}%</strong>.
                         </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
