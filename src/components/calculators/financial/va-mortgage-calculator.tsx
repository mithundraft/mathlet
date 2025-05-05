
'use client';

// IMPORTANT: VA loan calculations involve unique factors like the VA Funding Fee (which varies),
// potential property tax exemptions, and no PMI requirement. This calculator is a simplification.
// Consult official VA resources and VA-approved lenders for accurate details.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Home, HandCoins, ShieldCheck, AlertTriangle } from 'lucide-react'; // Using ShieldCheck for VA aspect
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


// Zod Schema for VA Loan Calculator (Simplified)
const vaLoanSchema = z.object({
  loanAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: "Loan amount must be positive." }), // Usually home price as often 0% down
  interestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Interest rate must be zero or positive." }),
  loanTerm: z.enum(['15', '20', '30']).default('30'), // Common terms
  // VA Funding Fee (Required) - Varies significantly based on service, down payment, subsequent use
  vaFundingFeePercent: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "VA Funding Fee rate must be valid." }), // User needs to input correct rate
   // Optional PITI components
  propertyTaxes: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"),
  homeownersInsurance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"),
});

type VaLoanFormValues = z.infer<typeof vaLoanSchema>;

interface VaMortgageCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function VaMortgageCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: VaMortgageCalculatorProps) {
    const [principalAndInterest, setPrincipalAndInterest] = React.useState<number | null>(null);
    const [fundingFeeAmount, setFundingFeeAmount] = React.useState<number | null>(null);
    const [estimatedTotalPayment, setEstimatedTotalPayment] = React.useState<number | null>(null); // PITI
    const [totalLoanWithFee, setTotalLoanWithFee] = React.useState<number | null>(null);
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

    const form = useForm<VaLoanFormValues>({
        resolver: zodResolver(vaLoanSchema),
        defaultValues: {
            loanAmount: '',
            interestRate: '',
            loanTerm: '30',
            vaFundingFeePercent: '', // No default - user MUST provide based on status
            propertyTaxes: '0',
            homeownersInsurance: '0',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({ loanTerm: '30', propertyTaxes: '0', homeownersInsurance: '0', vaFundingFeePercent: ''});
            setPrincipalAndInterest(null);
            setFundingFeeAmount(null);
            setEstimatedTotalPayment(null);
            setTotalLoanWithFee(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate VA Loan Payment
    const calculateVaLoan = (values: VaLoanFormValues): { pi: number; feeAmount: number; totalPayment: number; totalLoan: number; } | null => {
        const baseLoanAmount = parseFloat(values.loanAmount);
        const rate = parseFloat(values.interestRate) / 100;
        const termYears = parseInt(values.loanTerm);
        const fundingFeeRate = parseFloat(values.vaFundingFeePercent) / 100;
        const annualTaxes = parseFloat(values.propertyTaxes || '0');
        const annualInsurance = parseFloat(values.homeownersInsurance || '0');

        if (isNaN(baseLoanAmount) || baseLoanAmount <= 0 || isNaN(rate) || rate < 0 || isNaN(termYears) || termYears <= 0 || isNaN(fundingFeeRate) || fundingFeeRate < 0 || isNaN(annualTaxes) || isNaN(annualInsurance)) {
            return null;
        }

        // Calculate Funding Fee and Total Loan Amount (usually financed)
        const feeAmountCalc = baseLoanAmount * fundingFeeRate;
        const totalLoanAmount = baseLoanAmount + feeAmountCalc;

        // Calculate Principal & Interest (P&I) based on Total Loan Amount
        const monthlyRate = rate / 12;
        const numberOfPayments = termYears * 12;
        let piPayment: number;

        if (monthlyRate === 0) {
            piPayment = totalLoanAmount / numberOfPayments;
        } else {
            piPayment = totalLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
            if (!isFinite(piPayment)) return null; // Check for calculation issues
        }

        // Calculate monthly taxes and insurance
        const monthlyTaxes = annualTaxes / 12;
        const monthlyInsurance = annualInsurance / 12;

        // Calculate Total Estimated Monthly Payment (PITI) - No PMI for VA
        const totalMonthlyPayment = piPayment + monthlyTaxes + monthlyInsurance;

        return {
            pi: piPayment,
            feeAmount: feeAmountCalc,
            totalPayment: totalMonthlyPayment,
            totalLoan: totalLoanAmount,
        };
    };


    const onSubmit: SubmitHandler<VaLoanFormValues> = (data) => {
        const result = calculateVaLoan(data);
        if (result) {
            setPrincipalAndInterest(result.pi);
            setFundingFeeAmount(result.feeAmount);
            setEstimatedTotalPayment(result.totalPayment);
            setTotalLoanWithFee(result.totalLoan);


            const inputString = `Loan: ${formatCurrency(parseFloat(data.loanAmount))}, Rate: ${data.interestRate}%, Term: ${data.loanTerm} yrs, Funding Fee: ${data.vaFundingFeePercent}%, Taxes: ${formatCurrency(parseFloat(data.propertyTaxes || '0'))}/yr, Insurance: ${formatCurrency(parseFloat(data.homeownersInsurance || '0'))}/yr`;
            const resultString = `Est. Total Monthly PITI: ${formatCurrency(result.totalPayment)} (P&I: ${formatCurrency(result.pi)}, T&I: ${formatCurrency((parseFloat(data.propertyTaxes||'0')/12)+(parseFloat(data.homeownersInsurance||'0')/12))}). Funding Fee: ${formatCurrency(result.feeAmount)}. Total Loan Amt: ${formatCurrency(result.totalLoan)}.`;

            const historyEntry: HistoryEntry = { id: Date.now().toString(), calculatorSlug: slug, timestamp: new Date(), input: inputString, result: resultString };
            onCalculation(historyEntry);
        } else {
            setPrincipalAndInterest(null);
            setFundingFeeAmount(null);
            setEstimatedTotalPayment(null);
            setTotalLoanWithFee(null);
            form.setError("root", { message: "Calculation failed. Check inputs." });
            console.error("Calculation failed. Check inputs.");
        }
    };

     // Skeleton Loader
    if (!mounted) {
        return (
             <Card className="w-full max-w-xl mx-auto"> {/* Wider Card */}
                <CardHeader className="relative">
                    <Skeleton className="absolute top-3 right-3 h-7 w-7 rounded-full" />
                    <div className="flex items-center gap-2 pr-10"><Skeleton className="h-6 w-6" /><Skeleton className="h-6 w-3/4" /></div>
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                 <CardContent className="space-y-6">
                      {/* Loan Details */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                     </div>
                      {/* Fee & Optional Costs */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                           <Skeleton className="h-10 w-full" />
                           <Skeleton className="h-10 w-full" />
                           <Skeleton className="h-10 w-full" />
                       </div>
                    <Skeleton className="h-10 w-full" /> {/* Button */}
                    <Skeleton className="mt-6 h-28 w-full" /> {/* Result */}
                    <Skeleton className="h-16 w-full" /> {/* Disclaimer */}
                 </CardContent>
            </Card>
        );
    }


    return (
         <Card className="w-full max-w-xl mx-auto"> {/* Wider Card */}
            <CardHeader className="relative">
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description} <strong className='text-destructive'>(Simplified Estimate)</strong></CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          {/* Loan Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <FormField control={form.control} name="loanAmount" render={({ field }) => (<FormItem><FormLabel>Loan Amount ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 300000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="interestRate" render={({ field }) => (<FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 6.25" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="loanTerm" render={({ field }) => (<FormItem><FormLabel>Loan Term</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger></FormControl><SelectContent><SelectItem value="30">30 Years</SelectItem><SelectItem value="20">20 Years</SelectItem><SelectItem value="15">15 Years</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                          </div>
                           {/* Fee & Optional Costs */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                               <FormField control={form.control} name="vaFundingFeePercent" render={({ field }) => (<FormItem><FormLabel>VA Funding Fee (%)</FormLabel><FormControl><Input type="number" placeholder="See VA.gov for rate" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="propertyTaxes" render={({ field }) => (<FormItem><FormLabel>Property Taxes ({currency.symbol}/yr) <small>(Opt.)</small></FormLabel><FormControl><Input type="number" placeholder="e.g., 3500" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="homeownersInsurance" render={({ field }) => (<FormItem><FormLabel>Home Insurance ({currency.symbol}/yr) <small>(Opt.)</small></FormLabel><FormControl><Input type="number" placeholder="e.g., 1000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                           {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate VA Payment</Button>
                    </form>
                </Form>

                 {estimatedTotalPayment !== null && principalAndInterest !== null && fundingFeeAmount !== null && totalLoanWithFee !== null && (
                    <Alert className="mt-6">
                        <HandCoins className="h-4 w-4" />
                        <AlertTitle>Estimated VA Loan Payment ({currency.code})</AlertTitle>
                        <AlertDescription className="space-y-1">
                             <p>Est. Total Monthly Payment (PITI): <strong className="text-lg">{formatCurrency(estimatedTotalPayment)}</strong></p>
                             <p className="text-xs">Principal & Interest (P&I): {formatCurrency(principalAndInterest)}</p>
                             <p className="text-xs">Taxes & Insurance (Est. Monthly): {formatCurrency((parseFloat(form.getValues('propertyTaxes')||'0')/12) + (parseFloat(form.getValues('homeownersInsurance')||'0')/12))}</p>
                             <p className="text-xs mt-1">VA Funding Fee (Financed): {formatCurrency(fundingFeeAmount)}</p>
                             <p className="text-xs">Total Loan Amount (incl. Funding Fee): {formatCurrency(totalLoanWithFee)}</p>
                             <p className="text-xs mt-2 font-semibold text-destructive">Disclaimer: This is an estimate. VA Funding Fee percentage varies based on service history, down payment (if any), and prior VA loan use. Property taxes and insurance are estimates. Consult official VA resources and a VA-approved lender.</p>
                        </AlertDescription>
                    </Alert>
                )}
                  {!estimatedTotalPayment && (
                     <Alert variant="destructive" className="mt-6">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Important Note</AlertTitle>
                         <AlertDescription>
                              VA loan calculations depend on the specific VA Funding Fee applicable to your situation, which can vary significantly. This calculator requires you to input the correct fee percentage. Always verify eligibility, current fee rates, and get official loan estimates from VA-approved lenders.
                         </AlertDescription>
                    </Alert>
                  )}
            </CardContent>
        </Card>
    );
}
