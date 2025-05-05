
'use client';

// IMPORTANT: RMD rules and life expectancy tables change. This calculator uses
// the Uniform Lifetime Table (common for account owners). Beneficiary RMDs and other
// situations have different rules. Consult official IRS publications (like Pub 590-B)
// and a tax advisor for accurate RMD planning.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, BookOpen, HandCoins, AlertTriangle } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// --- Uniform Lifetime Table (ULT) - IRS Publication 590-B, Appendix B, Table III ---
// This table is subject to change by the IRS. Using 2024 data as example.
// Key: Age, Value: Distribution Period
const uniformLifetimeTable: { [age: number]: number } = {
    73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
    80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2,
    87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1,
    94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4,
    101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1,
    108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3, 113: 3.1, 114: 3.0,
    115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0 // And older
};
// RMD generally starts at age 73 (SECURE 2.0 Act)

// Zod Schema for RMD Calculator
const rmdSchema = z.object({
    accountBalance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Account balance must be zero or positive.",
    }), // Balance as of Dec 31st of the *previous* year
    age: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 73, { // RMD Start Age
        message: "Age must be 73 or older for standard RMD calculation.",
    }),
});

type RmdFormValues = z.infer<typeof rmdSchema>;

interface RmdCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function RmdCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: RmdCalculatorProps) {
    const [rmdAmount, setRmdAmount] = React.useState<number | null>(null);
    const [distributionPeriod, setDistributionPeriod] = React.useState<number | null>(null);
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

    const form = useForm<RmdFormValues>({
        resolver: zodResolver(rmdSchema),
        defaultValues: {
            accountBalance: '',
            age: '',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setRmdAmount(null);
            setDistributionPeriod(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate RMD
    const calculateRmd = (values: RmdFormValues): { rmd: number; period: number } | null => {
        const balance = parseFloat(values.accountBalance);
        const age = parseInt(values.age);

        if (isNaN(balance) || balance < 0 || isNaN(age) || age < 73) {
            return null;
        }

        // Find distribution period from the table
        const distributionPeriodValue = uniformLifetimeTable[age] || uniformLifetimeTable[120]; // Use last value if older

        if (!distributionPeriodValue) {
             console.error(`Distribution period not found for age ${age}. Using max age value.`);
             // Use the value for 120+ if age is somehow higher than table allows
             const maxAgePeriod = uniformLifetimeTable[120];
              if (!maxAgePeriod) return null; // Should not happen if table is complete
              const rmd = balance / maxAgePeriod;
              return { rmd: rmd, period: maxAgePeriod };
        }


        const rmd = balance / distributionPeriodValue;
        return { rmd: rmd, period: distributionPeriodValue };
    };

    const onSubmit: SubmitHandler<RmdFormValues> = (data) => {
        const result = calculateRmd(data);
        if (result) {
            setRmdAmount(result.rmd);
            setDistributionPeriod(result.period);

            const inputString = `Prev. Year-End Balance: ${formatCurrency(parseFloat(data.accountBalance))}, Age: ${data.age}`;
            const resultString = `Estimated RMD for this year: ${formatCurrency(result.rmd)} (Based on distribution period of ${result.period})`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setRmdAmount(null);
            setDistributionPeriod(null);
             form.setError("root", {message: "Calculation failed. Ensure age is 73+."});
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
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" /> {/* Button Skeleton */}
                    <Skeleton className="mt-6 h-20 w-full" /> {/* Result Skeleton */}
                    <Skeleton className="h-16 w-full" /> {/* Disclaimer Skeleton */}
                </CardContent>
            </Card>
        );
    }


    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="relative">
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description} <strong className='text-destructive'>(Simplified Estimate)</strong></CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="accountBalance" render={({ field }) => (<FormItem><FormLabel>Account Balance ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="Balance at Dec 31st of previous year" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="age" render={({ field }) => (<FormItem><FormLabel>Age This Year</FormLabel><FormControl><Input type="number" placeholder="Your age during this calendar year (73+)" {...field} step="1" min="73" /></FormControl><FormMessage /></FormItem>)} />
                          {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate RMD</Button>
                    </form>
                </Form>

                {rmdAmount !== null && distributionPeriod !== null && (
                    <Alert className="mt-6">
                        <HandCoins className="h-4 w-4" />
                        <AlertTitle>Estimated Required Minimum Distribution (RMD)</AlertTitle>
                        <AlertDescription>
                            <p>Based on the Uniform Lifetime Table for age {form.watch('age')}, the distribution period is <strong>{distributionPeriod}</strong>.</p>
                            <p>Estimated RMD for this year: <strong>{formatCurrency(rmdAmount)}</strong></p>
                            <p className="text-xs mt-2 font-semibold text-destructive">Disclaimer: This is an estimate using the Uniform Lifetime Table. RMD rules are complex (e.g., beneficiary rules, different tables) and life expectancy tables change. Consult IRS Publication 590-B and a tax advisor for accurate RMD planning.</p>
                        </AlertDescription>
                    </Alert>
                )}
                  {!rmdAmount && (
                    <Alert variant="destructive" className="mt-6">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Important Note</AlertTitle>
                         <AlertDescription>
                             Required Minimum Distribution (RMD) rules depend on factors like account type, beneficiary status, and age. This calculator uses the standard Uniform Lifetime Table for account owners aged 73+. It does not cover all scenarios. Always consult official IRS resources (Pub 590-B) and a qualified tax advisor. Failure to take the correct RMD can result in significant penalties.
                         </AlertDescription>
                    </Alert>
                  )}
            </CardContent>
        </Card>
    );
}
