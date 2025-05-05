
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
import { Calculator, Star, LineChart as LineChartIcon } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Zod Schema for 401k Calculator
const k401Schema = z.object({
    currentAge: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) < 100, {
        message: "Current age must be a positive number less than 100.",
    }),
    retirementAge: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) <= 100, {
        message: "Retirement age must be a positive number up to 100.",
    }),
    currentBalance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Current balance must be zero or positive.",
    }),
    annualContribution: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual contribution must be zero or positive.",
    }),
    employerMatchPercent: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "Employer match must be between 0 and 100.",
    }).optional(),
    matchUpToPercent: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "Match up to percent must be between 0 and 100.",
    }).optional(),
    annualReturnRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual return rate must be zero or positive.",
    }),
    annualSalary: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual salary must be zero or positive.",
    }).optional(), // Optional for employer match calculation
}).superRefine((data, ctx) => {
    if (parseInt(data.retirementAge) <= parseInt(data.currentAge)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Retirement age must be greater than current age.",
            path: ["retirementAge"],
        });
    }
    if ((data.employerMatchPercent && !data.matchUpToPercent) || (!data.employerMatchPercent && data.matchUpToPercent)) {
         // For simplicity, require both or neither for match calc
         if (data.employerMatchPercent || data.matchUpToPercent) {
             if (!data.annualSalary) {
                 ctx.addIssue({
                     code: z.ZodIssueCode.custom,
                     message: "Annual salary is required for employer match calculation.",
                     path: ["annualSalary"],
                 });
             }
             if (!data.employerMatchPercent) {
                  ctx.addIssue({
                     code: z.ZodIssueCode.custom,
                     message: "Employer match % is required if Match Up To % is provided.",
                     path: ["employerMatchPercent"],
                 });
             }
              if (!data.matchUpToPercent) {
                  ctx.addIssue({
                     code: z.ZodIssueCode.custom,
                     message: "Match up to % is required if Employer Match % is provided.",
                     path: ["matchUpToPercent"],
                 });
             }
         }
    }
});


type K401FormValues = z.infer<typeof k401Schema>;

interface K401CalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function K401Calculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: K401CalculatorProps) {
    const [retirementBalance, setRetirementBalance] = React.useState<number | null>(null);
    const [totalContributions, setTotalContributions] = React.useState<number | null>(null);
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

    const form = useForm<K401FormValues>({
        resolver: zodResolver(k401Schema),
        defaultValues: {
            currentAge: '',
            retirementAge: '',
            currentBalance: '',
            annualContribution: '',
            employerMatchPercent: '',
            matchUpToPercent: '',
            annualReturnRate: '',
            annualSalary: '',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setRetirementBalance(null);
            setTotalContributions(null);
            setTotalGrowth(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculate401k = (values: K401FormValues): { balance: number; contributions: number; growth: number } | null => {
        const currentAge = parseInt(values.currentAge);
        const retirementAge = parseInt(values.retirementAge);
        let currentBalance = parseFloat(values.currentBalance);
        const annualContribution = parseFloat(values.annualContribution);
        const annualReturnRate = parseFloat(values.annualReturnRate) / 100;
        const yearsToRetirement = retirementAge - currentAge;

        let employerMatchAmount = 0;
        if (values.employerMatchPercent && values.matchUpToPercent && values.annualSalary) {
            const employerMatchPercent = parseFloat(values.employerMatchPercent) / 100;
            const matchUpToPercent = parseFloat(values.matchUpToPercent) / 100;
            const annualSalary = parseFloat(values.annualSalary);
            const maxMatchContribution = annualSalary * matchUpToPercent;
            const actualContributionForMatch = Math.min(annualContribution, maxMatchContribution);
            employerMatchAmount = actualContributionForMatch * employerMatchPercent;
        }

        const totalAnnualContribution = annualContribution + employerMatchAmount;
        let totalContributionsMade = 0;
        let futureValue = currentBalance;

        for (let i = 0; i < yearsToRetirement; i++) {
            futureValue = (futureValue + totalAnnualContribution) * (1 + annualReturnRate);
            totalContributionsMade += totalAnnualContribution;
        }

         const totalGrowthCalc = futureValue - currentBalance - totalContributionsMade;
         // Include initial balance in total contributions baseline for growth calculation
         const totalContributionsIncludingInitial = currentBalance + totalContributionsMade;


        return {
             balance: futureValue,
             contributions: totalContributionsIncludingInitial, // Return total contributions + initial balance
             growth: totalGrowthCalc
         };
    };

    const onSubmit: SubmitHandler<K401FormValues> = (data) => {
        const result = calculate401k(data);
        if (result) {
            setRetirementBalance(result.balance);
            setTotalContributions(result.contributions);
            setTotalGrowth(result.growth);

            const inputString = `Current Age: ${data.currentAge}, Retirement Age: ${data.retirementAge}, Current Balance: ${formatCurrency(parseFloat(data.currentBalance))}, Annual Contribution: ${formatCurrency(parseFloat(data.annualContribution))}, Employer Match: ${data.employerMatchPercent || '0'}% up to ${data.matchUpToPercent || '0'}% (Salary: ${data.annualSalary ? formatCurrency(parseFloat(data.annualSalary)) : 'N/A'}), Rate: ${data.annualReturnRate}%`;
            const resultString = `Est. Balance at Retirement: ${formatCurrency(result.balance)}, Total Contributions: ${formatCurrency(result.contributions)}, Total Growth: ${formatCurrency(result.growth)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setRetirementBalance(null);
             setTotalContributions(null);
             setTotalGrowth(null);
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
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="currentAge"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Age</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 30" {...field} step="1" min="1" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="retirementAge"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Retirement Age</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 65" {...field} step="1" min="1" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="currentBalance"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current 401(k) Balance ({currency.symbol})</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 50000" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="annualContribution"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Your Annual Contribution ({currency.symbol})</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 6000" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="annualSalary"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Annual Salary ({currency.symbol}) <small>(Optional, for match)</small></FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 75000" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="employerMatchPercent"
                                render={({ field }) => (
                                    <FormItem>
                                         <FormLabel>Employer Match (%) <small>(Optional)</small></FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 50" {...field} step="any" min="0" max="100" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="matchUpToPercent"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Match Up To (%) <small>(Of Salary, Optional)</small></FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 6" {...field} step="any" min="0" max="100" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="annualReturnRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Est. Annual Return Rate (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 7" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                         </div>
                         <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate 401(k) Growth
                        </Button>
                    </form>
                </Form>

                {retirementBalance !== null && totalContributions !== null && totalGrowth !== null && (
                    <Alert className="mt-6">
                        <LineChartIcon className="h-4 w-4" />
                        <AlertTitle>Estimated 401(k) Growth ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Estimated Balance at Retirement: <strong>{formatCurrency(retirementBalance)}</strong></p>
                            <p>Total Contributions (incl. initial & match): <strong>{formatCurrency(totalContributions)}</strong></p>
                            <p>Total Investment Growth: <strong>{formatCurrency(totalGrowth)}</strong></p>
                            <p className="text-xs mt-2 text-muted-foreground">Note: Estimates are based on provided inputs and do not guarantee future results. Assumes constant contribution and return rate.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
