
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, WalletCards, PlusCircle, Trash2, Scaling, CheckCircle, XCircle } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Sub-schema for individual debts
const debtSchema = z.object({
    name: z.string().optional().default('Debt'),
    balance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Balance must be positive.",
    }),
    apr: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "APR must be zero or positive.",
    }),
    monthlyPayment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Monthly payment must be positive.",
    }),
});

// Zod Schema for Debt Consolidation Calculator
const consolidationSchema = z.object({
    debts: z.array(debtSchema).min(1, "Add at least one debt."),
    // Consolidation Loan Details
    consolidationLoanRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Consolidation loan APR must be zero or positive.",
    }),
    consolidationLoanTerm: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Consolidation loan term must be positive (years).",
    }),
     // Optional: Consolidation loan fees
    consolidationLoanFees: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Loan fees must be zero or positive.",
    }).optional().default("0"),
});

type ConsolidationFormValues = z.infer<typeof consolidationSchema>;

interface DebtConsolidationCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

interface ConsolidationResult {
    currentTotalPayment: number;
    currentTotalInterest: number;
    currentPayoffMonths: number;
    consolidatedMonthlyPayment: number;
    consolidatedTotalInterest: number;
    consolidatedTotalPaid: number;
    interestSaved: number;
     potentialSavings: boolean;
     warning?: string | null;
}

export function DebtConsolidationCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: DebtConsolidationCalculatorProps) {
    const [result, setResult] = React.useState<ConsolidationResult | null>(null);
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

    const form = useForm<ConsolidationFormValues>({
        resolver: zodResolver(consolidationSchema),
        defaultValues: {
            debts: [{ name: 'Debt 1', balance: '', apr: '', monthlyPayment: '' }],
            consolidationLoanRate: '',
            consolidationLoanTerm: '',
             consolidationLoanFees: '0',
        },
    });

    const { fields: debtFields, append: appendDebt, remove: removeDebt } = useFieldArray({
        control: form.control,
        name: "debts",
    });


    React.useEffect(() => {
        if (mounted) {
            form.reset({
                debts: [{ name: 'Debt 1', balance: '', apr: '', monthlyPayment: '' }],
                consolidationLoanRate: '',
                consolidationLoanTerm: '',
                consolidationLoanFees: '0',
            });
            setResult(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Helper to calculate payoff for a single debt
    const calculateSingleDebtPayoff = (balance: number, apr: number, monthlyPayment: number): { months: number; interest: number; totalPaid: number; warning: string | null } | null => {
         const monthlyRate = (apr / 100) / 12;

         if (balance <= 0 || monthlyPayment <= 0) return { months: 0, interest: 0, totalPaid: 0, warning: null };

         // Check if payment covers interest
         const minPaymentForProgress = balance * monthlyRate;
         if (monthlyPayment <= minPaymentForProgress && monthlyRate > 0) {
            return { months: Infinity, interest: Infinity, totalPaid: Infinity, warning: `Payment (${formatCurrency(monthlyPayment)}) doesn't cover interest (${formatCurrency(minPaymentForProgress)}).` };
         }
          if (monthlyRate === 0) {
              const months = Math.ceil(balance / monthlyPayment);
              return { months: months, interest: 0, totalPaid: balance, warning: null };
          }

         const numberOfMonths = -Math.log(1 - (balance * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate);
         if (!isFinite(numberOfMonths) || numberOfMonths < 0) {
            return { months: Infinity, interest: Infinity, totalPaid: Infinity, warning: "Cannot calculate payoff time with this payment." };
         }

         // Simulate for accuracy
         let currentBalance = balance;
         let totalInterestCalc = 0;
         let totalPaidActual = 0;
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
             totalPaidActual += paymentThisMonth;
             currentBalance -= principalPaid;
             actualMonths = i + 1;
         }
          if(actualMonths >= maxMonths){
             return { months: Infinity, interest: Infinity, totalPaid: Infinity, warning: "Payoff takes over 100 years." };
          }

         return { months: actualMonths, interest: totalInterestCalc, totalPaid: totalPaidActual, warning: null };
    };

     // Helper to calculate consolidation loan details
    const calculateConsolidationLoan = (totalDebt: number, fees: number, annualRate: number, termYears: number): { monthlyPayment: number; totalInterest: number; totalPaid: number } | null => {
        const loanAmount = totalDebt + fees;
        const monthlyRate = (annualRate / 100) / 12;
        const numberOfPayments = termYears * 12;

        if (loanAmount <= 0 || annualRate < 0 || termYears <= 0) return null;

         let monthlyPaymentCalc: number;
          if (monthlyRate === 0) {
             monthlyPaymentCalc = loanAmount / numberOfPayments;
         } else {
             monthlyPaymentCalc = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
         }

         const totalPaidCalc = monthlyPaymentCalc * numberOfPayments; // Approximation, final payment might differ slightly
         const totalInterestCalc = totalPaidCalc - loanAmount;

        // Simulate for more accuracy if needed, especially for total paid
        let balance = loanAmount;
        let totalInterestSim = 0;
        let totalPaidSim = 0;
        for (let i = 0; i < numberOfPayments; i++) {
            let interest = balance * monthlyRate;
            let principal = monthlyPaymentCalc - interest;
             let payment = monthlyPaymentCalc;
             if (i === numberOfPayments - 1 || balance + interest < payment) { // Final payment adjustment
                 payment = balance + interest;
                 principal = balance;
             }
            balance -= principal;
            totalInterestSim += interest;
             totalPaidSim += payment;
             if (balance < 0.005) break;
        }


        return {
            monthlyPayment: monthlyPaymentCalc,
            totalInterest: totalInterestSim,
            totalPaid: totalPaidSim
        };
    };


    const onSubmit: SubmitHandler<ConsolidationFormValues> = (data) => {
        let currentTotalMonthlyPayment = 0;
        let currentTotalInterest = 0;
        let maxPayoffMonths = 0;
         let currentWarning: string | null = null;

        // Calculate current situation
        for (const debt of data.debts) {
            const balance = parseFloat(debt.balance);
            const apr = parseFloat(debt.apr);
            const payment = parseFloat(debt.monthlyPayment);
            currentTotalMonthlyPayment += payment;
             const payoff = calculateSingleDebtPayoff(balance, apr, payment);
             if (payoff) {
                if (payoff.months === Infinity) {
                     currentWarning = payoff.warning || `Cannot pay off '${debt.name || 'a debt'}' with current payment.`;
                     currentTotalInterest = Infinity; // Mark as infinite if one debt can't be paid off
                     maxPayoffMonths = Infinity;
                     // break; // Stop calculation if one fails critically
                 } else if (currentTotalInterest !== Infinity) {
                     currentTotalInterest += payoff.interest;
                     maxPayoffMonths = Math.max(maxPayoffMonths, payoff.months);
                 }
            } else {
                 // Handle calculation error for individual debt
                  setResult(null);
                  form.setError(`debts.${data.debts.indexOf(debt)}.balance`, { message: "Invalid debt details." });
                  console.error("Failed to calculate payoff for an individual debt.");
                  return;
            }
        }


        // Calculate consolidation scenario
        const totalDebtBalance = data.debts.reduce((sum, d) => sum + parseFloat(d.balance), 0);
        const consRate = parseFloat(data.consolidationLoanRate);
        const consTerm = parseInt(data.consolidationLoanTerm);
        const consFees = parseFloat(data.consolidationLoanFees || '0');

        const consResult = calculateConsolidationLoan(totalDebtBalance, consFees, consRate, consTerm);

        if (consResult) {
            const interestSaved = currentTotalInterest === Infinity ? -Infinity : currentTotalInterest - consResult.totalInterest; // Negative infinity if current is already infinite
            const potentialSavings = currentTotalInterest !== Infinity && interestSaved > 0;

            const finalResult : ConsolidationResult = {
                 currentTotalPayment: currentTotalMonthlyPayment,
                 currentTotalInterest: currentTotalInterest,
                 currentPayoffMonths: maxPayoffMonths,
                 consolidatedMonthlyPayment: consResult.monthlyPayment,
                 consolidatedTotalInterest: consResult.totalInterest,
                 consolidatedTotalPaid: consResult.totalPaid,
                 interestSaved: interestSaved,
                 potentialSavings: potentialSavings,
                 warning: currentWarning
            }

            setResult(finalResult);

            // Record History (only if calculation was feasible)
             if (!currentWarning && currentTotalInterest !== Infinity) {
                 const debtSummary = data.debts.map(d => `${d.name || 'Debt'}: ${formatCurrency(parseFloat(d.balance))}@${d.apr}%(${formatCurrency(parseFloat(d.monthlyPayment))}/mo)`).join('; ');
                 const consSummary = `Cons. Loan: ${formatCurrency(totalDebtBalance + consFees)} @ ${consRate}% for ${consTerm}yrs`;
                 const inputString = `Debts: [${debtSummary}] | ${consSummary}`;
                 const resultString = `Consolidated Pmt: ${formatCurrency(consResult.monthlyPayment)}/mo, Total Interest Saved: ${formatCurrency(interestSaved)}. ${potentialSavings ? 'Consolidation appears beneficial.' : 'Consolidation may not save interest.'}`;

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
            setResult(null);
            form.setError("root", { message: "Failed to calculate consolidation loan details." });
            console.error("Failed to calculate consolidation loan.");
        }
    };

    // Skeleton Loader
    if (!mounted) {
        return (
             <Card className="w-full max-w-3xl mx-auto"> {/* Wider card */}
                 <CardHeader className="relative">
                     <Skeleton className="absolute top-3 right-3 h-7 w-7 rounded-full" />
                     <div className="flex items-center gap-2 pr-10">
                         <Skeleton className="h-6 w-6" />
                         <Skeleton className="h-6 w-3/4" />
                     </div>
                     <Skeleton className="h-4 w-full" />
                 </CardHeader>
                 <CardContent className="space-y-6">
                     {/* Debts Section Skeleton */}
                     <div>
                         <Skeleton className="h-6 w-1/4 mb-2" />
                         <div className="space-y-2">
                              {/* Skeleton for one debt row */}
                              <div className="flex flex-col md:flex-row gap-2 items-start border p-3">
                                  <Skeleton className="h-10 flex-1" />
                                  <Skeleton className="h-10 flex-1" />
                                  <Skeleton className="h-10 flex-1" />
                                  <Skeleton className="h-10 flex-1" />
                                  <Skeleton className="h-10 w-10 mt-auto" />
                              </div>
                          </div>
                         <Skeleton className="h-9 w-32 mt-2" /> {/* Add debt button skeleton */}
                     </div>
                     {/* Consolidation Loan Skeleton */}
                     <div>
                          <Skeleton className="h-6 w-1/3 mb-2"/>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <Skeleton className="h-10 w-full"/>
                              <Skeleton className="h-10 w-full"/>
                               <Skeleton className="h-10 w-full"/>
                          </div>
                     </div>
                     <Skeleton className="h-10 w-full" /> {/* Calculate Button Skeleton */}
                     <Skeleton className="mt-6 h-32 w-full" /> {/* Result Skeleton */}
                 </CardContent>
            </Card>
        );
    }


    return (
         <Card className="w-full max-w-3xl mx-auto"> {/* Wider card */}
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
                        {/* Debts Section */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">Your Current Debts</h3>
                             {debtFields.map((field, index) => (
                                <div key={field.id} className="flex flex-col md:flex-row gap-2 items-start border p-3 rounded">
                                     <FormField
                                        control={form.control}
                                        name={`debts.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem className="flex-grow md:flex-grow-0 md:w-1/4">
                                                <FormLabel className="sr-only md:not-sr-only">Debt Name</FormLabel>
                                                <FormControl><Input placeholder={`Debt ${index + 1}`} {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`debts.${index}.balance`}
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormLabel className="sr-only md:not-sr-only">Balance ({currency.symbol})</FormLabel>
                                                <FormControl><Input type="number" placeholder="Balance" {...field} step="any" min="0" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`debts.${index}.apr`}
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormLabel className="sr-only md:not-sr-only">APR (%)</FormLabel>
                                                <FormControl><Input type="number" placeholder="APR" {...field} step="any" min="0" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name={`debts.${index}.monthlyPayment`}
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormLabel className="sr-only md:not-sr-only">Payment ({currency.symbol})</FormLabel>
                                                <FormControl><Input type="number" placeholder="Payment" {...field} step="any" min="0" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <Button
                                        type="button" variant="ghost" size="icon"
                                        onClick={() => removeDebt(index)} disabled={debtFields.length <= 1}
                                        className="mt-1 md:mt-auto text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed self-end md:self-center"
                                        aria-label="Remove debt"
                                    ><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendDebt({ name: `Debt ${debtFields.length + 1}`, balance: '', apr: '', monthlyPayment: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Debt
                            </Button>
                            <FormMessage>{form.formState.errors.debts?.root?.message || form.formState.errors.debts?.message}</FormMessage>
                        </div>

                        {/* Consolidation Loan Section */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-semibold">Consolidation Loan Offer</h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="consolidationLoanRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Loan APR (%)</FormLabel>
                                            <FormControl><Input type="number" placeholder="e.g., 9.5" {...field} step="any" min="0" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="consolidationLoanTerm"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Loan Term (Years)</FormLabel>
                                            <FormControl><Input type="number" placeholder="e.g., 5" {...field} step="1" min="1" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                  <FormField
                                    control={form.control}
                                    name="consolidationLoanFees"
                                    render={({ field }) => (
                                        <FormItem>
                                             <FormLabel>Loan Fees ({currency.symbol}) <small>(Optional)</small></FormLabel>
                                            <FormControl><Input type="number" placeholder="e.g., 500" {...field} step="any" min="0" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                         {form.formState.errors.root && (
                             <FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>
                         )}

                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Compare Consolidation
                        </Button>
                    </form>
                </Form>

                 {result && (
                    <Alert className="mt-6" variant={result.warning ? "destructive" : "default"}>
                        <Scaling className="h-4 w-4" />
                        <AlertTitle>Consolidation Comparison ({currency.code})</AlertTitle>
                        <AlertDescription className="space-y-2">
                            {result.warning && <p className='font-semibold'>{result.warning}</p>}
                             <div>
                                <h4 className='font-medium text-sm'>Current Situation:</h4>
                                <p className='text-xs'>Total Monthly Payments: {formatCurrency(result.currentTotalPayment)}</p>
                                 <p className='text-xs'>Est. Total Interest Paid: {result.currentTotalInterest === Infinity ? 'N/A (Payoff not possible)' : formatCurrency(result.currentTotalInterest)}</p>
                                 <p className='text-xs'>Est. Payoff Time: {result.currentPayoffMonths === Infinity ? '> 50 years' : `${result.currentPayoffMonths} months`}</p>
                            </div>
                             <div>
                                <h4 className='font-medium text-sm'>Consolidated Loan:</h4>
                                 <p className='text-xs'>Monthly Payment: {formatCurrency(result.consolidatedMonthlyPayment)}</p>
                                 <p className='text-xs'>Total Interest Paid: {formatCurrency(result.consolidatedTotalInterest)}</p>
                                 <p className='text-xs'>Total Paid (incl. fees): {formatCurrency(result.consolidatedTotalPaid)}</p>
                                 <p className='text-xs'>Payoff Time: {parseInt(form.getValues('consolidationLoanTerm'))*12} months</p>
                            </div>
                            {result.currentTotalInterest !== Infinity && (
                                 <div className={cn("mt-2 pt-2 border-t font-semibold flex items-center gap-1", result.potentialSavings ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                                     {result.potentialSavings ? <CheckCircle className="h-4 w-4"/> : <XCircle className="h-4 w-4"/>}
                                     Potential Interest Savings: {formatCurrency(result.interestSaved)}
                                      ({result.potentialSavings ? 'Consolidation may save money' : 'Consolidation might cost more interest'})
                                 </div>
                            )}
                             {result.currentTotalInterest === Infinity && result.warning && (
                                <p className="text-xs mt-1 text-destructive">Fix current payment issues before considering consolidation.</p>
                             )}
                             {result.currentTotalInterest !== Infinity && !result.warning && !result.potentialSavings && result.consolidatedMonthlyPayment < result.currentTotalPayment && (
                                 <p className="text-xs mt-1 text-muted-foreground">Note: While interest might be higher, the monthly payment is lower.</p>
                             )}
                         </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
