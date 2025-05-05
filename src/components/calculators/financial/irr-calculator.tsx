
'use client';

// IRR calculation typically requires an iterative numerical method.
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Target, Percent, PlusCircle, Trash2 } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Sub-schema for cash flows
const cashFlowSchema = z.object({
    amount: z.string().refine(val => !isNaN(parseFloat(val)), { // Allow negative for initial investment
        message: "Cash flow amount must be a number.",
    }),
});

// Zod Schema for IRR Calculator
const irrSchema = z.object({
    cashFlows: z.array(cashFlowSchema).min(2, "At least two cash flows required (initial investment and one return).")
        .refine(flows => parseFloat(flows[0]?.amount || '0') < 0, { // First flow must be negative (investment)
            message: "Initial cash flow (Year 0) must be negative (investment).",
            path: ["cashFlows", 0, "amount"],
        })
         .refine(flows => flows.slice(1).some(flow => parseFloat(flow.amount || '0') > 0), { // At least one positive flow needed
              message: "At least one positive cash flow (return) is required.",
               path: ["cashFlows"], // Apply error to the array level
          }),
});


type IrrFormValues = z.infer<typeof irrSchema>;

interface IrrCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function IrrCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: IrrCalculatorProps) {
    const [irrResult, setIrrResult] = React.useState<number | null | 'Error'>(null);
    const [calculationStatus, setCalculationStatus] = React.useState<'idle' | 'calculating' | 'error' | 'success'>('idle');
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

    const form = useForm<IrrFormValues>({
        resolver: zodResolver(irrSchema),
        defaultValues: {
            cashFlows: [{ amount: '' }, { amount: '' }], // Start with initial investment and one return period
        },
    });

    const { fields: cashFlowFields, append: appendCashFlow, remove: removeCashFlow } = useFieldArray({
        control: form.control,
        name: "cashFlows",
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset({ cashFlows: [{ amount: '' }, { amount: '' }] });
            setIrrResult(null);
            setCalculationStatus('idle');
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // NPV calculation function (needed for IRR)
    const calculateNpv = (rate: number, flows: number[]): number => {
        let npv = 0;
        for (let i = 0; i < flows.length; i++) {
             if (isNaN(flows[i])) continue; // Skip invalid flows
            npv += flows[i] / Math.pow(1 + rate, i);
        }
        return npv;
    };

    // IRR Calculation using numerical method (e.g., Newton-Raphson or Bisection)
    const calculateIrr = (flows: number[]): number | null => {
        // Initial guess for IRR (can be tricky)
        let guess = 0.1; // 10%
        const tolerance = 0.00001; // Accuracy tolerance
        const maxIterations = 100;
        let iterations = 0;

        // Ensure flows are valid numbers
         const validFlows = flows.map(f => {
            const num = parseFloat(String(f)); // Convert potentially string inputs
             return isNaN(num) ? 0 : num; // Default invalid flows to 0 or handle differently
         });

         if (validFlows.length < 2 || validFlows[0] >= 0 || !validFlows.slice(1).some(f => f > 0)) {
             console.error("Invalid cash flow pattern for IRR calculation.");
             return null; // Invalid input for IRR
         }


        // Simple Bisection Method (safer but slower than Newton-Raphson)
        let lowRate = -0.99; // Lower bound (avoid -100%)
        let highRate = 1.0; // Upper bound (100% - adjust if needed)

        for(let i = 0; i < maxIterations; i++) {
            const midRate = (lowRate + highRate) / 2;
            const npvAtMid = calculateNpv(midRate, validFlows);

            if (Math.abs(npvAtMid) < tolerance) {
                return midRate * 100; // Found IRR (as percentage)
            }

            const npvAtLow = calculateNpv(lowRate, validFlows);

             // Adjust bounds based on the sign of NPV
             if (npvAtLow * npvAtMid < 0) { // Signs differ, IRR is between low and mid
                highRate = midRate;
             } else { // Signs are the same (or one is zero), IRR is between mid and high
                lowRate = midRate;
             }

              // Check if bounds are too close or invalid
             if (highRate - lowRate < tolerance) {
                 break; // Close enough
             }
        }


        console.warn("IRR calculation did not converge or solution not found within bounds.");
        return null; // Failed to converge
    };


    const onSubmit: SubmitHandler<IrrFormValues> = (data) => {
        setCalculationStatus('calculating');
        setIrrResult(null);
         const flows = data.cashFlows.map(cf => parseFloat(cf.amount));
         if (flows.some(isNaN)) {
             setCalculationStatus('error');
             form.setError("root", {message: "Invalid number in cash flows."})
             return;
         }

        const result = calculateIrr(flows);

        if (result !== null) {
            setIrrResult(result);
             setCalculationStatus('success');

            const flowsString = flows.map((f, i) => `Year ${i}: ${formatCurrency(f)}`).join(', ');
            const inputString = `Cash Flows: [${flowsString}]`;
            const resultString = `Internal Rate of Return (IRR): ${result.toFixed(4)}%`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setIrrResult('Error'); // Indicate calculation error
            setCalculationStatus('error');
            form.setError("root", {message: "Could not calculate IRR. Check cash flow pattern (initial negative, subsequent positive) or try different values."})
            console.error("IRR Calculation failed or did not converge.");
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
                    {/* Cash Flow Skeletons */}
                    <div>
                         <Skeleton className="h-6 w-1/4 mb-2" />
                         <div className="space-y-2">
                             <div className="flex gap-2 items-center"><Skeleton className="w-16 h-6"/><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-10" /></div>
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
                         {/* Cash Flow Inputs */}
                        <div className="space-y-3">
                            <FormLabel>Cash Flows (Year 0 should be negative investment)</FormLabel>
                             {cashFlowFields.map((field, index) => (
                                <div key={field.id} className="flex gap-2 items-center">
                                    <FormLabel className="w-16 text-sm text-muted-foreground pt-2">Year {index}:</FormLabel>
                                     <FormField
                                        control={form.control}
                                        name={`cashFlows.${index}.amount`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel className="sr-only">Cash Flow Amount</FormLabel>
                                                <FormControl>
                                                     <Input type="number" placeholder={`Amount (${currency.symbol}) ${index === 0 ? '(e.g., -10000)' : ''}`} {...field} step="any" />
                                                 </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <Button
                                        type="button" variant="ghost" size="icon"
                                        onClick={() => removeCashFlow(index)}
                                        disabled={cashFlowFields.length <= 2} // Need at least 2 flows
                                        className="text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Remove cash flow"
                                     ><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendCashFlow({ amount: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Cash Flow Year
                            </Button>
                             <FormMessage>{form.formState.errors.cashFlows?.root?.message || form.formState.errors.cashFlows?.message}</FormMessage>
                        </div>
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                         {calculationStatus === 'calculating' && (<p className="text-sm text-muted-foreground italic">Calculating IRR...</p>)}
                        <Button type="submit" className="w-full" disabled={calculationStatus === 'calculating'}>
                            <Calculator className="mr-2 h-4 w-4" /> Calculate IRR
                        </Button>
                    </form>
                </Form>

                {irrResult !== null && calculationStatus === 'success' && (
                    <Alert className="mt-6">
                        <Percent className="h-4 w-4" />
                        <AlertTitle>Internal Rate of Return (IRR)</AlertTitle>
                        <AlertDescription>
                            The estimated Internal Rate of Return (IRR) for this series of cash flows is approximately <strong>{irrResult.toFixed(4)}%</strong>.
                            <p className="text-xs mt-1 text-muted-foreground">IRR is the discount rate at which the Net Present Value (NPV) of all cash flows equals zero.</p>
                        </AlertDescription>
                    </Alert>
                 )}
                  {irrResult === 'Error' && calculationStatus === 'error' && (
                     <Alert variant="destructive" className="mt-6">
                         <AlertTitle>Calculation Error</AlertTitle>
                         <AlertDescription>{form.formState.errors.root?.message || "Could not calculate IRR. Please check the cash flow pattern (ensure initial is negative and at least one subsequent is positive) and values."}</AlertDescription>
                     </Alert>
                 )}
            </CardContent>
        </Card>
    );
}
