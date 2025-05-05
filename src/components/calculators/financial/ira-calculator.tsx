
'use client';

// Similar to 401k, focusing on Traditional IRA specifics (like tax implications - simplified)
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, ShieldCheck, LineChart } from 'lucide-react'; // Use ShieldCheck or specific IRA icon
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Traditional IRA Calculator
const iraSchema = z.object({
    currentAge: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) < 100, {
        message: "Current age must be positive and less than 100.",
    }),
    retirementAge: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) <= 100, {
        message: "Retirement age must be positive and up to 100.",
    }),
    currentBalance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Current balance must be zero or positive.",
    }),
    annualContribution: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual contribution must be zero or positive.",
    }), // Subject to annual limits
    annualReturnRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual return rate must be zero or positive.",
    }),
     // Optional: Tax Rate fields for deduction estimate (Simplified)
     marginalTaxRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "Marginal tax rate must be between 0 and 100.",
     }).optional(),
}).superRefine((data, ctx) => {
    if (parseInt(data.retirementAge) <= parseInt(data.currentAge)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Retirement age must be greater than current age.",
            path: ["retirementAge"],
        });
    }
     // Check IRA contribution limits (these change annually, use placeholder)
     const contribution = parseFloat(data.annualContribution);
     const age = parseInt(data.currentAge);
     const limit = age >= 50 ? 7500 : 6500; // Example limits for 2023 (adjust for current year)
     if (!isNaN(contribution) && contribution > limit) {
         ctx.addIssue({
             code: z.ZodIssueCode.custom,
             message: `Annual contribution exceeds the limit of ${limit} for age ${age} (example limit). Check current IRS limits.`,
             path: ["annualContribution"],
         });
     }
});


type IraFormValues = z.infer<typeof iraSchema>;

interface IraCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function IraCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: IraCalculatorProps) {
    const [retirementBalance, setRetirementBalance] = React.useState<number | null>(null);
    const [totalContributions, setTotalContributions] = React.useState<number | null>(null);
    const [totalGrowth, setTotalGrowth] = React.useState<number | null>(null);
    const [estimatedTaxSavings, setEstimatedTaxSavings] = React.useState<number | null>(null);
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

    const form = useForm<IraFormValues>({
        resolver: zodResolver(iraSchema),
        defaultValues: {
            currentAge: '',
            retirementAge: '',
            currentBalance: '',
            annualContribution: '',
            annualReturnRate: '',
            marginalTaxRate: '',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset();
            setRetirementBalance(null);
            setTotalContributions(null);
            setTotalGrowth(null);
            setEstimatedTaxSavings(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate IRA Growth (similar to 401k but no employer match)
    const calculateIra = (values: IraFormValues): { balance: number; contributions: number; growth: number; taxSavings: number | null } | null => {
        const currentAge = parseInt(values.currentAge);
        const retirementAge = parseInt(values.retirementAge);
        let currentBalance = parseFloat(values.currentBalance);
        const annualContribution = parseFloat(values.annualContribution);
        const annualReturnRate = parseFloat(values.annualReturnRate) / 100;
        const yearsToRetirement = retirementAge - currentAge;
        const taxRate = values.marginalTaxRate ? parseFloat(values.marginalTaxRate) / 100 : null;


        if (isNaN(currentAge) || isNaN(retirementAge) || isNaN(currentBalance) || isNaN(annualContribution) || isNaN(annualReturnRate) || yearsToRetirement <= 0) {
            return null;
        }

        let futureValue = currentBalance;
        let totalContributionsMade = 0;

        for (let i = 0; i < yearsToRetirement; i++) {
            futureValue = (futureValue + annualContribution) * (1 + annualReturnRate);
            totalContributionsMade += annualContribution;
        }

        const totalGrowthCalc = futureValue - currentBalance - totalContributionsMade;
        const totalPrincipalAndContributions = currentBalance + totalContributionsMade;

        // Estimate tax savings (highly simplified)
        // Assumes entire contribution is deductible
        let taxSavingsCalc = null;
        if (taxRate !== null && annualContribution > 0) {
            // Simple estimate: Annual savings = Contribution * Tax Rate
            // Total estimated savings over the period
            taxSavingsCalc = totalContributionsMade * taxRate;
        }


        return {
             balance: futureValue,
             contributions: totalPrincipalAndContributions,
             growth: totalGrowthCalc,
             taxSavings: taxSavingsCalc,
         };
    };

    const onSubmit: SubmitHandler<IraFormValues> = (data) => {
        const result = calculateIra(data);
        if (result) {
            setRetirementBalance(result.balance);
            setTotalContributions(result.contributions);
            setTotalGrowth(result.growth);
             setEstimatedTaxSavings(result.taxSavings);

            const inputString = `Age: ${data.currentAge} to ${data.retirementAge}, Bal: ${formatCurrency(parseFloat(data.currentBalance))}, Contrib: ${formatCurrency(parseFloat(data.annualContribution))}/yr, Rate: ${data.annualReturnRate}%, Tax Rate: ${data.marginalTaxRate || 'N/A'}%`;
            let resultString = `Est. Balance at Retirement: ${formatCurrency(result.balance)}, Total Contributions: ${formatCurrency(result.contributions)}, Total Growth: ${formatCurrency(result.growth)}`;
            if (result.taxSavings !== null) {
                resultString += `, Est. Tax Savings: ${formatCurrency(result.taxSavings)}`;
            }

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
            setEstimatedTaxSavings(null);
             form.setError("root", {message: "Calculation failed. Check inputs."});
            console.error("Calculation failed. Check inputs.");
        }
    };

    // Skeleton Loader (similar to 401k)
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
                         <Skeleton className="h-10 w-full" /> {/* Tax Rate */}
                     </div>
                     <Skeleton className="h-10 w-full" /> {/* Button */}
                     <Skeleton className="mt-6 h-24 w-full" /> {/* Result */}
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
                             <FormField control={form.control} name="currentAge" render={({ field }) => (<FormItem><FormLabel>Current Age</FormLabel><FormControl><Input type="number" placeholder="e.g., 30" {...field} step="1" min="1" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="retirementAge" render={({ field }) => (<FormItem><FormLabel>Retirement Age</FormLabel><FormControl><Input type="number" placeholder="e.g., 67" {...field} step="1" min="1" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="currentBalance" render={({ field }) => (<FormItem><FormLabel>Current IRA Balance ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 25000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="annualContribution" render={({ field }) => (<FormItem><FormLabel>Annual Contribution ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 6500" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="annualReturnRate" render={({ field }) => (<FormItem><FormLabel>Est. Annual Return Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 7" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="marginalTaxRate" render={({ field }) => (<FormItem><FormLabel>Marginal Tax Rate (%) <small>(Optional)</small></FormLabel><FormControl><Input type="number" placeholder="For tax saving estimate" {...field} step="any" min="0" max="100"/></FormControl><FormMessage /></FormItem>)} />
                         </div>
                           {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate IRA Growth</Button>
                    </form>
                </Form>

                {retirementBalance !== null && totalContributions !== null && totalGrowth !== null && (
                    <Alert className="mt-6">
                        <LineChart className="h-4 w-4" />
                        <AlertTitle>Estimated IRA Growth ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Est. Balance at Retirement: <strong>{formatCurrency(retirementBalance)}</strong></p>
                            <p>Total Contributions (incl. initial): <strong>{formatCurrency(totalContributions)}</strong></p>
                            <p>Total Investment Growth: <strong>{formatCurrency(totalGrowth)}</strong></p>
                             {estimatedTaxSavings !== null && (
                                <p>Est. Total Tax Savings on Contributions: <strong>{formatCurrency(estimatedTaxSavings)}</strong></p>
                             )}
                              <p className="text-xs mt-2 text-muted-foreground">Note: Estimates are pre-tax for Traditional IRA. Withdrawals in retirement are typically taxed. Tax savings estimate assumes full deductibility; consult tax rules.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
