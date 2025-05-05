
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
import { Calculator, Star, Repeat, HandCoins } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Annuity Payout Calculator
const annuityPayoutSchema = z.object({
    principal: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Principal amount must be a positive number.",
    }),
    interestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual interest rate must be zero or positive.",
    }),
    payoutYears: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Payout duration must be a positive integer (years).",
    }),
    payoutFrequency: z.enum(['monthly', 'quarterly', 'annually']).default('monthly'),
});

type AnnuityPayoutFormValues = z.infer<typeof annuityPayoutSchema>;

interface AnnuityPayoutCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function AnnuityPayoutCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: AnnuityPayoutCalculatorProps) {
    const [payoutAmount, setPayoutAmount] = React.useState<number | null>(null);
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

    const form = useForm<AnnuityPayoutFormValues>({
        resolver: zodResolver(annuityPayoutSchema),
        defaultValues: {
            principal: '',
            interestRate: '',
            payoutYears: '',
            payoutFrequency: 'monthly',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset();
            setPayoutAmount(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculatePayout = (values: AnnuityPayoutFormValues): number | null => {
        const pv = parseFloat(values.principal);
        const annualRate = parseFloat(values.interestRate) / 100;
        const years = parseInt(values.payoutYears);
        const freq = values.payoutFrequency;

        let periodsPerYear: number;
        switch (freq) {
            case 'monthly': periodsPerYear = 12; break;
            case 'quarterly': periodsPerYear = 4; break;
            case 'annually': periodsPerYear = 1; break;
            default: return null;
        }

        const ratePerPeriod = annualRate / periodsPerYear;
        const totalPeriods = years * periodsPerYear;

        if (isNaN(pv) || pv <= 0 || isNaN(ratePerPeriod) || ratePerPeriod < 0 || isNaN(totalPeriods) || totalPeriods <= 0) {
             // Handle 0% interest rate separately
            if (annualRate === 0 && pv > 0 && totalPeriods > 0) {
                 return pv / totalPeriods;
            }
            return null;
        }

        // Annuity Payment Formula (based on Present Value): P = PV * [r(1+r)^n] / [(1+r)^n - 1]
        const payment = pv * (ratePerPeriod * Math.pow(1 + ratePerPeriod, totalPeriods)) / (Math.pow(1 + ratePerPeriod, totalPeriods) - 1);

        return payment;
    };

    const onSubmit: SubmitHandler<AnnuityPayoutFormValues> = (data) => {
        const result = calculatePayout(data);
        if (result !== null) {
            setPayoutAmount(result);

            const freqText = data.payoutFrequency.charAt(0).toUpperCase() + data.payoutFrequency.slice(1);

            const inputString = `Principal: ${formatCurrency(parseFloat(data.principal))}, Rate: ${data.interestRate}%, Years: ${data.payoutYears}, Frequency: ${freqText}`;
            const resultString = `Payout Amount per Period: ${formatCurrency(result)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setPayoutAmount(null);
            console.error("Calculation failed. Check inputs.");
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
                        <FormField
                            control={form.control}
                            name="principal"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Principal Amount ({currency.symbol})</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 100000" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="interestRate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Annual Interest Rate (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 4.5" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="payoutYears"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payout Duration (Years)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 20" {...field} step="1" min="1" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="payoutFrequency"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Payout Frequency</FormLabel>
                                    <FormControl>
                                         <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"
                                        >
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="monthly" id="pf-monthly" />
                                                </FormControl>
                                                <FormLabel htmlFor="pf-monthly" className="font-normal cursor-pointer">Monthly</FormLabel>
                                            </FormItem>
                                             <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="quarterly" id="pf-quarterly" />
                                                </FormControl>
                                                <FormLabel htmlFor="pf-quarterly" className="font-normal cursor-pointer">Quarterly</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="annually" id="pf-annually" />
                                                </FormControl>
                                                <FormLabel htmlFor="pf-annually" className="font-normal cursor-pointer">Annually</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate Payout
                        </Button>
                    </form>
                </Form>

                {payoutAmount !== null && (
                    <Alert className="mt-6">
                        <HandCoins className="h-4 w-4" />
                        <AlertTitle>Estimated Payout Amount ({currency.code})</AlertTitle>
                        <AlertDescription>
                            Based on your inputs, the estimated payout amount per period ({form.watch('payoutFrequency')}) is <strong>{formatCurrency(payoutAmount)}</strong>.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
