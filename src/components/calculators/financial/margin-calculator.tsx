
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
import { Calculator, Star, Ratio, TrendingUp, Percent } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Margin Calculator
const marginSchema = z.object({
    cost: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Cost must be zero or positive.",
    }),
    revenue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Revenue must be zero or positive.",
    }),
});
// Add refinement: revenue >= cost ?

type MarginFormValues = z.infer<typeof marginSchema>;

interface MarginCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function MarginCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: MarginCalculatorProps) {
    const [grossProfit, setGrossProfit] = React.useState<number | null>(null);
    const [grossMarginPercent, setGrossMarginPercent] = React.useState<number | null>(null);
    const [markupPercent, setMarkupPercent] = React.useState<number | null>(null);
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

    const form = useForm<MarginFormValues>({
        resolver: zodResolver(marginSchema),
        defaultValues: {
            cost: '',
            revenue: '',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setGrossProfit(null);
            setGrossMarginPercent(null);
            setMarkupPercent(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateMargin = (values: MarginFormValues): { profit: number; margin: number; markup: number } | null => {
        const cost = parseFloat(values.cost);
        const revenue = parseFloat(values.revenue);

        if (isNaN(cost) || cost < 0 || isNaN(revenue) || revenue < 0) {
            return null;
        }

        const profit = revenue - cost;
        const margin = revenue === 0 ? 0 : (profit / revenue) * 100; // Avoid division by zero
        const markup = cost === 0 ? (revenue > 0 ? Infinity : 0) : (profit / cost) * 100; // Avoid division by zero, handle Infinity

        return { profit, margin, markup };
    };

    const onSubmit: SubmitHandler<MarginFormValues> = (data) => {
        const result = calculateMargin(data);
        if (result) {
            setGrossProfit(result.profit);
            setGrossMarginPercent(result.margin);
            setMarkupPercent(result.markup);

            const inputString = `Cost: ${formatCurrency(parseFloat(data.cost))}, Revenue: ${formatCurrency(parseFloat(data.revenue))}`;
            const resultString = `Gross Profit: ${formatCurrency(result.profit)}, Gross Margin: ${result.margin.toFixed(2)}%, Markup: ${isFinite(result.markup) ? result.markup.toFixed(2) + '%' : 'Infinite'}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setGrossProfit(null);
            setGrossMarginPercent(null);
            setMarkupPercent(null);
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
                    <Skeleton className="h-10 w-full" /> {/* Button Skeleton */}
                    <Skeleton className="mt-6 h-24 w-full" /> {/* Result Skeleton */}
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
                        <FormField control={form.control} name="cost" render={({ field }) => (<FormItem><FormLabel>Cost ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 50" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="revenue" render={({ field }) => (<FormItem><FormLabel>Revenue ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 100" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Margin & Markup</Button>
                    </form>
                </Form>

                 {grossProfit !== null && grossMarginPercent !== null && markupPercent !== null && (
                    <Alert className="mt-6">
                         <Percent className="h-4 w-4" />
                         <AlertTitle>Margin & Markup Results ({currency.code})</AlertTitle>
                         <AlertDescription>
                            <p>Gross Profit: <strong>{formatCurrency(grossProfit)}</strong></p>
                            <p>Gross Margin: <strong>{grossMarginPercent.toFixed(2)}%</strong> (Profit as % of Revenue)</p>
                            <p>Markup: <strong>{isFinite(markupPercent) ? `${markupPercent.toFixed(2)}%` : 'Infinite'}</strong> (Profit as % of Cost)</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
