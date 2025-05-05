
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
import { Calculator, Star, Milestone, CalendarClock, HandCoins } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Mortgage Payoff Calculator
const payoffSchema = z.object({
    currentBalance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Current loan balance must be positive.",
    }),
    monthlyPayment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Current monthly P&I payment must be positive.",
    }),
    interestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual interest rate must be zero or positive.",
    }),
    extraPayment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Extra monthly payment must be zero or positive.",
    }).optional().default("0"),
});

type PayoffFormValues = z.infer<typeof payoffSchema>;

interface MortgagePayoffCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

interface PayoffResult {
    originalMonths: number;
    newMonths: number;
    monthsSaved: number;
    originalInterest: number;
    newInterest: number;
    interestSaved: number;
     warning?: string | null;
}

export function MortgagePayoffCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: MortgagePayoffCalculatorProps) {
    const [payoffResult, setPayoffResult] = React.useState<PayoffResult | null>(null);
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

    const form = useForm<PayoffFormValues>({
        resolver: zodResolver(payoffSchema),
        defaultValues: {
            currentBalance: '',
            monthlyPayment: '',
            interestRate: '',
            extraPayment: '0',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({ extraPayment: '0' });
            setPayoffResult(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Helper to calculate payoff details
    const calculatePayoffDetails = (balance: number, apr: number, monthlyPayment: number): { months: number; interest: number; warning: string | null } | null => {
        const monthlyRate = (apr / 100) / 12;

         if (balance <= 0) return { months: 0, interest: 0, warning: null };
         if (monthlyPayment <= 0) return { months: Infinity, interest: Infinity, warning: "Monthly payment must be positive."};

        const minPaymentForProgress = balance * monthlyRate;
        if (monthlyPayment <= minPaymentForProgress && monthlyRate > 0) {
            return { months: Infinity, interest: Infinity, warning: `Payment (${formatCurrency(monthlyPayment)}) doesn't cover interest (${formatCurrency(minPaymentForProgress)}).` };
        }
         if (monthlyRate === 0) {
             const months = Math.ceil(balance / monthlyPayment);
             return { months: months, interest: 0, warning: null };
         }


        const numberOfMonths = -Math.log(1 - (balance * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate);
         if (!isFinite(numberOfMonths) || numberOfMonths < 0) {
            return { months: Infinity, interest: Infinity, warning: "Cannot calculate payoff time. Payment likely too low." };
        }

         // Simulate for accurate interest
         let currentBalance = balance;
         let totalInterestCalc = 0;
         let actualMonths = 0;
         const maxMonths = 12 * 100; // 100 year limit

         for (let i = 0; i < Math.ceil(numberOfMonths) && currentBalance > 0.005 && i < maxMonths; i++) {
            let interestForMonth = currentBalance * monthlyRate;
            let paymentThisMonth = monthlyPayment;
            let principalPaid = paymentThisMonth - interestForMonth;

            if (paymentThisMonth >= currentBalance + interestForMonth) {
                 paymentThisMonth = currentBalance + interestForMonth;
                 principalPaid = currentBalance;
            }
            totalInterestCalc += interestForMonth;
            currentBalance -= principalPaid;
            actualMonths = i + 1;
         }

          if(actualMonths >= maxMonths){
             return { months: Infinity, interest: Infinity, warning: "Payoff takes over 100 years." };
          }

        return { months: actualMonths, interest: totalInterestCalc, warning: null };
    };

    const onSubmit: SubmitHandler<PayoffFormValues> = (data) => {
        const balance = parseFloat(data.currentBalance);
        const payment = parseFloat(data.monthlyPayment);
        const rate = parseFloat(data.interestRate);
        const extra = parseFloat(data.extraPayment || '0');

        const originalPayoff = calculatePayoffDetails(balance, rate, payment);
        const newPayoff = calculatePayoffDetails(balance, rate, payment + extra);

        if (originalPayoff && newPayoff) {
             // Handle cases where payoff is impossible
             if (originalPayoff.months === Infinity || newPayoff.months === Infinity) {
                 setPayoffResult({
                     originalMonths: originalPayoff.months, newMonths: newPayoff.months, monthsSaved: 0,
                     originalInterest: originalPayoff.interest, newInterest: newPayoff.interest, interestSaved: 0,
                     warning: originalPayoff.warning || newPayoff.warning || "Cannot complete calculation with current inputs."
                 });
             } else {
                 const monthsSaved = originalPayoff.months - newPayoff.months;
                 const interestSaved = originalPayoff.interest - newPayoff.interest;
                 setPayoffResult({
                     originalMonths: originalPayoff.months,
                     newMonths: newPayoff.months,
                     monthsSaved: monthsSaved,
                     originalInterest: originalPayoff.interest,
                     newInterest: newPayoff.interest,
                     interestSaved: interestSaved,
                      warning: null // Clear warning if successful
                 });

                 // Record history only on successful calculation
                 const inputString = `Balance: ${formatCurrency(balance)}, Pmt: ${formatCurrency(payment)}, Rate: ${rate}%, Extra Pmt: ${formatCurrency(extra)}`;
                 const resultString = `Payoff Time: ${newPayoff.months} mo (saved ${monthsSaved} mo), Interest Saved: ${formatCurrency(interestSaved)}`;
                 const historyEntry: HistoryEntry = {id: Date.now().toString(), calculatorSlug: slug, timestamp: new Date(), input: inputString, result: resultString};
                 onCalculation(historyEntry);
             }

        } else {
            setPayoffResult(null);
            form.setError("root", { message: "Calculation failed. Check inputs." });
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
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" /> {/* Button */}
                     <Skeleton className="mt-6 h-28 w-full" /> {/* Result */}
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
                        <FormField control={form.control} name="currentBalance" render={({ field }) => (<FormItem><FormLabel>Current Loan Balance ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 250000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="monthlyPayment" render={({ field }) => (<FormItem><FormLabel>Current Monthly P&I Payment ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 1500" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="interestRate" render={({ field }) => (<FormItem><FormLabel>Annual Interest Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 6.5" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="extraPayment" render={({ field }) => (<FormItem><FormLabel>Extra Monthly Payment ({currency.symbol}) <small>(Optional)</small></FormLabel><FormControl><Input type="number" placeholder="e.g., 200" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                         {payoffResult?.warning && (
                             <Alert variant="destructive">
                                <AlertTitle>Warning</AlertTitle>
                                <AlertDescription>{payoffResult.warning}</AlertDescription>
                            </Alert>
                         )}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Payoff</Button>
                    </form>
                </Form>

                 {payoffResult && payoffResult.monthsSaved >= 0 && payoffResult.interestSaved >= 0 && (
                    <Alert className="mt-6">
                         <CalendarClock className="h-4 w-4" />
                         <AlertTitle>Mortgage Payoff Summary ({currency.code})</AlertTitle>
                         <AlertDescription>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <span></span><span>Original</span><span>With Extra Pmt</span>
                                <span>Payoff Time:</span><span>{payoffResult.originalMonths === Infinity ? 'N/A' : `${payoffResult.originalMonths} mo`}</span><span>{payoffResult.newMonths === Infinity ? 'N/A' : `${payoffResult.newMonths} mo`}</span>
                                 <span>Total Interest:</span><span>{payoffResult.originalInterest === Infinity ? 'N/A' : formatCurrency(payoffResult.originalInterest)}</span><span>{payoffResult.newInterest === Infinity ? 'N/A' : formatCurrency(payoffResult.newInterest)}</span>

                                <span className="col-span-2 pt-2 mt-1 border-t font-semibold">Time Saved:</span><span className="pt-2 mt-1 border-t font-semibold">{payoffResult.monthsSaved === Infinity ? 'N/A' : `${payoffResult.monthsSaved} months`}</span>
                                 <span className="col-span-2 font-semibold">Interest Saved:</span><span className="font-semibold">{payoffResult.interestSaved === Infinity ? 'N/A' : formatCurrency(payoffResult.interestSaved)}</span>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
