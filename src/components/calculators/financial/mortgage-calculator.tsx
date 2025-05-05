
'use client';

// Standard Mortgage Calculator (similar to Loan Payment, possibly adding PITI)
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Home, HandCoins, ListChecks } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Mortgage Calculator (adding optional PITI fields)
const mortgageSchema = z.object({
  loanAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Loan amount must be a positive number.",
  }),
  interestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Interest rate must be zero or positive.",
  }),
  loanTerm: z.string().refine(val => z.enum(['15', '20', '30']).safeParse(val).success, { // Common terms
    message: "Loan term must be 15, 20, or 30 years.",
  }).default('30'),
  propertyTaxes: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Annual property taxes must be non-negative."}).optional().default("0"),
  homeInsurance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Annual homeowners insurance must be non-negative."}).optional().default("0"),
   // Optional PMI (Private Mortgage Insurance) - simplified as annual % of loan
  pmiRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 5, { // Rate usually 0.5-1.5%
    message: "PMI rate must be between 0 and 5.",
  }).optional().default("0"),
});

type MortgageFormValues = z.infer<typeof mortgageSchema>;

interface MortgageCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

// Amortization Schedule Type
interface AmortizationEntry {
    month: number;
    startingBalance: number;
    payment: number; // P&I Payment
    principalPaid: number;
    interestPaid: number;
    // Optional: Add extra payments, PMI, T&I per month if needed for detailed schedule
    endingBalance: number;
}

export function MortgageCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: MortgageCalculatorProps) {
    const [principalAndInterest, setPrincipalAndInterest] = React.useState<number | null>(null);
    const [monthlyTaxes, setMonthlyTaxes] = React.useState<number | null>(null);
    const [monthlyInsurance, setMonthlyInsurance] = React.useState<number | null>(null);
    const [monthlyPmi, setMonthlyPmi] = React.useState<number | null>(null);
    const [totalMonthlyPayment, setTotalMonthlyPayment] = React.useState<number | null>(null);
    const [totalInterest, setTotalInterest] = React.useState<number | null>(null);
    const [totalPayment, setTotalPayment] = React.useState<number | null>(null); // P&I only total
    const [amortizationSchedule, setAmortizationSchedule] = React.useState<AmortizationEntry[]>([]);
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

    const form = useForm<MortgageFormValues>({
        resolver: zodResolver(mortgageSchema),
        defaultValues: {
            loanAmount: '',
            interestRate: '',
            loanTerm: '30',
            propertyTaxes: '0',
            homeInsurance: '0',
            pmiRate: '0',
        },
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({ loanTerm: '30', propertyTaxes: '0', homeInsurance: '0', pmiRate: '0' });
             setPrincipalAndInterest(null);
             setMonthlyTaxes(null);
             setMonthlyInsurance(null);
             setMonthlyPmi(null);
             setTotalMonthlyPayment(null);
             setTotalInterest(null);
             setTotalPayment(null);
             setAmortizationSchedule([]);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculation logic (from Loan Payment, add PITI+PMI)
     const calculateMortgage = (values: MortgageFormValues): { pi: number; tax: number; insurance: number; pmi: number; total: number; schedule: AmortizationEntry[]; totalInterest: number; totalPaymentPI: number } | null => {
         const principal = parseFloat(values.loanAmount);
         const annualInterestRate = parseFloat(values.interestRate) / 100;
         const years = parseInt(values.loanTerm);
         const annualTaxes = parseFloat(values.propertyTaxes || '0');
         const annualInsurance = parseFloat(values.homeInsurance || '0');
         const annualPmiRate = parseFloat(values.pmiRate || '0') / 100;

         if (isNaN(principal) || principal <= 0 || isNaN(annualInterestRate) || annualInterestRate < 0 || isNaN(years) || years <= 0) {
             return null;
         }

         const monthlyInterestRate = annualInterestRate / 12;
         const numberOfPayments = years * 12;
         let piPayment: number; // Principal & Interest

         if (monthlyInterestRate === 0) {
            piPayment = principal / numberOfPayments;
         } else {
            piPayment = principal * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
         }

          const tax = annualTaxes / 12;
          const insurance = annualInsurance / 12;
          const pmi = (principal * annualPmiRate) / 12; // Simplified PMI calculation

          const totalMonthly = piPayment + tax + insurance + pmi;

         // Generate Amortization Schedule (for P&I part)
         const schedule: AmortizationEntry[] = [];
         let totalInterestPaid = 0;
         let remainingBalance = principal;

         for (let month = 1; month <= numberOfPayments; month++) {
             const interestForMonth = remainingBalance * monthlyInterestRate;
             let principalForMonth = piPayment - interestForMonth;
             let currentPayment = piPayment; // P&I Payment for schedule

             if (month === numberOfPayments) {
                 principalForMonth = remainingBalance;
                 currentPayment = principalForMonth + interestForMonth; // Adjust final P&I payment
             }

             const endingBalance = remainingBalance - principalForMonth;
             schedule.push({
                 month: month,
                 startingBalance: remainingBalance,
                 payment: currentPayment,
                 principalPaid: principalForMonth,
                 interestPaid: interestForMonth,
                 endingBalance: endingBalance < 0.005 ? 0 : endingBalance
             });

             totalInterestPaid += interestForMonth;
             remainingBalance = endingBalance;

              if (remainingBalance <= 0.005 && month < numberOfPayments) {
                  const lastEntry = schedule[schedule.length -1];
                  if (lastEntry){
                    lastEntry.endingBalance = 0;
                    totalInterestPaid = schedule.reduce((sum, entry) => sum + entry.interestPaid, 0); // Recalculate interest paid
                  }
                  break;
              }
         }
          const totalPaymentPI_calc = principal + totalInterestPaid;


         return { pi: piPayment, tax, insurance, pmi, total: totalMonthly, schedule, totalInterest: totalInterestPaid, totalPaymentPI: totalPaymentPI_calc };
      };

    const onSubmit: SubmitHandler<MortgageFormValues> = (data) => {
        const result = calculateMortgage(data);
        if (result) {
             setPrincipalAndInterest(result.pi);
             setMonthlyTaxes(result.tax);
             setMonthlyInsurance(result.insurance);
             setMonthlyPmi(result.pmi);
             setTotalMonthlyPayment(result.total);
             setTotalInterest(result.totalInterest);
             setTotalPayment(result.totalPaymentPI);
             setAmortizationSchedule(result.schedule);


            const inputString = `Loan: ${formatCurrency(parseFloat(data.loanAmount))}, Rate: ${data.interestRate}%, Term: ${data.loanTerm} yrs, Taxes: ${formatCurrency(parseFloat(data.propertyTaxes || '0'))}/yr, Insurance: ${formatCurrency(parseFloat(data.homeInsurance || '0'))}/yr, PMI: ${data.pmiRate || '0'}%`;
            const resultString = `Total Monthly Payment: ${formatCurrency(result.total)} (P&I: ${formatCurrency(result.pi)}, T&I: ${formatCurrency(result.tax + result.insurance)}, PMI: ${formatCurrency(result.pmi)}). Total Interest (P&I): ${formatCurrency(result.totalInterest)}.`;

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
             setMonthlyTaxes(null);
             setMonthlyInsurance(null);
             setMonthlyPmi(null);
             setTotalMonthlyPayment(null);
             setTotalInterest(null);
             setTotalPayment(null);
             setAmortizationSchedule([]);
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
                     {/* Loan Details */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                     </div>
                      {/* PITI Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                      </div>
                    <Skeleton className="h-10 w-full" /> {/* Button */}
                    <Skeleton className="mt-6 h-28 w-full" /> {/* Result */}
                    <Skeleton className="mt-6 h-[300px] w-full" /> {/* Table */}
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
                         {/* Core Loan Details */}
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <FormField control={form.control} name="loanAmount" render={({ field }) => (<FormItem><FormLabel>Loan Amount ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 300000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="interestRate" render={({ field }) => (<FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 6.5" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="loanTerm" render={({ field }) => (<FormItem><FormLabel>Loan Term</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger></FormControl><SelectContent><SelectItem value="30">30 Years</SelectItem><SelectItem value="20">20 Years</SelectItem><SelectItem value="15">15 Years</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                         </div>
                         {/* Optional PITI Components */}
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                             <FormField control={form.control} name="propertyTaxes" render={({ field }) => (<FormItem><FormLabel>Property Taxes ({currency.symbol}/yr) <small>(Opt.)</small></FormLabel><FormControl><Input type="number" placeholder="e.g., 4000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="homeInsurance" render={({ field }) => (<FormItem><FormLabel>Home Insurance ({currency.symbol}/yr) <small>(Opt.)</small></FormLabel><FormControl><Input type="number" placeholder="e.g., 1200" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="pmiRate" render={({ field }) => (<FormItem><FormLabel>PMI Rate (%/yr) <small>(Opt.)</small></FormLabel><FormControl><Input type="number" placeholder="e.g., 0.5" {...field} step="any" min="0" max="5"/></FormControl><FormMessage /></FormItem>)} />
                         </div>
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Mortgage Payment</Button>
                    </form>
                </Form>

                {totalMonthlyPayment !== null && principalAndInterest !== null && (
                    <Alert className="mt-6 mb-6">
                        <HandCoins className="h-4 w-4" />
                        <AlertTitle>Estimated Mortgage Payment ({currency.code})</AlertTitle>
                        <AlertDescription className='space-y-1'>
                            <p>Est. Total Monthly Payment: <strong className="text-lg">{formatCurrency(totalMonthlyPayment)}</strong></p>
                             <p className="text-xs">Principal & Interest (P&I): {formatCurrency(principalAndInterest)}</p>
                             <p className="text-xs">Taxes (Est. Monthly): {formatCurrency(monthlyTaxes)}</p>
                             <p className="text-xs">Insurance (Est. Monthly): {formatCurrency(monthlyInsurance)}</p>
                             <p className="text-xs">PMI (Est. Monthly): {formatCurrency(monthlyPmi)}</p>
                             <p className="text-xs mt-1">Total Interest Paid (P&I only): {formatCurrency(totalInterest)}</p>
                             <p className="text-xs">Total Paid (P&I only): {formatCurrency(totalPayment)}</p>
                        </AlertDescription>
                    </Alert>
                 )}

                 {amortizationSchedule.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" />Amortization Schedule (P&I) ({currency.code})</h3>
                        <ScrollArea className="h-[300px] w-full border">
                            <Table className="min-w-[600px]">
                                <TableHeader className="sticky top-0 bg-muted z-10">
                                    <TableRow>
                                        <TableHead className="w-[80px]">Month</TableHead>
                                        <TableHead>Principal</TableHead><TableHead>Interest</TableHead>
                                        <TableHead>P&I Payment</TableHead><TableHead className="text-right">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {amortizationSchedule.map((entry) => (
                                        <TableRow key={entry.month}>
                                            <TableCell className="font-medium">{entry.month}</TableCell>
                                            <TableCell>{formatCurrency(entry.principalPaid)}</TableCell>
                                            <TableCell>{formatCurrency(entry.interestPaid)}</TableCell>
                                            <TableCell>{formatCurrency(entry.payment)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(entry.endingBalance)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}
