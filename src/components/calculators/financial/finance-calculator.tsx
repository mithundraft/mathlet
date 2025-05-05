
'use client';

// This acts as a placeholder for a generic or multi-purpose finance calculator.
// Currently, it implements a simple Future Value calculation.
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Banknote, Sigma } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema - Example: Future Value
const financeSchema = z.object({
    presentValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Present value must be zero or positive.",
    }),
    interestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Interest rate must be zero or positive.",
    }),
    periods: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Number of periods must be a positive integer.",
    }),
    // Add more fields for different financial functions if needed
});

type FinanceFormValues = z.infer<typeof financeSchema>;

interface FinanceCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function FinanceCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: FinanceCalculatorProps) {
    const [futureValue, setFutureValue] = React.useState<number | null>(null);
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

    const form = useForm<FinanceFormValues>({
        resolver: zodResolver(financeSchema),
        defaultValues: {
            presentValue: '',
            interestRate: '',
            periods: '',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset();
            setFutureValue(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Example Calculation: Future Value
    const calculateFutureValue = (values: FinanceFormValues): number | null => {
        const pv = parseFloat(values.presentValue);
        const rate = parseFloat(values.interestRate) / 100; // Assuming rate per period matches periods
        const n = parseInt(values.periods);

        if (isNaN(pv) || pv < 0 || isNaN(rate) || rate < 0 || isNaN(n) || n <= 0) {
            return null;
        }

        // FV = PV * (1 + rate)^n
        const fv = pv * Math.pow(1 + rate, n);
        return fv;
    };

    const onSubmit: SubmitHandler<FinanceFormValues> = (data) => {
        const result = calculateFutureValue(data); // Adapt this based on the actual function needed
        if (result !== null) {
            setFutureValue(result);

            const inputString = `PV: ${formatCurrency(parseFloat(data.presentValue))}, Rate: ${data.interestRate}%, Periods: ${data.periods}`;
            const resultString = `Future Value (FV): ${formatCurrency(result)}`;

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
                <CardDescription>{description} (Example: Future Value Calculation)</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <FormField control={form.control} name="presentValue" render={({ field }) => (<FormItem><FormLabel>Present Value ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 1000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="interestRate" render={({ field }) => (<FormItem><FormLabel>Interest Rate per Period (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 5" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="periods" render={({ field }) => (<FormItem><FormLabel>Number of Periods</FormLabel><FormControl><Input type="number" placeholder="e.g., 10" {...field} step="1" min="1" /></FormControl><FormMessage /></FormItem>)} />
                         {form.formState.errors.root && (
                             <FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>
                         )}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate</Button>
                    </form>
                </Form>

                 {futureValue !== null && (
                    <Alert className="mt-6">
                        <Sigma className="h-4 w-4" />
                        <AlertTitle>Calculation Result ({currency.code})</AlertTitle>
                        <AlertDescription>
                             Calculated Future Value: <strong>{formatCurrency(futureValue)}</strong>
                        </AlertDescription>
                    </Alert>
                )}
                 {/* Add more result displays if this calculator does multiple things */}
            </CardContent>
        </Card>
    );
}
