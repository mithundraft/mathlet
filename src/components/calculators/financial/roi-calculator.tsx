
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
import { Calculator, Star, TrendingUp, Percent } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for ROI Calculator
const roiSchema = z.object({
    initialInvestment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Initial investment must be positive.",
    }),
    finalValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Final value must be zero or positive.",
    }),
    // Optional: Investment duration for annualized ROI
    // durationYears: z.string().optional(),
});

type RoiFormValues = z.infer<typeof roiSchema>;

interface RoiCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function RoiCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: RoiCalculatorProps) {
    const [roiPercentage, setRoiPercentage] = React.useState<number | null>(null);
    const [netProfit, setNetProfit] = React.useState<number | null>(null);
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

    const form = useForm<RoiFormValues>({
        resolver: zodResolver(roiSchema),
        defaultValues: {
            initialInvestment: '',
            finalValue: '',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setRoiPercentage(null);
            setNetProfit(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate ROI
    const calculateRoi = (values: RoiFormValues): { roi: number; profit: number } | null => {
        const initial = parseFloat(values.initialInvestment);
        const final = parseFloat(values.finalValue);

        if (isNaN(initial) || initial <= 0 || isNaN(final) || final < 0) {
            return null;
        }

        const profit = final - initial;
        const roi = (profit / initial) * 100;

        return { roi, profit };
    };

    const onSubmit: SubmitHandler<RoiFormValues> = (data) => {
        const result = calculateRoi(data);
        if (result) {
            setRoiPercentage(result.roi);
            setNetProfit(result.profit);

            const inputString = `Initial Investment: ${formatCurrency(parseFloat(data.initialInvestment))}, Final Value: ${formatCurrency(parseFloat(data.finalValue))}`;
            const resultString = `Net Profit: ${formatCurrency(result.profit)}, ROI: ${result.roi.toFixed(2)}%`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setRoiPercentage(null);
            setNetProfit(null);
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
                        <FormField control={form.control} name="initialInvestment" render={({ field }) => (<FormItem><FormLabel>Initial Investment ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="Total amount invested" {...field} step="any" min="0.01" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="finalValue" render={({ field }) => (<FormItem><FormLabel>Final Value ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="Current or sold value" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate ROI</Button>
                    </form>
                </Form>

                {roiPercentage !== null && netProfit !== null && (
                    <Alert className="mt-6">
                         <TrendingUp className="h-4 w-4" />
                         <AlertTitle>Return on Investment (ROI)</AlertTitle>
                         <AlertDescription>
                            <p>Net Profit: <strong>{formatCurrency(netProfit)}</strong></p>
                            <p>Return on Investment (ROI): <strong>{roiPercentage.toFixed(2)}%</strong></p>
                             <p className="text-xs mt-1 text-muted-foreground">ROI = (Net Profit / Initial Investment) * 100. Does not account for time duration (use CAGR for annualized returns).</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
