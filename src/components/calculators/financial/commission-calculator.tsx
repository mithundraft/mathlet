
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
import { Calculator, Star, Percent, HandCoins } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Zod Schema for Commission Calculator
const commissionSchema = z.object({
    saleAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Sale amount must be zero or positive.",
    }),
    commissionRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Commission rate must be zero or positive.",
    }),
    // Optional fixed commission amount
    fixedCommission: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
         message: "Fixed commission must be zero or positive.",
    }).optional().default("0"),
});

type CommissionFormValues = z.infer<typeof commissionSchema>;

interface CommissionCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function CommissionCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: CommissionCalculatorProps) {
    const [commissionAmount, setCommissionAmount] = React.useState<number | null>(null);
    const [totalPay, setTotalPay] = React.useState<number | null>(null); // Sale Amount + Commission
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

    const form = useForm<CommissionFormValues>({
        resolver: zodResolver(commissionSchema),
        defaultValues: {
            saleAmount: '',
            commissionRate: '',
            fixedCommission: '0',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({ fixedCommission: '0' });
            setCommissionAmount(null);
            setTotalPay(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateCommission = (values: CommissionFormValues): { commission: number; total: number } | null => {
        const sale = parseFloat(values.saleAmount);
        const rate = parseFloat(values.commissionRate) / 100;
        const fixed = parseFloat(values.fixedCommission || '0');

        if (isNaN(sale) || sale < 0 || isNaN(rate) || rate < 0 || isNaN(fixed) || fixed < 0) {
            return null;
        }

        const rateCommission = sale * rate;
        const totalCommission = rateCommission + fixed;
        const totalPayCalc = sale + totalCommission; // Or maybe just the commission itself? Context matters. Let's show commission earned.

        return { commission: totalCommission, total: sale /* Return original sale for context */ };
    };

    const onSubmit: SubmitHandler<CommissionFormValues> = (data) => {
        const result = calculateCommission(data);
        if (result) {
            setCommissionAmount(result.commission);
            setTotalPay(result.total); // Store original sale amount here

            const inputString = `Sale Amount: ${formatCurrency(parseFloat(data.saleAmount))}, Rate: ${data.commissionRate}%, Fixed: ${formatCurrency(parseFloat(data.fixedCommission || '0'))}`;
            const resultString = `Commission Earned: ${formatCurrency(result.commission)}`; // Result focuses on commission

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setCommissionAmount(null);
            setTotalPay(null);
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
                            name="saleAmount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sale Amount ({currency.symbol})</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 5000" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="commissionRate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Commission Rate (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 10" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="fixedCommission"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fixed Commission ({currency.symbol}) <small>(Optional)</small></FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 50" {...field} step="any" min="0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate Commission
                        </Button>
                    </form>
                </Form>

                {commissionAmount !== null && (
                    <Alert className="mt-6">
                        <HandCoins className="h-4 w-4" />
                        <AlertTitle>Commission Results ({currency.code})</AlertTitle>
                        <AlertDescription>
                             <p>Commission Earned: <strong>{formatCurrency(commissionAmount)}</strong></p>
                             {/* Optionally show total payout (sale + commission) if desired */}
                             {/* <p>Total Amount (Sale + Commission): <strong>{formatCurrency(totalPay + commissionAmount)}</strong></p> */}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
