
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
import { Calculator, Star, Banknote, TrendingDown, Scaling } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Cash Back vs Low Interest Calculator
const cashBackSchema = z.object({
    loanAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Loan amount must be a positive number.",
    }),
    loanTermYears: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Loan term must be a positive integer (years).",
    }),
    // Option 1: Cash Back
    cashBackAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Cash back amount must be zero or positive.",
    }),
    interestRateWithCashBack: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Interest rate with cash back must be zero or positive.",
    }),
    // Option 2: Low Interest Rate
    lowInterestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Low interest rate must be zero or positive.",
    }),
});

type CashBackFormValues = z.infer<typeof cashBackSchema>;

interface CashBackCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function CashBackOrLowInterestCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: CashBackCalculatorProps) {
    const [cashBackTotalCost, setCashBackTotalCost] = React.useState<number | null>(null);
    const [lowInterestTotalCost, setLowInterestTotalCost] = React.useState<number | null>(null);
    const [betterOption, setBetterOption] = React.useState<'cash_back' | 'low_interest' | 'equal' | null>(null);
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

    const form = useForm<CashBackFormValues>({
        resolver: zodResolver(cashBackSchema),
        defaultValues: {
            loanAmount: '',
            loanTermYears: '',
            cashBackAmount: '',
            interestRateWithCashBack: '',
            lowInterestRate: '',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setCashBackTotalCost(null);
            setLowInterestTotalCost(null);
            setBetterOption(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Helper to calculate total cost of a loan
    const calculateTotalLoanCost = (principal: number, annualRate: number, years: number): number | null => {
        if (principal <= 0 || annualRate < 0 || years <= 0) return null;

         const monthlyRate = annualRate / 12;
         const numberOfPayments = years * 12;
         let monthlyPayment = 0;

         if (monthlyRate === 0) {
            monthlyPayment = principal / numberOfPayments;
         } else {
             monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
         }

          // Calculate total payments accurately by simulating amortization or using total interest calc
          let totalInterestPaid = 0;
          let balance = principal;
          for(let i=0; i < numberOfPayments; i++){
              let interest = balance * monthlyRate;
               // Final payment adjustment
               if (i === numberOfPayments - 1) {
                   monthlyPayment = balance + interest;
               }
              totalInterestPaid += interest;
              balance -= (monthlyPayment - interest);
              if(balance < 0.005) balance = 0; // Handle rounding
          }

          // Total cost = principal + total interest
         return principal + totalInterestPaid; // More precise total cost
    };


    const onSubmit: SubmitHandler<CashBackFormValues> = (data) => {
        const P = parseFloat(data.loanAmount);
        const T = parseInt(data.loanTermYears);
        const cashBack = parseFloat(data.cashBackAmount);
        const rateWithCashBack = parseFloat(data.interestRateWithCashBack) / 100;
        const lowRate = parseFloat(data.lowInterestRate) / 100;

        // Option 1: Cash Back
        // Effective loan amount is P - cashBack
        const effectiveLoanAmount = P - cashBack;
        const totalCostCashBackOpt = calculateTotalLoanCost(effectiveLoanAmount, rateWithCashBack, T);

        // Option 2: Low Interest Rate
        const totalCostLowInterestOpt = calculateTotalLoanCost(P, lowRate, T);

        if (totalCostCashBackOpt !== null && totalCostLowInterestOpt !== null) {
            setCashBackTotalCost(totalCostCashBackOpt);
            setLowInterestTotalCost(totalCostLowInterestOpt);

            let option: 'cash_back' | 'low_interest' | 'equal' = 'equal';
            if (totalCostCashBackOpt < totalCostLowInterestOpt) {
                option = 'cash_back';
            } else if (totalCostLowInterestOpt < totalCostCashBackOpt) {
                option = 'low_interest';
            }
            setBetterOption(option);

            const inputString = `Loan: ${formatCurrency(P)}, Term: ${T} yrs | Cash Back: ${formatCurrency(cashBack)} @ ${data.interestRateWithCashBack}% | Low Rate: ${data.lowInterestRate}%`;
            const resultString = `Cash Back Total Cost: ${formatCurrency(totalCostCashBackOpt)}, Low Rate Total Cost: ${formatCurrency(totalCostLowInterestOpt)}. Better Option: ${option.replace('_', ' ').toUpperCase()}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);

        } else {
            setCashBackTotalCost(null);
            setLowInterestTotalCost(null);
            setBetterOption(null);
            console.error("Calculation failed. Check inputs.");
            form.setError("root", { message: "Could not calculate costs. Please check inputs."});
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
                     {/* Loan Details Skeletons */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                     </div>
                      {/* Option 1 Skeletons */}
                      <div>
                         <Skeleton className="h-6 w-1/3 mb-2"/>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <Skeleton className="h-10 w-full" />
                             <Skeleton className="h-10 w-full" />
                         </div>
                     </div>
                     {/* Option 2 Skeletons */}
                     <div>
                         <Skeleton className="h-6 w-1/3 mb-2"/>
                         <Skeleton className="h-10 w-full" />
                     </div>
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                         {/* Loan Details */}
                         <div className="space-y-4 border-b pb-4">
                            <h3 className="text-lg font-semibold">Loan Details</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="loanAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Loan Amount ({currency.symbol})</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g., 25000" {...field} step="any" min="0" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="loanTermYears"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Loan Term (Years)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g., 5" {...field} step="1" min="1" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Option 1: Cash Back */}
                        <div className="space-y-4 border-b pb-4">
                             <h3 className="text-lg font-semibold">Option 1: Cash Back</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="cashBackAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cash Back Amount ({currency.symbol})</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g., 1000" {...field} step="any" min="0" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="interestRateWithCashBack"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Interest Rate (%)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g., 7.5" {...field} step="any" min="0" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                         {/* Option 2: Low Interest Rate */}
                         <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Option 2: Low Interest Rate</h3>
                            <FormField
                                control={form.control}
                                name="lowInterestRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Low Interest Rate (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 5.5" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                         {form.formState.errors.root && (
                            <FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>
                         )}
                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Compare Options
                        </Button>
                    </form>
                </Form>

                {cashBackTotalCost !== null && lowInterestTotalCost !== null && betterOption && (
                    <Alert className="mt-6">
                        <Scaling className="h-4 w-4" />
                        <AlertTitle>Comparison Result ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Cash Back Option Total Cost: <strong>{formatCurrency(cashBackTotalCost)}</strong></p>
                            <p>Low Interest Rate Option Total Cost: <strong>{formatCurrency(lowInterestTotalCost)}</strong></p>
                             <p className="font-semibold mt-2">
                                 Better Option: <strong className={cn(
                                     betterOption === 'cash_back' ? "text-green-600 dark:text-green-400" :
                                     betterOption === 'low_interest' ? "text-green-600 dark:text-green-400" : ""
                                 )}>
                                     {betterOption === 'cash_back' ? 'Cash Back' : betterOption === 'low_interest' ? 'Low Interest Rate' : 'Both options cost the same'}
                                </strong>
                             </p>
                            <p className="text-xs mt-1 text-muted-foreground">Compares the total amount paid over the loan term for each option.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
