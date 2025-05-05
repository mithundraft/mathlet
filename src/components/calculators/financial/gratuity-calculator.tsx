
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
import { Calculator, Star, Award, HandCoins } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Note: Gratuity rules vary GREATLY by country. This example implements the formula
// commonly used under the Payment of Gratuity Act, 1972 in India.
// Adjustments needed for other countries or specific company policies.

// Zod Schema for Gratuity Calculator (India example)
const gratuitySchema = z.object({
    lastDrawnSalary: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Last drawn monthly salary (Basic + DA) must be positive.",
    }),
    yearsOfService: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 5, { // Min 5 years often required
        message: "Years of service must be at least 5 (check specific rules).",
    }),
});

type GratuityFormValues = z.infer<typeof gratuitySchema>;

interface GratuityCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData; // Likely INR for this example
}

export function GratuityCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: GratuityCalculatorProps) {
    const [gratuityAmount, setGratuityAmount] = React.useState<number | null>(null);
    const [mounted, setMounted] = React.useState(false);

    const { name, description, icon: Icon } = calculatorInfo;
    const isFavorite = favorites.includes(slug);
    // Recommend forcing currency to INR if this is India-specific
    const displayCurrency = currency.code === 'INR' ? currency : { ...currency, code: 'INR', symbol: '₹' };

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

    const form = useForm<GratuityFormValues>({
        resolver: zodResolver(gratuitySchema),
        defaultValues: {
            lastDrawnSalary: '',
            yearsOfService: '',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset();
            setGratuityAmount(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayCurrency.code, mounted]); // Use displayCurrency

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        // Use local INR formatting if possible, else default
        return `${displayCurrency.symbol}${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [displayCurrency.symbol]);

    // Calculate Gratuity (India Formula)
    const calculateGratuity = (values: GratuityFormValues): number | null => {
        const salary = parseFloat(values.lastDrawnSalary); // Monthly Basic + DA
        const years = parseInt(values.yearsOfService);

        if (isNaN(salary) || salary <= 0 || isNaN(years) || years < 5) { // Check minimum years
            return null;
        }

        // Formula: (Last Drawn Salary * 15 * Years of Service) / 26
        // Note: Last Drawn Salary includes Basic + Dearness Allowance (DA).
        //       '15' represents 15 days' salary.
        //       '26' represents the number of working days in a month.
        //       Years of service: If > 6 months in the last year, round up. (Handled below)

         // Round up years if service in the last year is > 6 months (common practice, but check exact rules)
         // This simple form assumes integer years are provided, might need refinement for partial years.
         // For simplicity, we'll use the integer years provided. Add notes about rounding.


        const gratuity = (salary * 15 * years) / 26;

        // Gratuity limit (as of writing, ₹20 Lakhs - check current limit)
        const gratuityLimit = 2000000;
        return Math.min(gratuity, gratuityLimit);
    };

    const onSubmit: SubmitHandler<GratuityFormValues> = (data) => {
        const result = calculateGratuity(data);
        if (result !== null) {
            setGratuityAmount(result);

            const inputString = `Last Salary (Basic+DA): ${formatCurrency(parseFloat(data.lastDrawnSalary))}, Years Served: ${data.yearsOfService}`;
            const resultString = `Estimated Gratuity Amount: ${formatCurrency(result)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setGratuityAmount(null);
             form.setError("root", {message: "Calculation failed. Ensure years >= 5."})
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
                    <Skeleton className="h-10 w-full" /> {/* Button Skeleton */}
                    <Skeleton className="mt-6 h-20 w-full" /> {/* Result Skeleton */}
                    <Skeleton className="h-10 w-full" /> {/* Disclaimer Skeleton */}
                </CardContent>
            </Card>
        );
    }


    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="relative">
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description} (Based on Indian Gratuity Act)</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <FormField control={form.control} name="lastDrawnSalary" render={({ field }) => (<FormItem><FormLabel>Last Drawn Monthly Salary (Basic + DA) ({displayCurrency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 50000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="yearsOfService" render={({ field }) => (<FormItem><FormLabel>Years of Service Completed</FormLabel><FormControl><Input type="number" placeholder="Min 5 years" {...field} step="1" min="5" /></FormControl><FormMessage /></FormItem>)} />
                          {form.formState.errors.root && (
                             <FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>
                         )}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Gratuity</Button>
                    </form>
                </Form>

                 {gratuityAmount !== null && (
                    <Alert className="mt-6">
                        <Award className="h-4 w-4" />
                        <AlertTitle>Estimated Gratuity Amount ({displayCurrency.code})</AlertTitle>
                        <AlertDescription>
                            <p>The estimated gratuity payable is <strong>{formatCurrency(gratuityAmount)}</strong>.</p>
                             <p className="text-xs mt-2 text-muted-foreground">
                                <strong>Note:</strong> This calculation is based on the formula (Salary * 15 * Years) / 26. It assumes the employee is covered under the Gratuity Act. The maximum statutory limit (currently ₹20 Lakhs) has been applied. Rules regarding rounding of service years and exact definition of 'salary' can vary. Consult official sources or HR for precise details.
                             </p>
                        </AlertDescription>
                    </Alert>
                )}
                 {!gratuityAmount && (
                      <Alert variant="destructive" className="mt-6">
                        <AlertTitle>Important Note</AlertTitle>
                        <AlertDescription>
                            Gratuity calculations depend heavily on specific country laws (this calculator uses the common Indian formula) and employment contracts. Always verify eligibility and calculation methods with official sources or your employer. Minimum service years (often 5) are typically required.
                        </AlertDescription>
                    </Alert>
                 )}
            </CardContent>
        </Card>
    );
}
