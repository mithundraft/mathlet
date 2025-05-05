
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
import { Calculator, Star, Home, GitCompare, HandCoins } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Refinance Calculator
const refinanceSchema = z.object({
    // Current Loan
    currentBalance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: "Current balance must be positive." }),
    currentInterestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Current rate must be zero or positive." }),
    currentMonthlyPayment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: "Current payment (P&I) must be positive." }), // P&I only

    // New Loan Offer
    newInterestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "New rate must be zero or positive." }),
    newLoanTerm: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, { message: "New term must be positive (years)." }),
    refinanceCosts: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"), // Closing costs, fees
});

type RefinanceFormValues = z.infer<typeof refinanceSchema>;

interface RefinanceCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

interface RefinanceResult {
    currentRemainingMonths: number | string; // Can be "N/A" or Infinity
    currentTotalInterestRemaining: number | string;
    newMonthlyPayment: number;
    newTotalInterest: number;
    totalSavings: number | string; // Can be "N/A"
    breakevenMonths: number | string; // Months to recoup refinance costs
    warning?: string | null;
}


export function RefinanceCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: RefinanceCalculatorProps) {
    const [result, setResult] = React.useState<RefinanceResult | null>(null);
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

    const form = useForm<RefinanceFormValues>({
        resolver: zodResolver(refinanceSchema),
        defaultValues: {
            currentBalance: '',
            currentInterestRate: '',
            currentMonthlyPayment: '',
            newInterestRate: '',
            newLoanTerm: '',
            refinanceCosts: '0',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({ refinanceCosts: '0' });
            setResult(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null || value === Infinity || value === -Infinity) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

     // Helper to calculate payoff details (similar to Payoff Calc)
    const calculatePayoffInfo = (balance: number, apr: number, monthlyPayment: number): { months: number; interest: number; warning: string | null } | null => {
         const monthlyRate = (apr / 100) / 12;
         if (balance <= 0) return { months: 0, interest: 0, warning: null };
         if (monthlyPayment <= 0) return { months: Infinity, interest: Infinity, warning: "Payment must be positive."};

         const minPaymentForProgress = balance * monthlyRate;
         if (monthlyPayment <= minPaymentForProgress && monthlyRate > 0) return { months: Infinity, interest: Infinity, warning: `Payment (${formatCurrency(monthlyPayment)}) doesn't cover interest (${formatCurrency(minPaymentForProgress)}).` };
         if (monthlyRate === 0) return { months: Math.ceil(balance / monthlyPayment), interest: 0, warning: null };

         const numberOfMonths = -Math.log(1 - (balance * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate);
         if (!isFinite(numberOfMonths) || numberOfMonths < 0) return { months: Infinity, interest: Infinity, warning: "Cannot calculate payoff." };

         let currentBalance = balance;
         let totalInterestCalc = 0;
         let actualMonths = 0;
         const maxMonths = 12 * 100;

         for (let i = 0; i < Math.ceil(numberOfMonths) && currentBalance > 0.005 && i < maxMonths; i++) {
            let interestForMonth = currentBalance * monthlyRate;
            let paymentThisMonth = monthlyPayment;
            let principalPaid = paymentThisMonth - interestForMonth;
             if (paymentThisMonth >= currentBalance + interestForMonth) { paymentThisMonth = currentBalance + interestForMonth; principalPaid = currentBalance; }
            totalInterestCalc += interestForMonth;
            currentBalance -= principalPaid;
            actualMonths = i + 1;
         }
          if(actualMonths >= maxMonths) return { months: Infinity, interest: Infinity, warning: "Payoff > 100 years." };

         return { months: actualMonths, interest: totalInterestCalc, warning: null };
    };

    // Helper to calculate new loan payment
     const calculateNewPayment = (principal: number, annualRate: number, termYears: number): number | null => {
         const monthlyRate = (annualRate / 100) / 12;
         const numberOfPayments = termYears * 12;
         if (principal <= 0 || annualRate < 0 || termYears <= 0) return null;
         if (monthlyRate === 0) return principal / numberOfPayments;
         return principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
     };


    const onSubmit: SubmitHandler<RefinanceFormValues> = (data) => {
        const currentB = parseFloat(data.currentBalance);
        const currentR = parseFloat(data.currentInterestRate);
        const currentP = parseFloat(data.currentMonthlyPayment);
        const newR = parseFloat(data.newInterestRate);
        const newT = parseInt(data.newLoanTerm);
        const costs = parseFloat(data.refinanceCosts || '0');

        const currentPayoff = calculatePayoffInfo(currentB, currentR, currentP);
        const newLoanAmount = currentB; // Assume refinancing current balance, not rolling in costs for this basic calc
        const newPayment = calculateNewPayment(newLoanAmount, newR, newT);
        const newPayoff = newPayment ? calculatePayoffInfo(newLoanAmount, newR, newPayment) : null;

        if (currentPayoff && newPayoff && newPayment) {
            let totalSavingsCalc: number | string = 'N/A';
             let breakevenMonthsCalc: number | string = 'N/A';

             if (currentPayoff.interest !== Infinity && newPayoff.interest !== Infinity) {
                 totalSavingsCalc = currentPayoff.interest - (newPayoff.interest + costs);
             }

            const monthlySavings = currentP - newPayment;
             if (costs > 0 && monthlySavings > 0) {
                 breakevenMonthsCalc = Math.ceil(costs / monthlySavings);
             } else if (costs <= 0) {
                 breakevenMonthsCalc = 0; // Immediate breakeven if no costs
             } else {
                  breakevenMonthsCalc = 'Never (Payment increases or no savings)';
             }


             setResult({
                 currentRemainingMonths: currentPayoff.months === Infinity ? 'N/A' : currentPayoff.months,
                 currentTotalInterestRemaining: currentPayoff.interest === Infinity ? 'N/A' : currentPayoff.interest,
                 newMonthlyPayment: newPayment,
                 newTotalInterest: newPayoff.interest === Infinity ? Infinity : newPayoff.interest, // Store as number or Infinity
                 totalSavings: totalSavingsCalc,
                 breakevenMonths: breakevenMonthsCalc,
                  warning: currentPayoff.warning,
             });

             // Record History (only if calculations are valid)
              if (currentPayoff.months !== Infinity && newPayoff.months !== Infinity) {
                 const inputString = `Current: ${formatCurrency(currentB)} @ ${currentR}% (${formatCurrency(currentP)}/mo) | New: ${newT}yrs @ ${newR}% | Costs: ${formatCurrency(costs)}`;
                 const resultString = `New Pmt: ${formatCurrency(newPayment)}/mo, Interest Saved: ${formatCurrency(totalSavingsCalc as number)}, Breakeven: ${breakevenMonthsCalc} mo`;
                 const historyEntry: HistoryEntry = { id: Date.now().toString(), calculatorSlug: slug, timestamp: new Date(), input: inputString, result: resultString };
                 onCalculation(historyEntry);
              }

        } else {
            setResult(null);
            form.setError("root", { message: "Calculation failed. Check inputs, ensure current payment covers interest." });
            console.error("Calculation failed. Check inputs.");
        }
    };

    // Skeleton Loader
    if (!mounted) {
        return (
            <Card className="w-full max-w-xl mx-auto">
                <CardHeader className="relative">
                    <Skeleton className="absolute top-3 right-3 h-7 w-7 rounded-full" />
                    <div className="flex items-center gap-2 pr-10"><Skeleton className="h-6 w-6" /><Skeleton className="h-6 w-3/4" /></div>
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Current Loan Skeletons */}
                    <div> <Skeleton className="h-6 w-1/3 mb-2"/> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div></div>
                    {/* New Loan Skeletons */}
                     <div> <Skeleton className="h-6 w-1/3 mb-2"/> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div></div>
                    <Skeleton className="h-10 w-full" /> {/* Button */}
                    <Skeleton className="mt-6 h-32 w-full" /> {/* Result */}
                </CardContent>
            </Card>
        );
    }

    return (
         <Card className="w-full max-w-xl mx-auto"> {/* Slightly Wider Card */}
            <CardHeader className="relative">
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                         {/* Current Loan Section */}
                        <div className="space-y-3 border-b pb-4">
                             <h3 className="text-lg font-semibold">Current Mortgage</h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="currentBalance" render={({ field }) => (<FormItem><FormLabel>Current Balance ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 200000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="currentInterestRate" render={({ field }) => (<FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 7.0" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="currentMonthlyPayment" render={({ field }) => (<FormItem><FormLabel>Monthly P&I ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 1330" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             </div>
                         </div>
                         {/* New Loan Section */}
                        <div className="space-y-3">
                             <h3 className="text-lg font-semibold">New Loan Offer</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="newInterestRate" render={({ field }) => (<FormItem><FormLabel>New Interest Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 6.0" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="newLoanTerm" render={({ field }) => (<FormItem><FormLabel>New Term (Years)</FormLabel><FormControl><Input type="number" placeholder="e.g., 30" {...field} step="1" min="1" /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="refinanceCosts" render={({ field }) => (<FormItem><FormLabel>Refinance Costs ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 3000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                         {result?.warning && (
                             <Alert variant="destructive">
                                <AlertTitle>Warning</AlertTitle>
                                <AlertDescription>{result.warning}</AlertDescription>
                            </Alert>
                         )}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Compare Refinance</Button>
                    </form>
                </Form>

                {result && !result.warning && (
                    <Alert className="mt-6">
                        <GitCompare className="h-4 w-4" />
                        <AlertTitle>Refinance Comparison ({currency.code})</AlertTitle>
                        <AlertDescription>
                             <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-2">
                                 <span></span><strong>Current Loan</strong><strong>New Loan</strong>
                                 <span>Monthly P&I:</span><span>{formatCurrency(parseFloat(form.getValues('currentMonthlyPayment')))}</span><span>{formatCurrency(result.newMonthlyPayment)}</span>
                                 <span>Remaining Interest:</span><span>{typeof result.currentTotalInterestRemaining === 'number' ? formatCurrency(result.currentTotalInterestRemaining) : result.currentTotalInterestRemaining}</span><span>{typeof result.newTotalInterest === 'number' ? formatCurrency(result.newTotalInterest) : 'N/A'}</span>
                                  <span>Remaining Months:</span><span>{result.currentRemainingMonths}</span><span>{parseInt(form.getValues('newLoanTerm'))*12}</span>
                             </div>
                             <div className="border-t pt-2 mt-2 space-y-1">
                                 <p>Estimated Total Interest Savings: <strong className={cn(typeof result.totalSavings === 'number' && result.totalSavings > 0 ? "text-green-600 dark:text-green-400" : typeof result.totalSavings === 'number' && result.totalSavings < 0 ? "text-destructive" : "")}>{formatCurrency(result.totalSavings as number)}</strong></p>
                                 <p>Breakeven Point (Months to Recoup Costs): <strong>{typeof result.breakevenMonths === 'number' ? `${result.breakevenMonths} months` : result.breakevenMonths}</strong></p>
                                  <p className="text-xs mt-1 text-muted-foreground">Savings calculated based on remaining interest vs new total interest + costs. Breakeven assumes monthly savings are realized immediately.</p>
                             </div>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
