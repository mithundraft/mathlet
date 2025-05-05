
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
import { Calculator, Star, Percent, Tag } from 'lucide-react'; // Using Tag icon
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Discount Calculator
const discountSchema = z.object({
    originalPrice: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Original price must be zero or positive.",
    }),
    discountPercent: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Discount percentage must be zero or positive.",
    }),
    // Optional: Calculate discount amount instead
    // discountAmount: z.string().optional(),
});

type DiscountFormValues = z.infer<typeof discountSchema>;

interface DiscountCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function DiscountCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: DiscountCalculatorProps) {
    const [finalPrice, setFinalPrice] = React.useState<number | null>(null);
    const [amountSaved, setAmountSaved] = React.useState<number | null>(null);
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

    const form = useForm<DiscountFormValues>({
        resolver: zodResolver(discountSchema),
        defaultValues: {
            originalPrice: '',
            discountPercent: '',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset();
            setFinalPrice(null);
            setAmountSaved(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateDiscount = (values: DiscountFormValues): { final: number; saved: number } | null => {
        const price = parseFloat(values.originalPrice);
        const discount = parseFloat(values.discountPercent) / 100;

        if (isNaN(price) || price < 0 || isNaN(discount) || discount < 0) {
            return null;
        }

        const saved = price * discount;
        const final = price - saved;

        return { final, saved };
    };

    const onSubmit: SubmitHandler<DiscountFormValues> = (data) => {
        const result = calculateDiscount(data);
        if (result) {
            setFinalPrice(result.final);
            setAmountSaved(result.saved);

            const inputString = `Original Price: ${formatCurrency(parseFloat(data.originalPrice))}, Discount: ${data.discountPercent}%`;
            const resultString = `Final Price: ${formatCurrency(result.final)}, Amount Saved: ${formatCurrency(result.saved)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setFinalPrice(null);
            setAmountSaved(null);
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
                         <FormField
                            control={form.control}
                            name="originalPrice"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Original Price ({currency.symbol})</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 100" {...field} step="any" min="0" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="discountPercent"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Discount Percentage (%)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 20" {...field} step="any" min="0" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Discount</Button>
                    </form>
                </Form>

                 {finalPrice !== null && amountSaved !== null && (
                    <Alert className="mt-6">
                        <Tag className="h-4 w-4" />
                        <AlertTitle>Discount Calculation ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Final Price: <strong>{formatCurrency(finalPrice)}</strong></p>
                            <p>Amount Saved: <strong>{formatCurrency(amountSaved)}</strong></p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
