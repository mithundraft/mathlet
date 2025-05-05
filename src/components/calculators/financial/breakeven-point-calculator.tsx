
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
import { Calculator, Star, Scale as ScaleIcon, Target } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Zod Schema for Breakeven Point Calculator
const breakevenSchema = z.object({
    fixedCosts: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Fixed costs must be zero or positive.",
    }),
    variableCostPerUnit: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Variable cost per unit must be zero or positive.",
    }),
    sellingPricePerUnit: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Selling price per unit must be zero or positive.",
    }),
}).superRefine((data, ctx) => {
    const price = parseFloat(data.sellingPricePerUnit);
    const varCost = parseFloat(data.variableCostPerUnit);
    if (!isNaN(price) && !isNaN(varCost) && price <= varCost) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Selling price must be greater than variable cost per unit.",
            path: ["sellingPricePerUnit"],
        });
    }
});


type BreakevenFormValues = z.infer<typeof breakevenSchema>;

interface BreakevenPointCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function BreakevenPointCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: BreakevenPointCalculatorProps) {
    const [breakevenUnits, setBreakevenUnits] = React.useState<number | null>(null);
    const [breakevenRevenue, setBreakevenRevenue] = React.useState<number | null>(null);
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

    const form = useForm<BreakevenFormValues>({
        resolver: zodResolver(breakevenSchema),
        defaultValues: {
            fixedCosts: '',
            variableCostPerUnit: '',
            sellingPricePerUnit: '',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset();
            setBreakevenUnits(null);
            setBreakevenRevenue(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateBreakeven = (values: BreakevenFormValues): { units: number; revenue: number } | null => {
        const fixedCosts = parseFloat(values.fixedCosts);
        const varCost = parseFloat(values.variableCostPerUnit);
        const price = parseFloat(values.sellingPricePerUnit);

        if (isNaN(fixedCosts) || fixedCosts < 0 || isNaN(varCost) || varCost < 0 || isNaN(price) || price <= 0) {
            return null;
        }

        const contributionMargin = price - varCost;
        if (contributionMargin <= 0) {
             // This case should be caught by superRefine, but double-check
            console.error("Selling price must exceed variable cost.");
            form.setError("sellingPricePerUnit", {message: "Selling price must be greater than variable cost."});
            return null;
        }

        const units = fixedCosts / contributionMargin;
        const revenue = units * price;

        return { units: Math.ceil(units), revenue: revenue }; // Often round units up
    };

    const onSubmit: SubmitHandler<BreakevenFormValues> = (data) => {
        const result = calculateBreakeven(data);
        if (result) {
            setBreakevenUnits(result.units);
            setBreakevenRevenue(result.revenue);

            const inputString = `Fixed Costs: ${formatCurrency(parseFloat(data.fixedCosts))}, Variable Cost/Unit: ${formatCurrency(parseFloat(data.variableCostPerUnit))}, Selling Price/Unit: ${formatCurrency(parseFloat(data.sellingPricePerUnit))}`;
            const resultString = `Breakeven Point: ${result.units.toLocaleString()} units, Breakeven Revenue: ${formatCurrency(result.revenue)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setBreakevenUnits(null);
            setBreakevenRevenue(null);
            // Error likely set in calculate function
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
                            name="fixedCosts"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Total Fixed Costs ({currency.symbol})</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 10000" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="variableCostPerUnit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Cost Per Unit ({currency.symbol})</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 5" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="sellingPricePerUnit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Selling Price Per Unit ({currency.symbol})</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 15" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate Breakeven Point
                        </Button>
                    </form>
                </Form>

                {breakevenUnits !== null && breakevenRevenue !== null && (
                    <Alert className="mt-6">
                        <Target className="h-4 w-4" />
                        <AlertTitle>Breakeven Point Analysis ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>You need to sell approximately <strong>{breakevenUnits.toLocaleString()} units</strong> to break even.</p>
                             <p>This corresponds to a breakeven revenue of <strong>{formatCurrency(breakevenRevenue)}</strong>.</p>
                            <p className="text-xs mt-2 text-muted-foreground">This is the point where total revenue equals total costs (fixed + variable).</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
