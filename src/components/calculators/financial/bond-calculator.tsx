
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
import { Calculator, Star, FileText, Sigma } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Zod Schema for Bond Price Calculator (Yield to Maturity - YTM approximation)
const bondSchema = z.object({
    faceValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Face value (par value) must be a positive number.",
    }),
    couponRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual coupon rate must be zero or positive.",
    }),
    yearsToMaturity: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Years to maturity must be a positive number.",
    }),
    requiredYield: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Required yield (YTM) must be zero or positive.",
    }),
    couponFrequency: z.enum(['annually', 'semi-annually', 'quarterly']).default('semi-annually'),
});

type BondFormValues = z.infer<typeof bondSchema>;

interface BondCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function BondCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: BondCalculatorProps) {
    const [bondPrice, setBondPrice] = React.useState<number | null>(null);
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

    const form = useForm<BondFormValues>({
        resolver: zodResolver(bondSchema),
        defaultValues: {
            faceValue: '',
            couponRate: '',
            yearsToMaturity: '',
            requiredYield: '',
            couponFrequency: 'semi-annually',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({ couponFrequency: 'semi-annually' });
            setBondPrice(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Bond Price
    const calculateBondPrice = (values: BondFormValues): number | null => {
        const F = parseFloat(values.faceValue);
        const C_annual = parseFloat(values.couponRate) / 100;
        const T = parseFloat(values.yearsToMaturity);
        const Y_annual = parseFloat(values.requiredYield) / 100;
        const freq = values.couponFrequency;

        let periodsPerYear: number;
        switch (freq) {
            case 'annually': periodsPerYear = 1; break;
            case 'semi-annually': periodsPerYear = 2; break;
            case 'quarterly': periodsPerYear = 4; break;
            default: return null;
        }

        const C = (F * C_annual) / periodsPerYear; // Coupon payment per period
        const Y = Y_annual / periodsPerYear;       // Yield per period
        const N = T * periodsPerYear;              // Total number of periods

        if (isNaN(F) || F <= 0 || isNaN(C_annual) || C_annual < 0 || isNaN(T) || T <= 0 || isNaN(Y_annual) || Y_annual < 0 || isNaN(N)) {
            return null;
        }

        // Bond Price Formula: PV(Coupons) + PV(Face Value)
        // PV = C * [1 - (1 + Y)^-N] / Y   +   F / (1 + Y)^N

         if (Y === 0) { // Handle zero yield case
            // Price is sum of coupons + face value
             return (C * N) + F;
         }

        const pvCoupons = C * (1 - Math.pow(1 + Y, -N)) / Y;
        const pvFaceValue = F / Math.pow(1 + Y, N);
        const bondPriceCalc = pvCoupons + pvFaceValue;

        return bondPriceCalc;
    };

    const onSubmit: SubmitHandler<BondFormValues> = (data) => {
        const result = calculateBondPrice(data);
        if (result !== null) {
            setBondPrice(result);

            const inputString = `Face Value: ${formatCurrency(parseFloat(data.faceValue))}, Coupon: ${data.couponRate}%, Maturity: ${data.yearsToMaturity} yrs, Yield: ${data.requiredYield}%, Freq: ${data.couponFrequency}`;
            const resultString = `Estimated Bond Price: ${formatCurrency(result)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setBondPrice(null);
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
                    </div>
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
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="faceValue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Face Value (Par) ({currency.symbol})</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 1000" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="couponRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Annual Coupon Rate (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 5.0" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="yearsToMaturity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Years to Maturity</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 10" {...field} step="any" min="0.01" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="requiredYield"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Required Yield (YTM) (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 6.0" {...field} step="any" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                         </div>
                          <FormField
                            control={form.control}
                            name="couponFrequency"
                             render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Coupon Frequency</FormLabel>
                                     <FormControl>
                                         {/* Replace Select with RadioGroup or keep Select if preferred */}
                                         <div className="flex flex-wrap gap-4">
                                             {(['annually', 'semi-annually', 'quarterly'] as const).map((freq) => (
                                                 <FormItem key={freq} className="flex items-center space-x-2 space-y-0">
                                                     <FormControl>
                                                         <input
                                                             type="radio"
                                                             id={`freq-${freq}`}
                                                             value={freq}
                                                             checked={field.value === freq}
                                                             onChange={field.onChange}
                                                             className="form-radio h-4 w-4 text-primary focus:ring-primary border-muted-foreground/50"
                                                         />
                                                     </FormControl>
                                                     <FormLabel htmlFor={`freq-${freq}`} className="font-normal cursor-pointer capitalize">
                                                         {freq.replace('-', ' ')}
                                                     </FormLabel>
                                                 </FormItem>
                                             ))}
                                         </div>
                                     </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate Bond Price
                        </Button>
                    </form>
                </Form>

                {bondPrice !== null && (
                    <Alert className="mt-6">
                        <Sigma className="h-4 w-4" />
                        <AlertTitle>Estimated Bond Price ({currency.code})</AlertTitle>
                        <AlertDescription>
                            The estimated price of the bond based on the required yield is <strong>{formatCurrency(bondPrice)}</strong>.
                            <p className='text-xs mt-1 text-muted-foreground'>If Price &lt; Face Value, it's a discount bond. If Price &gt; Face Value, it's a premium bond.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
