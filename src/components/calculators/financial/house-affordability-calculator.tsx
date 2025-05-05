
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
import { Calculator, Star, Home, Wallet } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for House Affordability Calculator
const affordabilitySchema = z.object({
    annualGrossIncome: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Annual gross income must be positive.",
    }),
    monthlyDebts: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Total monthly debt payments must be zero or positive.",
    }), // Includes loans, credit cards, etc. (excluding potential mortgage)
    downPayment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Down payment must be zero or positive.",
    }),
    interestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Estimated mortgage interest rate must be zero or positive.",
    }),
    loanTerm: z.enum(['15', '30']).default('30'), // Common terms
    propertyTaxRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "Annual property tax rate must be between 0 and 100.",
    }).optional().default("1.2"), // National average approx 1.1-1.2%
    homeInsuranceRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "Annual home insurance rate must be between 0 and 100.",
    }).optional().default("0.5"), // Rough estimate as % of home value
     // Debt-to-Income Ratios (Lender guidelines vary, common examples)
     frontEndRatioLimit: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 100, {}).default("28"), // Housing cost / Gross Income
     backEndRatioLimit: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 100, {}).default("36"), // Total Debt / Gross Income (sometimes up to 43% or 50%)
});

type AffordabilityFormValues = z.infer<typeof affordabilitySchema>;

interface HouseAffordabilityCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function HouseAffordabilityCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: HouseAffordabilityCalculatorProps) {
    const [affordableHomePrice, setAffordableHomePrice] = React.useState<number | null>(null);
    const [maxMonthlyPayment, setMaxMonthlyPayment] = React.useState<number | null>(null);
    const [limitingFactor, setLimitingFactor] = React.useState<'front_end' | 'back_end' | null>(null);
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

    const form = useForm<AffordabilityFormValues>({
        resolver: zodResolver(affordabilitySchema),
        defaultValues: {
            annualGrossIncome: '',
            monthlyDebts: '',
            downPayment: '',
            interestRate: '',
            loanTerm: '30',
            propertyTaxRate: '1.2',
            homeInsuranceRate: '0.5',
            frontEndRatioLimit: '28',
            backEndRatioLimit: '36',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset({ loanTerm: '30', propertyTaxRate: '1.2', homeInsuranceRate: '0.5', frontEndRatioLimit: '28', backEndRatioLimit: '36' });
            setAffordableHomePrice(null);
            setMaxMonthlyPayment(null);
            setLimitingFactor(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; // Often show affordability rounded
    }, [currency.symbol]);

     // Calculate Affordable Home Price
    const calculateAffordability = (values: AffordabilityFormValues): { price: number; maxPayment: number; limit: 'front_end' | 'back_end'} | null => {
        const annualIncome = parseFloat(values.annualGrossIncome);
        const monthlyDebts = parseFloat(values.monthlyDebts);
        const downPayment = parseFloat(values.downPayment);
        const annualRate = parseFloat(values.interestRate) / 100;
        const termYears = parseInt(values.loanTerm);
        const taxRateAnnual = parseFloat(values.propertyTaxRate || '0') / 100;
        const insuranceRateAnnual = parseFloat(values.homeInsuranceRate || '0') / 100;
        const frontEndLimit = parseFloat(values.frontEndRatioLimit) / 100;
        const backEndLimit = parseFloat(values.backEndRatioLimit) / 100;

        if (isNaN(annualIncome) || annualIncome <= 0 || isNaN(monthlyDebts) || monthlyDebts < 0 || isNaN(downPayment) || downPayment < 0 || isNaN(annualRate) || annualRate < 0 || isNaN(termYears) || termYears <= 0 || isNaN(taxRateAnnual) || isNaN(insuranceRateAnnual) || isNaN(frontEndLimit) || isNaN(backEndLimit)) {
            return null;
        }

        const monthlyIncome = annualIncome / 12;
        const monthlyRate = annualRate / 12;
        const numberOfPayments = termYears * 12;

        // 1. Calculate max monthly PITI based on Front-End Ratio (Housing Costs)
        const maxPITI_frontEnd = monthlyIncome * frontEndLimit;

        // 2. Calculate max monthly PITI based on Back-End Ratio (Total Debts)
        const maxTotalDebtPayment_backEnd = monthlyIncome * backEndLimit;
        const maxPITI_backEnd = maxTotalDebtPayment_backEnd - monthlyDebts;

        // 3. Determine the limiting max PITI
        const maxAffordablePITI = Math.max(0, Math.min(maxPITI_frontEnd, maxPITI_backEnd)); // Cannot be negative
        const limitFactor = maxPITI_frontEnd <= maxPITI_backEnd ? 'front_end' : 'back_end';

        // 4. Estimate max loan amount based on max PITI
        // PITI = P&I + T + I
        // Need to back-calculate P&I from PITI
        // PITI ≈ P&I + (HomePrice * taxRate / 12) + (HomePrice * insuranceRate / 12)
        // This requires relating P&I back to HomePrice/LoanAmount, creating a loop.
        // We need iterative approach or simplification.

        // Simplification: Assume T&I are a percentage of the *loan payment* P&I (less accurate but avoids iteration here)
        // Or, more commonly: Iterate to find the home price where the calculated PITI matches maxAffordablePITI

        // Iterative Approach: Guess a home price, calculate PITI, adjust guess.
        let lowPrice = downPayment; // Minimum possible price is down payment
        let highPrice = annualIncome * 10; // Generous upper bound guess
        let affordablePrice = lowPrice;
        const iterations = 100;
        const tolerance = 100; // Stop when price difference is small ($100)

        for (let i = 0; i < iterations; i++) {
            const guessPrice = (lowPrice + highPrice) / 2;
            const guessLoanAmount = Math.max(0, guessPrice - downPayment);

            // Calculate P&I for the guess loan amount
            let piPayment: number;
            if (monthlyRate === 0) {
                piPayment = guessLoanAmount / numberOfPayments;
            } else {
                piPayment = guessLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
                 if (!isFinite(piPayment)) piPayment = 0; // Handle potential division by zero if rate is ~ -1/month
            }


             // Calculate estimated T&I based on guess price
            const monthlyTaxes = (guessPrice * taxRateAnnual) / 12;
            const monthlyInsurance = (guessPrice * insuranceRateAnnual) / 12;

            const calculatedPITI = piPayment + monthlyTaxes + monthlyInsurance;

            if (Math.abs(calculatedPITI - maxAffordablePITI) < tolerance * monthlyRate + 1 || highPrice - lowPrice < tolerance) { // Check if close enough
                 affordablePrice = guessPrice;
                break;
            }

            if (calculatedPITI > maxAffordablePITI) {
                highPrice = guessPrice; // Guess was too high
            } else {
                lowPrice = guessPrice; // Guess was too low
            }
             affordablePrice = guessPrice; // Keep track of last guess
        }

         // Ensure affordability isn't negative or just the down payment if calculation fails low
         affordablePrice = Math.max(downPayment, affordablePrice);


        return { price: affordablePrice, maxPayment: maxAffordablePITI, limit: limitFactor };
    };


    const onSubmit: SubmitHandler<AffordabilityFormValues> = (data) => {
        const result = calculateAffordability(data);
        if (result) {
            setAffordableHomePrice(result.price);
            setMaxMonthlyPayment(result.maxPayment);
            setLimitingFactor(result.limit);

            const inputString = `Income: ${formatCurrency(parseFloat(data.annualGrossIncome))}/yr, Debts: ${formatCurrency(parseFloat(data.monthlyDebts))}/mo, Down: ${formatCurrency(parseFloat(data.downPayment))}, Rate: ${data.interestRate}%, Term: ${data.loanTerm}yrs, Ratios: ${data.frontEndRatioLimit}/${data.backEndRatioLimit}`;
            const resultString = `Affordable Home Price: ~${formatCurrency(result.price)}, Max Monthly PITI: ~${formatCurrency(result.maxPayment)} (Limited by ${result.limit === 'front_end' ? 'Front-End DTI' : 'Back-End DTI'})`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setAffordableHomePrice(null);
            setMaxMonthlyPayment(null);
            setLimitingFactor(null);
             form.setError("root", {message: "Calculation failed. Check inputs."})
            console.error("Calculation failed. Check inputs.");
        }
    };

    // Skeleton Loader
    if (!mounted) {
        return (
            <Card className="w-full max-w-xl mx-auto"> {/* Slightly Wider */}
                <CardHeader className="relative">
                    <Skeleton className="absolute top-3 right-3 h-7 w-7 rounded-full" />
                    <div className="flex items-center gap-2 pr-10"><Skeleton className="h-6 w-6" /><Skeleton className="h-6 w-3/4" /></div>
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                 <CardContent className="space-y-6">
                      {/* Input Skeletons in Grid */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                     </div>
                     {/* Ratio Skeletons */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
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
         <Card className="w-full max-w-xl mx-auto"> {/* Slightly Wider Card */}
            <CardHeader className="relative">
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="annualGrossIncome" render={({ field }) => (<FormItem><FormLabel>Annual Gross Income ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 80000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="monthlyDebts" render={({ field }) => (<FormItem><FormLabel>Total Monthly Debts ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="Loans, CC min payments (excl. rent/mortgage)" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="downPayment" render={({ field }) => (<FormItem><FormLabel>Down Payment ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 20000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="interestRate" render={({ field }) => (<FormItem><FormLabel>Est. Mortgage Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 6.8" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="loanTerm" render={({ field }) => (<FormItem><FormLabel>Loan Term</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger></FormControl><SelectContent><SelectItem value="30">30 Years</SelectItem><SelectItem value="15">15 Years</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="propertyTaxRate" render={({ field }) => (<FormItem><FormLabel>Est. Property Tax (%/yr)</FormLabel><FormControl><Input type="number" placeholder="e.g., 1.2" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="homeInsuranceRate" render={({ field }) => (<FormItem><FormLabel>Est. Home Insurance (%/yr)</FormLabel><FormControl><Input type="number" placeholder="e.g., 0.5" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        {/* DTI Ratio Limits */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                             <FormField control={form.control} name="frontEndRatioLimit" render={({ field }) => (<FormItem><FormLabel>Max Front-End DTI (%)</FormLabel><FormControl><Input type="number" {...field} step="any" min="1" max="100"/></FormControl><FormDescription className="text-xs">Max housing cost / income.</FormDescription><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="backEndRatioLimit" render={({ field }) => (<FormItem><FormLabel>Max Back-End DTI (%)</FormLabel><FormControl><Input type="number" {...field} step="any" min="1" max="100"/></FormControl><FormDescription className="text-xs">Max total debt / income.</FormDescription><FormMessage /></FormItem>)} />
                         </div>

                          {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Estimate Affordability</Button>
                    </form>
                </Form>

                {affordableHomePrice !== null && maxMonthlyPayment !== null && limitingFactor && (
                    <Alert className="mt-6">
                         <Home className="h-4 w-4" />
                         <AlertTitle>Estimated House Affordability ({currency.code})</AlertTitle>
                         <AlertDescription>
                            <p>Affordable Home Price: ~<strong>{formatCurrency(affordableHomePrice)}</strong></p>
                            <p>Maximum Monthly PITI Payment: ~<strong>{formatCurrency(maxMonthlyPayment)}</strong></p>
                             <p className="text-xs mt-1">Limited by: {limitingFactor === 'front_end' ? 'Front-End (Housing Cost)' : 'Back-End (Total Debt)'} Ratio Limit ({limitingFactor === 'front_end' ? form.watch('frontEndRatioLimit') : form.watch('backEndRatioLimit')}%)</p>
                            <p className="text-xs mt-2 text-muted-foreground">This is an estimate based on common lending guidelines. Your actual affordability may vary based on credit score, lender policies, and other factors.</p>
                         </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
