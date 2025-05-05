
'use client';

// Similar to Credit Cards Payoff, but potentially for different debt types (loans, etc.)
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, WalletCards, ListChecks, PlusCircle, Trash2, CalendarClock, HandCoins } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Sub-schema for a single debt item
const debtItemSchema = z.object({
    name: z.string().optional().default('Debt'),
    balance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Balance must be positive.",
    }),
    apr: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "APR must be zero or positive.",
    }),
    minimumPayment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Minimum payment must be positive.",
    }), // Require user to input minimum payment
});

// Zod Schema for Debt Payoff Calculator
const debtPayoffSchema = z.object({
    debts: z.array(debtItemSchema).min(1, "Add at least one debt."),
    additionalPayment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Additional payment must be zero or positive.",
    }).optional().default("0"), // Extra amount paid towards debts each month
    payoffStrategy: z.enum(['avalanche', 'snowball']).default('avalanche'), // Avalanche (highest APR first) or Snowball (lowest balance first)
});

type DebtPayoffFormValues = z.infer<typeof debtPayoffSchema>;

interface DebtPayoffCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

interface PayoffResult {
    totalMonths: number;
    totalInterest: number;
    totalPaid: number;
    payoffOrder: { name: string; months: number }[];
     warning?: string | null;
}


export function DebtPayoffCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: DebtPayoffCalculatorProps) {
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

    const form = useForm<DebtPayoffFormValues>({
        resolver: zodResolver(debtPayoffSchema),
        defaultValues: {
            debts: [{ name: 'Debt 1', balance: '', apr: '', minimumPayment: '' }],
            additionalPayment: '0',
            payoffStrategy: 'avalanche',
        },
    });

     const { fields: debtFields, append: appendDebt, remove: removeDebt } = useFieldArray({
        control: form.control,
        name: "debts",
    });


    React.useEffect(() => {
        if (mounted) {
            form.reset({
                debts: [{ name: 'Debt 1', balance: '', apr: '', minimumPayment: '' }],
                additionalPayment: '0',
                payoffStrategy: 'avalanche',
            });
            setPayoffResult(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Payoff using selected strategy (Similar to Credit Cards Payoff)
    const calculateDebtPayoff = (values: DebtPayoffFormValues): PayoffResult | null => {
        const additionalMonthlyPayment = parseFloat(values.additionalPayment || '0');
        let debts = values.debts.map((d, index) => ({
            id: index,
            name: d.name || `Debt ${index + 1}`,
            balance: parseFloat(d.balance),
            apr: parseFloat(d.apr) / 100,
            monthlyRate: (parseFloat(d.apr) / 100) / 12,
            minimumPayment: parseFloat(d.minimumPayment),
            payoffMonth: null as number | null,
        }));

        if (isNaN(additionalMonthlyPayment) || additionalMonthlyPayment < 0) return null;

        const totalMinimumPayments = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
        const totalMonthlyPayment = totalMinimumPayments + additionalMonthlyPayment;

        // Initial check for payment sufficiency
        for (const debt of debts) {
             const interestThisMonth = debt.balance * debt.monthlyRate;
             if (debt.minimumPayment <= interestThisMonth && debt.monthlyRate > 0) {
                 return { totalMonths: Infinity, totalInterest: Infinity, totalPaid: Infinity, payoffOrder: [], warning: `Minimum payment (${formatCurrency(debt.minimumPayment)}) for '${debt.name}' doesn't cover first month's interest (${formatCurrency(interestThisMonth)}). Payoff impossible.` };
             }
        }

        // Sort debts based on strategy
        if (values.payoffStrategy === 'avalanche') {
            debts.sort((a, b) => b.apr - a.apr); // Highest APR first
        } else { // snowball
            debts.sort((a, b) => a.balance - b.balance); // Lowest balance first
        }

        let months = 0;
        let totalInterestPaid = 0;
        let remainingDebts = [...debts];
        const payoffOrder: { name: string; months: number }[] = [];
        const MAX_MONTHS = 12 * 100; // 100 year limit
        let totalPaidTowardsPrincipalAndInterest = 0;


        while (remainingDebts.length > 0 && months < MAX_MONTHS) {
            months++;
            let paymentAvailable = totalMonthlyPayment;
            let snowballPayment = 0; // Extra payment freed up from paid-off debts this month

             // Apply minimum payments and calculate interest
            for (const debt of remainingDebts) {
                const interestForMonth = debt.balance * debt.monthlyRate;
                totalInterestPaid += interestForMonth;

                 // Tentatively reduce balance by minimum payment's principal portion
                 // Actual payment happens in the next loop
            }

            // Distribute payments
             let paymentAppliedThisMonth = 0;
            for (let i = 0; i < remainingDebts.length; i++) {
                 const debt = remainingDebts[i];
                 const interestForMonth = debt.balance * debt.monthlyRate; // Recalculate based on start-of-month balance
                 let paymentForDebt = debt.minimumPayment;

                 // If this is the target debt, add the snowball/additional payment
                 if (i === 0) {
                    paymentForDebt += additionalMonthlyPayment + snowballPayment;
                 }

                 // Don't overpay the debt
                 paymentForDebt = Math.min(paymentForDebt, debt.balance + interestForMonth);
                 // Don't pay more than available
                 paymentForDebt = Math.min(paymentForDebt, paymentAvailable);

                 const principalPaid = paymentForDebt - interestForMonth;
                 debt.balance -= principalPaid;
                 paymentAvailable -= paymentForDebt;
                 paymentAppliedThisMonth += paymentForDebt;


                 if (debt.balance < 0.005) {
                     debt.balance = 0;
                     debt.payoffMonth = months;
                     payoffOrder.push({ name: debt.name, months: months });
                     // Add this debt's minimum payment to the snowball for the *next* debt in *this* month's loop
                     // But only if we are not already paying the target debt
                      if (i > 0) { // Don't add snowball if it was the primary target just paid off
                          snowballPayment += debt.minimumPayment;
                      } else {
                          // If the primary target was paid off, the *entire* remaining payment goes to the next target
                           // This logic is implicitly handled by the loop and paymentAvailable reduction
                      }

                 }
            }

            totalPaidTowardsPrincipalAndInterest += paymentAppliedThisMonth;
            remainingDebts = remainingDebts.filter(debt => debt.balance > 0);

             // Update minimums for the next iteration based on remaining balances (though often fixed)
             // For simplicity here, we assume minimums stay constant unless paid off.

             if (paymentAvailable > 0.01 && remainingDebts.length > 0) {
                // This indicates an issue, maybe minimums were too low or calculation error
                 console.warn(`Remaining payment (${paymentAvailable}) after distribution in month ${months}`);
             }

        }


        if (months >= MAX_MONTHS) {
             return { totalMonths: Infinity, totalInterest: Infinity, totalPaid: Infinity, payoffOrder, warning: `Payoff takes longer than ${MAX_MONTHS/12} years. Increase monthly payment or check minimums.` };
        }

         // Calculate total paid more accurately
         const initialTotalBalance = values.debts.reduce((sum, d) => sum + parseFloat(d.balance), 0);
         // Total paid should equal initial balance plus total interest accrued
         const totalPaidCalc = initialTotalBalance + totalInterestPaid;


        return {
            totalMonths: months,
            totalInterest: totalInterestPaid,
            totalPaid: totalPaidCalc,
            payoffOrder: payoffOrder,
             warning: null
        };
    };

    const onSubmit: SubmitHandler<DebtPayoffFormValues> = (data) => {
        setPayoffResult(null); // Clear previous
        const result = calculateDebtPayoff(data);
        if (result) {
             setPayoffResult(result);

             if(!result.warning && result.totalMonths !== Infinity){
                const debtSummary = data.debts.map(d => `${d.name || 'Debt'}: ${formatCurrency(parseFloat(d.balance))}@${d.apr}%(${formatCurrency(parseFloat(d.minimumPayment))}/mo)`).join('; ');
                const inputString = `Debts: [${debtSummary}], Add'l Pmt: ${formatCurrency(parseFloat(data.additionalPayment || '0'))}, Strategy: ${data.payoffStrategy}`;
                const orderSummary = result.payoffOrder.map(o => `${o.name} (${o.months} mo)`).join(', ');
                const resultString = `Total Payoff Time: ${result.totalMonths} months, Total Interest: ${formatCurrency(result.totalInterest)}, Payoff Order: ${orderSummary}`;

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
            setPayoffResult(null);
             form.setError("root", {message: "Calculation failed. Check inputs."});
            console.error("Calculation failed. Check inputs.");
        }
    };

     // Skeleton Loader (similar to Credit Cards Payoff)
    if (!mounted) {
        return (
            <Card className="w-full max-w-3xl mx-auto">
                <CardHeader className="relative">
                    <Skeleton className="absolute top-3 right-3 h-7 w-7 rounded-full" />
                    <div className="flex items-center gap-2 pr-10"><Skeleton className="h-6 w-6" /><Skeleton className="h-6 w-3/4" /></div>
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Debts Section Skeleton */}
                    <div>
                        <Skeleton className="h-6 w-1/4 mb-2" />
                        <div className="space-y-2">
                            <div className="flex flex-col md:flex-row gap-2 items-start border p-3"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-10 mt-auto" /></div>
                        </div>
                        <Skeleton className="h-9 w-32 mt-2" />
                    </div>
                    {/* Payment & Strategy Skeleton */}
                    <Skeleton className="h-10 w-full" />
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-1/4 mb-2"/><div className="flex gap-4"><Skeleton className="h-6 w-1/3"/><Skeleton className="h-6 w-1/3"/></div>
                    </div>
                    <Skeleton className="h-10 w-full" /> {/* Calculate Button */}
                    <Skeleton className="mt-6 h-28 w-full" /> {/* Result */}
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
                        {/* Debt Inputs */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">Your Debts</h3>
                             {debtFields.map((field, index) => (
                                <div key={field.id} className="flex flex-col md:flex-row gap-2 items-start border p-3 rounded">
                                    <FormField control={form.control} name={`debts.${index}.name`} render={({ field }) => (<FormItem className="flex-grow md:flex-grow-0 md:w-1/4"><FormLabel className="sr-only md:not-sr-only">Debt Name</FormLabel><FormControl><Input placeholder={`Debt ${index + 1}`} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`debts.${index}.balance`} render={({ field }) => (<FormItem className="flex-grow"><FormLabel className="sr-only md:not-sr-only">Balance ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="Balance" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`debts.${index}.apr`} render={({ field }) => (<FormItem className="flex-grow"><FormLabel className="sr-only md:not-sr-only">APR (%)</FormLabel><FormControl><Input type="number" placeholder="APR" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`debts.${index}.minimumPayment`} render={({ field }) => (<FormItem className="flex-grow"><FormLabel className="sr-only md:not-sr-only">Min. Pmt ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="Min. Payment" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeDebt(index)} disabled={debtFields.length <= 1} className="mt-1 md:mt-auto text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed self-end md:self-center" aria-label="Remove debt"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendDebt({ name: `Debt ${debtFields.length + 1}`, balance: '', apr: '', minimumPayment: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Debt</Button>
                            <FormMessage>{form.formState.errors.debts?.root?.message || form.formState.errors.debts?.message}</FormMessage>
                        </div>

                        {/* Payoff Strategy and Additional Payment */}
                         <div className="space-y-4 border-t pt-4">
                             <FormField
                                control={form.control}
                                name="additionalPayment"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Additional Monthly Payment ({currency.symbol}) <small>(Optional)</small></FormLabel>
                                        <FormControl><Input type="number" placeholder="Extra amount towards debt" {...field} step="any" min="0" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="payoffStrategy"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Payoff Strategy</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col sm:flex-row gap-4">
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="avalanche" id="debt-strat-avalanche"/></FormControl><FormLabel htmlFor="debt-strat-avalanche" className="font-normal cursor-pointer">Avalanche (Highest APR First)</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="snowball" id="debt-strat-snowball" /></FormControl><FormLabel htmlFor="debt-strat-snowball" className="font-normal cursor-pointer">Snowball (Lowest Balance First)</FormLabel></FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                         {form.formState.errors.root && (
                             <FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>
                         )}
                          {payoffResult?.warning && (
                             <Alert variant="destructive">
                                <AlertTitle>Warning</AlertTitle>
                                <AlertDescription>{payoffResult.warning}</AlertDescription>
                            </Alert>
                         )}

                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate Debt Payoff Plan
                        </Button>
                    </form>
                </Form>

                 {payoffResult && payoffResult.totalMonths !== Infinity && (
                    <Alert className="mt-6">
                        <ListChecks className="h-4 w-4" />
                        <AlertTitle>Debt Payoff Plan ({currency.code})</AlertTitle>
                         <AlertDescription>
                            <p>Total Payoff Time: <strong>{payoffResult.totalMonths} months</strong> ({Math.floor(payoffResult.totalMonths / 12)} years, {payoffResult.totalMonths % 12} months)</p>
                            <p>Total Interest Paid: <strong>{formatCurrency(payoffResult.totalInterest)}</strong></p>
                            <p>Total Amount Paid: <strong>{formatCurrency(payoffResult.totalPaid)}</strong></p>
                             <div className="mt-2">
                                <h4 className="font-medium text-sm mb-1">Payoff Order ({form.watch('payoffStrategy')} strategy):</h4>
                                <ul className="list-decimal list-inside text-xs space-y-0.5">
                                    {payoffResult.payoffOrder.map((item, index) => (
                                        <li key={index}>{item.name} (paid off in month {item.months})</li>
                                    ))}
                                </ul>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
