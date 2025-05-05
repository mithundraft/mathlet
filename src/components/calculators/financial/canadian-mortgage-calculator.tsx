
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
import { Calculator, Star, Home, HandCoins, ListChecks } from 'lucide-react'; // Use Home or specific Canadian icon if available
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Zod Schema for Canadian Mortgage Calculator
const canadianMortgageSchema = z.object({
  loanAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Loan amount must be a positive number.",
  }),
  interestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Annual interest rate must be zero or positive.",
  }),
  amortizationPeriod: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: "Amortization period must be a positive integer (years).",
  }),
   // Canadian mortgages compound semi-annually by law, but payments are usually more frequent
   paymentFrequency: z.enum(['monthly', 'bi-weekly', 'weekly']).default('monthly'),
});

type CanadianMortgageFormValues = z.infer<typeof canadianMortgageSchema>;

interface CanadianMortgageCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData; // Should typically be CAD
}

// Amortization Schedule Type
interface AmortizationEntry {
    period: number; // Payment period number
    startingBalance: number;
    payment: number;
    principalPaid: number;
    interestPaid: number;
    endingBalance: number;
}

export function CanadianMortgageCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: CanadianMortgageCalculatorProps) {
    const [paymentAmount, setPaymentAmount] = React.useState<number | null>(null);
    const [totalInterest, setTotalInterest] = React.useState<number | null>(null);
    const [totalCost, setTotalCost] = React.useState<number | null>(null);
    const [amortizationSchedule, setAmortizationSchedule] = React.useState<AmortizationEntry[]>([]);
    const [mounted, setMounted] = React.useState(false);

    const { name, description, icon: Icon } = calculatorInfo;
    const isFavorite = favorites.includes(slug);

    // Ensure currency is CAD for this specific calculator if needed, though props handle it
    const displayCurrency = currency.code === 'CAD' ? currency : { ...currency, code: 'CAD', symbol: '$' }; // Default to CAD symbol $ if needed

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

    const form = useForm<CanadianMortgageFormValues>({
        resolver: zodResolver(canadianMortgageSchema),
        defaultValues: {
            loanAmount: '',
            interestRate: '',
            amortizationPeriod: '',
            paymentFrequency: 'monthly',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({ paymentFrequency: 'monthly' });
            setPaymentAmount(null);
            setTotalInterest(null);
            setTotalCost(null);
            setAmortizationSchedule([]);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayCurrency.code, mounted]); // Use displayCurrency

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        // Use CAD formatting potentially, but stick with global for now
        return `${displayCurrency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [displayCurrency.symbol]);

    // Calculate Canadian Mortgage Payment
    const calculateCanadianMortgage = (values: CanadianMortgageFormValues): { payment: number; totalInterest: number; totalCost: number; schedule: AmortizationEntry[] } | null => {
        const principal = parseFloat(values.loanAmount);
        const annualRate = parseFloat(values.interestRate) / 100;
        const amortizationYears = parseInt(values.amortizationPeriod);
        const paymentFreq = values.paymentFrequency;

        if (isNaN(principal) || principal <= 0 || isNaN(annualRate) || annualRate < 0 || isNaN(amortizationYears) || amortizationYears <= 0) {
            return null;
        }

        // 1. Calculate the semi-annual effective rate (compounded semi-annually)
        const i_sa = annualRate / 2; // Semi-annual nominal rate
        const effective_semi_annual_rate = i_sa; // It's just i/2 for simple compounding interval

        // 2. Determine the number of payments per year
        let paymentsPerYear: number;
        switch (paymentFreq) {
            case 'monthly': paymentsPerYear = 12; break;
            case 'bi-weekly': paymentsPerYear = 26; break;
            case 'weekly': paymentsPerYear = 52; break;
            default: return null;
        }

        // 3. Calculate the equivalent interest rate per payment period
        // Formula: i_p = (1 + i_sa)^(2/paymentsPerYear) - 1
        const ratePerPaymentPeriod = Math.pow(1 + effective_semi_annual_rate, 2 / paymentsPerYear) - 1;

        // 4. Calculate the total number of payments
        const totalNumberOfPayments = amortizationYears * paymentsPerYear;

        // 5. Calculate the mortgage payment per period
        // Formula: P = Principal * [i_p * (1 + i_p)^N] / [(1 + i_p)^N - 1]
        let payment: number;
        if (ratePerPaymentPeriod === 0) {
             payment = principal / totalNumberOfPayments;
         } else {
             payment = principal * (ratePerPaymentPeriod * Math.pow(1 + ratePerPaymentPeriod, totalNumberOfPayments)) / (Math.pow(1 + ratePerPaymentPeriod, totalNumberOfPayments) - 1);
         }


        // Generate Amortization Schedule
        const schedule: AmortizationEntry[] = [];
        let remainingBalance = principal;
        let totalInterestPaid = 0;

        for (let period = 1; period <= totalNumberOfPayments; period++) {
            const interestForPeriod = remainingBalance * ratePerPaymentPeriod;
            let principalForPeriod = payment - interestForPeriod;
            let currentPayment = payment;

            // Adjust final payment
            if (period === totalNumberOfPayments) {
                principalForPeriod = remainingBalance;
                currentPayment = principalForPeriod + interestForPeriod;
            }

            const endingBalance = remainingBalance - principalForPeriod;

            schedule.push({
                period: period,
                startingBalance: remainingBalance,
                payment: currentPayment,
                principalPaid: principalForPeriod,
                interestPaid: interestForPeriod,
                endingBalance: endingBalance < 0.005 ? 0 : endingBalance,
            });

            totalInterestPaid += interestForPeriod;
            remainingBalance = endingBalance;

            if (remainingBalance <= 0.005 && period < totalNumberOfPayments) {
                 const lastEntry = schedule[schedule.length - 1];
                 if(lastEntry){
                    lastEntry.endingBalance = 0;
                     // Recalculate total interest based on actual payments made
                    totalInterestPaid = schedule.reduce((sum, entry) => sum + entry.interestPaid, 0);
                 }
                 break; // Stop early if balance is paid off
            }
        }

        const actualTotalCost = principal + totalInterestPaid;


        return {
            payment: payment, // Return the regular calculated payment
            totalInterest: totalInterestPaid,
            totalCost: actualTotalCost,
            schedule: schedule
        };
    };


    const onSubmit: SubmitHandler<CanadianMortgageFormValues> = (data) => {
        const result = calculateCanadianMortgage(data);
        if (result) {
            setPaymentAmount(result.payment);
            setTotalInterest(result.totalInterest);
            setTotalCost(result.totalCost);
            setAmortizationSchedule(result.schedule);

            const inputString = `Loan: ${formatCurrency(parseFloat(data.loanAmount))}, Rate: ${data.interestRate}%, Amortization: ${data.amortizationPeriod} yrs, Freq: ${data.paymentFrequency}`;
            const resultString = `Payment: ${formatCurrency(result.payment)} per period, Total Interest: ${formatCurrency(result.totalInterest)}, Total Cost: ${formatCurrency(result.totalCost)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setPaymentAmount(null);
            setTotalInterest(null);
            setTotalCost(null);
            setAmortizationSchedule([]);
            console.error("Calculation failed. Check inputs.");
        }
    };

     // Skeleton Loader
    if (!mounted) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader className="relative">
                    <Skeleton className="absolute top-3 right-3 h-7 w-7 rounded-full" />
                    <div className="flex items-center gap-2 pr-10">
                        <Skeleton className="h-6 w-6" />
                        <Skeleton className="h-6 w-3/4" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="space-y-2"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                     {/* Frequency Radio Skeleton */}
                     <div className="space-y-3 mb-6">
                         <Skeleton className="h-5 w-1/4 mb-2" />
                         <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                             <Skeleton className="h-6 w-1/4" />
                             <Skeleton className="h-6 w-1/4" />
                             <Skeleton className="h-6 w-1/4" />
                         </div>
                     </div>
                     <Skeleton className="h-10 w-full mb-6" /> {/* Button Skeleton */}
                     <Skeleton className="h-24 w-full mb-6" /> {/* Result Skeleton */}
                     <Skeleton className="h-[300px] w-full" /> {/* Table Skeleton */}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
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
                    {name} ({displayCurrency.code})
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="loanAmount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Loan Amount ({displayCurrency.symbol})</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 300000" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="interestRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Annual Interest Rate (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 5.25" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="amortizationPeriod"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amortization Period (Years)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 25" {...field} step="1" min="1" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                         <FormField
                            control={form.control}
                            name="paymentFrequency"
                             render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Payment Frequency</FormLabel>
                                    <FormControl>
                                         <div className="flex flex-wrap gap-4">
                                             {(['monthly', 'bi-weekly', 'weekly'] as const).map((freq) => (
                                                 <FormItem key={freq} className="flex items-center space-x-2 space-y-0">
                                                     <FormControl>
                                                         <input
                                                             type="radio"
                                                             id={`cm-freq-${freq}`}
                                                             value={freq}
                                                             checked={field.value === freq}
                                                             onChange={field.onChange}
                                                             className="form-radio h-4 w-4 text-primary focus:ring-primary border-muted-foreground/50"
                                                         />
                                                     </FormControl>
                                                     <FormLabel htmlFor={`cm-freq-${freq}`} className="font-normal cursor-pointer capitalize">
                                                         {freq.replace('-', ' ')}
                                                     </FormLabel>
                                                 </FormItem>
                                             ))}
                                         </div>
                                     </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate Mortgage
                        </Button>
                    </form>
                </Form>

                 {paymentAmount !== null && totalInterest !== null && totalCost !== null && (
                    <Alert className="mt-6 mb-6">
                        <HandCoins className="h-4 w-4" />
                        <AlertTitle>Mortgage Summary ({displayCurrency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Payment per Period ({form.watch('paymentFrequency')}): <strong>{formatCurrency(paymentAmount)}</strong></p>
                            <p>Total Principal Paid: <strong>{formatCurrency(parseFloat(form.getValues('loanAmount') || '0'))}</strong></p>
                            <p>Total Interest Paid: <strong>{formatCurrency(totalInterest)}</strong></p>
                            <p>Total Cost of Mortgage: <strong>{formatCurrency(totalCost)}</strong></p>
                            <p className="text-xs mt-1 text-muted-foreground">Based on semi-annual compounding typical for Canadian mortgages.</p>
                        </AlertDescription>
                    </Alert>
                 )}

                 {amortizationSchedule.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <ListChecks className="h-5 w-5 text-primary" />
                            Amortization Schedule ({displayCurrency.code})
                        </h3>
                        <ScrollArea className="h-[300px] w-full border">
                            <Table className="min-w-[600px]">
                                <TableHeader className="sticky top-0 bg-muted z-10">
                                    <TableRow>
                                        <TableHead className="w-[80px]">Period</TableHead>
                                        <TableHead>Principal</TableHead>
                                        <TableHead>Interest</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {amortizationSchedule.map((entry) => (
                                        <TableRow key={entry.period}>
                                            <TableCell className="font-medium">{entry.period}</TableCell>
                                            <TableCell>{formatCurrency(entry.principalPaid)}</TableCell>
                                            <TableCell>{formatCurrency(entry.interestPaid)}</TableCell>
                                            <TableCell>{formatCurrency(entry.payment)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(entry.endingBalance)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}
