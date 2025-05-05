
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, PercentSquare, TrendingUp, HandCoins } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Interest Calculator
const interestSchema = z.object({
    principal: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Principal amount must be zero or positive.",
    }),
    annualRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual interest rate must be zero or positive.",
    }),
    timePeriod: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Time period must be positive.",
    }),
     timeUnit: z.enum(['years', 'months', 'days']).default('years'),
    interestType: z.enum(['simple', 'compound']).default('simple'),
    // Required only for compound interest
    compoundingFrequency: z.enum(['annually', 'semi-annually', 'quarterly', 'monthly', 'daily']).default('annually'),
});

type InterestFormValues = z.infer<typeof interestSchema>;

interface InterestCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function InterestCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: InterestCalculatorProps) {
    const [totalInterest, setTotalInterest] = React.useState<number | null>(null);
    const [finalAmount, setFinalAmount] = React.useState<number | null>(null);
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

    const form = useForm<InterestFormValues>({
        resolver: zodResolver(interestSchema),
        defaultValues: {
            principal: '',
            annualRate: '',
            timePeriod: '',
            timeUnit: 'years',
            interestType: 'simple',
            compoundingFrequency: 'annually',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset({ timeUnit: 'years', interestType: 'simple', compoundingFrequency: 'annually' });
            setTotalInterest(null);
            setFinalAmount(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    // Reset results when interest type changes
     React.useEffect(() => {
        setTotalInterest(null);
        setFinalAmount(null);
     }, [form.watch('interestType')]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateInterest = (values: InterestFormValues): { interest: number; final: number } | null => {
        const P = parseFloat(values.principal);
        const r_annual = parseFloat(values.annualRate) / 100;
        const time = parseFloat(values.timePeriod);
        const timeUnit = values.timeUnit;
        const type = values.interestType;
        const compFreq = values.compoundingFrequency;

        if (isNaN(P) || P < 0 || isNaN(r_annual) || r_annual < 0 || isNaN(time) || time <= 0) {
            return null;
        }

        // Convert time period to years
        let t_years: number;
        switch (timeUnit) {
            case 'years': t_years = time; break;
            case 'months': t_years = time / 12; break;
            case 'days': t_years = time / 365; break; // Use 365 for simplicity
            default: return null;
        }

        let interestCalc = 0;
        let finalAmountCalc = P;

        if (type === 'simple') {
            // Simple Interest = P * r * t
            interestCalc = P * r_annual * t_years;
            finalAmountCalc = P + interestCalc;
        } else { // Compound Interest
            let n: number; // Compounding periods per year
            switch (compFreq) {
                case 'annually': n = 1; break;
                case 'semi-annually': n = 2; break;
                case 'quarterly': n = 4; break;
                case 'monthly': n = 12; break;
                case 'daily': n = 365; break;
                default: return null;
            }

            // Compound Amount = P * (1 + r/n)^(nt)
            finalAmountCalc = P * Math.pow(1 + r_annual / n, n * t_years);
            interestCalc = finalAmountCalc - P;
        }

        return { interest: interestCalc, final: finalAmountCalc };
    };

    const onSubmit: SubmitHandler<InterestFormValues> = (data) => {
        const result = calculateInterest(data);
        if (result) {
            setTotalInterest(result.interest);
            setFinalAmount(result.final);

            const timeText = `${data.timePeriod} ${data.timeUnit}`;
            const compoundText = data.interestType === 'compound' ? ` compounded ${data.compoundingFrequency}` : '';
            const inputString = `Principal: ${formatCurrency(parseFloat(data.principal))}, Rate: ${data.annualRate}%, Time: ${timeText}, Type: ${data.interestType}${compoundText}`;
            const resultString = `Total Interest: ${formatCurrency(result.interest)}, Final Amount: ${formatCurrency(result.final)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setTotalInterest(null);
            setFinalAmount(null);
             form.setError("root", {message: "Calculation failed. Check inputs."})
            console.error("Calculation failed. Check inputs.");
        }
    };

    const interestType = form.watch('interestType');

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
                     <div className="flex gap-4"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-1/3" /></div>
                     <Skeleton className="h-10 w-full" /> {/* Type Select */}
                      {/* Compound Freq Skeleton (conditionally shown) */}
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
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="principal" render={({ field }) => (<FormItem><FormLabel>Principal Amount ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 1000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="annualRate" render={({ field }) => (<FormItem><FormLabel>Annual Interest Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 5" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         <div className="flex flex-col sm:flex-row gap-4">
                            <FormField control={form.control} name="timePeriod" render={({ field }) => (<FormItem className="flex-1"><FormLabel>Time Period</FormLabel><FormControl><Input type="number" placeholder="e.g., 5" {...field} step="any" min="0.01" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="timeUnit" render={({ field }) => (<FormItem className="w-full sm:w-auto"><FormLabel>Time Unit</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl><SelectContent><SelectItem value="years">Years</SelectItem><SelectItem value="months">Months</SelectItem><SelectItem value="days">Days</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                         </div>
                          <FormField control={form.control} name="interestType" render={({ field }) => (<FormItem><FormLabel>Interest Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="simple">Simple</SelectItem><SelectItem value="compound">Compound</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />

                        {interestType === 'compound' && (
                             <FormField
                                control={form.control}
                                name="compoundingFrequency"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Compounding Frequency</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="annually">Annually</SelectItem>
                                        <SelectItem value="semi-annually">Semi-Annually</SelectItem>
                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                         <SelectItem value="daily">Daily</SelectItem>
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        )}
                        {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Interest</Button>
                    </form>
                </Form>

                 {totalInterest !== null && finalAmount !== null && (
                    <Alert className="mt-6">
                         <HandCoins className="h-4 w-4" />
                        <AlertTitle>{form.watch('interestType') === 'simple' ? 'Simple' : 'Compound'} Interest Results ({currency.code})</AlertTitle>
                         <AlertDescription>
                            <p>Total Interest Earned: <strong>{formatCurrency(totalInterest)}</strong></p>
                            <p>Final Amount (Principal + Interest): <strong>{formatCurrency(finalAmount)}</strong></p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
