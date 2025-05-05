
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
import { Calculator, Star, Receipt, Percent } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for VAT Calculator
const vatSchema = z.object({
    amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Amount must be positive.",
    }),
    vatRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "VAT rate must be between 0 and 100.",
    }),
    calculationType: z.enum(['add_vat', 'remove_vat']).default('add_vat'), // Add VAT to net or remove VAT from gross
});

type VatFormValues = z.infer<typeof vatSchema>;

interface VatCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function VatCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: VatCalculatorProps) {
    const [vatAmount, setVatAmount] = React.useState<number | null>(null);
    const [finalAmount, setFinalAmount] = React.useState<number | null>(null); // Gross or Net depending on calculation
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

    const form = useForm<VatFormValues>({
        resolver: zodResolver(vatSchema),
        defaultValues: {
            amount: '',
            vatRate: '',
            calculationType: 'add_vat',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset({ calculationType: 'add_vat'});
            setVatAmount(null);
            setFinalAmount(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

     // Reset results when calculation type changes
     React.useEffect(() => {
        setVatAmount(null);
        setFinalAmount(null);
     }, [form.watch('calculationType')]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateVat = (values: VatFormValues): { vat: number; final: number; type: 'add' | 'remove' } | null => {
        const amount = parseFloat(values.amount);
        const rate = parseFloat(values.vatRate) / 100;

        if (isNaN(amount) || amount <= 0 || isNaN(rate) || rate < 0) {
            return null;
        }

        let vatCalc: number;
        let finalAmountCalc: number;
        let type: 'add' | 'remove';

        if (values.calculationType === 'add_vat') {
             // Amount is Net, calculate Gross
            type = 'add';
            vatCalc = amount * rate;
            finalAmountCalc = amount + vatCalc;
        } else { // remove_vat
            // Amount is Gross, calculate Net
            type = 'remove';
             // VAT = Gross * (Rate / (1 + Rate))
             // Net = Gross / (1 + Rate)
            vatCalc = amount * (rate / (1 + rate));
            finalAmountCalc = amount - vatCalc; // Final amount here is the Net amount
        }

        return { vat: vatCalc, final: finalAmountCalc, type };
    };

    const onSubmit: SubmitHandler<VatFormValues> = (data) => {
        const result = calculateVat(data);
        if (result) {
            setVatAmount(result.vat);
            setFinalAmount(result.final);

            const amountLabel = data.calculationType === 'add_vat' ? 'Net Amount' : 'Gross Amount';
            const finalLabel = data.calculationType === 'add_vat' ? 'Gross Amount' : 'Net Amount';

            const inputString = `${amountLabel}: ${formatCurrency(parseFloat(data.amount))}, VAT Rate: ${data.vatRate}%`;
            const resultString = `VAT Amount: ${formatCurrency(result.vat)}, ${finalLabel}: ${formatCurrency(result.final)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setVatAmount(null);
            setFinalAmount(null);
             form.setError("root", {message: "Calculation failed. Check inputs."});
            console.error("Calculation failed. Check inputs.");
        }
    };

    const calculationType = form.watch('calculationType');

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
                     <div className="space-y-3"> <Skeleton className="h-5 w-1/4" /> <div className="flex space-x-4"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-6 w-1/3" /></div> </div>
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
                        <FormField control={form.control} name="calculationType" render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Calculation Type</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="add_vat" id="vat-add"/></FormControl><FormLabel htmlFor="vat-add" className="font-normal cursor-pointer">Add VAT (to Net)</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="remove_vat" id="vat-remove"/></FormControl><FormLabel htmlFor="vat-remove" className="font-normal cursor-pointer">Remove VAT (from Gross)</FormLabel></FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>{calculationType === 'add_vat' ? 'Net Amount' : 'Gross Amount'} ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="Enter amount" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="vatRate" render={({ field }) => (<FormItem><FormLabel>VAT Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 20" {...field} step="any" min="0" max="100"/></FormControl><FormMessage /></FormItem>)} />
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate VAT</Button>
                    </form>
                </Form>

                 {vatAmount !== null && finalAmount !== null && (
                    <Alert className="mt-6">
                        <Receipt className="h-4 w-4" />
                        <AlertTitle>VAT Calculation Results ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>VAT Amount: <strong>{formatCurrency(vatAmount)}</strong></p>
                             <p>{calculationType === 'add_vat' ? 'Gross Amount (Incl. VAT):' : 'Net Amount (Excl. VAT):'} <strong>{formatCurrency(finalAmount)}</strong></p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
