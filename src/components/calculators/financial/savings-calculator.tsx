
'use client';

// Similar to Compound Interest / FV, focuses on reaching a savings goal
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
import { Calculator, Star, PiggyBank, Target } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Savings Calculator (Goal focused)
const savingsSchema = z.object({
    savingsGoal: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Savings goal must be positive.",
    }),
    initialDeposit: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Initial deposit must be zero or positive.",
    }).optional().default("0"),
    monthlyContribution: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Monthly contribution must be zero or positive.",
    }),
    annualRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual interest rate must be zero or positive.",
    }),
    // Compounding frequency matters for accuracy
    compoundingFrequency: z.enum(['annually', 'semi-annually', 'quarterly', 'monthly', 'daily']).default('monthly'),
});

type SavingsFormValues = z.infer<typeof savingsSchema>;

interface SavingsCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function SavingsCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: SavingsCalculatorProps) {
    const [timeToGoal, setTimeToGoal] = React.useState<number | null | string>(null); // In months or descriptive string
    const [finalBalance, setFinalBalance] = React.useState<number | null>(null);
     const [totalInterestEarned, setTotalInterestEarned] = React.useState<number | null>(null);
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

    const form = useForm<SavingsFormValues>({
        resolver: zodResolver(savingsSchema),
        defaultValues: {
            savingsGoal: '',
            initialDeposit: '0',
            monthlyContribution: '',
            annualRate: '',
            compoundingFrequency: 'monthly',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset({ initialDeposit: '0', compoundingFrequency: 'monthly' });
            setTimeToGoal(null);
            setFinalBalance(null);
            setTotalInterestEarned(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Time to Reach Savings Goal
    const calculateTimeToGoal = (values: SavingsFormValues): { months: number; finalAmount: number; totalInterest: number } | null | string => {
        const goal = parseFloat(values.savingsGoal);
        const P = parseFloat(values.initialDeposit || '0');
        const pmt = parseFloat(values.monthlyContribution);
        const r_annual = parseFloat(values.annualRate) / 100;
        const compFreq = values.compoundingFrequency;

        if (isNaN(goal) || goal <= P || isNaN(P) || P < 0 || isNaN(pmt) || pmt < 0 || isNaN(r_annual) || r_annual < 0) {
             if(goal <= P) return "Goal already reached or exceeded by initial deposit.";
             if(pmt <= 0 && r_annual <= 0 && P < goal) return "Goal cannot be reached with zero contributions and zero interest.";
             if(pmt <= 0 && r_annual > 0) { // Goal reached by interest alone?
                 // Calculate time for P to reach goal: t = log(FV/PV) / (n*log(1+r/n))
                  let n: number; // Compounding periods per year
                 switch (compFreq) {
                     case 'annually': n = 1; break; case 'semi-annually': n = 2; break;
                     case 'quarterly': n = 4; break; case 'monthly': n = 12; break;
                     case 'daily': n = 365; break; default: return null;
                 }
                 const ratePerPeriod = r_annual / n;
                 if (ratePerPeriod === 0) return "Goal cannot be reached with zero contributions and zero interest."; // Should have been caught earlier

                 const periodsNeeded = Math.log(goal / P) / Math.log(1 + ratePerPeriod);
                  if (!isFinite(periodsNeeded) || periodsNeeded < 0) return "Cannot calculate time with these inputs.";
                  const monthsNeeded = Math.ceil(periodsNeeded / (n / 12)); // Convert periods to months
                   const finalAmt = P * Math.pow(1 + ratePerPeriod, periodsNeeded);
                  return { months: monthsNeeded, finalAmount: finalAmt, totalInterest: finalAmt - P };

             } else {
                  return null; // Other invalid input cases
             }

        }

         // If contribution is zero, but interest is positive, handle above.
         if (pmt === 0 && r_annual > 0) {
             // Calculation handled in the block above, this path shouldn't be reached
             return null;
         }
          if (pmt === 0 && r_annual === 0) {
               return "Goal cannot be reached with zero contributions and zero interest.";
          }


        // Financial formula for NPER (number of periods) for an annuity
        // NPER = log((FV*i + Pmt) / (PV*i + Pmt)) / log(1 + i) -- when rate > 0
        // Need rate per contribution period (assuming monthly contribution and selected compounding)

         let n_compound: number; // Compounding periods per year
         switch (compFreq) {
             case 'annually': n_compound = 1; break; case 'semi-annually': n_compound = 2; break;
             case 'quarterly': n_compound = 4; break; case 'monthly': n_compound = 12; break;
             case 'daily': n_compound = 365; break; default: return null;
         }
         const n_pmt = 12; // Monthly contributions assumed

          // Effective rate per contribution period (monthly)
          const ear = Math.pow(1 + r_annual / n_compound, n_compound) - 1; // Effective Annual Rate
          const monthlyRate = Math.pow(1 + ear, 1 / n_pmt) - 1; // Effective Monthly Rate


         let periodsNeeded: number;
         if (monthlyRate === 0) {
             // Time = (Goal - Principal) / Monthly Contribution
             periodsNeeded = (goal - P) / pmt;
         } else {
             // NPER formula needs careful application: log base change might be needed
             // Using the standard finance library formula logic:
             // FV = PV*(1+i)^n + Pmt * [((1+i)^n - 1) / i] -> Solve for n (periods)
             // This requires iteration or a financial library's NPER function.

             // Simplified Iterative Approach: Simulate month by month
             let currentBalance = P;
             let months = 0;
             const MAX_MONTHS = 12 * 150; // 150 year limit
             while (currentBalance < goal && months < MAX_MONTHS) {
                 // Interest for the month (using effective monthly rate)
                 currentBalance *= (1 + monthlyRate);
                 // Add contribution at the end of the month
                 currentBalance += pmt;
                 months++;
             }
              periodsNeeded = months;
              if(months >= MAX_MONTHS) return Infinity; // Didn't reach goal
         }

          if (!isFinite(periodsNeeded) || periodsNeeded < 0) {
            return Infinity; // Indicate goal not reached or error
          }

         const monthsRounded = Math.ceil(periodsNeeded);

         // Recalculate final balance and interest for the exact number of months
          let finalBalanceCalc = P;
          let totalContribMade = 0;
           for (let i = 0; i < monthsRounded; i++) {
              finalBalanceCalc *= (1 + monthlyRate);
              finalBalanceCalc += pmt;
               totalContribMade += pmt;
           }

           // Final balance might slightly exceed goal due to rounding up months
           finalBalanceCalc = Math.min(finalBalanceCalc, goal * 1.001); // Cap slightly above goal if needed, or use exact final pmt calc

           const totalInterestCalc = finalBalanceCalc - P - totalContribMade;


        return { months: monthsRounded, finalAmount: finalBalanceCalc, totalInterest: totalInterestCalc };
    };

    const onSubmit: SubmitHandler<SavingsFormValues> = (data) => {
        const result = calculateTimeToGoal(data);

        if (typeof result === 'string') {
             setTimeToGoal(result); // Display message like "Goal already reached"
             setFinalBalance(null);
             setTotalInterestEarned(null);
             form.setError("root", { message: result });
        } else if (result === Infinity) {
             setTimeToGoal("Goal not reached within reasonable timeframe.");
             setFinalBalance(null);
             setTotalInterestEarned(null);
              form.setError("root", { message: "Goal not reached. Increase contributions or check rate." });
        } else if (result) {
            setTimeToGoal(result.months);
            setFinalBalance(result.finalAmount);
             setTotalInterestEarned(result.totalInterest);


            const inputString = `Goal: ${formatCurrency(parseFloat(data.savingsGoal))}, Start: ${formatCurrency(parseFloat(data.initialDeposit || '0'))}, Contrib: ${formatCurrency(parseFloat(data.monthlyContribution))}/mo, Rate: ${data.annualRate}%`;
            const years = Math.floor(result.months / 12);
             const months = result.months % 12;
             const timeString = `${years > 0 ? years + ' years' : ''}${years > 0 && months > 0 ? ', ' : ''}${months > 0 ? months + ' months' : years === 0 ? result.months + ' months': ''}`;
            const resultString = `Time to Goal: ~${timeString} (${result.months} months), Final Balance: ${formatCurrency(result.finalAmount)}, Total Interest: ${formatCurrency(result.totalInterest)}`;

            const historyEntry: HistoryEntry = { id: Date.now().toString(), calculatorSlug: slug, timestamp: new Date(), input: inputString, result: resultString };
            onCalculation(historyEntry);
        } else {
            setTimeToGoal(null);
            setFinalBalance(null);
             setTotalInterestEarned(null);
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
                         <Skeleton className="h-10 w-full md:col-span-2" /> {/* Compounding */}
                     </div>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="savingsGoal" render={({ field }) => (<FormItem><FormLabel>Savings Goal ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 25000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="initialDeposit" render={({ field }) => (<FormItem><FormLabel>Initial Deposit ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 1000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="monthlyContribution" render={({ field }) => (<FormItem><FormLabel>Monthly Contribution ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 200" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="annualRate" render={({ field }) => (<FormItem><FormLabel>Annual Interest Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 4.5" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="compoundingFrequency" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Compounding Frequency</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl><SelectContent><SelectItem value="annually">Annually</SelectItem><SelectItem value="semi-annually">Semi-Annually</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="daily">Daily</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                          {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Time to Goal</Button>
                    </form>
                </Form>

                 {timeToGoal !== null && (
                    <Alert className="mt-6">
                         <Target className="h-4 w-4" />
                         <AlertTitle>Savings Goal Projection</AlertTitle>
                         <AlertDescription>
                             {typeof timeToGoal === 'number' && finalBalance !== null && totalInterestEarned !== null ? (
                                <>
                                    <p>Estimated Time to Reach Goal: <strong>
                                         {Math.floor(timeToGoal / 12)} years, {timeToGoal % 12} months
                                     </strong> ({timeToGoal} months total)</p>
                                    <p>Estimated Balance at Goal: <strong>{formatCurrency(finalBalance)}</strong></p>
                                     <p>Total Interest Earned: <strong>{formatCurrency(totalInterestEarned)}</strong></p>
                                </>
                             ) : (
                                <p className="font-semibold">{timeToGoal}</p> // Display messages like "Goal already reached"
                             )}
                         </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
