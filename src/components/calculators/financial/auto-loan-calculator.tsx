
'use client';

// Essentially the same logic as Loan Payment, but possibly pre-filled or context-specific UI
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Car, HandCoins, ListChecks } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Schema (same as Loan Payment)
const autoLoanSchema = z.object({
  loanAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Loan amount (vehicle price minus down/trade) must be positive.",
  }),
  interestRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Interest rate must be zero or positive.",
  }),
  loanTerm: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: "Loan term must be a positive integer (years).",
  }),
  // Optional fields specific to auto context
  vehiclePrice: z.string().optional(),
  downPayment: z.string().optional(),
  tradeInValue: z.string().optional(),
});

type AutoLoanFormValues = z.infer<typeof autoLoanSchema>;

interface AutoLoanCalculatorProps {
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
    payment: number;
    principalPaid: number;
    interestPaid: number;
    endingBalance: number;
}


export function AutoLoanCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: AutoLoanCalculatorProps) {
    const [monthlyPayment, setMonthlyPayment] = React.useState<number | null>(null);
    const [totalInterest, setTotalInterest] = React.useState<number | null>(null);
    const [totalPayment, setTotalPayment] = React.useState<number | null>(null);
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

    const form = useForm<AutoLoanFormValues>({
        resolver: zodResolver(autoLoanSchema),
        defaultValues: {
            loanAmount: '',
            interestRate: '',
            loanTerm: '',
            vehiclePrice: '',
            downPayment: '',
            tradeInValue: '',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset();
            setMonthlyPayment(null);
            setTotalInterest(null);
            setTotalPayment(null);
            setAmortizationSchedule([]);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    // Recalculate loanAmount when price/down/trade changes
    React.useEffect(() => {
        const price = parseFloat(form.watch('vehiclePrice') || '0');
        const down = parseFloat(form.watch('downPayment') || '0');
        const trade = parseFloat(form.watch('tradeInValue') || '0');
        if (!isNaN(price) && !isNaN(down) && !isNaN(trade)) {
            const calculatedLoanAmount = Math.max(0, price - down - trade);
            form.setValue('loanAmount', calculatedLoanAmount.toString(), { shouldValidate: true });
        }
     }, [form.watch('vehiclePrice'), form.watch('downPayment'), form.watch('tradeInValue'), form.setValue, form]);


    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculation logic (identical to Loan Payment)
     const calculateLoanPayment = (values: AutoLoanFormValues): { payment: number; totalInterest: number; totalPayment: number; schedule: AmortizationEntry[] } | null => {
         const principal = parseFloat(values.loanAmount);
         const annualInterestRate = parseFloat(values.interestRate) / 100;
         const years = parseInt(values.loanTerm);

         if (isNaN(principal) || principal <= 0 || isNaN(annualInterestRate) || annualInterestRate < 0 || isNaN(years) || years <= 0) {
              // Allow calculation even if principal is 0 (fully paid by down/trade)
             if (principal === 0) return { payment: 0, totalInterest: 0, totalPayment: 0, schedule: [] };
             return null;
         }


         const monthlyInterestRate = annualInterestRate / 12;
         const numberOfPayments = years * 12;
         let monthlyPaymentCalc = 0;
         const schedule: AmortizationEntry[] = [];
         let totalInterestPaid = 0;
         let remainingBalance = principal;

         if (monthlyInterestRate === 0) {
            monthlyPaymentCalc = principal / numberOfPayments;
         } else {
            monthlyPaymentCalc = principal * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
         }

         // Generate Amortization Schedule
         for (let month = 1; month <= numberOfPayments; month++) {
             const interestForMonth = remainingBalance * monthlyInterestRate;
             let principalForMonth = monthlyPaymentCalc - interestForMonth;
             let currentPayment = monthlyPaymentCalc;
             if (month === numberOfPayments) {
                 principalForMonth = remainingBalance;
                 currentPayment = principalForMonth + interestForMonth;
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
                 const lastEntry = schedule[schedule.length - 1];
                 if(lastEntry) {
                     lastEntry.endingBalance = 0;
                     totalInterestPaid = schedule.reduce((sum, entry) => sum + entry.interestPaid, 0);
                 }
                 break;
             }
         }

          const actualTotalPayment = schedule.reduce((sum, entry) => sum + entry.payment, 0);
         const actualTotalInterest = schedule.reduce((sum, entry) => sum + entry.interestPaid, 0);

         return {
             payment: monthlyPaymentCalc,
             totalInterest: actualTotalInterest,
             totalPayment: actualTotalPayment,
             schedule: schedule
         };
      };

    const onSubmit: SubmitHandler<AutoLoanFormValues> = (data) => {
        const result = calculateLoanPayment(data);
        if (result) {
            setMonthlyPayment(result.payment);
            setTotalInterest(result.totalInterest);
            setTotalPayment(result.totalPayment);
            setAmortizationSchedule(result.schedule);

            const inputString = `Loan Amount: ${formatCurrency(parseFloat(data.loanAmount))}, Rate: ${data.interestRate}%, Term: ${data.loanTerm} years. (Price: ${formatCurrency(parseFloat(data.vehiclePrice || '0'))}, Down: ${formatCurrency(parseFloat(data.downPayment || '0'))}, Trade: ${formatCurrency(parseFloat(data.tradeInValue || '0'))})`;
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
        }
    };

     // Skeleton Loader
    if (!mounted) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader className="relative">
                    <Skeleton className="absolute top-3 right-3 h-7 w-7 rounded-full" />
                    <div className="flex items-center gap-2 pr-10">
                        <Skeleton className="h-6 w-6" />
                        <Skeleton className="h-6 w-3/4" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                     {/* Added skeletons for optional fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                         <div className="space-y-2"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="space-y-2"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                        <div className="md:col-span-3"><Skeleton className="h-10 w-full" /></div>
                    </div>
                    <Skeleton className="mt-6 h-24 w-full" /> {/* Result Skeleton */}
                    <Skeleton className="mt-6 h-[300px] w-full" /> {/* Table Skeleton */}
                </CardContent>
            </Card>
        );
    }


    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="relative">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")}
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
                    {/* Optional Price/Down/Trade fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                       <FormField
                            control={form.control}
                            name="vehiclePrice"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Vehicle Price ({currency.symbol}) <small>(Optional)</small></FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 35000" {...field} step="any" min="0" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="downPayment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Down Payment ({currency.symbol}) <small>(Optional)</small></FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 5000" {...field} step="any" min="0" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="tradeInValue"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Trade-in Value ({currency.symbol}) <small>(Optional)</small></FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 10000" {...field} step="any" min="0" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                     </div>

                    {/* Core Loan Fields */}
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                         <FormField
                            control={form.control}
                            name="loanAmount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Loan Amount ({currency.symbol})</FormLabel>
                                    {/* Make read-only if price/down/trade are filled */}
                                     <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="e.g., 20000"
                                            {...field}
                                            step="any"
                                            min="0"
                                             readOnly={!!form.watch('vehiclePrice')} // Readonly if price is entered
                                             className={!!form.watch('vehiclePrice') ? 'bg-muted/50 cursor-not-allowed' : ''}
                                        />
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
                                        <Input type="number" placeholder="e.g., 6.5" {...field} step="any" min="0" />
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
                                        <Input type="number" placeholder="e.g., 5" {...field} step="1" min="1" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="md:col-span-3">
                            <Button type="submit" className="w-full">
                                <Calculator className="mr-2 h-4 w-4" /> Calculate Auto Loan
                            </Button>
                        </div>
                    </form>
                </Form>

                 {monthlyPayment !== null && totalInterest !== null && totalPayment !== null && (
                    <Alert className="mt-6 mb-6 transition-subtle">
                        <HandCoins className="h-4 w-4" />
                        <AlertTitle>Loan Summary ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Monthly Payment: <strong>{formatCurrency(monthlyPayment)}</strong></p>
                            <p>Total Principal Paid: <strong>{formatCurrency(parseFloat(form.getValues('loanAmount') || '0'))}</strong></p>
                            <p>Total Interest Paid: <strong>{formatCurrency(totalInterest)}</strong></p>
                            <p>Total Cost of Loan: <strong>{formatCurrency(totalPayment)}</strong></p>
                        </AlertDescription>
                    </Alert>
                 )}

                 {amortizationSchedule.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <ListChecks className="h-5 w-5 text-primary" />
                            Amortization Schedule ({currency.code})
                        </h3>
                        <ScrollArea className="h-[300px] w-full border">
                            <Table className="min-w-[600px]">
                                <TableHeader className="sticky top-0 bg-muted z-10">
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
