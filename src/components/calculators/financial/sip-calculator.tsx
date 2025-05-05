
'use client';

// Similar to Investment Growth / Compound Interest, but often focused on regular monthly investments.
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Assuming compounding frequency affects SIP returns, include Select
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, CandlestickChart, TrendingUp } from 'lucide-react'; // Use CandlestickChart for SIP
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for SIP Calculator
const sipSchema = z.object({
    monthlyInvestment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Monthly investment must be positive.",
    }),
    expectedReturnRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Expected annual return rate must be zero or positive.",
    }),
    investmentPeriod: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Investment period must be a positive integer (years).",
    }),
    // Compounding frequency for the underlying investment growth
     compoundingFrequency: z.enum(['annually', 'semi-annually', 'quarterly', 'monthly', 'daily']).default('annually'), // Or monthly might be more common for MF returns
});

type SipFormValues = z.infer<typeof sipSchema>;

interface SipCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function SipCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: SipCalculatorProps) {
    const [futureValue, setFutureValue] = React.useState<number | null>(null);
    const [totalInvested, setTotalInvested] = React.useState<number | null>(null);
    const [estimatedReturns, setEstimatedReturns] = React.useState<number | null>(null); // = FV - Total Invested
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

    const form = useForm<SipFormValues>({
        resolver: zodResolver(sipSchema),
        defaultValues: {
            monthlyInvestment: '',
            expectedReturnRate: '',
            investmentPeriod: '',
            compoundingFrequency: 'annually',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({ compoundingFrequency: 'annually' });
            setFutureValue(null);
            setTotalInvested(null);
            setEstimatedReturns(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate SIP Future Value (Future Value of an Annuity)
    const calculateSip = (values: SipFormValues): { fv: number; invested: number; returns: number } | null => {
        const pmt = parseFloat(values.monthlyInvestment);
        const r_annual = parseFloat(values.expectedReturnRate) / 100;
        const t_years = parseInt(values.investmentPeriod);
        const compFreq = values.compoundingFrequency;
        const n_pmt = 12; // Monthly investments

        let n_compound: number; // Compounding periods per year
         switch (compFreq) {
             case 'annually': n_compound = 1; break; case 'semi-annually': n_compound = 2; break;
             case 'quarterly': n_compound = 4; break; case 'monthly': n_compound = 12; break;
             case 'daily': n_compound = 365; break; default: return null;
         }


        if (isNaN(pmt) || pmt <= 0 || isNaN(r_annual) || r_annual < 0 || isNaN(t_years) || t_years <= 0) {
            return null;
        }

        // Calculate effective rate per payment period (monthly) based on compounding frequency
         const ear = Math.pow(1 + r_annual / n_compound, n_compound) - 1; // Effective Annual Rate
         const monthlyRate = Math.pow(1 + ear, 1 / n_pmt) - 1; // Effective Monthly Rate

        const totalPeriods = t_years * n_pmt; // Total number of monthly investments

        // Future Value of Annuity = Pmt * [((1 + i)^n - 1) / i]
        let fv: number;
        if (monthlyRate === 0) {
            fv = pmt * totalPeriods;
        } else {
            fv = pmt * ((Math.pow(1 + monthlyRate, totalPeriods) - 1) / monthlyRate);
        }

        const investedAmount = pmt * totalPeriods;
        const returnsAmount = fv - investedAmount;

        return { fv, invested: investedAmount, returns: returnsAmount };
    };


    const onSubmit: SubmitHandler<SipFormValues> = (data) => {
        const result = calculateSip(data);
        if (result) {
            setFutureValue(result.fv);
            setTotalInvested(result.invested);
            setEstimatedReturns(result.returns);

            const inputString = `Monthly SIP: ${formatCurrency(parseFloat(data.monthlyInvestment))}, Rate: ${data.expectedReturnRate}%, Years: ${data.investmentPeriod}, Compound: ${data.compoundingFrequency}`;
            const resultString = `Est. Future Value: ${formatCurrency(result.fv)}, Total Invested: ${formatCurrency(result.invested)}, Est. Returns: ${formatCurrency(result.returns)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setFutureValue(null);
            setTotalInvested(null);
            setEstimatedReturns(null);
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
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" /> {/* Compounding Freq */}
                    <Skeleton className="h-10 w-full" /> {/* Button */}
                    <Skeleton className="mt-6 h-24 w-full" /> {/* Result */}
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
                        <FormField control={form.control} name="monthlyInvestment" render={({ field }) => (<FormItem><FormLabel>Monthly Investment ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 5000" {...field} step="any" min="0.01" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="expectedReturnRate" render={({ field }) => (<FormItem><FormLabel>Expected Annual Return Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 12" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="investmentPeriod" render={({ field }) => (<FormItem><FormLabel>Investment Period (Years)</FormLabel><FormControl><Input type="number" placeholder="e.g., 15" {...field} step="1" min="1" /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="compoundingFrequency" render={({ field }) => (<FormItem><FormLabel>Compounding Frequency</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl><SelectContent><SelectItem value="annually">Annually</SelectItem><SelectItem value="semi-annually">Semi-Annually</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="daily">Daily</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate SIP Returns</Button>
                    </form>
                </Form>

                 {futureValue !== null && totalInvested !== null && estimatedReturns !== null && (
                    <Alert className="mt-6">
                        <TrendingUp className="h-4 w-4" />
                        <AlertTitle>SIP Projection ({currency.code})</AlertTitle>
                        <AlertDescription>
                             <p>Estimated Future Value: <strong>{formatCurrency(futureValue)}</strong></p>
                             <p>Total Amount Invested: <strong>{formatCurrency(totalInvested)}</strong></p>
                             <p>Estimated Returns: <strong>{formatCurrency(estimatedReturns)}</strong></p>
                             <p className="text-xs mt-1 text-muted-foreground">Note: Projections are based on assumed constant returns and regular investments. Actual market returns vary and are not guaranteed.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
