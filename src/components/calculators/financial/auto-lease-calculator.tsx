
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
import { Calculator, Star, Car, FileText } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Auto Lease Calculator
const autoLeaseSchema = z.object({
    vehiclePrice: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Vehicle price must be a positive number.",
    }),
    downPayment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Down payment must be zero or positive.",
    }).optional().default("0"),
    tradeInValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Trade-in value must be zero or positive.",
    }).optional().default("0"),
    residualValuePercent: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "Residual value must be between 0 and 100.",
    }),
    leaseTermMonths: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Lease term must be a positive integer (months).",
    }),
    moneyFactor: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Money Factor must be zero or positive.",
    }), // Often expressed as a small decimal like 0.00125
    salesTaxRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "Sales tax rate must be between 0 and 100.",
    }).optional().default("0"),
});

type AutoLeaseFormValues = z.infer<typeof autoLeaseSchema>;

interface AutoLeaseCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function AutoLeaseCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: AutoLeaseCalculatorProps) {
    const [monthlyPayment, setMonthlyPayment] = React.useState<number | null>(null);
    const [totalLeaseCost, setTotalLeaseCost] = React.useState<number | null>(null);
    const [monthlyPaymentAfterTax, setMonthlyPaymentAfterTax] = React.useState<number | null>(null);
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

    const form = useForm<AutoLeaseFormValues>({
        resolver: zodResolver(autoLeaseSchema),
        defaultValues: {
            vehiclePrice: '',
            downPayment: '0',
            tradeInValue: '0',
            residualValuePercent: '',
            leaseTermMonths: '',
            moneyFactor: '',
            salesTaxRate: '0',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({ downPayment: '0', tradeInValue: '0', salesTaxRate: '0' });
            setMonthlyPayment(null);
            setTotalLeaseCost(null);
            setMonthlyPaymentAfterTax(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateLeasePayment = (values: AutoLeaseFormValues): { monthly: number; total: number; monthlyAfterTax: number } | null => {
        const msrp = parseFloat(values.vehiclePrice);
        const downPayment = parseFloat(values.downPayment || '0');
        const tradeIn = parseFloat(values.tradeInValue || '0');
        const residualPercent = parseFloat(values.residualValuePercent) / 100;
        const term = parseInt(values.leaseTermMonths);
        const moneyFactor = parseFloat(values.moneyFactor);
        const taxRate = parseFloat(values.salesTaxRate || '0') / 100;

        if (isNaN(msrp) || msrp <= 0 || isNaN(residualPercent) || isNaN(term) || term <= 0 || isNaN(moneyFactor) || moneyFactor < 0 || isNaN(taxRate) || taxRate < 0) {
            return null;
        }

        const capitalizedCost = msrp - downPayment - tradeIn; // Simplified cap cost
        const residualValue = msrp * residualPercent;
        const depreciation = capitalizedCost - residualValue;
        const baseMonthlyPayment = depreciation / term;

        const financeCharge = (capitalizedCost + residualValue) * moneyFactor;
        const monthlyFinanceCharge = financeCharge; // Money factor already incorporates term implicitly

        const preTaxMonthlyPayment = baseMonthlyPayment + monthlyFinanceCharge;
        const monthlyTax = preTaxMonthlyPayment * taxRate; // Tax on the payment itself (common method)
        const monthlyPaymentWithTax = preTaxMonthlyPayment + monthlyTax;

        const totalCost = (monthlyPaymentWithTax * term) + downPayment; // Add down payment back for total out-of-pocket

        return {
             monthly: preTaxMonthlyPayment, // Pre-tax payment
             total: totalCost,
             monthlyAfterTax: monthlyPaymentWithTax // Post-tax payment
        };
    };

    const onSubmit: SubmitHandler<AutoLeaseFormValues> = (data) => {
        const result = calculateLeasePayment(data);
        if (result) {
            setMonthlyPayment(result.monthly);
            setTotalLeaseCost(result.total);
            setMonthlyPaymentAfterTax(result.monthlyAfterTax);

            const inputString = `Price: ${formatCurrency(parseFloat(data.vehiclePrice))}, Down: ${formatCurrency(parseFloat(data.downPayment || '0'))}, Trade: ${formatCurrency(parseFloat(data.tradeInValue || '0'))}, Residual: ${data.residualValuePercent}%, Term: ${data.leaseTermMonths} mo, MF: ${data.moneyFactor}, Tax: ${data.salesTaxRate || '0'}%`;
            const resultString = `Est. Monthly Payment (before tax): ${formatCurrency(result.monthly)}, Monthly (after tax): ${formatCurrency(result.monthlyAfterTax)}, Total Lease Cost: ${formatCurrency(result.total)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setMonthlyPayment(null);
            setTotalLeaseCost(null);
            setMonthlyPaymentAfterTax(null);
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
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                     </div>
                     <Skeleton className="h-10 w-full" /> {/* Button Skeleton */}
                     <Skeleton className="mt-6 h-24 w-full" /> {/* Result Skeleton */}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="vehiclePrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vehicle Price (MSRP) ({currency.symbol})</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 30000" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="downPayment"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Down Payment ({currency.symbol}) <small>(Optional)</small></FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 2000" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="tradeInValue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Trade-in Value ({currency.symbol}) <small>(Optional)</small></FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 5000" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="residualValuePercent"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Residual Value (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 55" {...field} step="any" min="0" max="100"/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="leaseTermMonths"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Lease Term (Months)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 36" {...field} step="1" min="1" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="moneyFactor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Money Factor</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 0.00125" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="salesTaxRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sales Tax Rate (%) <small>(Optional)</small></FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 7" {...field} step="any" min="0" max="100"/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate Lease Payment
                        </Button>
                    </form>
                </Form>

                {monthlyPaymentAfterTax !== null && monthlyPayment !== null && totalLeaseCost !== null && (
                    <Alert className="mt-6">
                        <FileText className="h-4 w-4" />
                        <AlertTitle>Estimated Lease Summary ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Est. Monthly Payment (Before Tax): <strong>{formatCurrency(monthlyPayment)}</strong></p>
                            <p>Est. Monthly Payment (After Tax): <strong>{formatCurrency(monthlyPaymentAfterTax)}</strong></p>
                            <p>Total Lease Cost (incl. Down Payment): <strong>{formatCurrency(totalLeaseCost)}</strong></p>
                             <p className="text-xs mt-2 text-muted-foreground">Note: Does not include acquisition fees, disposition fees, or other potential charges. Tax calculation method may vary by region.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
