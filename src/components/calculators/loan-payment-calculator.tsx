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
import { Calculator, HandCoins, Star, ListChecks } from 'lucide-react'; // Removed Landmark, use HandCoins
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // For amortization schedule
import { ScrollArea } from "@/components/ui/scroll-area"; // For table scrolling
import type { CalculatorInfo } from '@/lib/constants';
import type { CurrencyData } from '@/lib/constants'; // Import CurrencyData type
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton


// --- Zod Schema ---
const loanPaymentSchema = z.object({
  loanAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Loan amount must be a positive number.",
  }),
  interestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Interest rate must be zero or positive.",
  }),
  loanTerm: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: "Loan term must be a positive integer (years).",
  }),
});

type LoanPaymentFormValues = z.infer<typeof loanPaymentSchema>;

// --- Amortization Schedule Type ---
interface AmortizationEntry {
    month: number;
    startingBalance: number;
    payment: number;
    principalPaid: number;
    interestPaid: number;
    endingBalance: number;
}


interface LoanPaymentCalculatorProps {
  slug: string;
  calculatorInfo: CalculatorInfo; // Receive full info
  onCalculation: (entry: HistoryEntry) => void;
  favorites: FavoriteCalculators;
  setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
  currency: CurrencyData; // Add currency prop
}

export function LoanPaymentCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: LoanPaymentCalculatorProps) {
  const [monthlyPayment, setMonthlyPayment] = React.useState<number | null>(null);
  const [totalInterest, setTotalInterest] = React.useState<number | null>(null);
  const [totalPayment, setTotalPayment] = React.useState<number | null>(null);
  const [amortizationSchedule, setAmortizationSchedule] = React.useState<AmortizationEntry[]>([]);
  const [mounted, setMounted] = React.useState(false); // Added mounted state

  const { name, description, icon: Icon } = calculatorInfo;
  const isFavorite = favorites.includes(slug);
  // Currency is now received via props

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

  const form = useForm<LoanPaymentFormValues>({
    resolver: zodResolver(loanPaymentSchema),
    defaultValues: {
      loanAmount: '',
      interestRate: '',
      loanTerm: '',
    },
  });

  // --- Currency Reactivity ---
  // Effect to reset form/results if currency changes
  React.useEffect(() => {
    if (mounted) {
        console.log("Loan Payment Currency changed to:", currency.code); // Debug log
        form.reset(); // Reset form fields
        setMonthlyPayment(null); // Clear previous results
        setTotalInterest(null);
        setTotalPayment(null);
        setAmortizationSchedule([]);
        form.clearErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency.code, mounted]); // Depend on currency code and mounted status

  // --- Currency Formatting ---
  const formatCurrency = React.useCallback((value: number | null) => {
    if (value === null) return 'N/A';
    return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currency.symbol]); // Update when currency symbol changes

  const calculateLoanPayment = (values: LoanPaymentFormValues): { payment: number; totalInterest: number; totalPayment: number; schedule: AmortizationEntry[] } | null => {
     const principal = parseFloat(values.loanAmount);
     const annualInterestRate = parseFloat(values.interestRate) / 100;
     const years = parseInt(values.loanTerm);

     if (isNaN(principal) || principal <= 0 || isNaN(annualInterestRate) || annualInterestRate < 0 || isNaN(years) || years <= 0) {
         return null;
     }

     const monthlyInterestRate = annualInterestRate / 12;
     const numberOfPayments = years * 12;
     let monthlyPaymentCalc = 0;
     const schedule: AmortizationEntry[] = [];
     let totalInterestPaid = 0;
     let remainingBalance = principal;

     if (monthlyInterestRate === 0) { // Handle 0% interest rate
        monthlyPaymentCalc = principal / numberOfPayments;
     } else {
        monthlyPaymentCalc = principal * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
     }

     // Generate Amortization Schedule
     for (let month = 1; month <= numberOfPayments; month++) {
         const interestForMonth = remainingBalance * monthlyInterestRate;
         let principalForMonth = monthlyPaymentCalc - interestForMonth;
         // Adjust payment if it's the last one and balance is slightly off due to rounding
         let currentPayment = monthlyPaymentCalc;
         if (month === numberOfPayments) {
             principalForMonth = remainingBalance;
             currentPayment = principalForMonth + interestForMonth; // Recalculate the final payment amount
         }

         const endingBalance = remainingBalance - principalForMonth;

         schedule.push({
             month: month,
             startingBalance: remainingBalance,
             payment: currentPayment,
             principalPaid: principalForMonth,
             interestPaid: interestForMonth,
             endingBalance: endingBalance < 0.005 ? 0 : endingBalance // Handle small floating point inaccuracies
         });

         totalInterestPaid += interestForMonth;
         remainingBalance = endingBalance;

         // Stop if balance is effectively zero
         if (remainingBalance <= 0.005 && month < numberOfPayments) {
             const lastEntry = schedule[schedule.length - 1];
              if (lastEntry) { // Check if lastEntry exists
                 lastEntry.endingBalance = 0;
                 totalInterestPaid = schedule.reduce((sum, entry) => sum + entry.interestPaid, 0);
              }
             break; // Stop generating further entries
         }
     }

     // Recalculate total interest and payment based on the actual schedule
     const actualTotalPayment = schedule.reduce((sum, entry) => sum + entry.payment, 0);
     const actualTotalInterest = schedule.reduce((sum, entry) => sum + entry.interestPaid, 0);

     return {
         payment: monthlyPaymentCalc, // Keep the calculated monthly payment consistent for display
         totalInterest: actualTotalInterest,
         totalPayment: actualTotalPayment,
         schedule: schedule
     };
  };


  const onSubmit: SubmitHandler<LoanPaymentFormValues> = (data) => {
    const result = calculateLoanPayment(data);
    if (result) {
      setMonthlyPayment(result.payment);
      setTotalInterest(result.totalInterest);
      setTotalPayment(result.totalPayment);
      setAmortizationSchedule(result.schedule);

      // Use formatCurrency for inputs and results
      const inputString = `Loan Amount: ${formatCurrency(parseFloat(data.loanAmount))}, Interest Rate: ${data.interestRate}%, Term: ${data.loanTerm} years`;
      const resultString = `Monthly Payment: ${formatCurrency(result.payment)}, Total Interest: ${formatCurrency(result.totalInterest)}, Total Payment: ${formatCurrency(result.totalPayment)}`;

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
      setTotalInterest(null);
      setTotalPayment(null);
      setAmortizationSchedule([]);
      console.error("Calculation failed. Check inputs.");
      form.setError("root", { message: "Calculation failed. Check inputs." });
    }
  };

    // Skeleton Loader
    if (!mounted) {
        return (
            <Card className="w-full max-w-2xl mx-auto transition-subtle">
                <CardHeader className="relative">
                     <Skeleton className="absolute top-3 right-3 h-7 w-7 rounded-full" />
                     <div className="flex items-center gap-2 pr-10">
                         <Skeleton className="h-6 w-6" />
                         <Skeleton className="h-6 w-3/4" />
                     </div>
                     <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                         <div className="space-y-2">
                             <Skeleton className="h-5 w-1/3" />
                             <Skeleton className="h-10 w-full" />
                         </div>
                         <div className="space-y-2">
                              <Skeleton className="h-5 w-1/2" />
                             <Skeleton className="h-10 w-full" />
                         </div>
                         <div className="space-y-2">
                              <Skeleton className="h-5 w-1/3" />
                             <Skeleton className="h-10 w-full" />
                         </div>
                         <div className="md:col-span-3">
                             <Skeleton className="h-10 w-full" />
                         </div>
                    </div>
                     <Skeleton className="mt-6 h-24 w-full" /> {/* Result Skeleton */}
                     <Skeleton className="mt-6 h-[300px] w-full" /> {/* Table Skeleton */}
                 </CardContent>
            </Card>
        );
    }


  return (
    <Card className="w-full max-w-2xl mx-auto transition-subtle"> {/* Increased max-width */}
      <CardHeader className="relative">
         <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10",
              isFavorite && "text-primary"
            )}
            onClick={toggleFavorite}
            aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}
          >
            <Star className={cn("h-5 w-5", isFavorite && "fill-current")} />
          </Button>
        <CardTitle className="flex items-center gap-2 pr-10">
          <Icon className="h-6 w-6 text-primary" />
          {name}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <FormField
              control={form.control}
              name="loanAmount"
              render={({ field }) => (
                <FormItem>
                  {/* Updated Label */}
                  <FormLabel>Loan Amount ({currency.symbol})</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 200000" {...field} step="any" min="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="interestRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Interest Rate (%)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 5.5" {...field} step="any" min="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="loanTerm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loan Term (Years)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 30" {...field} step="1" min="1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="md:col-span-3">
                 <Button type="submit" className="w-full transition-subtle">
                   <Calculator className="mr-2 h-4 w-4" /> Calculate Payment
                 </Button>
             </div>
              {form.formState.errors.root && (
                 <FormMessage className="md:col-span-3 text-destructive">{form.formState.errors.root.message}</FormMessage>
              )}
          </form>
        </Form>

        {monthlyPayment !== null && totalInterest !== null && totalPayment !== null && (
          <Alert className="mt-6 mb-6 transition-subtle">
            <HandCoins className="h-4 w-4" />
            {/* Updated Title */}
            <AlertTitle>Loan Summary ({currency.code})</AlertTitle>
            <AlertDescription>
                {/* Use formatCurrency */}
                <p>Monthly Payment: <strong>{formatCurrency(monthlyPayment)}</strong></p>
                <p>Total Principal Paid: <strong>{formatCurrency(parseFloat(form.getValues('loanAmount') || '0'))}</strong></p>
                <p>Total Interest Paid: <strong>{formatCurrency(totalInterest)}</strong></p>
                 <p>Total Cost of Loan: <strong>{formatCurrency(totalPayment)}</strong></p>
            </AlertDescription>
          </Alert>
        )}

        {/* Amortization Schedule */}
        {amortizationSchedule.length > 0 && (
             <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                   <ListChecks className="h-5 w-5 text-primary" />
                   {/* Updated Title */}
                   Amortization Schedule ({currency.code})
                 </h3>
                 {/* Improved table responsiveness */}
                 <ScrollArea className="h-[300px] w-full border"> {/* Added border for clarity */}
                     <Table className="min-w-[600px]"> {/* Set a minimum width for the table */}
                        <TableHeader className="sticky top-0 bg-muted z-10"> {/* Make header sticky */}
                            <TableRow>
                                <TableHead className="w-[80px]">Month</TableHead>
                                <TableHead>Principal</TableHead>
                                <TableHead>Interest</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                             {amortizationSchedule.map((entry) => (
                                 <TableRow key={entry.month}>
                                     {/* Use formatCurrency */}
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
