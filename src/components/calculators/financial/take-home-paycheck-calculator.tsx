
'use client';

// IMPORTANT: Paycheck calculations are highly complex due to federal, state, and local taxes,
// pre-tax deductions (401k, health insurance), post-tax deductions (Roth 401k, garnishments),
// filing status, allowances/dependents, etc. This is a MAJOR SIMPLIFICATION.
// THIS IS FOR ILLUSTRATIVE PURPOSES ONLY AND NOT ACCURATE TAX CALCULATION.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Wallet2, Receipt, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema - Highly Simplified
const paycheckSchema = z.object({
    grossPay: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Gross pay amount must be zero or positive.",
    }),
    payFrequency: z.enum(['weekly', 'bi-weekly', 'semi-monthly', 'monthly']).default('bi-weekly'),
    federalFilingStatus: z.enum(['single', 'married_jointly' /* , 'married_separately', 'hoh' */ ]).default('single'), // Simplified
    // VERY Simplified Tax Estimate
    effectiveTaxRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "Effective tax rate must be between 0 and 100.",
    }).optional().default("15"), // Example default effective rate
     // Simplified Deductions
     preTaxDeductions: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"),
     postTaxDeductions: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"),

});

type PaycheckFormValues = z.infer<typeof paycheckSchema>;

interface TakeHomePaycheckCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function TakeHomePaycheckCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: TakeHomePaycheckCalculatorProps) {
    const [netPay, setNetPay] = React.useState<number | null>(null);
    const [totalTaxes, setTotalTaxes] = React.useState<number | null>(null);
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

    const form = useForm<PaycheckFormValues>({
        resolver: zodResolver(paycheckSchema),
        defaultValues: {
            grossPay: '',
            payFrequency: 'bi-weekly',
            federalFilingStatus: 'single',
            effectiveTaxRate: '15',
            preTaxDeductions: '0',
            postTaxDeductions: '0',
        },
    });

    React.useEffect(() => {
        if (mounted) {
             form.reset({ payFrequency: 'bi-weekly', federalFilingStatus: 'single', effectiveTaxRate: '15', preTaxDeductions: '0', postTaxDeductions: '0' });
            setNetPay(null);
             setTotalTaxes(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Simplified Take-Home Pay
    const calculateNetPay = (values: PaycheckFormValues): { net: number; taxes: number } | null => {
        const gross = parseFloat(values.grossPay);
        const preTaxDed = parseFloat(values.preTaxDeductions || '0');
        const postTaxDed = parseFloat(values.postTaxDeductions || '0');
        const taxRate = parseFloat(values.effectiveTaxRate || '0') / 100;

        if (isNaN(gross) || gross < 0 || isNaN(preTaxDed) || isNaN(postTaxDed) || isNaN(taxRate)) {
            return null;
        }

        const taxableIncome = Math.max(0, gross - preTaxDed);
        const estimatedTaxes = taxableIncome * taxRate; // Highly simplified tax calculation
        const netPayCalc = taxableIncome - estimatedTaxes - postTaxDed;

        return { net: netPayCalc, taxes: estimatedTaxes };
    };

    const onSubmit: SubmitHandler<PaycheckFormValues> = (data) => {
        const result = calculateNetPay(data);
        if (result) {
            setNetPay(result.net);
            setTotalTaxes(result.taxes);

            const inputString = `Gross: ${formatCurrency(parseFloat(data.grossPay))} (${data.payFrequency}), Status: ${data.federalFilingStatus}, Eff. Tax Rate: ${data.effectiveTaxRate}%, Pre-Tax Ded: ${formatCurrency(parseFloat(data.preTaxDeductions || '0'))}, Post-Tax Ded: ${formatCurrency(parseFloat(data.postTaxDeductions || '0'))}`;
            const resultString = `Estimated Net Pay: ${formatCurrency(result.net)}, Estimated Taxes: ${formatCurrency(result.taxes)}`;

            const historyEntry: HistoryEntry = { id: Date.now().toString(), calculatorSlug: slug, timestamp: new Date(), input: inputString, result: resultString };
            onCalculation(historyEntry);
        } else {
            setNetPay(null);
            setTotalTaxes(null);
             form.setError("root", { message: "Calculation failed. Check inputs." });
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
                     </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <Skeleton className="h-10 w-full" />
                           <Skeleton className="h-10 w-full" />
                       </div>
                    <Skeleton className="h-10 w-full" /> {/* Button Skeleton */}
                    <Skeleton className="mt-6 h-20 w-full" /> {/* Result Skeleton */}
                     <Skeleton className="h-16 w-full" /> {/* Disclaimer Skeleton */}
                </CardContent>
            </Card>
        );
    }


    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="relative">
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description} <strong className='text-destructive'>(Simplified Estimate)</strong></CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="grossPay" render={({ field }) => (<FormItem><FormLabel>Gross Pay per Period ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 3000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="payFrequency" render={({ field }) => (<FormItem><FormLabel>Pay Frequency</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="bi-weekly">Bi-Weekly</SelectItem><SelectItem value="semi-monthly">Semi-Monthly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="federalFilingStatus" render={({ field }) => (<FormItem><FormLabel>Federal Filing Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="married_jointly">Married Filing Jointly</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="effectiveTaxRate" render={({ field }) => (<FormItem><FormLabel>Est. Effective Tax Rate (%)</FormLabel><FormControl><Input type="number" placeholder="Overall rate (Fed+State+Local)" {...field} step="any" min="0" max="100"/></FormControl><FormMessage /></FormItem>)} />
                        </div>
                         {/* Deductions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                             <FormField control={form.control} name="preTaxDeductions" render={({ field }) => (<FormItem><FormLabel>Pre-Tax Deductions ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="401k, health ins., etc." {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="postTaxDeductions" render={({ field }) => (<FormItem><FormLabel>Post-Tax Deductions ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="Roth 401k, garnishments" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         </div>

                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Estimate Net Pay</Button>
                    </form>
                </Form>

                {netPay !== null && totalTaxes !== null && (
                    <Alert className="mt-6">
                         <Receipt className="h-4 w-4" />
                        <AlertTitle>Estimated Paycheck Summary ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Estimated Net Pay (Take-Home): <strong>{formatCurrency(netPay)}</strong></p>
                            <p>Estimated Total Taxes (Simplified): <strong>{formatCurrency(totalTaxes)}</strong></p>
                             <p className="text-xs mt-2 font-semibold text-destructive">Disclaimer: This is a highly simplified estimate. Actual net pay depends on specific federal, state, and local tax withholding (based on W-4), FICA taxes (Social Security/Medicare), exact pre/post-tax deduction amounts, and other factors. Use official payroll calculators or consult a tax professional for accuracy.</p>
                        </AlertDescription>
                    </Alert>
                )}
                 {!netPay && (
                      <Alert variant="destructive" className="mt-6">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Important Note</AlertTitle>
                         <AlertDescription>
                              Accurate paycheck calculation requires detailed tax tables, withholding information (W-4), and specific deduction rules. This calculator uses a simple effective tax rate and basic deductions for a rough estimate only. For precise figures, use a dedicated payroll calculator or consult your employer/payroll provider.
                         </AlertDescription>
                    </Alert>
                  )}
            </CardContent>
        </Card>
    );
}
