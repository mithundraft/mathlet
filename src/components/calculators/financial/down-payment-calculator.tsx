
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
import { Calculator, Star, PiggyBank, Home, Percent } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Down Payment Calculator
const downPaymentSchema = z.object({
    homePrice: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Home price must be a positive number.",
    }),
    downPaymentPercent: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "Down payment percentage must be between 0 and 100.",
    }),
     // Optional: Calculate percent from amount
     // downPaymentAmount: z.string().optional(),
});
// Add refinement if needed to ensure only one of percent or amount is provided if amount is added

type DownPaymentFormValues = z.infer<typeof downPaymentSchema>;

interface DownPaymentCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function DownPaymentCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: DownPaymentCalculatorProps) {
    const [downPaymentAmount, setDownPaymentAmount] = React.useState<number | null>(null);
    const [loanAmount, setLoanAmount] = React.useState<number | null>(null);
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

    const form = useForm<DownPaymentFormValues>({
        resolver: zodResolver(downPaymentSchema),
        defaultValues: {
            homePrice: '',
            downPaymentPercent: '',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setDownPaymentAmount(null);
            setLoanAmount(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateDownPayment = (values: DownPaymentFormValues): { down: number; loan: number } | null => {
        const price = parseFloat(values.homePrice);
        const percent = parseFloat(values.downPaymentPercent) / 100;

        if (isNaN(price) || price <= 0 || isNaN(percent) || percent < 0 || percent > 1) {
            return null;
        }

        const downAmount = price * percent;
        const loanAmountCalc = price - downAmount;

        return { down: downAmount, loan: loanAmountCalc };
    };

    const onSubmit: SubmitHandler<DownPaymentFormValues> = (data) => {
        const result = calculateDownPayment(data);
        if (result) {
            setDownPaymentAmount(result.down);
            setLoanAmount(result.loan);

            const inputString = `Home Price: ${formatCurrency(parseFloat(data.homePrice))}, Down Payment: ${data.downPaymentPercent}%`;
            const resultString = `Down Payment Amount: ${formatCurrency(result.down)}, Estimated Loan Amount: ${formatCurrency(result.loan)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setDownPaymentAmount(null);
            setLoanAmount(null);
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
                        <FormField control={form.control} name="homePrice" render={({ field }) => (<FormItem><FormLabel>Home Price ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 400000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="downPaymentPercent" render={({ field }) => (<FormItem><FormLabel>Down Payment Percentage (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 20" {...field} step="any" min="0" max="100" /></FormControl><FormMessage /></FormItem>)} />
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Down Payment</Button>
                    </form>
                </Form>

                 {downPaymentAmount !== null && loanAmount !== null && (
                    <Alert className="mt-6">
                        <Home className="h-4 w-4" />
                        <AlertTitle>Down Payment Details ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Down Payment Amount: <strong>{formatCurrency(downPaymentAmount)}</strong></p>
                            <p>Estimated Loan Amount: <strong>{formatCurrency(loanAmount)}</strong></p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
