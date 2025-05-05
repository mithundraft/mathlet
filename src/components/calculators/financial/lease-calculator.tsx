
'use client';

// Generic Lease Payment Calculator (can be adapted for equipment, property etc.)
// Similar logic to Auto Lease but more generalized inputs.
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, FileText as FileTextIcon, HandCoins } from 'lucide-react'; // Use generic FileText
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Generic Lease Calculator
const leaseSchema = z.object({
    assetCost: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Asset cost must be a positive number.",
    }),
    residualValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Residual value must be zero or positive.",
    }),
    leaseTermMonths: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Lease term must be a positive integer (months).",
    }),
    interestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Implicit interest rate (APR) must be zero or positive.",
    }), // Often implicit in lease factor, but needed for calculation
     // Optional fields
     downPayment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"),
     salesTaxRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {}).optional().default("0"),
}).superRefine((data, ctx) => {
    const cost = parseFloat(data.assetCost);
    const residual = parseFloat(data.residualValue);
    if (!isNaN(cost) && !isNaN(residual) && residual > cost) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Residual value cannot be greater than the asset cost.",
            path: ["residualValue"],
        });
    }
});


type LeaseFormValues = z.infer<typeof leaseSchema>;

interface LeaseCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function LeaseCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: LeaseCalculatorProps) {
    const [monthlyPayment, setMonthlyPayment] = React.useState<number | null>(null);
    const [monthlyPaymentAfterTax, setMonthlyPaymentAfterTax] = React.useState<number | null>(null);
    const [totalLeaseCost, setTotalLeaseCost] = React.useState<number | null>(null);
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

    const form = useForm<LeaseFormValues>({
        resolver: zodResolver(leaseSchema),
        defaultValues: {
            assetCost: '',
            residualValue: '',
            leaseTermMonths: '',
            interestRate: '',
            downPayment: '0',
            salesTaxRate: '0',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({ downPayment: '0', salesTaxRate: '0' });
            setMonthlyPayment(null);
             setMonthlyPaymentAfterTax(null);
             setTotalLeaseCost(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Lease Payment
    const calculateLease = (values: LeaseFormValues): { monthly: number; monthlyAfterTax: number; total: number } | null => {
        const cost = parseFloat(values.assetCost);
        const residual = parseFloat(values.residualValue);
        const term = parseInt(values.leaseTermMonths);
        const annualRate = parseFloat(values.interestRate) / 100;
        const down = parseFloat(values.downPayment || '0');
        const taxRate = parseFloat(values.salesTaxRate || '0') / 100;

        if (isNaN(cost) || cost <= 0 || isNaN(residual) || residual < 0 || isNaN(term) || term <= 0 || isNaN(annualRate) || annualRate < 0 || isNaN(down) || isNaN(taxRate) || residual > cost) {
            return null;
        }

        const capitalizedCost = cost - down; // Net cost after down payment
        const depreciation = capitalizedCost - residual;
        const monthlyRate = annualRate / 12;

        // Lease payment has two main components: Depreciation and Finance Charge

        // 1. Monthly Depreciation Charge
        const monthlyDepreciation = depreciation / term;

        // 2. Monthly Finance Charge (using average value method)
        // Finance Charge = (Capitalized Cost + Residual Value) * Money Factor
        // Money Factor ≈ Annual Rate / 2400 (This is an approximation, true MF depends on lender)
        // Or calculate based on PV formulas if rate is known precisely.
        // Using the interest rate approach: Finance charge is interest on the average depreciating balance.
        // Let's use a more standard formula involving PV:
        // Payment = (PV * i * (1+i)^n) / ((1+i)^n - 1) for loan part
        // Need PV of residual: PV_residual = Residual / (1+i)^n
        // Need PV of depreciation: PV_depreciation = Cost - Down - PV_residual
        // Then calculate payment on PV_depreciation like a loan payment.

         let financeChargePart: number;
         let depreciationPart: number;
         let preTaxMonthlyPayment: number;

        if (monthlyRate === 0) {
            depreciationPart = depreciation / term;
             financeChargePart = 0;
             preTaxMonthlyPayment = depreciationPart;
        } else {
            // Calculate payment required to pay off the depreciation amount over the term
            const pv_residual = residual / Math.pow(1 + monthlyRate, term);
            const pv_depreciation = capitalizedCost - pv_residual;

            // Payment on the depreciation portion (like loan payment on pv_depreciation)
            depreciationPart = pv_depreciation * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);

            // Payment related to the interest on the residual value (simplified)
            // Correct finance charge calculation is complex. A common method:
             financeChargePart = (capitalizedCost + residual) * (annualRate / 24); // Using rate/2400 approx for MF

             // Alternative Finance Charge (Interest on Average Balance - Approximation)
             // const avgBalance = (capitalizedCost + residual) / 2;
             // financeChargePart = avgBalance * monthlyRate; // Less accurate


            // More accurate PVIFA approach:
             // Payment = (PV_Depreciation + PV_Interest) / PVIFA ??? No.
             // Let's stick to the common formula: Depreciation + Finance Charge

             // Recalculate finance charge based on rate explicitly:
             // Finance Charge = (Cap Cost + Residual) * Money Factor where MF = rate / 24
              financeChargePart = (capitalizedCost + residual) * (annualRate / 24);

              preTaxMonthlyPayment = monthlyDepreciation + financeChargePart;


        }


        const monthlyTax = preTaxMonthlyPayment * taxRate;
        const monthlyPaymentWithTax = preTaxMonthlyPayment + monthlyTax;
        const totalCost = (monthlyPaymentWithTax * term) + down;


        return {
            monthly: preTaxMonthlyPayment,
            monthlyAfterTax: monthlyPaymentWithTax,
            total: totalCost
        };
    };


    const onSubmit: SubmitHandler<LeaseFormValues> = (data) => {
        const result = calculateLease(data);
        if (result) {
            setMonthlyPayment(result.monthly);
            setMonthlyPaymentAfterTax(result.monthlyAfterTax);
            setTotalLeaseCost(result.total);

            const inputString = `Cost: ${formatCurrency(parseFloat(data.assetCost))}, Residual: ${formatCurrency(parseFloat(data.residualValue))}, Term: ${data.leaseTermMonths} mo, Rate: ${data.interestRate}%, Down: ${formatCurrency(parseFloat(data.downPayment || '0'))}, Tax: ${data.salesTaxRate || '0'}%`;
            const resultString = `Est. Monthly Payment (Before Tax): ${formatCurrency(result.monthly)}, Monthly (After Tax): ${formatCurrency(result.monthlyAfterTax)}, Total Lease Cost: ${formatCurrency(result.total)}`;

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
             setMonthlyPaymentAfterTax(null);
             setTotalLeaseCost(null);
             form.setError("root", {message: "Calculation failed. Check inputs."});
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="assetCost" render={({ field }) => (<FormItem><FormLabel>Asset Cost ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 30000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="residualValue" render={({ field }) => (<FormItem><FormLabel>Residual Value ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 15000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="leaseTermMonths" render={({ field }) => (<FormItem><FormLabel>Lease Term (Months)</FormLabel><FormControl><Input type="number" placeholder="e.g., 36" {...field} step="1" min="1" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="interestRate" render={({ field }) => (<FormItem><FormLabel>Interest Rate (APR %)</FormLabel><FormControl><Input type="number" placeholder="e.g., 5.0" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="downPayment" render={({ field }) => (<FormItem><FormLabel>Down Payment ({currency.symbol}) <small>(Optional)</small></FormLabel><FormControl><Input type="number" placeholder="e.g., 2000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="salesTaxRate" render={({ field }) => (<FormItem><FormLabel>Sales Tax Rate (%) <small>(Optional)</small></FormLabel><FormControl><Input type="number" placeholder="e.g., 7" {...field} step="any" min="0" max="100"/></FormControl><FormMessage /></FormItem>)} />
                        </div>
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Lease Payment</Button>
                    </form>
                </Form>

                {monthlyPaymentAfterTax !== null && monthlyPayment !== null && totalLeaseCost !== null && (
                    <Alert className="mt-6">
                        <HandCoins className="h-4 w-4" />
                        <AlertTitle>Estimated Lease Summary ({currency.code})</AlertTitle>
                        <AlertDescription>
                             <p>Est. Monthly Payment (Before Tax): <strong>{formatCurrency(monthlyPayment)}</strong></p>
                             <p>Est. Monthly Payment (After Tax): <strong>{formatCurrency(monthlyPaymentAfterTax)}</strong></p>
                             <p>Total Lease Cost (incl. Down Payment): <strong>{formatCurrency(totalLeaseCost)}</strong></p>
                             <p className="text-xs mt-2 text-muted-foreground">Note: Calculation uses approximations for finance charge. Doesn't include acquisition/disposition fees or other charges. Tax calculation may vary.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
