
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
import { Calculator, Star, ShoppingCart, Percent } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Zod Schema for Sales Tax Calculator
const salesTaxSchema = z.object({
    preTaxAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Pre-tax amount must be zero or positive.",
    }),
    taxRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "Sales tax rate must be between 0 and 100.",
    }),
});

type SalesTaxFormValues = z.infer<typeof salesTaxSchema>;

interface SalesTaxCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function SalesTaxCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: SalesTaxCalculatorProps) {
    const [taxAmount, setTaxAmount] = React.useState<number | null>(null);
    const [totalAmount, setTotalAmount] = React.useState<number | null>(null);
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

    const form = useForm<SalesTaxFormValues>({
        resolver: zodResolver(salesTaxSchema),
        defaultValues: {
            preTaxAmount: '',
            taxRate: '',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setTaxAmount(null);
            setTotalAmount(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateSalesTax = (values: SalesTaxFormValues): { tax: number; total: number } | null => {
        const amount = parseFloat(values.preTaxAmount);
        const rate = parseFloat(values.taxRate) / 100;

        if (isNaN(amount) || amount < 0 || isNaN(rate) || rate < 0) {
            return null;
        }

        const tax = amount * rate;
        const total = amount + tax;

        return { tax, total };
    };

    const onSubmit: SubmitHandler<SalesTaxFormValues> = (data) => {
        const result = calculateSalesTax(data);
        if (result) {
            setTaxAmount(result.tax);
            setTotalAmount(result.total);

            const inputString = `Amount: ${formatCurrency(parseFloat(data.preTaxAmount))}, Tax Rate: ${data.taxRate}%`;
            const resultString = `Sales Tax: ${formatCurrency(result.tax)}, Total Amount: ${formatCurrency(result.total)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setTaxAmount(null);
            setTotalAmount(null);
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
                        <FormField control={form.control} name="preTaxAmount" render={({ field }) => (<FormItem><FormLabel>Pre-Tax Amount ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 50.00" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="taxRate" render={({ field }) => (<FormItem><FormLabel>Sales Tax Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 7.5" {...field} step="any" min="0" max="100"/></FormControl><FormMessage /></FormItem>)} />
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Sales Tax</Button>
                    </form>
                </Form>

                 {taxAmount !== null && totalAmount !== null && (
                    <Alert className="mt-6">
                        <ShoppingCart className="h-4 w-4" />
                        <AlertTitle>Sales Tax Calculation ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Sales Tax Amount: <strong>{formatCurrency(taxAmount)}</strong></p>
                            <p>Total Amount (including tax): <strong>{formatCurrency(totalAmount)}</strong></p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
