
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
import { Calculator, Star, Coins, ArrowRightLeft } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { CURRENCIES } from '@/lib/constants'; // Import currency list
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
// Assuming a service exists for conversion - replace with actual implementation if needed
// import { convertCurrency } from '@/services/currency';

// Zod Schema for Currency Converter
const currencyConverterSchema = z.object({
    amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Amount must be zero or positive.",
    }),
    fromCurrency: z.string().length(3, "Select 'From' currency"),
    toCurrency: z.string().length(3, "Select 'To' currency"),
});

type CurrencyConverterFormValues = z.infer<typeof currencyConverterSchema>;

interface CurrencyConverterProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData; // Global currency setting (might influence default 'from' or 'to')
}

export function CurrencyConverter({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: CurrencyConverterProps) {
    const [convertedAmount, setConvertedAmount] = React.useState<number | null>(null);
    const [conversionRate, setConversionRate] = React.useState<number | null>(null);
    const [isLoading, setIsLoading] = React.useState(false); // For potential API calls
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

    const form = useForm<CurrencyConverterFormValues>({
        resolver: zodResolver(currencyConverterSchema),
        defaultValues: {
            amount: '',
            fromCurrency: currency.code, // Default 'from' to global setting
            toCurrency: CURRENCIES.find(c => c.code !== currency.code)?.code || 'EUR', // Default 'to' to something different
        },
    });

    // Update default 'from' currency if global currency changes
     React.useEffect(() => {
        if (mounted) {
            form.reset({
                 amount: form.getValues('amount') || '', // Keep amount if already entered
                 fromCurrency: currency.code,
                 toCurrency: form.getValues('toCurrency') === currency.code
                    ? CURRENCIES.find(c => c.code !== currency.code)?.code || 'EUR' // Change 'to' if it matches new 'from'
                    : form.getValues('toCurrency') || 'EUR',
            });
             setConvertedAmount(null);
             setConversionRate(null);
             form.clearErrors();
        }
     // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [currency.code, mounted]);

      const getCurrencySymbol = (code: string): string => {
         return CURRENCIES.find(c => c.code === code)?.symbol || '$';
     };

    // --- Mock Conversion Logic ---
    // Replace this with actual API call in production
    const performConversion = async (values: CurrencyConverterFormValues): Promise<{ amount: number; rate: number } | null> => {
        setIsLoading(true);
        try {
            const amount = parseFloat(values.amount);
            const from = CURRENCIES.find(c => c.code === values.fromCurrency);
            const to = CURRENCIES.find(c => c.code === values.toCurrency);

            if (!from || !to || isNaN(amount)) {
                console.error("Invalid input for conversion");
                return null;
            }

            // Use mock rates from constants.ts for calculation
            const rate = (1 / from.rate) * to.rate; // Calculate rate based on USD base
            const result = amount * rate;

            // Simulate API delay
            // await new Promise(resolve => setTimeout(resolve, 500));

            return { amount: result, rate: rate };
        } catch (error) {
            console.error("Conversion error:", error);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit: SubmitHandler<CurrencyConverterFormValues> = async (data) => {
        const result = await performConversion(data);
        if (result) {
            setConvertedAmount(result.amount);
            setConversionRate(result.rate);

            const fromSymbol = getCurrencySymbol(data.fromCurrency);
            const toSymbol = getCurrencySymbol(data.toCurrency);
            const amountIn = `${fromSymbol}${parseFloat(data.amount).toLocaleString()}`;


             const inputString = `Amount: ${amountIn} ${data.fromCurrency}, To: ${data.toCurrency}`;
             const resultString = `Converted Amount: ${toSymbol}${result.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${data.toCurrency} (Rate: ≈${result.rate.toFixed(5)})`; // Show more precision for rate

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setConvertedAmount(null);
            setConversionRate(null);
             form.setError("root", {message: "Failed to perform conversion."})
        }
    };

     const handleSwap = () => {
        const from = form.watch('fromCurrency');
        const to = form.watch('toCurrency');
        form.setValue('fromCurrency', to);
        form.setValue('toCurrency', from);
        // Optionally trigger recalculation immediately
        // form.handleSubmit(onSubmit)(); // Uncomment to recalculate on swap
         setConvertedAmount(null); // Clear result on swap
         setConversionRate(null);
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
                     <div className="flex items-center gap-2">
                         <Skeleton className="h-10 flex-1" />
                         <Skeleton className="h-8 w-8 rounded-full" /> {/* Swap button skeleton */}
                         <Skeleton className="h-10 flex-1" />
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
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount</FormLabel>
                                    <FormControl>
                                         <Input type="number" placeholder="Enter amount to convert" {...field} step="any" min="0" />
                                     </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex items-end gap-2">
                            <FormField
                                control={form.control}
                                name="fromCurrency"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>From</FormLabel>
                                         <Select onValueChange={field.onChange} value={field.value}>
                                             <FormControl>
                                                 <SelectTrigger>
                                                     <SelectValue placeholder="Select currency" />
                                                 </SelectTrigger>
                                             </FormControl>
                                             <SelectContent>
                                                 {CURRENCIES.map(c => (
                                                     <SelectItem key={c.code} value={c.code}>
                                                         ({c.symbol}) {c.code} - {c.name}
                                                     </SelectItem>
                                                 ))}
                                             </SelectContent>
                                         </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleSwap}
                                className="mb-1" // Align with bottom of input
                                aria-label="Swap currencies"
                            >
                                <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                             <FormField
                                control={form.control}
                                name="toCurrency"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>To</FormLabel>
                                         <Select onValueChange={field.onChange} value={field.value}>
                                             <FormControl>
                                                 <SelectTrigger>
                                                     <SelectValue placeholder="Select currency" />
                                                 </SelectTrigger>
                                             </FormControl>
                                             <SelectContent>
                                                 {CURRENCIES.map(c => (
                                                     <SelectItem key={c.code} value={c.code}>
                                                        ({c.symbol}) {c.code} - {c.name}
                                                     </SelectItem>
                                                 ))}
                                             </SelectContent>
                                         </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {form.formState.errors.root && (
                             <FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>
                         )}

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Converting...' : <> <Calculator className="mr-2 h-4 w-4" /> Convert Currency</>}
                        </Button>
                    </form>
                </Form>

                {convertedAmount !== null && conversionRate !== null && !isLoading && (
                    <Alert className="mt-6">
                         <Coins className="h-4 w-4" />
                         <AlertTitle>Conversion Result</AlertTitle>
                         <AlertDescription>
                            <p className="font-semibold text-lg">
                                 {formatCurrency(convertedAmount)} {form.watch('toCurrency')}
                            </p>
                             <p className="text-xs text-muted-foreground">
                                Based on an approximate rate of 1 {form.watch('fromCurrency')} ≈ {conversionRate.toFixed(5)} {form.watch('toCurrency')}.
                                (Using stored rates, not live data)
                             </p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
