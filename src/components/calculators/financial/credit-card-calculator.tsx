
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
import { Calculator, Star, CreditCard, CalendarClock, HandCoins } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Zod Schema for Credit Card Payoff Calculator
const creditCardSchema = z.object({
    balance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Current balance must be a positive number.",
    }),
    apr: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual Percentage Rate (APR) must be zero or positive.",
    }),
    monthlyPayment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Monthly payment must be a positive number.",
    }),
});

type CreditCardFormValues = z.infer<typeof creditCardSchema>;

interface CreditCardCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function CreditCardCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: CreditCardCalculatorProps) {
    const [payoffMonths, setPayoffMonths] = React.useState<number | null>(null);
    const [totalInterestPaid, setTotalInterestPaid] = React.useState<number | null>(null);
    const [totalPaid, setTotalPaid] = React.useState<number | null>(null);
    const [minimumPaymentWarning, setMinimumPaymentWarning] = React.useState<string | null>(null);
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

    const form = useForm<CreditCardFormValues>({
        resolver: zodResolver(creditCardSchema),
        defaultValues: {
            balance: '',
            apr: '',
            monthlyPayment: '',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setPayoffMonths(null);
            setTotalInterestPaid(null);
            setTotalPaid(null);
            setMinimumPaymentWarning(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Credit Card Payoff Time and Interest
    const calculatePayoff = (values: CreditCardFormValues): { months: number; interest: number; total: number; warning: string | null } | null => {
        const B = parseFloat(values.balance);
        const apr = parseFloat(values.apr) / 100;
        const M = parseFloat(values.monthlyPayment);

        if (isNaN(B) || B <= 0 || isNaN(apr) || apr < 0 || isNaN(M) || M <= 0) {
            return null;
        }

        const monthlyRate = apr / 12;

        // Check if payment covers interest
         const minPaymentForProgress = B * monthlyRate;
         if (M <= minPaymentForProgress && monthlyRate > 0) {
            return { months: Infinity, interest: Infinity, total: Infinity, warning: `Monthly payment (${formatCurrency(M)}) must be greater than the first month's interest (${formatCurrency(minPaymentForProgress)}) to pay off the balance.` };
         }
          if (monthlyRate === 0) {
              // If APR is 0%, payoff is simple division
             const months = Math.ceil(B / M);
             return { months: months, interest: 0, total: B, warning: null };
         }

        // Formula for number of periods (months) to pay off a loan:
        // n = -log(1 - (B * i) / M) / log(1 + i)
        // Where i is the monthly interest rate

        const numberOfMonths = -Math.log(1 - (B * monthlyRate) / M) / Math.log(1 + monthlyRate);

        if (!isFinite(numberOfMonths) || numberOfMonths < 0) {
             // This can happen if M is too small relative to interest
              return { months: Infinity, interest: Infinity, total: Infinity, warning: `Cannot calculate payoff time with the provided payment. Payment might be too low relative to interest.` };
        }

        const monthsRounded = Math.ceil(numberOfMonths);
        const totalPaidCalc = M * monthsRounded; // Approximation, final payment might be smaller

         // More accurate calculation by simulating payoff
         let currentBalance = B;
         let totalInterestCalc = 0;
         let totalPaidActual = 0;
         let actualMonths = 0;
         for (let i=0; i < monthsRounded || currentBalance > 0; i++) {
              if (currentBalance <= 0) break; // Already paid off

              let interestForMonth = currentBalance * monthlyRate;
              let principalPaid = M - interestForMonth;
              let paymentThisMonth = M;

              if (M > currentBalance + interestForMonth) {
                  // Final payment is smaller
                  paymentThisMonth = currentBalance + interestForMonth;
                  principalPaid = currentBalance;
              }

              totalInterestCalc += interestForMonth;
              totalPaidActual += paymentThisMonth;
              currentBalance -= principalPaid;
              actualMonths = i + 1;

              if (currentBalance < 0.005) { // Handle floating point
                  currentBalance = 0;
                   break;
              }
               // Safety break if calculation runs too long (shouldn't happen with initial check)
                if (i > 12 * 100) { // e.g., > 100 years
                     console.error("Payoff calculation exceeded maximum iterations.");
                     return { months: Infinity, interest: Infinity, total: Infinity, warning: "Calculation took too long, payment might be extremely low." };
                }
         }


        return {
            months: actualMonths,
            interest: totalInterestCalc,
            total: totalPaidActual,
            warning: null
        };
    };

    const onSubmit: SubmitHandler<CreditCardFormValues> = (data) => {
         setMinimumPaymentWarning(null); // Clear previous warning
        const result = calculatePayoff(data);
        if (result) {
            if (result.months === Infinity) {
                setMinimumPaymentWarning(result.warning);
                setPayoffMonths(null);
                setTotalInterestPaid(null);
                setTotalPaid(null);
                 // Don't record history for non-converging calculation
            } else {
                setPayoffMonths(result.months);
                setTotalInterestPaid(result.interest);
                setTotalPaid(result.total);

                const inputString = `Balance: ${formatCurrency(parseFloat(data.balance))}, APR: ${data.apr}%, Monthly Payment: ${formatCurrency(parseFloat(data.monthlyPayment))}`;
                const resultString = `Payoff Time: ${result.months} months, Total Interest: ${formatCurrency(result.interest)}, Total Paid: ${formatCurrency(result.total)}`;

                const historyEntry: HistoryEntry = {
                    id: Date.now().toString(),
                    calculatorSlug: slug,
                    timestamp: new Date(),
                    input: inputString,
                    result: resultString,
                };
                onCalculation(historyEntry);
            }
        } else {
            setPayoffMonths(null);
            setTotalInterestPaid(null);
            setTotalPaid(null);
             form.setError("root", {message:"Calculation failed. Check inputs."});
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
                    <Skeleton className="mt-6 h-24 w-full" /> {/* Result Skeleton */}
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
                            name="balance"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Current Balance ({currency.symbol})</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 5000" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="apr"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Annual Percentage Rate (APR) (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 19.99" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="monthlyPayment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Monthly Payment ({currency.symbol})</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 200" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         {form.formState.errors.root && (
                            <FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>
                         )}
                         {minimumPaymentWarning && (
                             <Alert variant="destructive">
                                <AlertTitle>Warning</AlertTitle>
                                <AlertDescription>{minimumPaymentWarning}</AlertDescription>
                            </Alert>
                         )}
                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate Payoff
                        </Button>
                    </form>
                </Form>

                {payoffMonths !== null && totalInterestPaid !== null && totalPaid !== null && (
                    <Alert className="mt-6">
                        <CalendarClock className="h-4 w-4" />
                        <AlertTitle>Payoff Summary ({currency.code})</AlertTitle>
                        <AlertDescription>
                             <p>Estimated Payoff Time: <strong>{payoffMonths} months</strong> ({Math.floor(payoffMonths / 12)} years, {payoffMonths % 12} months)</p>
                            <p>Total Interest Paid: <strong>{formatCurrency(totalInterestPaid)}</strong></p>
                            <p>Total Amount Paid: <strong>{formatCurrency(totalPaid)}</strong></p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
