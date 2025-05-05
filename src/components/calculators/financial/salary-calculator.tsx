
'use client';

// IMPORTANT: Salary calculations are highly complex due to varying tax laws (federal, state, local),
// deductions (pre-tax, post-tax), benefits (insurance, retirement), and other factors.
// This calculator provides a VERY simplified estimate. Use official payroll calculators or
// consult with HR/payroll/tax professionals for accuracy.
// THIS IS FOR ILLUSTRATIVE PURPOSES ONLY AND NOT FINANCIAL ADVICE.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Wallet2, Receipt, AlertTriangle } from 'lucide-react'; // Using Wallet2
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema - Simplified
const salarySchema = z.object({
    grossAnnualSalary: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Gross annual salary must be zero or positive.",
    }),
    payFrequency: z.enum(['weekly', 'bi-weekly', 'semi-monthly', 'monthly']).default('bi-weekly'),
    // Very simplified tax and deductions
    effectiveTaxRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "Effective tax rate (all taxes) must be between 0 and 100.",
    }).optional().default("20"), // Example combined rate
    preTaxDeductionsPercent: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {}).optional().default("5"), // e.g., 401k %
    postTaxDeductionsFixed: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"), // e.g., Fixed health insurance premium per paycheck
});

type SalaryFormValues = z.infer<typeof salarySchema>;

interface SalaryCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function SalaryCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: SalaryCalculatorProps) {
    const [netPayPerPeriod, setNetPayPerPeriod] = React.useState<number | null>(null);
    const [grossPayPerPeriod, setGrossPayPerPeriod] = React.useState<number | null>(null);
    const [taxesPerPeriod, setTaxesPerPeriod] = React.useState<number | null>(null);
    const [deductionsPerPeriod, setDeductionsPerPeriod] = React.useState<number | null>(null);
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

    const form = useForm<SalaryFormValues>({
        resolver: zodResolver(salarySchema),
        defaultValues: {
            grossAnnualSalary: '',
            payFrequency: 'bi-weekly',
            effectiveTaxRate: '20',
            preTaxDeductionsPercent: '5',
            postTaxDeductionsFixed: '0',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({ payFrequency: 'bi-weekly', effectiveTaxRate: '20', preTaxDeductionsPercent: '5', postTaxDeductionsFixed: '0' });
            setNetPayPerPeriod(null);
            setGrossPayPerPeriod(null);
            setTaxesPerPeriod(null);
            setDeductionsPerPeriod(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateNetSalary = (values: SalaryFormValues): { net: number; grossPeriod: number; taxes: number; deductions: number } | null => {
        const annualGross = parseFloat(values.grossAnnualSalary);
        const payFreq = values.payFrequency;
        const taxRate = parseFloat(values.effectiveTaxRate || '0') / 100;
        const preTaxDedPercent = parseFloat(values.preTaxDeductionsPercent || '0') / 100;
        const postTaxDedFixed = parseFloat(values.postTaxDeductionsFixed || '0');

        if (isNaN(annualGross) || annualGross < 0) return null;

        let periodsPerYear: number;
        switch (payFreq) {
            case 'weekly': periodsPerYear = 52; break;
            case 'bi-weekly': periodsPerYear = 26; break;
            case 'semi-monthly': periodsPerYear = 24; break;
            case 'monthly': periodsPerYear = 12; break;
            default: return null;
        }

        const grossPerPeriod = annualGross / periodsPerYear;
        const preTaxDedAmount = grossPerPeriod * preTaxDedPercent;
        const taxableIncome = Math.max(0, grossPerPeriod - preTaxDedAmount);
        const estimatedTaxes = taxableIncome * taxRate; // Simplified tax
        const totalDeductions = preTaxDedAmount + postTaxDedFixed;
        const netPay = grossPerPeriod - estimatedTaxes - totalDeductions; // Note: This isn't quite right, taxes calculated on taxable income.

        // Recalculate net pay correctly
        const netPayCorrected = taxableIncome - estimatedTaxes - postTaxDedFixed;


        return {
            net: netPayCorrected,
            grossPeriod: grossPerPeriod,
            taxes: estimatedTaxes,
            deductions: totalDeductions
        };
    };

    const onSubmit: SubmitHandler<SalaryFormValues> = (data) => {
        const result = calculateNetSalary(data);
        if (result) {
            setNetPayPerPeriod(result.net);
            setGrossPayPerPeriod(result.grossPeriod);
            setTaxesPerPeriod(result.taxes);
            setDeductionsPerPeriod(result.deductions);


            const inputString = `Annual Gross: ${formatCurrency(parseFloat(data.grossAnnualSalary))}, Freq: ${data.payFrequency}, Tax Rate: ${data.effectiveTaxRate}%, Pre-Tax Ded: ${data.preTaxDeductionsPercent}%, Post-Tax Ded: ${formatCurrency(parseFloat(data.postTaxDeductionsFixed || '0'))}`;
            const resultString = `Est. Net Pay/Period: ${formatCurrency(result.net)}, Gross/Period: ${formatCurrency(result.grossPeriod)}, Taxes/Period: ${formatCurrency(result.taxes)}, Deductions/Period: ${formatCurrency(result.deductions)}`;

            const historyEntry: HistoryEntry = { id: Date.now().toString(), calculatorSlug: slug, timestamp: new Date(), input: inputString, result: resultString };
            onCalculation(historyEntry);
        } else {
            setNetPayPerPeriod(null);
            setGrossPayPerPeriod(null);
            setTaxesPerPeriod(null);
            setDeductionsPerPeriod(null);
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
                     </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <Skeleton className="h-10 w-full" />
                           <Skeleton className="h-10 w-full" />
                       </div>
                    <Skeleton className="h-10 w-full" /> {/* Button Skeleton */}
                    <Skeleton className="mt-6 h-24 w-full" /> {/* Result Skeleton */}
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
                             <FormField control={form.control} name="grossAnnualSalary" render={({ field }) => (<FormItem><FormLabel>Annual Gross Salary ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 75000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="payFrequency" render={({ field }) => (<FormItem><FormLabel>Pay Frequency</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="bi-weekly">Bi-Weekly</SelectItem><SelectItem value="semi-monthly">Semi-Monthly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="effectiveTaxRate" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Est. Effective Tax Rate (%)</FormLabel><FormControl><Input type="number" placeholder="Total % (Fed+State+Local+FICA)" {...field} step="any" min="0" max="100"/></FormControl><FormMessage /></FormItem>)} />
                         </div>
                          {/* Deductions */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                              <FormField control={form.control} name="preTaxDeductionsPercent" render={({ field }) => (<FormItem><FormLabel>Pre-Tax Deductions (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 5 (for 401k, etc.)" {...field} step="any" min="0" max="100" /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="postTaxDeductionsFixed" render={({ field }) => (<FormItem><FormLabel>Post-Tax Deductions ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="Fixed amount per paycheck" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                          {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Estimate Net Pay</Button>
                    </form>
                </Form>

                 {netPayPerPeriod !== null && grossPayPerPeriod !== null && taxesPerPeriod !== null && deductionsPerPeriod !== null && (
                    <Alert className="mt-6">
                         <Receipt className="h-4 w-4" />
                         <AlertTitle>Estimated Paycheck Summary ({currency.code})</AlertTitle>
                         <AlertDescription className="space-y-1">
                             <p>Gross Pay per Period: <strong>{formatCurrency(grossPayPerPeriod)}</strong></p>
                             <p>Est. Pre-Tax Deductions: {formatCurrency(grossPayPerPeriod * (parseFloat(form.getValues('preTaxDeductionsPercent')||'0')/100))}</p>
                             <p>Est. Taxes (Simplified): {formatCurrency(taxesPerPeriod)}</p>
                             <p>Est. Post-Tax Deductions: {formatCurrency(parseFloat(form.getValues('postTaxDeductionsFixed')||'0'))}</p>
                             <p>Estimated Net Pay (Take-Home): <strong className="text-lg">{formatCurrency(netPayPerPeriod)}</strong></p>
                             <p className="text-xs mt-2 font-semibold text-destructive">Disclaimer: Highly simplified estimate. Actual net pay depends on precise tax withholding (W-4, state/local rules), FICA taxes (Social Security/Medicare), benefit costs, and other deductions. Use for rough planning only.</p>
                         </AlertDescription>
                    </Alert>
                )}
                   {!netPayPerPeriod && (
                     <Alert variant="destructive" className="mt-6">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Important Note</AlertTitle>
                         <AlertDescription>
                              Accurate salary calculation requires detailed tax information specific to your location, filing status, and W-4 elections, plus exact deduction amounts. This tool uses a simplified effective tax rate. Consult official payroll calculators or your HR/payroll department for precise figures.
                         </AlertDescription>
                    </Alert>
                  )}
            </CardContent>
        </Card>
    );
}
