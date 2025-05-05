
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
import { Calculator, Star, Repeat, LineChart } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Annuity Calculator
const annuitySchema = z.object({
    type: z.enum(['present_value', 'future_value']),
    paymentAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Payment amount must be a positive number.",
    }),
    interestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Interest rate must be zero or positive.",
    }),
    numberOfPeriods: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Number of periods must be a positive integer.",
    }),
    paymentFrequency: z.enum(['monthly', 'quarterly', 'annually']).default('annually'),
});

type AnnuityFormValues = z.infer<typeof annuitySchema>;

interface AnnuityCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function AnnuityCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: AnnuityCalculatorProps) {
    const [annuityValue, setAnnuityValue] = React.useState<number | null>(null);
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

    const form = useForm<AnnuityFormValues>({
        resolver: zodResolver(annuitySchema),
        defaultValues: {
            type: 'future_value',
            paymentAmount: '',
            interestRate: '',
            numberOfPeriods: '',
            paymentFrequency: 'annually',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setAnnuityValue(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

     // Reset results when annuity type changes
     React.useEffect(() => {
        setAnnuityValue(null);
        form.clearErrors(['paymentAmount', 'interestRate', 'numberOfPeriods']); // Clear calculation-related errors
     }, [form.watch('type')]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateAnnuity = (values: AnnuityFormValues): number | null => {
        const pmt = parseFloat(values.paymentAmount);
        const annualRate = parseFloat(values.interestRate) / 100;
        const n = parseInt(values.numberOfPeriods);
        const freq = values.paymentFrequency;

        let ratePerPeriod: number;
        let totalPeriods = n;

        switch (freq) {
            case 'monthly':
                ratePerPeriod = annualRate / 12;
                totalPeriods = n * 12;
                break;
            case 'quarterly':
                ratePerPeriod = annualRate / 4;
                totalPeriods = n * 4;
                break;
            case 'annually':
            default:
                ratePerPeriod = annualRate;
                // totalPeriods remains n for annual
                break;
        }


        if (isNaN(pmt) || pmt <= 0 || isNaN(ratePerPeriod) || ratePerPeriod < 0 || isNaN(totalPeriods) || totalPeriods <= 0) {
            return null;
        }

        if (ratePerPeriod === 0) {
            if (values.type === 'future_value') {
                return pmt * totalPeriods;
            } else { // present_value
                 // Present value of 0% annuity is just sum of payments
                 return pmt * totalPeriods;
            }
        }

        if (values.type === 'future_value') {
            // Future Value of an Ordinary Annuity Formula: FV = P * [((1 + r)^n - 1) / r]
            return pmt * ((Math.pow(1 + ratePerPeriod, totalPeriods) - 1) / ratePerPeriod);
        } else { // present_value
            // Present Value of an Ordinary Annuity Formula: PV = P * [(1 - (1 + r)^-n) / r]
            return pmt * ((1 - Math.pow(1 + ratePerPeriod, -totalPeriods)) / ratePerPeriod);
        }
    };

    const onSubmit: SubmitHandler<AnnuityFormValues> = (data) => {
        const result = calculateAnnuity(data);
        if (result !== null) {
            setAnnuityValue(result);

            const freqText = data.paymentFrequency.charAt(0).toUpperCase() + data.paymentFrequency.slice(1);
            const typeText = data.type === 'future_value' ? 'Future Value' : 'Present Value';
            const periodText = data.paymentFrequency === 'annually' ? 'years' : data.paymentFrequency.replace('ly', 's');

            const inputString = `Type: ${typeText}, Payment: ${formatCurrency(parseFloat(data.paymentAmount))} per ${data.paymentFrequency.replace('ly', '')}, Rate: ${data.interestRate}%, Periods: ${data.numberOfPeriods} ${periodText}`;
            const resultString = `Calculated ${typeText}: ${formatCurrency(result)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setAnnuityValue(null);
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
                    {/* Type Radio Skeleton */}
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-1/4" />
                        <div className="flex space-x-4">
                            <Skeleton className="h-6 w-1/3" />
                            <Skeleton className="h-6 w-1/3" />
                        </div>
                    </div>
                    {/* Input Skeletons */}
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
                            name="type"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Calculate Annuity</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex space-x-4"
                                        >
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="future_value" id="fv-annuity" />
                                                </FormControl>
                                                <FormLabel htmlFor="fv-annuity" className="font-normal cursor-pointer">Future Value (FV)</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="present_value" id="pv-annuity" />
                                                </FormControl>
                                                <FormLabel htmlFor="pv-annuity" className="font-normal cursor-pointer">Present Value (PV)</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="paymentAmount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Amount ({currency.symbol})</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 100" {...field} step="any" min="0" />
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
                                        <Input type="number" placeholder="e.g., 5" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="numberOfPeriods"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Years</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 10" {...field} step="1" min="1" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="paymentFrequency"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Payment Frequency</FormLabel>
                                    <FormControl>
                                         <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"
                                        >
                                             <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="annually" id="freq-annually" />
                                                </FormControl>
                                                <FormLabel htmlFor="freq-annually" className="font-normal cursor-pointer">Annually</FormLabel>
                                            </FormItem>
                                             <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="quarterly" id="freq-quarterly" />
                                                </FormControl>
                                                <FormLabel htmlFor="freq-quarterly" className="font-normal cursor-pointer">Quarterly</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="monthly" id="freq-monthly" />
                                                </FormControl>
                                                <FormLabel htmlFor="freq-monthly" className="font-normal cursor-pointer">Monthly</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate Annuity {form.watch('type') === 'future_value' ? 'FV' : 'PV'}
                        </Button>
                    </form>
                </Form>

                {annuityValue !== null && (
                    <Alert className="mt-6">
                        <LineChart className="h-4 w-4" />
                        <AlertTitle>Annuity {form.watch('type') === 'future_value' ? 'Future Value' : 'Present Value'} ({currency.code})</AlertTitle>
                        <AlertDescription>
                             The calculated {form.watch('type') === 'future_value' ? 'future value' : 'present value'} of the annuity is <strong>{formatCurrency(annuityValue)}</strong>.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
