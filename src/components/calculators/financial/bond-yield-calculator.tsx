
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
import { Calculator, Star, FileText, Percent } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Bond Yield (YTM) Calculator
const bondYieldSchema = z.object({
    currentPrice: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Current bond price must be a positive number.",
    }),
    faceValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Face value (par value) must be a positive number.",
    }),
    couponRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual coupon rate must be zero or positive.",
    }),
    yearsToMaturity: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Years to maturity must be a positive number.",
    }),
    couponFrequency: z.enum(['annually', 'semi-annually', 'quarterly']).default('semi-annually'),
});

type BondYieldFormValues = z.infer<typeof bondYieldSchema>;

interface BondYieldCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function BondYieldCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: BondYieldCalculatorProps) {
    const [ytmResult, setYtmResult] = React.useState<number | null>(null);
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

    const form = useForm<BondYieldFormValues>({
        resolver: zodResolver(bondYieldSchema),
        defaultValues: {
            currentPrice: '',
            faceValue: '',
            couponRate: '',
            yearsToMaturity: '',
            couponFrequency: 'semi-annually',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset({ couponFrequency: 'semi-annually' });
            setYtmResult(null);
            setCalculationStatus('idle');
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]); // Reset on currency change

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Yield to Maturity (YTM) using an iterative approach (approximation)
    const calculateYtm = (values: BondYieldFormValues): number | null => {
        const P = parseFloat(values.currentPrice);
        const F = parseFloat(values.faceValue);
        const C_annual = parseFloat(values.couponRate) / 100;
        const T = parseFloat(values.yearsToMaturity);
        const freq = values.couponFrequency;

        let periodsPerYear: number;
        switch (freq) {
            case 'annually': periodsPerYear = 1; break;
            case 'semi-annually': periodsPerYear = 2; break;
            case 'quarterly': periodsPerYear = 4; break;
            default: return null;
        }

        const C = (F * C_annual) / periodsPerYear; // Coupon payment per period
        const N = T * periodsPerYear;             // Total number of periods

        if (isNaN(P) || P <= 0 || isNaN(F) || F <= 0 || isNaN(C_annual) || C_annual < 0 || isNaN(T) || T <= 0 || isNaN(N)) {
            return null;
        }

        // YTM calculation requires solving the bond pricing formula for the yield (Y).
        // This usually requires an iterative numerical method (like Newton-Raphson or bisection).

        // Define the bond pricing function based on yield (y_period)
        const bondPriceFunc = (y_period: number): number => {
             if (y_period === 0) return (C * N) + F; // Handle zero yield
             if (y_period <= -1) return Infinity; // Avoid issues with negative base in pow

            const pvCoupons = C * (1 - Math.pow(1 + y_period, -N)) / y_period;
            const pvFaceValue = F / Math.pow(1 + y_period, N);
            return pvCoupons + pvFaceValue;
        };

        // Iterative approach (simplified bisection method)
        let lowRate = 0.0; // Lower bound for yield period rate
        let highRate = 1.0; // Upper bound (100% per period, adjust if needed)
        let guessRate = 0.05 / periodsPerYear; // Initial guess (e.g., 5% annual / periods)
        const tolerance = 0.00001; // Accuracy tolerance
        let iterations = 0;
        const maxIterations = 100;

        while (iterations < maxIterations) {
            const calculatedPrice = bondPriceFunc(guessRate);
            const diff = calculatedPrice - P;

            if (Math.abs(diff) < tolerance) {
                break; // Found a suitable rate
            }

            if (diff > 0) {
                // Price is too high, yield must be higher
                lowRate = guessRate;
            } else {
                // Price is too low, yield must be lower
                highRate = guessRate;
            }

            // Update guess (midpoint)
             guessRate = (lowRate + highRate) / 2;

             // Check for problematic bounds or slow convergence
             if (highRate <= lowRate || highRate > 1.5 || lowRate < -0.5 ) {
                 console.warn("YTM calculation bounds issue or potential non-convergence.");
                  // Provide a rough fallback estimate based on current yield
                 const currentYield = (C_annual * F) / P;
                 return currentYield * 100; // Return current yield as fallback
             }


            iterations++;
        }

        if (iterations >= maxIterations) {
            console.warn("YTM calculation did not converge within max iterations. Result might be inaccurate.");
            // Fallback: Approximate YTM = (Annual Interest + ((FV - Price) / T)) / ((FV + Price) / 2)
            const approxYtm = ((C_annual * F) + ((F - P) / T)) / ((F + P) / 2);
             return isNaN(approxYtm) ? null : approxYtm * 100; // Return approximation or null
        }

        const ytm = guessRate * periodsPerYear * 100; // Annualize and convert to percentage
        return ytm;
    };

    const onSubmit: SubmitHandler<BondYieldFormValues> = (data) => {
        setCalculationStatus('calculating');
        setYtmResult(null); // Clear previous result
        try {
             const result = calculateYtm(data);
             if (result !== null) {
                 setYtmResult(result);
                 setCalculationStatus('success');

                 const inputString = `Price: ${formatCurrency(parseFloat(data.currentPrice))}, Face Value: ${formatCurrency(parseFloat(data.faceValue))}, Coupon: ${data.couponRate}%, Maturity: ${data.yearsToMaturity} yrs, Freq: ${data.couponFrequency}`;
                 const resultString = `Estimated Yield to Maturity (YTM): ${result.toFixed(3)}%`;

                 const historyEntry: HistoryEntry = {
                     id: Date.now().toString(),
                     calculatorSlug: slug,
                     timestamp: new Date(),
                     input: inputString,
                     result: resultString,
                 };
                 onCalculation(historyEntry);
             } else {
                 setCalculationStatus('error');
                 form.setError("root", { message: "Could not calculate YTM. Please check inputs." });
                 console.error("YTM Calculation failed. Check inputs.");
             }
        } catch (error) {
             setCalculationStatus('error');
             form.setError("root", { message: "An error occurred during YTM calculation." });
             console.error("YTM Calculation error:", error);
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
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     {/* Frequency Radio Skeleton */}
                     <div className="space-y-3">
                         <Skeleton className="h-5 w-1/3" />
                         <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                             <Skeleton className="h-6 w-1/4" />
                             <Skeleton className="h-6 w-1/4" />
                             <Skeleton className="h-6 w-1/4" />
                         </div>
                     </div>
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
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="currentPrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Bond Price ({currency.symbol})</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 950" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="faceValue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Face Value (Par) ({currency.symbol})</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 1000" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="couponRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Annual Coupon Rate (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 5.0" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="yearsToMaturity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Years to Maturity</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 10" {...field} step="any" min="0.01" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                         </div>
                         <FormField
                            control={form.control}
                            name="couponFrequency"
                             render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Coupon Frequency</FormLabel>
                                     <FormControl>
                                         <div className="flex flex-wrap gap-4">
                                             {(['annually', 'semi-annually', 'quarterly'] as const).map((freq) => (
                                                 <FormItem key={freq} className="flex items-center space-x-2 space-y-0">
                                                     <FormControl>
                                                         <input
                                                             type="radio"
                                                             id={`freq-${freq}-yield`}
                                                             value={freq}
                                                             checked={field.value === freq}
                                                             onChange={field.onChange}
                                                             className="form-radio h-4 w-4 text-primary focus:ring-primary border-muted-foreground/50"
                                                         />
                                                     </FormControl>
                                                     <FormLabel htmlFor={`freq-${freq}-yield`} className="font-normal cursor-pointer capitalize">
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
                         {form.formState.errors.root && (
                            <FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>
                         )}
                          {calculationStatus === 'calculating' && (
                             <p className="text-sm text-muted-foreground italic">Calculating YTM...</p>
                          )}
                        <Button type="submit" className="w-full" disabled={calculationStatus === 'calculating'}>
                            <Calculator className="mr-2 h-4 w-4" /> Calculate Bond Yield (YTM)
                        </Button>
                    </form>
                </Form>

                {ytmResult !== null && calculationStatus === 'success' && (
                    <Alert className="mt-6">
                        <Percent className="h-4 w-4" />
                        <AlertTitle>Estimated Yield to Maturity (YTM)</AlertTitle>
                        <AlertDescription>
                            The estimated Yield to Maturity (YTM) for this bond is approximately <strong>{ytmResult.toFixed(3)}%</strong>.
                             <p className='text-xs mt-1 text-muted-foreground'>YTM represents the total return anticipated if the bond is held until it matures.</p>
                        </AlertDescription>
                    </Alert>
                )}
                 {calculationStatus === 'error' && !form.formState.errors.root && (
                     <Alert variant="destructive" className="mt-6">
                         <AlertTitle>Calculation Error</AlertTitle>
                         <AlertDescription>Could not calculate YTM. The calculation may not have converged or inputs might be invalid.</AlertDescription>
                     </Alert>
                 )}
            </CardContent>
        </Card>
    );
}
