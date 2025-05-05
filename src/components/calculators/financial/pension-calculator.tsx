
'use client';

// IMPORTANT: Pension calculations are extremely diverse and depend heavily on specific
// plan rules (defined benefit vs. defined contribution), country regulations, vesting schedules,
// retirement age, payout options, etc. This is a highly simplified example, possibly
// estimating a basic defined benefit calculation or projecting a defined contribution balance.
// THIS IS FOR ILLUSTRATIVE PURPOSES ONLY AND NOT FINANCIAL ADVICE.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Building, HandCoins, AlertTriangle } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema - Example for a simple Defined Benefit calculation
const pensionSchema = z.object({
    finalAverageSalary: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Final average salary must be positive.",
    }),
    yearsOfService: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Years of service must be positive.",
    }),
    pensionFactor: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) < 5, { // Factor usually 1-2.5%
        message: "Pension factor (%) must be positive (usually 1-3%).",
    }),
    // Add fields for DC plans: current balance, contributions, rate, retirement age...
});

type PensionFormValues = z.infer<typeof pensionSchema>;

interface PensionCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function PensionCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: PensionCalculatorProps) {
    const [estimatedAnnualPension, setEstimatedAnnualPension] = React.useState<number | null>(null);
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

    const form = useForm<PensionFormValues>({
        resolver: zodResolver(pensionSchema),
        defaultValues: {
            finalAverageSalary: '',
            yearsOfService: '',
            pensionFactor: '', // Example: 1.5%
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setEstimatedAnnualPension(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Simplified Defined Benefit Pension
    const calculatePension = (values: PensionFormValues): number | null => {
        const salary = parseFloat(values.finalAverageSalary);
        const years = parseInt(values.yearsOfService);
        const factor = parseFloat(values.pensionFactor) / 100; // Convert percentage to decimal

        if (isNaN(salary) || salary <= 0 || isNaN(years) || years <= 0 || isNaN(factor) || factor <= 0) {
            return null;
        }

        // Formula: Annual Pension = Final Average Salary * Years of Service * Pension Factor
        const annualPension = salary * years * factor;
        return annualPension;
    };

    const onSubmit: SubmitHandler<PensionFormValues> = (data) => {
        const result = calculatePension(data);
        if (result !== null) {
            setEstimatedAnnualPension(result);

            const inputString = `Avg Salary: ${formatCurrency(parseFloat(data.finalAverageSalary))}, Years Served: ${data.yearsOfService}, Factor: ${data.pensionFactor}%`;
            const resultString = `Estimated Annual Pension: ${formatCurrency(result)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setEstimatedAnnualPension(null);
            form.setError("root", {message: "Calculation failed. Check inputs."})
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
                <CardDescription>{description} <strong className='text-destructive'>(Simplified Defined Benefit Example)</strong></CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="finalAverageSalary" render={({ field }) => (<FormItem><FormLabel>Final Average Salary ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="Avg. salary over last few years" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="yearsOfService" render={({ field }) => (<FormItem><FormLabel>Years of Service</FormLabel><FormControl><Input type="number" placeholder="e.g., 30" {...field} step="1" min="1" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="pensionFactor" render={({ field }) => (<FormItem><FormLabel>Pension Factor / Multiplier (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 1.5" {...field} step="any" min="0" /></FormControl><FormDescription className="text-xs">Percentage per year of service defined by the plan.</FormDescription><FormMessage /></FormItem>)} />
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Estimate Annual Pension</Button>
                    </form>
                </Form>

                {estimatedAnnualPension !== null && (
                    <Alert className="mt-6">
                         <HandCoins className="h-4 w-4" />
                        <AlertTitle>Estimated Annual Pension ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>The estimated annual pension payout is <strong>{formatCurrency(estimatedAnnualPension)}</strong>.</p>
                            <p className="text-xs mt-2 font-semibold text-destructive">Disclaimer: This is a simplified estimate based on a common defined benefit formula. Actual pension depends on specific plan rules, vesting, retirement age, survivor benefits, and regulations. Consult your plan administrator or a financial advisor.</p>
                        </AlertDescription>
                    </Alert>
                )}
                  {!estimatedAnnualPension && (
                     <Alert variant="destructive" className="mt-6">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Important Note</AlertTitle>
                         <AlertDescription>
                             Pension calculations vary significantly. This tool uses a simplified defined benefit formula. Defined contribution plans depend on account balance and withdrawal strategy. Always refer to your specific pension plan documents and consult a financial advisor for accurate retirement income planning.
                         </AlertDescription>
                    </Alert>
                  )}
            </CardContent>
        </Card>
    );
}
