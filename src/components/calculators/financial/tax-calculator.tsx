
'use client';

// IMPORTANT: Tax calculations are extremely complex and vary significantly based on jurisdiction,
// filing status, income sources, deductions, credits, etc. This calculator provides a grossly
// simplified estimate for illustrative purposes only.
// DO NOT use this for actual tax planning or filing. Consult a tax professional.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Receipt, Percent, AlertTriangle } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema - Simplified Effective Tax Rate Calculation
const taxSchema = z.object({
    taxableIncome: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Taxable income must be zero or positive.",
    }),
    effectiveTaxRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "Effective tax rate must be between 0 and 100.",
    }),
});

type TaxFormValues = z.infer<typeof taxSchema>;

interface TaxCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function TaxCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: TaxCalculatorProps) {
    const [estimatedTax, setEstimatedTax] = React.useState<number | null>(null);
    const [netIncome, setNetIncome] = React.useState<number | null>(null);
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

    const form = useForm<TaxFormValues>({
        resolver: zodResolver(taxSchema),
        defaultValues: {
            taxableIncome: '',
            effectiveTaxRate: '',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setEstimatedTax(null);
            setNetIncome(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateTax = (values: TaxFormValues): { tax: number; net: number } | null => {
        const income = parseFloat(values.taxableIncome);
        const rate = parseFloat(values.effectiveTaxRate) / 100;

        if (isNaN(income) || income < 0 || isNaN(rate) || rate < 0 || rate > 1) {
            return null;
        }

        const taxAmount = income * rate;
        const netAmount = income - taxAmount;

        return { tax: taxAmount, net: netAmount };
    };

    const onSubmit: SubmitHandler<TaxFormValues> = (data) => {
        const result = calculateTax(data);
        if (result) {
            setEstimatedTax(result.tax);
            setNetIncome(result.net);

            const inputString = `Taxable Income: ${formatCurrency(parseFloat(data.taxableIncome))}, Effective Rate: ${data.effectiveTaxRate}%`;
            const resultString = `Estimated Tax: ${formatCurrency(result.tax)}, Net Income: ${formatCurrency(result.net)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setEstimatedTax(null);
            setNetIncome(null);
             form.setError("root", {message: "Calculation failed. Check inputs."});
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
                    <Skeleton className="h-10 w-full" /> {/* Button */}
                    <Skeleton className="mt-6 h-20 w-full" /> {/* Result */}
                    <Skeleton className="h-16 w-full" /> {/* Disclaimer */}
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
                        <FormField control={form.control} name="taxableIncome" render={({ field }) => (<FormItem><FormLabel>Taxable Income ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="Amount subject to tax" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="effectiveTaxRate" render={({ field }) => (<FormItem><FormLabel>Effective Tax Rate (%)</FormLabel><FormControl><Input type="number" placeholder="Overall % (Fed+State+Local)" {...field} step="any" min="0" max="100" /></FormControl><FormDescription className="text-xs">Enter your estimated combined tax rate.</FormDescription><FormMessage /></FormItem>)} />
                        {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Estimate Tax</Button>
                    </form>
                </Form>

                 {estimatedTax !== null && netIncome !== null && (
                    <Alert className="mt-6">
                        <Receipt className="h-4 w-4" />
                        <AlertTitle>Estimated Tax ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Estimated Tax Amount: <strong>{formatCurrency(estimatedTax)}</strong></p>
                            <p>Estimated Net Income (After Tax): <strong>{formatCurrency(netIncome)}</strong></p>
                            <p className="text-xs mt-2 font-semibold text-destructive">Disclaimer: Extremely simplified calculation using an effective rate. Actual taxes depend on brackets, deductions, credits, and specific tax laws. Consult a tax professional.</p>
                        </AlertDescription>
                    </Alert>
                )}
                 {!estimatedTax && ( // Show disclaimer initially if result is null (includes mount/reset state)
                     <Alert variant="destructive" className="mt-6">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Important Note</AlertTitle>
                         <AlertDescription>
                              Tax calculation is complex. This tool uses a single effective rate for a basic estimate only. It does not account for tax brackets, deductions, credits, different income types, or specific jurisdictional rules. Use official tax software or consult a qualified tax professional for accurate tax planning and filing.
                         </AlertDescription>
                    </Alert>
                  )}
            </CardContent>
        </Card>
    );
}
