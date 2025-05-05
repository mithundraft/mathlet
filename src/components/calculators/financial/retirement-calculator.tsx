
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
import { Calculator, Star, Umbrella, TrendingUp } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Zod Schema for Retirement Calculator (Simplified Savings Goal)
const retirementSchema = z.object({
    currentAge: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) < 100, {
        message: "Current age must be positive and less than 100.",
    }),
    retirementAge: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) <= 100, {
        message: "Retirement age must be positive and up to 100.",
    }),
    currentSavings: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Current savings must be zero or positive.",
    }),
    annualContribution: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual contribution must be zero or positive.",
    }),
    annualReturnRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Pre-retirement annual return rate must be zero or positive.",
    }),
    // Optional: Add post-retirement fields if calculating withdrawal sustainability
    // retirementDuration: z.string().optional(), // Years in retirement
    // postRetirementReturnRate: z.string().optional(),
    // desiredAnnualIncome: z.string().optional(),
}).superRefine((data, ctx) => {
    if (parseInt(data.retirementAge) <= parseInt(data.currentAge)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Retirement age must be greater than current age.",
            path: ["retirementAge"],
        });
    }
});

type RetirementFormValues = z.infer<typeof retirementSchema>;

interface RetirementCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function RetirementCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: RetirementCalculatorProps) {
    const [estimatedRetirementSavings, setEstimatedRetirementSavings] = React.useState<number | null>(null);
     const [totalContributed, setTotalContributed] = React.useState<number | null>(null);
     const [totalGrowth, setTotalGrowth] = React.useState<number | null>(null);
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

    const form = useForm<RetirementFormValues>({
        resolver: zodResolver(retirementSchema),
        defaultValues: {
            currentAge: '',
            retirementAge: '',
            currentSavings: '',
            annualContribution: '',
            annualReturnRate: '',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setEstimatedRetirementSavings(null);
             setTotalContributed(null);
             setTotalGrowth(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Retirement Savings Growth (Similar to Compound Interest/FV)
    const calculateRetirementSavings = (values: RetirementFormValues): { balance: number; contributed: number; growth: number } | null => {
        const currentAge = parseInt(values.currentAge);
        const retirementAge = parseInt(values.retirementAge);
        const P = parseFloat(values.currentSavings);
        const pmt = parseFloat(values.annualContribution);
        const r = parseFloat(values.annualReturnRate) / 100;
        const yearsToGrow = retirementAge - currentAge;

        if (isNaN(currentAge) || isNaN(retirementAge) || isNaN(P) || isNaN(pmt) || isNaN(r) || yearsToGrow <= 0) {
            return null;
        }

        let futureValue = P;
         let totalContributionsMade = 0;

         // Calculate future value year by year
         for (let i = 0; i < yearsToGrow; i++) {
             futureValue = (futureValue + pmt) * (1 + r);
             totalContributionsMade += pmt;
         }


        const totalGrowthCalc = futureValue - P - totalContributionsMade;
        const totalPrincipalAndContributions = P + totalContributionsMade;

        return {
            balance: futureValue,
            contributed: totalPrincipalAndContributions,
            growth: totalGrowthCalc
        };
    };


    const onSubmit: SubmitHandler<RetirementFormValues> = (data) => {
        const result = calculateRetirementSavings(data);
        if (result) {
            setEstimatedRetirementSavings(result.balance);
            setTotalContributed(result.contributed);
             setTotalGrowth(result.growth);

            const inputString = `Age: ${data.currentAge} to ${data.retirementAge}, Current: ${formatCurrency(parseFloat(data.currentSavings))}, Annual Contrib: ${formatCurrency(parseFloat(data.annualContribution))}, Rate: ${data.annualReturnRate}%`;
            const resultString = `Est. Savings at Retirement: ${formatCurrency(result.balance)}, Total Contributed: ${formatCurrency(result.contributed)}, Total Growth: ${formatCurrency(result.growth)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setEstimatedRetirementSavings(null);
            setTotalContributed(null);
            setTotalGrowth(null);
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
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-full" /> {/* Button Skeleton */}
                    <Skeleton className="mt-6 h-24 w-full" /> {/* Result Skeleton */}
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
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="currentAge" render={({ field }) => (<FormItem><FormLabel>Current Age</FormLabel><FormControl><Input type="number" placeholder="e.g., 35" {...field} step="1" min="1" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="retirementAge" render={({ field }) => (<FormItem><FormLabel>Retirement Age</FormLabel><FormControl><Input type="number" placeholder="e.g., 65" {...field} step="1" min="1" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="currentSavings" render={({ field }) => (<FormItem><FormLabel>Current Savings ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 50000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="annualContribution" render={({ field }) => (<FormItem><FormLabel>Annual Contribution ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 10000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="annualReturnRate" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Est. Annual Return Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 7" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         </div>
                           {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Estimate Retirement Savings</Button>
                    </form>
                </Form>

                {estimatedRetirementSavings !== null && totalContributed !== null && totalGrowth !== null && (
                    <Alert className="mt-6">
                        <TrendingUp className="h-4 w-4" />
                        <AlertTitle>Retirement Savings Projection ({currency.code})</AlertTitle>
                        <AlertDescription>
                             <p>Estimated Savings at Retirement: <strong>{formatCurrency(estimatedRetirementSavings)}</strong></p>
                             <p>Total Principal & Contributions: <strong>{formatCurrency(totalContributed)}</strong></p>
                             <p>Total Growth (Returns): <strong>{formatCurrency(totalGrowth)}</strong></p>
                             <p className="text-xs mt-2 text-muted-foreground">Note: This is a projection based on constant contributions and returns. It doesn't account for inflation, taxes, fees, or changes in contributions/returns. Further calculations are needed to determine if this amount is sufficient for your retirement income needs.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
