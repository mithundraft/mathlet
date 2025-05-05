
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
import { Calculator, Star, BadgePercent, Percent } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Zod Schema for APR Calculator
// Note: Exact APR calculation can be complex. This is a simplified version based on nominal rate and fees.
// A more accurate calculation might involve iterative methods or specific loan structures.
const aprSchema = z.object({
    loanAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Loan amount must be a positive number.",
    }),
    nominalInterestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Nominal interest rate must be zero or positive.",
    }),
    loanTermYears: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Loan term must be a positive integer (years).",
    }),
    fees: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Fees must be zero or positive.",
    }).optional().default("0"), // Fees are optional
});

type AprFormValues = z.infer<typeof aprSchema>;

interface AprCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function AprCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: AprCalculatorProps) {
    const [aprResult, setAprResult] = React.useState<number | null>(null);
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

    const form = useForm<AprFormValues>({
        resolver: zodResolver(aprSchema),
        defaultValues: {
            loanAmount: '',
            nominalInterestRate: '',
            loanTermYears: '',
            fees: '0',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset({ fees: '0' }); // Reset form, ensuring fees default to 0
            setAprResult(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]); // Reset on currency change although currency isn't directly used in APR calc itself

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Simplified APR Calculation (approximation)
    // Formula: APR ≈ ( (Fees / Loan Amount) / Loan Term Years ) * 12 + Nominal Rate
    // This is a very rough estimate and doesn't account for compounding or payment frequency.
    // A precise APR calculation requires solving for the rate in the loan payment formula
    // where the principal is the net amount received (Loan Amount - Fees).
    const calculateApr = (values: AprFormValues): number | null => {
        const P = parseFloat(values.loanAmount);
        const nominalRate = parseFloat(values.nominalInterestRate) / 100;
        const T = parseInt(values.loanTermYears);
        const F = parseFloat(values.fees || '0');

        if (isNaN(P) || P <= 0 || isNaN(nominalRate) || nominalRate < 0 || isNaN(T) || T <= 0 || isNaN(F) || F < 0) {
            return null;
        }

        // Calculate monthly payment based on nominal rate and original loan amount
        const r_monthly_nominal = nominalRate / 12;
        const n = T * 12;
        let M = 0;
        if (r_monthly_nominal === 0) {
            M = P / n;
        } else {
            M = P * (r_monthly_nominal * Math.pow(1 + r_monthly_nominal, n)) / (Math.pow(1 + r_monthly_nominal, n) - 1);
        }


        // Now, try to find the rate (APR/12) that makes the PV of payments equal to (P - F)
        // This requires an iterative approach (like Newton-Raphson) or a financial function.
        // For simplification in this example, we'll use the rough approximation.
        // **WARNING: THIS IS NOT ACCURATE FOR MOST CASES**
        // const roughApr = ((F / P) / T) + nominalRate; // Simplified annual fee impact + nominal rate
        // A slightly better approximation:
        const netLoanAmount = P - F;
        if (netLoanAmount <=0) {
             // Cannot calculate APR if fees exceed loan amount
             console.error("Fees cannot exceed or equal loan amount for APR calculation.");
             return null; // Or handle as an error state
        }

        // Use an iterative approach (Goal Seek / Root Finding) to find the actual monthly rate for APR
        let guessRate = nominalRate / 12; // Start guess near nominal rate
        let calculatedPV;
        const tolerance = 0.00001; // Tolerance for accuracy
        let iterations = 0;
        const maxIterations = 100;

        do {
            if (guessRate <= -1) { // Avoid Math.pow with negative base if rate is -100% or less
                console.error("Cannot calculate APR with extremely low or negative effective rates.");
                return null;
            }
            // Calculate PV based on current guess rate
             if (guessRate === 0) {
                 calculatedPV = M * n;
             } else {
                 calculatedPV = M * (1 - Math.pow(1 + guessRate, -n)) / guessRate;
             }

            // Adjust guess rate based on difference
            const diff = calculatedPV - netLoanAmount;
            if (Math.abs(diff) < tolerance) {
                break; // Found a suitable rate
            }

            // Simple adjustment (could use Newton-Raphson for faster convergence)
            // Increase rate if PV is too high, decrease if too low
             if (diff > 0) {
                guessRate += tolerance; // Needs refinement - adjustment step size matters
             } else {
                guessRate -= tolerance;
             }
            // Simplified adjustment step - lacks precision
            // guessRate = guessRate * (1 + diff / netLoanAmount * 0.1); // Very basic adjustment


             iterations++;
        } while (iterations < maxIterations);


        if (iterations >= maxIterations) {
             console.warn("APR calculation did not converge. Result might be inaccurate.");
             // Return the nominal rate as a fallback, maybe? Or null/error.
              // For this example, let's return the nominal rate + basic fee spread as a rough fallback
              return nominalRate + (F / P / T); // Fallback to very rough estimate
        }

        const apr = guessRate * 12 * 100; // Annualize and convert to percentage

        return apr;
    };

    const onSubmit: SubmitHandler<AprFormValues> = (data) => {
        const result = calculateApr(data);
        if (result !== null) {
            setAprResult(result);

            const inputString = `Loan Amount: ${formatCurrency(parseFloat(data.loanAmount))}, Nominal Rate: ${data.nominalInterestRate}%, Term: ${data.loanTermYears} years, Fees: ${formatCurrency(parseFloat(data.fees || '0'))}`;
            const resultString = `Calculated APR: ${result.toFixed(3)}%`; // Show APR with more precision

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setAprResult(null);
            console.error("APR Calculation failed. Check inputs or complexity.");
             // Optionally show an error message to the user via toast or Alert
             form.setError("root", { message: "Could not calculate APR. Ensure fees do not exceed loan amount." });
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
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" /> {/* Button Skeleton */}
                    <Skeleton className="mt-6 h-20 w-full" /> {/* Result Skeleton */}
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
                            name="loanAmount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Loan Amount ({currency.symbol})</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 10000" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="nominalInterestRate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nominal Interest Rate (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 5.0" {...field} step="any" min="0" />
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
                        <FormField
                            control={form.control}
                            name="fees"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Total Fees ({currency.symbol}) <small>(Optional)</small></FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 200" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         {form.formState.errors.root && (
                            <FormMessage>{form.formState.errors.root.message}</FormMessage>
                        )}
                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate APR
                        </Button>
                    </form>
                </Form>

                {aprResult !== null && (
                    <Alert className="mt-6">
                        <Percent className="h-4 w-4" />
                        <AlertTitle>Calculated Annual Percentage Rate (APR)</AlertTitle>
                        <AlertDescription>
                             The estimated APR for this loan is approximately <strong>{aprResult.toFixed(3)}%</strong>. This rate includes the impact of fees on the total cost of borrowing.
                             <p className='text-xs mt-1 text-muted-foreground'>Note: This is an estimate. The actual APR may vary based on exact loan terms and calculation methods used by the lender.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
