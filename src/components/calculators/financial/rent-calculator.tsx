
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
import { Calculator, Star, Hotel, Percent } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Rent Calculator (Affordability based on income)
const rentSchema = z.object({
    monthlyGrossIncome: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Monthly gross income must be positive.",
    }),
    rentPercentOfIncome: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 100, {
        message: "Percentage must be between 0 and 100.",
    }).default("30"), // Common affordability guideline
});

type RentFormValues = z.infer<typeof rentSchema>;

interface RentCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function RentCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: RentCalculatorProps) {
    const [affordableRent, setAffordableRent] = React.useState<number | null>(null);
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

    const form = useForm<RentFormValues>({
        resolver: zodResolver(rentSchema),
        defaultValues: {
            monthlyGrossIncome: '',
            rentPercentOfIncome: '30',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({ rentPercentOfIncome: '30' });
            setAffordableRent(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Affordable Rent
    const calculateAffordableRent = (values: RentFormValues): number | null => {
        const income = parseFloat(values.monthlyGrossIncome);
        const percent = parseFloat(values.rentPercentOfIncome) / 100;

        if (isNaN(income) || income <= 0 || isNaN(percent) || percent <= 0 || percent > 1) {
            return null;
        }

        const affordableRentCalc = income * percent;
        return affordableRentCalc;
    };

    const onSubmit: SubmitHandler<RentFormValues> = (data) => {
        const result = calculateAffordableRent(data);
        if (result !== null) {
            setAffordableRent(result);

            const inputString = `Monthly Income: ${formatCurrency(parseFloat(data.monthlyGrossIncome))}, Rent Percentage: ${data.rentPercentOfIncome}%`;
            const resultString = `Estimated Affordable Monthly Rent: ${formatCurrency(result)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setAffordableRent(null);
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
                         <FormField control={form.control} name="monthlyGrossIncome" render={({ field }) => (<FormItem><FormLabel>Monthly Gross Income ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 5000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="rentPercentOfIncome" render={({ field }) => (<FormItem><FormLabel>Desired Rent Percentage of Income (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 30" {...field} step="any" min="0" max="100" /></FormControl><FormDescription className="text-xs">Common guideline is 30% or less.</FormDescription><FormMessage /></FormItem>)} />
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Affordable Rent</Button>
                    </form>
                </Form>

                {affordableRent !== null && (
                    <Alert className="mt-6">
                        <Hotel className="h-4 w-4" />
                        <AlertTitle>Estimated Affordable Rent ({currency.code})</AlertTitle>
                        <AlertDescription>
                             Based on {form.watch('rentPercentOfIncome')}% of your income, your estimated maximum affordable monthly rent is <strong>{formatCurrency(affordableRent)}</strong>.
                             <p className="text-xs mt-1 text-muted-foreground">This is a guideline; consider other expenses and debts when determining your actual budget.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
