
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
import { Calculator, Star, Landmark, Receipt } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Note: Estate tax laws are VERY complex, vary significantly by jurisdiction (country/state),
// and change over time. This calculator provides a highly simplified estimate based on a
// single exemption amount and a flat tax rate above that exemption.
// THIS IS FOR ILLUSTRATIVE PURPOSES ONLY AND NOT FINANCIAL/LEGAL ADVICE.

// Zod Schema for Simplified Estate Tax Calculator
const estateTaxSchema = z.object({
    grossEstateValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Gross estate value must be zero or positive.",
    }),
    estateTaxExemption: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Tax exemption amount must be zero or positive.",
    }),
    estateTaxRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "Tax rate must be between 0 and 100.",
    }),
});

type EstateTaxFormValues = z.infer<typeof estateTaxSchema>;

interface EstateTaxCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function EstateTaxCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: EstateTaxCalculatorProps) {
    const [taxableEstate, setTaxableEstate] = React.useState<number | null>(null);
    const [estimatedTax, setEstimatedTax] = React.useState<number | null>(null);
    const [mounted, setMounted] = React.useState(false);

    const { name, description, icon: Icon } = calculatorInfo;
    const isFavorite = favorites.includes(slug);

    // Example US Federal Estate Tax Exemption for 2024 (approx) - Update as needed
    const defaultExemption = 13_610_000;
    // Example max US Federal Estate Tax Rate (approx) - Update as needed
    const defaultRate = 40;


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

    const form = useForm<EstateTaxFormValues>({
        resolver: zodResolver(estateTaxSchema),
        defaultValues: {
            grossEstateValue: '',
            // Use default values, converting to string for the form
            estateTaxExemption: defaultExemption.toString(),
            estateTaxRate: defaultRate.toString(),
        },
    });

     React.useEffect(() => {
        if (mounted) {
             // Reset with defaults when currency changes (though calculation isn't currency specific, amounts are)
            form.reset({
                 grossEstateValue: '',
                 estateTaxExemption: defaultExemption.toString(),
                 estateTaxRate: defaultRate.toString(),
            });
            setTaxableEstate(null);
            setEstimatedTax(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);


    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateEstateTax = (values: EstateTaxFormValues): { taxable: number; tax: number } | null => {
        const grossValue = parseFloat(values.grossEstateValue);
        const exemption = parseFloat(values.estateTaxExemption);
        const rate = parseFloat(values.estateTaxRate) / 100;

        if (isNaN(grossValue) || grossValue < 0 || isNaN(exemption) || exemption < 0 || isNaN(rate) || rate < 0 || rate > 1) {
            return null;
        }

        const taxableAmount = Math.max(0, grossValue - exemption);
        const taxAmount = taxableAmount * rate;

        return { taxable: taxableAmount, tax: taxAmount };
    };

    const onSubmit: SubmitHandler<EstateTaxFormValues> = (data) => {
        const result = calculateEstateTax(data);
        if (result) {
            setTaxableEstate(result.taxable);
            setEstimatedTax(result.tax);

            const inputString = `Gross Estate: ${formatCurrency(parseFloat(data.grossEstateValue))}, Exemption: ${formatCurrency(parseFloat(data.estateTaxExemption))}, Rate: ${data.estateTaxRate}%`;
            const resultString = `Taxable Estate: ${formatCurrency(result.taxable)}, Estimated Estate Tax: ${formatCurrency(result.tax)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setTaxableEstate(null);
            setEstimatedTax(null);
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
                     <Skeleton className="h-10 w-full" /> {/* Disclaimer Skeleton */}
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
                        <FormField control={form.control} name="grossEstateValue" render={({ field }) => (<FormItem><FormLabel>Gross Estate Value ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 15000000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="estateTaxExemption" render={({ field }) => (<FormItem><FormLabel>Estate Tax Exemption ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 13610000" {...field} step="any" min="0" /></FormControl><FormDescription className="text-xs">Varies by jurisdiction & year. Example: US Federal 2024.</FormDescription><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="estateTaxRate" render={({ field }) => (<FormItem><FormLabel>Estate Tax Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 40" {...field} step="any" min="0" max="100" /></FormControl><FormDescription className="text-xs">Simplified flat rate above exemption.</FormDescription><FormMessage /></FormItem>)} />
                         {form.formState.errors.root && (
                             <FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>
                         )}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Estimated Tax</Button>
                    </form>
                </Form>

                 {taxableEstate !== null && estimatedTax !== null && (
                    <Alert className="mt-6">
                        <Receipt className="h-4 w-4" />
                        <AlertTitle>Estimated Estate Tax ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Taxable Estate (Value above exemption): <strong>{formatCurrency(taxableEstate)}</strong></p>
                            <p>Estimated Estate Tax Liability: <strong>{formatCurrency(estimatedTax)}</strong></p>
                             <p className="text-xs mt-2 font-semibold text-destructive">Disclaimer: This is a highly simplified estimate. Estate tax laws are complex and vary. Consult a qualified professional for advice.</p>
                        </AlertDescription>
                    </Alert>
                )}
                 {!taxableEstate && !estimatedTax && (
                    <Alert variant="destructive" className="mt-6">
                        <AlertTitle>Important Disclaimer</AlertTitle>
                        <AlertDescription>
                             Estate tax calculations are extremely complex and depend heavily on specific laws, deductions, credits, and asset types which vary by location and change over time. This calculator provides a vastly simplified estimate for illustrative purposes ONLY.
                             <strong className="block mt-1">Do not rely on this calculator for financial or legal planning. Consult with qualified estate planning attorneys and financial advisors in your jurisdiction.</strong>
                        </AlertDescription>
                    </Alert>
                 )}
            </CardContent>
        </Card>
    );
}
