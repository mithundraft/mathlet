
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
import { Calculator, Star, CreditCard, ListChecks, PlusCircle, Trash2, CalendarClock, HandCoins } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Sub-schema for a single credit card
const cardSchema = z.object({
    name: z.string().optional().default('Card'),
    balance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Balance must be positive.",
    }),
    apr: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "APR must be zero or positive.",
    }),
    // Minimum payment can be complex (e.g., % of balance + interest/fees or flat amount)
    // For simplicity, we'll use monthly payment similar to single card calc or ask user
    // minimumPayment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    //     message: "Min. payment must be positive.",
    // }),
});

// Zod Schema for Credit Cards Payoff Calculator
const cardsPayoffSchema = z.object({
    cards: z.array(cardSchema).min(1, "Add at least one credit card."),
    monthlyPaymentAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Total monthly payment must be positive.",
    }),
    payoffStrategy: z.enum(['avalanche', 'snowball']).default('avalanche'), // Avalanche (highest APR first) or Snowball (lowest balance first)
});

type CardsPayoffFormValues = z.infer<typeof cardsPayoffSchema>;

interface CardsPayoffCalculatorProps {
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


export function CreditCardsPayoffCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: CardsPayoffCalculatorProps) {
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

    const form = useForm<CardsPayoffFormValues>({
        resolver: zodResolver(cardsPayoffSchema),
        defaultValues: {
            cards: [{ name: 'Card 1', balance: '', apr: '' }],
            monthlyPaymentAmount: '',
            payoffStrategy: 'avalanche',
        },
    });

     const { fields: cardFields, append: appendCard, remove: removeCard } = useFieldArray({
        control: form.control,
        name: "cards",
    });


    React.useEffect(() => {
        if (mounted) {
            form.reset({
                 cards: [{ name: 'Card 1', balance: '', apr: '' }],
                 monthlyPaymentAmount: '',
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

    // Calculate Payoff using selected strategy
    const calculateCardsPayoff = (values: CardsPayoffFormValues): PayoffResult | null => {
        const totalMonthlyPayment = parseFloat(values.monthlyPaymentAmount);
        let cards = values.cards.map((c, index) => ({
            id: index,
            name: c.name || `Card ${index + 1}`,
            balance: parseFloat(c.balance),
            apr: parseFloat(c.apr) / 100,
            monthlyRate: (parseFloat(c.apr) / 100) / 12,
            minimumPayment: 0, // Calculate minimum later
            payoffMonth: null as number | null, // Track when paid off
        }));

        if (isNaN(totalMonthlyPayment) || totalMonthlyPayment <= 0) return null;

        // Calculate minimum payment for each card (e.g., 1% of balance + interest, or a flat minimum like $25, whichever is higher)
        // This is a simplification; actual minimums vary.
        let totalMinimumPayments = 0;
        for (const card of cards) {
            const interestThisMonth = card.balance * card.monthlyRate;
            const onePercent = card.balance * 0.01;
            card.minimumPayment = Math.max(25, onePercent + interestThisMonth); // Example minimum calc
            if (card.minimumPayment > card.balance + interestThisMonth) {
                 card.minimumPayment = card.balance + interestThisMonth; // Cap minimum at payoff amount
            }
            totalMinimumPayments += card.minimumPayment;
        }

        if (totalMonthlyPayment < totalMinimumPayments) {
             return { totalMonths: Infinity, totalInterest: Infinity, totalPaid: Infinity, payoffOrder: [], warning: `Total monthly payment (${formatCurrency(totalMonthlyPayment)}) is less than the sum of estimated minimum payments (${formatCurrency(totalMinimumPayments)}). Increase payment to make progress.` };
        }

        // Sort cards based on strategy
        if (values.payoffStrategy === 'avalanche') {
            cards.sort((a, b) => b.apr - a.apr); // Highest APR first
        } else { // snowball
            cards.sort((a, b) => a.balance - b.balance); // Lowest balance first
        }

        let months = 0;
        let totalInterestPaid = 0;
        let remainingCards = [...cards];
        const payoffOrder: { name: string; months: number }[] = [];
        const MAX_MONTHS = 12 * 50; // 50 year limit

        while (remainingCards.length > 0 && months < MAX_MONTHS) {
            months++;
            let paymentRemaining = totalMonthlyPayment;
            let interestThisMonthTotal = 0;

            // Pay minimums on all cards first (except potentially the target card)
             for (const card of remainingCards) {
                 const interestForMonth = card.balance * card.monthlyRate;
                 interestThisMonthTotal += interestForMonth;
                 const minPay = card.minimumPayment; // Use calculated minimum

                 if (paymentRemaining >= minPay) {
                     // Pay minimum if not the target card for extra payment (or if it's the only card left)
                     // If it's the target card, we still calculate min for total min payment check, but apply extra later
                     // For simplicity in this loop, we'll just track remaining payment after *potential* minimums
                     // The actual payment logic comes next
                 } else {
                     // This shouldn't happen if totalMonthlyPayment >= totalMinimumPayments initially
                     console.error("Error: Payment remaining less than minimum payment.");
                     return { totalMonths: Infinity, totalInterest: Infinity, totalPaid: Infinity, payoffOrder: [], warning: "Calculation error: Insufficient payment for minimums." };
                 }
             }


             // Apply payments according to strategy
             let extraPaymentApplied = false;
             for (let i = 0; i < remainingCards.length; i++) {
                const card = remainingCards[i];
                const interestForMonth = card.balance * card.monthlyRate;
                let paymentForCard = card.minimumPayment; // Start with minimum


                 // If this is the target card (first in sorted list unless paid off), apply extra
                 // Or if previous cards were paid off this month, snowball the payment
                 if (i === 0 || extraPaymentApplied) { // Apply extra to the current target
                     const extraAvailable = paymentRemaining - remainingCards.slice(i).reduce((sum, c) => sum + c.minimumPayment, 0);
                     paymentForCard = Math.min(card.balance + interestForMonth, card.minimumPayment + Math.max(0, extraAvailable)); // Pay up to payoff amount
                     extraPaymentApplied = true; // Indicate extra was applied (or attempted)
                 }


                 // Ensure payment doesn't exceed available funds OR payoff amount
                 paymentForCard = Math.min(paymentRemaining, paymentForCard, card.balance + interestForMonth);


                 const principalPaid = paymentForCard - interestForMonth;
                 card.balance -= principalPaid;
                 totalInterestPaid += interestForMonth;
                 paymentRemaining -= paymentForCard;

                 if (card.balance < 0.005) {
                     card.balance = 0;
                      card.payoffMonth = months;
                      payoffOrder.push({ name: card.name, months: months });
                 }
            }

            // Remove paid-off cards for the next iteration
             remainingCards = remainingCards.filter(card => card.balance > 0);

             // Recalculate minimums for next month (important for accuracy)
            totalMinimumPayments = 0;
            for (const card of remainingCards) {
                 const interestThisMonth = card.balance * card.monthlyRate;
                 const onePercent = card.balance * 0.01;
                 card.minimumPayment = Math.max(25, onePercent + interestThisMonth);
                 if (card.minimumPayment > card.balance + interestThisMonth) {
                    card.minimumPayment = card.balance + interestThisMonth;
                 }
                totalMinimumPayments += card.minimumPayment;
            }
              // Safety check: Ensure next month's payment can cover minimums
              if (remainingCards.length > 0 && totalMonthlyPayment < totalMinimumPayments) {
                   console.warn("Payment becomes insufficient for minimums later in payoff.");
                  // Can happen if minimums increase as balances change, rare but possible
                   return { totalMonths: months, totalInterest: totalInterestPaid, totalPaid: values.cards.reduce((sum, c) => sum + parseFloat(c.balance), 0) + totalInterestPaid, payoffOrder, warning: `Payment (${formatCurrency(totalMonthlyPayment)}) becomes insufficient to cover minimums (${formatCurrency(totalMinimumPayments)}) after month ${months}. Results shown up to this point.` };
              }

        }

        if (months >= MAX_MONTHS) {
             return { totalMonths: Infinity, totalInterest: Infinity, totalPaid: Infinity, payoffOrder, warning: `Payoff takes longer than ${MAX_MONTHS/12} years. Increase monthly payment.` };
        }

        const totalPaidCalc = values.cards.reduce((sum, c) => sum + parseFloat(c.balance), 0) + totalInterestPaid;


        return {
            totalMonths: months,
            totalInterest: totalInterestPaid,
            totalPaid: totalPaidCalc,
            payoffOrder: payoffOrder,
             warning: null
        };
    };

    const onSubmit: SubmitHandler<CardsPayoffFormValues> = (data) => {
         setPayoffResult(null); // Clear previous results
        const result = calculateCardsPayoff(data);
        if (result) {
            setPayoffResult(result);

             if (!result.warning && result.totalMonths !== Infinity) {
                const cardSummary = data.cards.map(c => `${c.name || 'Card'}: ${formatCurrency(parseFloat(c.balance))} @ ${c.apr}%`).join('; ');
                const inputString = `Cards: [${cardSummary}], Monthly Pmt: ${formatCurrency(parseFloat(data.monthlyPaymentAmount))}, Strategy: ${data.payoffStrategy}`;
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
             form.setError("root", {message: "Calculation failed. Check inputs."})
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
                <CardContent className="space-y-6">
                    {/* Cards Section Skeleton */}
                    <div>
                        <Skeleton className="h-6 w-1/4 mb-2" />
                        <div className="space-y-2">
                             {/* Skeleton for one card row */}
                             <div className="flex flex-col md:flex-row gap-2 items-start border p-3">
                                 <Skeleton className="h-10 flex-1" />
                                 <Skeleton className="h-10 flex-1" />
                                 <Skeleton className="h-10 flex-1" />
                                 <Skeleton className="h-10 w-10 mt-auto" />
                             </div>
                         </div>
                        <Skeleton className="h-9 w-32 mt-2" /> {/* Add card button skeleton */}
                    </div>
                     {/* Payment & Strategy Skeleton */}
                     <Skeleton className="h-10 w-full" />
                     <div className="space-y-3">
                         <Skeleton className="h-5 w-1/4 mb-2"/>
                         <div className="flex gap-4"><Skeleton className="h-6 w-1/3"/><Skeleton className="h-6 w-1/3"/></div>
                     </div>
                    <Skeleton className="h-10 w-full" /> {/* Calculate Button Skeleton */}
                    <Skeleton className="mt-6 h-28 w-full" /> {/* Result Skeleton */}
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
                    {name}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Credit Card Inputs */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">Credit Card Details</h3>
                             {cardFields.map((field, index) => (
                                <div key={field.id} className="flex flex-col md:flex-row gap-2 items-start border p-3 rounded">
                                     <FormField
                                        control={form.control}
                                        name={`cards.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem className="flex-grow md:flex-grow-0 md:w-1/4">
                                                <FormLabel className="sr-only md:not-sr-only">Card Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={`Card ${index + 1}`} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name={`cards.${index}.balance`}
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                 <FormLabel className="sr-only md:not-sr-only">Balance ({currency.symbol})</FormLabel>
                                                 <FormControl>
                                                    <Input type="number" placeholder="Balance" {...field} step="any" min="0" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`cards.${index}.apr`}
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                 <FormLabel className="sr-only md:not-sr-only">APR (%)</FormLabel>
                                                 <FormControl>
                                                    <Input type="number" placeholder="APR" {...field} step="any" min="0" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeCard(index)}
                                        disabled={cardFields.length <= 1}
                                         className="mt-1 md:mt-auto text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed self-end md:self-center"
                                         aria-label="Remove card"
                                     >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => appendCard({ name: `Card ${cardFields.length + 1}`, balance: '', apr: '' })}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Card
                            </Button>
                            <FormMessage>{form.formState.errors.cards?.root?.message || form.formState.errors.cards?.message}</FormMessage>
                        </div>

                        {/* Payment and Strategy */}
                        <div className="space-y-4 border-t pt-4">
                             <FormField
                                control={form.control}
                                name="monthlyPaymentAmount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Total Monthly Payment ({currency.symbol})</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="Total amount you can pay monthly" {...field} step="any" min="0" />
                                        </FormControl>
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
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                className="flex flex-col sm:flex-row gap-4"
                                            >
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value="avalanche" id="strat-avalanche"/></FormControl>
                                                    <FormLabel htmlFor="strat-avalanche" className="font-normal cursor-pointer">Avalanche (Highest APR First)</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value="snowball" id="strat-snowball" /></FormControl>
                                                    <FormLabel htmlFor="strat-snowball" className="font-normal cursor-pointer">Snowball (Lowest Balance First)</FormLabel>
                                                </FormItem>
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
                            <Calculator className="mr-2 h-4 w-4" /> Calculate Payoff Plan
                        </Button>
                    </form>
                </Form>

                {payoffResult && payoffResult.totalMonths !== Infinity && (
                    <Alert className="mt-6">
                        <ListChecks className="h-4 w-4" />
                        <AlertTitle>Credit Card Payoff Plan ({currency.code})</AlertTitle>
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
