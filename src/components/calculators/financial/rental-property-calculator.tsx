
'use client';

// IMPORTANT: Rental property analysis is complex, involving financing, vacancy, repairs,
// management fees, taxes, appreciation, etc. This is a highly simplified example focusing
// on basic cash flow and Cash-on-Cash Return.
// THIS IS FOR ILLUSTRATIVE PURPOSES ONLY AND NOT INVESTMENT ADVICE.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Hotel, LineChart, Percent, AlertTriangle } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Simplified Rental Property Calculator
const rentalSchema = z.object({
    // Property Info
    purchasePrice: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: "Purchase price must be positive." }),
    downPaymentPercent: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, { message: "Down payment % must be 0-100." }),
    closingCosts: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"),
    initialRepairs: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"),

    // Income
    monthlyRent: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Monthly rent must be zero or positive." }),
    otherMonthlyIncome: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"),

    // Expenses (Monthly Estimates)
    propertyTaxes: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"),
    insurance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"),
    vacancyRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {}).optional().default("5"), // %
    repairsMaintenance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"), // Can be % or fixed
    propertyManagement: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"), // Can be % or fixed
    hoaFees: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"),
    otherExpenses: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional().default("0"),

    // Financing (Optional)
    loanInterestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {}).optional(),
    loanTerm: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {}).optional(),
});

type RentalFormValues = z.infer<typeof rentalSchema>;

interface RentalPropertyCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

interface RentalResult {
    noi: number; // Net Operating Income
    monthlyCashFlow: number;
    cashOnCashReturn: number | null; // Can be null if total cash invested is zero or negative
    capRate: number;
}

export function RentalPropertyCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: RentalPropertyCalculatorProps) {
    const [result, setResult] = React.useState<RentalResult | null>(null);
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

    const form = useForm<RentalFormValues>({
        resolver: zodResolver(rentalSchema),
        defaultValues: {
            purchasePrice: '', downPaymentPercent: '20', closingCosts: '0', initialRepairs: '0',
            monthlyRent: '', otherMonthlyIncome: '0',
            propertyTaxes: '0', insurance: '0', vacancyRate: '5', repairsMaintenance: '0', propertyManagement: '0', hoaFees: '0', otherExpenses: '0',
            loanInterestRate: '', loanTerm: '',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset({ downPaymentPercent: '20', closingCosts: '0', initialRepairs: '0', otherMonthlyIncome: '0', propertyTaxes: '0', insurance: '0', vacancyRate: '5', repairsMaintenance: '0', propertyManagement: '0', hoaFees: '0', otherExpenses: '0', loanInterestRate: '', loanTerm: '' });
            setResult(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateRentalMetrics = (values: RentalFormValues): RentalResult | null => {
        const price = parseFloat(values.purchasePrice);
        const dpPercent = parseFloat(values.downPaymentPercent) / 100;
        const closing = parseFloat(values.closingCosts || '0');
        const repairs = parseFloat(values.initialRepairs || '0');
        const rent = parseFloat(values.monthlyRent);
        const otherIncome = parseFloat(values.otherMonthlyIncome || '0');
        const taxes = parseFloat(values.propertyTaxes || '0'); // Assuming monthly
        const insurance = parseFloat(values.insurance || '0'); // Assuming monthly
        const vacancy = parseFloat(values.vacancyRate || '0') / 100;
        const repairExp = parseFloat(values.repairsMaintenance || '0'); // Assuming monthly
        const mgmtExp = parseFloat(values.propertyManagement || '0'); // Assuming monthly
        const hoa = parseFloat(values.hoaFees || '0'); // Assuming monthly
        const otherExp = parseFloat(values.otherExpenses || '0'); // Assuming monthly
        const rate = values.loanInterestRate ? parseFloat(values.loanInterestRate) / 100 : null;
        const term = values.loanTerm ? parseInt(values.loanTerm) : null;

        if (isNaN(price) || price <= 0 || isNaN(rent) || rent < 0) return null;

        // Income
        const grossMonthlyIncome = rent + otherIncome;
        const effectiveGrossMonthlyIncome = grossMonthlyIncome * (1 - vacancy);
        const annualNOI = (effectiveGrossMonthlyIncome * 12) - ((taxes + insurance + repairExp + mgmtExp + hoa + otherExp) * 12);

        // Cash Investment
        const downPayment = price * dpPercent;
        const totalCashInvested = downPayment + closing + repairs;

        // Debt Service (Monthly P&I)
        let monthlyDebtService = 0;
        if (rate !== null && term !== null && rate >= 0 && term > 0) {
            const loanAmount = price - downPayment;
            if (loanAmount > 0) {
                const monthlyRate = rate / 12;
                const numberOfPayments = term * 12;
                 if (monthlyRate === 0) {
                    monthlyDebtService = loanAmount / numberOfPayments;
                 } else {
                    monthlyDebtService = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
                     if (!isFinite(monthlyDebtService)) monthlyDebtService = 0; // Handle edge cases
                 }
            }
        }

        // Monthly Cash Flow
        const monthlyNOI = annualNOI / 12;
        const monthlyCashFlowCalc = monthlyNOI - monthlyDebtService;

        // Cash-on-Cash Return (%)
        const annualCashFlow = monthlyCashFlowCalc * 12;
        const cashOnCashReturnCalc = (totalCashInvested > 0) ? (annualCashFlow / totalCashInvested) * 100 : null;

        // Cap Rate (%)
        const capRateCalc = (annualNOI / price) * 100;

        return {
            noi: annualNOI,
            monthlyCashFlow: monthlyCashFlowCalc,
            cashOnCashReturn: cashOnCashReturnCalc,
            capRate: capRateCalc,
        };
    };

    const onSubmit: SubmitHandler<RentalFormValues> = (data) => {
        const calcResult = calculateRentalMetrics(data);
        if (calcResult) {
            setResult(calcResult);

            const inputString = `Price: ${formatCurrency(parseFloat(data.purchasePrice))}, Rent: ${formatCurrency(parseFloat(data.monthlyRent))}/mo, Expenses(mo): approx ${formatCurrency(parseFloat(data.propertyTaxes||'0')+parseFloat(data.insurance||'0')+parseFloat(data.repairsMaintenance||'0')+parseFloat(data.propertyManagement||'0')+parseFloat(data.hoaFees||'0')+parseFloat(data.otherExpenses||'0'))}, Loan: ${data.loanInterestRate||'N/A'}%/${data.loanTerm||'N/A'}yrs`;
            const resultString = `NOI: ${formatCurrency(calcResult.noi)}/yr, Monthly CF: ${formatCurrency(calcResult.monthlyCashFlow)}, CoC Return: ${calcResult.cashOnCashReturn?.toFixed(2) ?? 'N/A'}%, Cap Rate: ${calcResult.capRate.toFixed(2)}%`;

            const historyEntry: HistoryEntry = { id: Date.now().toString(), calculatorSlug: slug, timestamp: new Date(), input: inputString, result: resultString };
            onCalculation(historyEntry);
        } else {
            setResult(null);
             form.setError("root", {message: "Calculation failed. Check inputs."});
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
                    {/* Property/Investment Skeletons */}
                     <div><Skeleton className="h-6 w-1/3 mb-2"/><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div></div>
                     {/* Income Skeletons */}
                      <div><Skeleton className="h-6 w-1/4 mb-2"/><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div></div>
                     {/* Expenses Skeletons */}
                      <div><Skeleton className="h-6 w-1/4 mb-2"/><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div></div>
                     {/* Financing Skeletons */}
                      <div><Skeleton className="h-6 w-1/4 mb-2"/><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div></div>
                    <Skeleton className="h-10 w-full" /> {/* Button */}
                    <Skeleton className="mt-6 h-24 w-full" /> {/* Result */}
                     <Skeleton className="h-16 w-full" /> {/* Disclaimer */}
                </CardContent>
            </Card>
        );
    }


    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="relative">
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description} <strong className='text-destructive'>(Simplified Analysis)</strong></CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Property & Investment */}
                         <div className="space-y-3 border-b pb-4">
                             <h3 className="text-lg font-semibold">Property & Investment</h3>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField control={form.control} name="purchasePrice" render={({ field }) => (<FormItem><FormLabel>Purchase Price</FormLabel><FormControl><Input type="number" placeholder={currency.symbol} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="downPaymentPercent" render={({ field }) => (<FormItem><FormLabel>Down Payment (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 20" {...field} step="any" min="0" max="100" /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="closingCosts" render={({ field }) => (<FormItem><FormLabel>Closing Costs</FormLabel><FormControl><Input type="number" placeholder={`Est. ${currency.symbol}`} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="initialRepairs" render={({ field }) => (<FormItem><FormLabel>Initial Repairs</FormLabel><FormControl><Input type="number" placeholder={`Est. ${currency.symbol}`} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             </div>
                         </div>
                          {/* Income */}
                          <div className="space-y-3 border-b pb-4">
                              <h3 className="text-lg font-semibold">Monthly Income</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField control={form.control} name="monthlyRent" render={({ field }) => (<FormItem><FormLabel>Gross Monthly Rent</FormLabel><FormControl><Input type="number" placeholder={currency.symbol} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                  <FormField control={form.control} name="otherMonthlyIncome" render={({ field }) => (<FormItem><FormLabel>Other Income</FormLabel><FormControl><Input type="number" placeholder={`Laundry, etc. ${currency.symbol}`} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                              </div>
                          </div>
                          {/* Expenses */}
                          <div className="space-y-3 border-b pb-4">
                               <h3 className="text-lg font-semibold">Estimated Monthly Expenses</h3>
                               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                   <FormField control={form.control} name="propertyTaxes" render={({ field }) => (<FormItem><FormLabel>Property Taxes</FormLabel><FormControl><Input type="number" placeholder={currency.symbol} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                   <FormField control={form.control} name="insurance" render={({ field }) => (<FormItem><FormLabel>Insurance</FormLabel><FormControl><Input type="number" placeholder={currency.symbol} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                   <FormField control={form.control} name="vacancyRate" render={({ field }) => (<FormItem><FormLabel>Vacancy Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 5" {...field} step="any" min="0" max="100"/></FormControl><FormMessage /></FormItem>)} />
                                   <FormField control={form.control} name="repairsMaintenance" render={({ field }) => (<FormItem><FormLabel>Repairs/Maint.</FormLabel><FormControl><Input type="number" placeholder={`${currency.symbol} or %`} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                   <FormField control={form.control} name="propertyManagement" render={({ field }) => (<FormItem><FormLabel>Prop. Mgmt</FormLabel><FormControl><Input type="number" placeholder={`${currency.symbol} or %`} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                   <FormField control={form.control} name="hoaFees" render={({ field }) => (<FormItem><FormLabel>HOA Fees</FormLabel><FormControl><Input type="number" placeholder={currency.symbol} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                   <FormField control={form.control} name="otherExpenses" render={({ field }) => (<FormItem><FormLabel>Other</FormLabel><FormControl><Input type="number" placeholder={currency.symbol} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                               </div>
                           </div>
                          {/* Financing */}
                           <div className="space-y-3">
                               <h3 className="text-lg font-semibold">Financing (Optional)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="loanInterestRate" render={({ field }) => (<FormItem><FormLabel>Loan Interest Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 7.0" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="loanTerm" render={({ field }) => (<FormItem><FormLabel>Loan Term (Years)</FormLabel><FormControl><Input type="number" placeholder="e.g., 30" {...field} step="1" min="1" /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </div>

                          {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Analyze Property</Button>
                    </form>
                </Form>

                 {result !== null && (
                    <Alert className="mt-6">
                         <LineChart className="h-4 w-4" />
                         <AlertTitle>Rental Property Analysis ({currency.code})</AlertTitle>
                         <AlertDescription className="space-y-1">
                             <p>Est. Annual Net Operating Income (NOI): <strong>{formatCurrency(result.noi)}</strong></p>
                             <p>Est. Monthly Cash Flow (after debt service): <strong>{formatCurrency(result.monthlyCashFlow)}</strong></p>
                             <p>Est. Capitalization Rate (Cap Rate): <strong>{result.capRate.toFixed(2)}%</strong></p>
                             <p>Est. Cash-on-Cash Return: <strong>{result.cashOnCashReturn !== null ? `${result.cashOnCashReturn.toFixed(2)}%` : 'N/A (Check Cash Invested)'}</strong></p>
                             <p className="text-xs mt-2 font-semibold text-destructive">Disclaimer: Simplified analysis. Does not include taxes, depreciation, appreciation, or detailed financing costs. Market conditions vary. Consult professionals.</p>
                         </AlertDescription>
                    </Alert>
                )}
                   {!result && (
                     <Alert variant="destructive" className="mt-6">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Important Note</AlertTitle>
                         <AlertDescription>
                              Real estate investment involves significant risk and requires thorough due diligence. This calculator provides basic metrics only. Analyze vacancy, repairs, management costs, market trends, financing details, and tax implications carefully. Consult with real estate professionals, financial advisors, and accountants.
                         </AlertDescription>
                    </Alert>
                  )}
            </CardContent>
        </Card>
    );
}
