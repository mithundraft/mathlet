
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
import { Calculator, Star, CircleDollarSign, LineChart } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Zod Schema for CD Calculator
const cdSchema = z.object({
    initialDeposit: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Initial deposit must be a positive number.",
    }),
    apy: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual Percentage Yield (APY) must be zero or positive.",
    }),
    termMonths: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Term must be a positive integer (months).",
    }),
    // Compounding frequency is often fixed by the bank for CDs, but can be added for flexibility
    // compoundingFrequency: z.enum(['daily', 'monthly', 'quarterly', 'annually']).default('monthly'),
});

type CdFormValues = z.infer<typeof cdSchema>;

interface CdCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function CdCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: CdCalculatorProps) {
    const [finalBalance, setFinalBalance] = React.useState<number | null>(null);
    const [totalInterest, setTotalInterest] = React.useState<number | null>(null);
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

    const form = useForm<CdFormValues>({
        resolver: zodResolver(cdSchema),
        defaultValues: {
            initialDeposit: '',
            apy: '',
            termMonths: '',
            // compoundingFrequency: 'monthly',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset();
            setFinalBalance(null);
            setTotalInterest(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate CD Final Balance using APY
    const calculateCdBalance = (values: CdFormValues): { balance: number; interest: number } | null => {
        const P = parseFloat(values.initialDeposit);
        const apy = parseFloat(values.apy) / 100;
        const termMonths = parseInt(values.termMonths);

        if (isNaN(P) || P <= 0 || isNaN(apy) || apy < 0 || isNaN(termMonths) || termMonths <= 0) {
            return null;
        }

        const termYears = termMonths / 12;

        // Final Balance = P * (1 + APY)^(Term in Years)
        // APY already accounts for compounding frequency.
        const finalBalanceCalc = P * Math.pow(1 + apy, termYears);
        const totalInterestCalc = finalBalanceCalc - P;

        return { balance: finalBalanceCalc, interest: totalInterestCalc };
    };

    const onSubmit: SubmitHandler<CdFormValues> = (data) => {
        const result = calculateCdBalance(data);
        if (result) {
            setFinalBalance(result.balance);
            setTotalInterest(result.interest);

            const inputString = `Deposit: ${formatCurrency(parseFloat(data.initialDeposit))}, APY: ${data.apy}%, Term: ${data.termMonths} months`;
            const resultString = `Final Balance: ${formatCurrency(result.balance)}, Total Interest Earned: ${formatCurrency(result.interest)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setFinalBalance(null);
            setTotalInterest(null);
            console.error("Calculation failed. Check inputs.");
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
                            name="initialDeposit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Initial Deposit ({currency.symbol})</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 5000" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="apy"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Annual Percentage Yield (APY) (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 4.5" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="termMonths"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CD Term (Months)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 12" {...field} step="1" min="1" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate CD Balance
                        </Button>
                    </form>
                </Form>

                {finalBalance !== null && totalInterest !== null && (
                    <Alert className="mt-6">
                        <LineChart className="h-4 w-4" />
                        <AlertTitle>CD Calculation Results ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Final Balance at Maturity: <strong>{formatCurrency(finalBalance)}</strong></p>
                            <p>Total Interest Earned: <strong>{formatCurrency(totalInterest)}</strong></p>
                             <p className="text-xs mt-1 text-muted-foreground">Calculation based on APY assumes interest compounds according to the APY definition (usually annually or based on term).</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
