
'use client';

// Reusing logic from Compound Interest, focusing on FV
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Sigma, TrendingUp } from 'lucide-react'; // Use Sigma or TrendingUp
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema - same as Compound Interest basically
const fvSchema = z.object({
    presentValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Present value must be zero or positive.",
    }),
    annualRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual interest rate must be zero or positive.",
    }),
    years: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Number of years must be positive.",
    }),
    compoundingFrequency: z.enum(['annually', 'semi-annually', 'quarterly', 'monthly', 'daily']).default('annually'),
    contributionAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Contribution amount must be zero or positive.",
    }).optional().default("0"),
    contributionFrequency: z.enum(['annually', 'semi-annually', 'quarterly', 'monthly']).default('monthly'),
});

type FvFormValues = z.infer<typeof fvSchema>;

interface FutureValueCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function FutureValueCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: FutureValueCalculatorProps) {
    // Reusing state from Compound Interest
    const [futureValue, setFutureValue] = React.useState<number | null>(null);
    const [totalInterest, setTotalInterest] = React.useState<number | null>(null);
    const [totalContributions, setTotalContributions] = React.useState<number | null>(null);
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

    const form = useForm<FvFormValues>({
        resolver: zodResolver(fvSchema),
        defaultValues: {
            presentValue: '',
            annualRate: '',
            years: '',
            compoundingFrequency: 'annually',
            contributionAmount: '0',
            contributionFrequency: 'monthly',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset({ compoundingFrequency: 'annually', contributionAmount: '0', contributionFrequency: 'monthly' });
            setFutureValue(null);
            setTotalInterest(null);
            setTotalContributions(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

     // Calculation Logic (identical to Compound Interest)
     const calculateFutureValueInternal = (values: FvFormValues): { fv: number; interest: number; contributions: number } | null => {
        const P = parseFloat(values.presentValue);
        const r_annual = parseFloat(values.annualRate) / 100;
        const t = parseFloat(values.years);
        const compFreq = values.compoundingFrequency;
        const pmt = parseFloat(values.contributionAmount || '0');
        const contribFreq = values.contributionFrequency;

        let n: number; // Compounding periods per year
        switch (compFreq) {
            case 'annually': n = 1; break;
            case 'semi-annually': n = 2; break;
            case 'quarterly': n = 4; break;
            case 'monthly': n = 12; break;
            case 'daily': n = 365; break;
            default: return null;
        }

        let pmtN: number; // Contribution periods per year
         switch (contribFreq) {
             case 'annually': pmtN = 1; break;
             case 'semi-annually': pmtN = 2; break;
             case 'quarterly': pmtN = 4; break;
             case 'monthly': pmtN = 12; break;
             default: pmtN = 0;
         }

        if (isNaN(P) || P < 0 || isNaN(r_annual) || r_annual < 0 || isNaN(t) || t <= 0 || isNaN(pmt) || pmt < 0) {
            return null;
        }

        const ratePerPeriod = r_annual / n;
        const totalPeriods = n * t;
        const fvPrincipal = P * Math.pow(1 + ratePerPeriod, totalPeriods);

        let fvContributions = 0;
        if (pmt > 0 && pmtN > 0) {
             const ear = Math.pow(1 + r_annual / n, n) - 1;
             const ratePerContribPeriod = Math.pow(1 + ear, 1 / pmtN) - 1;
             const totalContributionsPeriods = pmtN * t;
             if (ratePerContribPeriod === 0) {
                 fvContributions = pmt * totalContributionsPeriods;
             } else {
                 fvContributions = pmt * ((Math.pow(1 + ratePerContribPeriod, totalContributionsPeriods) - 1) / ratePerContribPeriod);
             }
        }

        const finalValue = fvPrincipal + fvContributions;
        const totalContribMade = pmt * pmtN * t;
        const totalInterestEarned = finalValue - P - totalContribMade;
        const totalPrincipalAndContributions = P + totalContribMade;

        return { fv: finalValue, interest: totalInterestEarned, contributions: totalPrincipalAndContributions };
    };

    const onSubmit: SubmitHandler<FvFormValues> = (data) => {
        const result = calculateFutureValueInternal(data);
        if (result) {
            setFutureValue(result.fv);
            setTotalInterest(result.interest);
            setTotalContributions(result.contributions);

             const inputString = `PV: ${formatCurrency(parseFloat(data.presentValue))}, Rate: ${data.annualRate}%, Years: ${data.years}, Compound: ${data.compoundingFrequency}, Contribution: ${formatCurrency(parseFloat(data.contributionAmount || '0'))} ${data.contributionFrequency}`;
            const resultString = `Future Value: ${formatCurrency(result.fv)}, Total Interest: ${formatCurrency(result.interest)}, Total Principal + Contributions: ${formatCurrency(result.contributions)}`;

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
            setTotalInterest(null);
            setTotalContributions(null);
             form.setError("root", {message: "Calculation failed. Check inputs."})
            console.error("Calculation failed. Check inputs.");
        }
    };

     // Skeleton Loader (same as Compound Interest)
    if (!mounted) {
        return (
             <Card className="w-full max-w-lg mx-auto">
                <CardHeader className="relative">
                    <Skeleton className="absolute top-3 right-3 h-7 w-7 rounded-full" />
                    <div className="flex items-center gap-2 pr-10"><Skeleton className="h-6 w-6" /><Skeleton className="h-6 w-3/4" /></div>
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                 <CardContent className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="mt-6 h-24 w-full" />
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
                        {/* Reuse form fields from Compound Interest */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="presentValue" render={({ field }) => (<FormItem><FormLabel>Present Value ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 10000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="annualRate" render={({ field }) => (<FormItem><FormLabel>Annual Interest Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 6" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="years" render={({ field }) => (<FormItem><FormLabel>Number of Years</FormLabel><FormControl><Input type="number" placeholder="e.g., 10" {...field} step="any" min="0.01" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="compoundingFrequency" render={({ field }) => (<FormItem><FormLabel>Compounding Frequency</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl><SelectContent><SelectItem value="annually">Annually</SelectItem><SelectItem value="semi-annually">Semi-Annually</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="daily">Daily</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                         <div className="space-y-4 border-t pt-4 mt-4">
                             <h4 className="font-medium text-sm">Optional Contributions</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="contributionAmount" render={({ field }) => (<FormItem><FormLabel>Regular Contribution ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 100" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                 <FormField control={form.control} name="contributionFrequency" render={({ field }) => (<FormItem><FormLabel>Contribution Frequency</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl><SelectContent><SelectItem value="annually">Annually</SelectItem><SelectItem value="semi-annually">Semi-Annually</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Future Value</Button>
                    </form>
                </Form>

                 {futureValue !== null && totalInterest !== null && totalContributions !== null && (
                    <Alert className="mt-6">
                        <TrendingUp className="h-4 w-4" />
                        <AlertTitle>Future Value Results ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Future Value: <strong>{formatCurrency(futureValue)}</strong></p>
                            <p>Total Principal & Contributions: <strong>{formatCurrency(totalContributions)}</strong></p>
                            <p>Total Interest Earned: <strong>{formatCurrency(totalInterest)}</strong></p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
