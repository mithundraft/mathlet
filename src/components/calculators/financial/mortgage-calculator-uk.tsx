
'use client';

// IMPORTANT: UK mortgage calculations can differ significantly from US/Canada (e.g., interest calculation methods, fees, product types like offset mortgages).
// This calculator provides a VERY simplified P&I estimate and requires UK-specific expertise for accuracy.
// Treat this as a placeholder needing proper UK financial logic.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Home, HandCoins, AlertTriangle } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema - Simplified for basic P&I
const mortgageUKSchema = z.object({
  loanAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Loan amount must be a positive number.",
  }),
  interestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Interest rate must be zero or positive.",
  }),
  loanTerm: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: "Loan term must be a positive integer (years).",
  }),
});

type MortgageUKFormValues = z.infer<typeof mortgageUKSchema>;

interface MortgageCalculatorUKProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData; // Should ideally be GBP
}

export function MortgageCalculatorUK({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: MortgageCalculatorUKProps) {
    const [monthlyPayment, setMonthlyPayment] = React.useState<number | null>(null);
    const [mounted, setMounted] = React.useState(false);

    const { name, description, icon: Icon } = calculatorInfo;
    const isFavorite = favorites.includes(slug);
    // Recommend forcing currency to GBP
    const displayCurrency = currency.code === 'GBP' ? currency : { ...currency, code: 'GBP', symbol: '£' };

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

    const form = useForm<MortgageUKFormValues>({
        resolver: zodResolver(mortgageUKSchema),
        defaultValues: {
            loanAmount: '',
            interestRate: '',
            loanTerm: '',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset();
            setMonthlyPayment(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayCurrency.code, mounted]); // Use displayCurrency

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${displayCurrency.symbol}${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; // UK formatting
    }, [displayCurrency.symbol]);

    // Calculate Basic Mortgage Payment (Standard Annuity Formula - may not reflect all UK methods)
    const calculateMortgagePayment = (values: MortgageUKFormValues): number | null => {
         const principal = parseFloat(values.loanAmount);
         const annualInterestRate = parseFloat(values.interestRate) / 100;
         const years = parseInt(values.loanTerm);

         if (isNaN(principal) || principal <= 0 || isNaN(annualInterestRate) || annualInterestRate < 0 || isNaN(years) || years <= 0) {
             return null;
         }

         const monthlyInterestRate = annualInterestRate / 12;
         const numberOfPayments = years * 12;

         if (monthlyInterestRate === 0) {
             return principal / numberOfPayments;
         }

         const payment = principal * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
         return payment;
    };


    const onSubmit: SubmitHandler<MortgageUKFormValues> = (data) => {
        const result = calculateMortgagePayment(data);
        if (result !== null) {
            setMonthlyPayment(result);

            const inputString = `Loan Amount: ${formatCurrency(parseFloat(data.loanAmount))}, Rate: ${data.interestRate}%, Term: ${data.loanTerm} years`;
            const resultString = `Estimated Monthly Payment (P&I): ${formatCurrency(result)}`;

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
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name} ({displayCurrency.code})</CardTitle>
                <CardDescription>{description} <strong className='text-destructive'>(Simplified Estimate)</strong></CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <FormField control={form.control} name="loanAmount" render={({ field }) => (<FormItem><FormLabel>Loan Amount ({displayCurrency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 250000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="interestRate" render={({ field }) => (<FormItem><FormLabel>Annual Interest Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 4.75" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="loanTerm" render={({ field }) => (<FormItem><FormLabel>Loan Term (Years)</FormLabel><FormControl><Input type="number" placeholder="e.g., 25" {...field} step="1" min="1" /></FormControl><FormMessage /></FormItem>)} />
                          {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Estimate Payment</Button>
                    </form>
                </Form>

                {monthlyPayment !== null && (
                    <Alert className="mt-6">
                         <HandCoins className="h-4 w-4" />
                         <AlertTitle>Estimated Monthly Payment ({displayCurrency.code})</AlertTitle>
                         <AlertDescription>
                            <p>Principal & Interest (P&I): <strong>{formatCurrency(monthlyPayment)}</strong></p>
                             <p className="text-xs mt-2 font-semibold text-destructive">Disclaimer: This is a simplified P&I estimate using a standard formula. UK mortgage calculations can vary. It does not include fees, insurance, or other costs. Consult a UK mortgage advisor for accurate figures.</p>
                         </AlertDescription>
                    </Alert>
                )}
                  {!monthlyPayment && (
                     <Alert variant="destructive" className="mt-6">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Important Note</AlertTitle>
                         <AlertDescription>
                             UK mortgage products and calculations can be complex (e.g., different interest calculation methods, arrangement fees, offset features). This tool provides a very basic P&I estimate and should not be used for financial decisions. Always consult with a qualified UK mortgage advisor.
                         </AlertDescription>
                    </Alert>
                  )}
            </CardContent>
        </Card>
    );
}
