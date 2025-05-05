
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
import { Calculator, Star, Home, HandCoins } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for FHA Loan Calculator
const fhaLoanSchema = z.object({
  homePrice: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Home price must be a positive number.",
  }),
  downPaymentPercent: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 3.5 && parseFloat(val) <= 100, { // FHA minimum down payment is 3.5%
    message: "FHA down payment must be at least 3.5%.",
  }),
  interestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Interest rate must be zero or positive.",
  }),
  loanTerm: z.string().refine(val => z.enum(['15', '30']).safeParse(val).success, { // Common FHA terms
    message: "Loan term must be 15 or 30 years.",
  }).default('30'),
  // FHA MIP Rates (These change - use current rates)
  upfrontMipRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
     message: "Upfront MIP rate must be valid.",
   }).default("1.75"), // Example current rate (1.75%)
  annualMipRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Annual MIP rate must be valid.",
  }).default("0.55"), // Example current rate (0.55% for LTV > 95%, 30yr) - This VARIES!
   // Optional fields often included in PITI
    propertyTaxes: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Annual property taxes must be non-negative."}).optional().default("0"),
    homeownersInsurance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Annual homeowners insurance must be non-negative."}).optional().default("0"),
});

type FhaLoanFormValues = z.infer<typeof fhaLoanSchema>;

interface FhaLoanCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function FhaLoanCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: FhaLoanCalculatorProps) {
    const [principalAndInterest, setPrincipalAndInterest] = React.useState<number | null>(null);
    const [upfrontMipAmount, setUpfrontMipAmount] = React.useState<number | null>(null);
    const [monthlyMipAmount, setMonthlyMipAmount] = React.useState<number | null>(null);
    const [estimatedTotalPayment, setEstimatedTotalPayment] = React.useState<number | null>(null); // PITI + MIP
    const [loanAmount, setLoanAmount] = React.useState<number | null>(null); // Base loan amount
    const [totalLoanWithMip, setTotalLoanWithMip] = React.useState<number | null>(null); // Loan + financed MIP
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

    const form = useForm<FhaLoanFormValues>({
        resolver: zodResolver(fhaLoanSchema),
        defaultValues: {
            homePrice: '',
            downPaymentPercent: '3.5', // Default to minimum FHA
            interestRate: '',
            loanTerm: '30',
            upfrontMipRate: '1.75',
            annualMipRate: '0.55', // Update with current rates based on LTV/term
             propertyTaxes: '0',
             homeownersInsurance: '0',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({
                downPaymentPercent: '3.5', loanTerm: '30', upfrontMipRate: '1.75', annualMipRate: '0.55', propertyTaxes: '0', homeownersInsurance: '0'
             });
            setPrincipalAndInterest(null);
            setUpfrontMipAmount(null);
            setMonthlyMipAmount(null);
            setEstimatedTotalPayment(null);
            setLoanAmount(null);
             setTotalLoanWithMip(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

     // Update Annual MIP based on LTV and Term (Simplified Example)
     React.useEffect(() => {
        const price = parseFloat(form.watch('homePrice'));
        const dpPercent = parseFloat(form.watch('downPaymentPercent'));
        const term = parseInt(form.watch('loanTerm'));

        if (!isNaN(price) && !isNaN(dpPercent) && price > 0) {
            const downPayment = price * (dpPercent / 100);
            const baseLoan = price - downPayment;
            const ltv = (baseLoan / price) * 100;

            // VERY Simplified MIP Rate Logic - CHECK CURRENT FHA GUIDELINES
            let newMipRate = "0.55"; // Default/fallback
            if (term === 30) {
                 if (ltv > 95) newMipRate = "0.55";
                 else newMipRate = "0.50";
            } else if (term === 15) {
                if (ltv > 90) newMipRate = "0.40";
                 else newMipRate = "0.15";
            }
            // Add logic for loans > $726,200 as rates differ

             form.setValue('annualMipRate', newMipRate, { shouldValidate: true });
        }
     }, [form.watch('homePrice'), form.watch('downPaymentPercent'), form.watch('loanTerm'), form.setValue]);

    const calculateFhaLoan = (values: FhaLoanFormValues): { pi: number; upfrontMip: number; monthlyMip: number; totalPayment: number; baseLoan: number; totalLoan: number; } | null => {
        const price = parseFloat(values.homePrice);
        const dpPercent = parseFloat(values.downPaymentPercent) / 100;
        const rate = parseFloat(values.interestRate) / 100;
        const termYears = parseInt(values.loanTerm);
        const upfrontMipRate = parseFloat(values.upfrontMipRate) / 100;
        const annualMipRate = parseFloat(values.annualMipRate) / 100;
        const annualTaxes = parseFloat(values.propertyTaxes || '0');
        const annualInsurance = parseFloat(values.homeownersInsurance || '0');


        if (isNaN(price) || price <= 0 || isNaN(dpPercent) || dpPercent < 0.035 || isNaN(rate) || rate < 0 || isNaN(termYears) || termYears <= 0 || isNaN(upfrontMipRate) || isNaN(annualMipRate) || isNaN(annualTaxes) || isNaN(annualInsurance)) {
            return null;
        }

        const downPayment = price * dpPercent;
        const baseLoanAmount = price - downPayment;

        // Calculate Upfront MIP and Total Loan Amount (including financed MIP)
        const upfrontMip = baseLoanAmount * upfrontMipRate;
        const totalLoanAmount = baseLoanAmount + upfrontMip;

        // Calculate Principal & Interest (P&I) based on Total Loan Amount
        const monthlyRate = rate / 12;
        const numberOfPayments = termYears * 12;
        let piPayment: number;

        if (monthlyRate === 0) {
            piPayment = totalLoanAmount / numberOfPayments;
        } else {
            piPayment = totalLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
        }

        // Calculate Annual MIP and convert to Monthly MIP
        // Annual MIP is typically based on the *average* outstanding balance over the next 12 months,
        // but often simplified as calculated on the base loan amount annually and divided by 12.
        // Check FHA guidelines for the precise calculation. Let's use the simplified method:
        const monthlyMip = (baseLoanAmount * annualMipRate) / 12;

        // Calculate monthly taxes and insurance (PITI components)
        const monthlyTaxes = annualTaxes / 12;
        const monthlyInsurance = annualInsurance / 12;

        // Calculate Total Estimated Monthly Payment (PITI + Monthly MIP)
        const totalMonthlyPayment = piPayment + monthlyMip + monthlyTaxes + monthlyInsurance;


        return {
            pi: piPayment,
            upfrontMip: upfrontMip,
            monthlyMip: monthlyMip,
            totalPayment: totalMonthlyPayment,
            baseLoan: baseLoanAmount,
            totalLoan: totalLoanAmount,
        };
    };

    const onSubmit: SubmitHandler<FhaLoanFormValues> = (data) => {
        const result = calculateFhaLoan(data);
        if (result) {
            setPrincipalAndInterest(result.pi);
            setUpfrontMipAmount(result.upfrontMip);
            setMonthlyMipAmount(result.monthlyMip);
            setEstimatedTotalPayment(result.totalPayment);
            setLoanAmount(result.baseLoan);
            setTotalLoanWithMip(result.totalLoan);


            const inputString = `Price: ${formatCurrency(parseFloat(data.homePrice))}, DP: ${data.downPaymentPercent}%, Rate: ${data.interestRate}%, Term: ${data.loanTerm} yrs, Taxes: ${formatCurrency(parseFloat(data.propertyTaxes || '0'))}/yr, Insurance: ${formatCurrency(parseFloat(data.homeownersInsurance || '0'))}/yr`;
            const resultString = `Est. Total Monthly Payment: ${formatCurrency(result.totalPayment)} (P&I: ${formatCurrency(result.pi)}, MIP: ${formatCurrency(result.monthlyMip)}, T&I: ${formatCurrency((parseFloat(data.propertyTaxes||'0')/12) + (parseFloat(data.homeownersInsurance||'0')/12))}). Upfront MIP: ${formatCurrency(result.upfrontMip)}. Total Loan: ${formatCurrency(result.totalLoan)}.`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setPrincipalAndInterest(null);
            setUpfrontMipAmount(null);
            setMonthlyMipAmount(null);
            setEstimatedTotalPayment(null);
            setLoanAmount(null);
            setTotalLoanWithMip(null);
            form.setError("root", { message: "Calculation failed. Check inputs." });
            console.error("Calculation failed. Check inputs.");
        }
    };

    // Skeleton Loader
    if (!mounted) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader className="relative">
                    <Skeleton className="absolute top-3 right-3 h-7 w-7 rounded-full" />
                    <div className="flex items-center gap-2 pr-10"><Skeleton className="h-6 w-6" /><Skeleton className="h-6 w-3/4" /></div>
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                 <CardContent className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     {/* MIP Skeletons */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                     </div>
                      {/* Optional PITI Skeletons */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                      </div>
                    <Skeleton className="h-10 w-full" /> {/* Button Skeleton */}
                    <Skeleton className="mt-6 h-28 w-full" /> {/* Result Skeleton */}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="relative">
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         {/* Loan Details */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="homePrice" render={({ field }) => (<FormItem><FormLabel>Home Price ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 350000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="downPaymentPercent" render={({ field }) => (<FormItem><FormLabel>Down Payment (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 3.5" {...field} step="any" min="3.5" max="100" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="interestRate" render={({ field }) => (<FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 6.5" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField
                                control={form.control}
                                name="loanTerm"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Loan Term (Years)</FormLabel>
                                     <Select onValueChange={field.onChange} value={field.value}>
                                         <FormControl><SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger></FormControl>
                                         <SelectContent>
                                             <SelectItem value="30">30 Years</SelectItem>
                                             <SelectItem value="15">15 Years</SelectItem>
                                         </SelectContent>
                                     </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                         </div>
                         {/* MIP and Optional Costs */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                            <FormField control={form.control} name="upfrontMipRate" render={({ field }) => (<FormItem><FormLabel>Upfront MIP Rate (%)</FormLabel><FormControl><Input type="number" {...field} step="any" min="0" /></FormControl><FormDescription className='text-xs'>Current standard rate is 1.75%</FormDescription><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="annualMipRate" render={({ field }) => (<FormItem><FormLabel>Annual MIP Rate (%)</FormLabel><FormControl><Input type="number" {...field} step="any" min="0" readOnly className="bg-muted/50" /></FormControl><FormDescription className='text-xs'>Auto-calculated (approx.). Verify current FHA rates.</FormDescription><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="propertyTaxes" render={({ field }) => (<FormItem><FormLabel>Annual Property Taxes ({currency.symbol}) <small>(Optional)</small></FormLabel><FormControl><Input type="number" placeholder="e.g., 4000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="homeownersInsurance" render={({ field }) => (<FormItem><FormLabel>Annual Home Insurance ({currency.symbol}) <small>(Optional)</small></FormLabel><FormControl><Input type="number" placeholder="e.g., 1200" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        </div>

                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate FHA Payment</Button>
                    </form>
                </Form>

                 {estimatedTotalPayment !== null && principalAndInterest !== null && monthlyMipAmount !== null && (
                    <Alert className="mt-6">
                        <HandCoins className="h-4 w-4" />
                        <AlertTitle>Estimated FHA Loan Payment ({currency.code})</AlertTitle>
                        <AlertDescription className="space-y-1">
                            <p>Est. Total Monthly Payment: <strong className="text-lg">{formatCurrency(estimatedTotalPayment)}</strong></p>
                             <p className="text-xs">Principal & Interest (P&I): {formatCurrency(principalAndInterest)}</p>
                             <p className="text-xs">Monthly MIP: {formatCurrency(monthlyMipAmount)}</p>
                             <p className="text-xs">Monthly Taxes & Insurance (Est.): {formatCurrency((parseFloat(form.getValues('propertyTaxes')||'0')/12) + (parseFloat(form.getValues('homeownersInsurance')||'0')/12))}</p>
                             <p className="text-xs mt-2">Base Loan Amount: {formatCurrency(loanAmount)}</p>
                             <p className="text-xs">Upfront MIP Financed: {formatCurrency(upfrontMipAmount)}</p>
                             <p className="text-xs">Total Loan Amount (incl. MIP): {formatCurrency(totalLoanWithMip)}</p>
                             <p className="text-xs mt-2 font-semibold text-destructive">Note: MIP rates and calculation details can change. Verify with official FHA guidelines and lenders.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
