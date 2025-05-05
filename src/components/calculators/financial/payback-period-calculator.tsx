
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
import { Calculator, Star, Undo2, CalendarClock, PlusCircle, Trash2 } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Sub-schema for cash flows
const cashFlowPaybackSchema = z.object({
    amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { // Usually positive inflows after investment
        message: "Cash flow amount must be zero or positive.",
    }),
});


// Zod Schema for Payback Period Calculator
const paybackSchema = z.object({
    initialInvestment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Initial investment must be positive.",
    }),
     // Cash flows represent inflows per period (e.g., annually)
    cashFlows: z.array(cashFlowPaybackSchema).min(1, "Add at least one expected cash inflow period."),
});

type PaybackFormValues = z.infer<typeof paybackSchema>;

interface PaybackPeriodCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function PaybackPeriodCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: PaybackPeriodCalculatorProps) {
    const [paybackPeriodYears, setPaybackPeriodYears] = React.useState<number | string | null>(null); // Can be string like "X years, Y months"
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

    const form = useForm<PaybackFormValues>({
        resolver: zodResolver(paybackSchema),
        defaultValues: {
            initialInvestment: '',
            cashFlows: [{ amount: '' }], // Start with one inflow period
        },
    });

     const { fields: cashFlowFields, append: appendCashFlow, remove: removeCashFlow } = useFieldArray({
        control: form.control,
        name: "cashFlows",
    });


    React.useEffect(() => {
        if (mounted) {
            form.reset({ cashFlows: [{ amount: '' }] });
            setPaybackPeriodYears(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Payback Period
    const calculatePayback = (values: PaybackFormValues): number | string | null => {
        const investment = parseFloat(values.initialInvestment);
        const flows = values.cashFlows.map(cf => parseFloat(cf.amount));

        if (isNaN(investment) || investment <= 0 || flows.some(isNaN) || flows.some(f => f < 0)) {
             form.setError("cashFlows", {message: "Ensure all cash flows are valid positive numbers."});
            return null;
        }

        let cumulativeCashFlow = 0;
        let years = 0;

        for (let i = 0; i < flows.length; i++) {
            cumulativeCashFlow += flows[i];
            years++;
            if (cumulativeCashFlow >= investment) {
                // Payback occurs within this year
                const amountNeededLastYear = investment - (cumulativeCashFlow - flows[i]);
                const fractionOfYear = amountNeededLastYear / flows[i];
                 const payback = (years - 1) + fractionOfYear; // Payback period in years

                 // Format into years and months for better readability
                  const totalMonths = payback * 12;
                  const fullYears = Math.floor(payback);
                  const remainingMonths = Math.round((payback - fullYears) * 12);

                 if (remainingMonths === 12) {
                    return `${fullYears + 1} years`;
                 } else if (remainingMonths === 0) {
                     return `${fullYears} years`;
                 } else {
                    return `${fullYears} years, ${remainingMonths} months`;
                 }
                // return payback; // Return decimal years
            }
        }

        // If loop finishes and investment not recovered
        return Infinity; // Indicate payback doesn't occur within the given flows
    };


    const onSubmit: SubmitHandler<PaybackFormValues> = (data) => {
        const result = calculatePayback(data);
        if (result !== null) {
             setPaybackPeriodYears(result);

             if(result !== Infinity){
                const flowsString = data.cashFlows.map((f, i) => `Year ${i+1}: ${formatCurrency(parseFloat(f.amount))}`).join(', ');
                const inputString = `Investment: ${formatCurrency(parseFloat(data.initialInvestment))}, Flows: [${flowsString}]`;
                const resultString = `Payback Period: ~${result}`;

                const historyEntry: HistoryEntry = {
                    id: Date.now().toString(),
                    calculatorSlug: slug,
                    timestamp: new Date(),
                    input: inputString,
                    result: resultString,
                };
                onCalculation(historyEntry);
             } else {
                 form.setError("root", {message: "Payback period not reached within the provided cash flows."});
             }

        } else {
            setPaybackPeriodYears(null);
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
                    <Skeleton className="h-10 w-full" /> {/* Investment Skeleton */}
                     {/* Cash Flow Skeletons */}
                     <div>
                         <Skeleton className="h-6 w-1/4 mb-2" />
                         <div className="space-y-2">
                             <div className="flex gap-2 items-center"><Skeleton className="w-16 h-6"/><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-10" /></div>
                         </div>
                         <Skeleton className="h-9 w-36 mt-2" /> {/* Add button */}
                     </div>
                    <Skeleton className="h-10 w-full" /> {/* Calculate Button */}
                    <Skeleton className="mt-6 h-20 w-full" /> {/* Result */}
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
                        <FormField control={form.control} name="initialInvestment" render={({ field }) => (<FormItem><FormLabel>Initial Investment ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 50000" {...field} step="any" min="0.01" /></FormControl><FormMessage /></FormItem>)} />
                        {/* Cash Flow Inputs */}
                        <div className="space-y-3 border-t pt-4">
                            <FormLabel>Annual Cash Inflows (Positive Values)</FormLabel>
                             {cashFlowFields.map((field, index) => (
                                <div key={field.id} className="flex gap-2 items-center">
                                    <FormLabel className="w-16 text-sm text-muted-foreground pt-2">Year {index + 1}:</FormLabel>
                                     <FormField control={form.control} name={`cashFlows.${index}.amount`} render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel className="sr-only">Cash Flow Amount</FormLabel>
                                            <FormControl><Input type="number" placeholder={`Inflow (${currency.symbol})`} {...field} step="any" min="0" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <Button type="button" variant="ghost" size="icon" onClick={() => removeCashFlow(index)} disabled={cashFlowFields.length <= 1} className="text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Remove cash flow"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendCashFlow({ amount: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Cash Flow Year</Button>
                            <FormMessage>{form.formState.errors.cashFlows?.root?.message || form.formState.errors.cashFlows?.message}</FormMessage>
                        </div>
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Payback Period</Button>
                    </form>
                </Form>

                 {paybackPeriodYears !== null && (
                    <Alert className="mt-6">
                        <CalendarClock className="h-4 w-4" />
                        <AlertTitle>Payback Period Result</AlertTitle>
                        <AlertDescription>
                            {paybackPeriodYears === Infinity ? (
                                <p className="text-destructive font-semibold">The initial investment is not recovered within the provided cash flow periods.</p>
                             ) : (
                                 <p>The estimated payback period is approximately <strong>{paybackPeriodYears}</strong>.</p>
                             )}
                              <p className="text-xs mt-1 text-muted-foreground">This is the time required for the cumulative cash inflows to equal the initial investment. It does not account for the time value of money (use NPV or IRR for that).</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
