
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
import { Calculator, Star, TrendingDown, ListChecks } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Depreciation Calculator
const depreciationSchema = z.object({
    initialCost: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Initial cost must be a positive number.",
    }),
    salvageValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Salvage value must be zero or positive.",
    }),
    usefulLife: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Useful life must be a positive integer (years).",
    }),
    method: z.enum(['straight_line', 'double_declining_balance', 'sum_of_years_digits']).default('straight_line'),
}).superRefine((data, ctx) => {
    const initial = parseFloat(data.initialCost);
    const salvage = parseFloat(data.salvageValue);
    if (!isNaN(initial) && !isNaN(salvage) && salvage > initial) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Salvage value cannot be greater than the initial cost.",
            path: ["salvageValue"],
        });
    }
});


type DepreciationFormValues = z.infer<typeof depreciationSchema>;

interface DepreciationEntry {
    year: number;
    depreciationExpense: number;
    accumulatedDepreciation: number;
    bookValue: number;
}


interface DepreciationCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function DepreciationCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: DepreciationCalculatorProps) {
    const [depreciationSchedule, setDepreciationSchedule] = React.useState<DepreciationEntry[]>([]);
    const [totalDepreciation, setTotalDepreciation] = React.useState<number | null>(null);
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

    const form = useForm<DepreciationFormValues>({
        resolver: zodResolver(depreciationSchema),
        defaultValues: {
            initialCost: '',
            salvageValue: '',
            usefulLife: '',
            method: 'straight_line',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset({ method: 'straight_line' });
            setDepreciationSchedule([]);
            setTotalDepreciation(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

     // Reset results when method changes
     React.useEffect(() => {
         setDepreciationSchedule([]);
         setTotalDepreciation(null);
         form.clearErrors(['initialCost', 'salvageValue', 'usefulLife']); // Clear calculation-related errors
     }, [form.watch('method')]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateDepreciation = (values: DepreciationFormValues): { schedule: DepreciationEntry[]; total: number } | null => {
        const cost = parseFloat(values.initialCost);
        const salvage = parseFloat(values.salvageValue);
        const life = parseInt(values.usefulLife);
        const method = values.method;

        if (isNaN(cost) || cost <= 0 || isNaN(salvage) || salvage < 0 || isNaN(life) || life <= 0 || salvage > cost) {
            return null;
        }

        const depreciableBase = cost - salvage;
        const schedule: DepreciationEntry[] = [];
        let accumulatedDepreciation = 0;
        let bookValue = cost;

        for (let year = 1; year <= life; year++) {
            let depreciationExpense = 0;

            if (bookValue <= salvage) { // Stop depreciating if book value reaches salvage value
                depreciationExpense = 0;
            } else {
                switch (method) {
                    case 'straight_line':
                        depreciationExpense = depreciableBase / life;
                        break;
                    case 'double_declining_balance':
                        // Rate = (1 / Useful Life) * 2
                        // Expense = Book Value at Beginning of Year * Rate
                        const rateDDB = (1 / life) * 2;
                        depreciationExpense = bookValue * rateDDB;
                        break;
                    case 'sum_of_years_digits':
                        // Expense = Depreciable Base * (Remaining Useful Life / Sum of Years' Digits)
                        const soyd = (life * (life + 1)) / 2;
                        const remainingLife = life - year + 1;
                         if(soyd === 0) depreciationExpense = 0; // Avoid division by zero if life is 0 (shouldn't happen)
                         else depreciationExpense = depreciableBase * (remainingLife / soyd);
                        break;
                }

                // Ensure depreciation doesn't take book value below salvage value
                if (bookValue - depreciationExpense < salvage) {
                    depreciationExpense = Math.max(0, bookValue - salvage); // Adjust last depreciation amount
                }
            }


            accumulatedDepreciation += depreciationExpense;
            bookValue -= depreciationExpense;

            schedule.push({
                year: year,
                depreciationExpense: depreciationExpense,
                accumulatedDepreciation: accumulatedDepreciation,
                bookValue: bookValue < 0.005 ? salvage : bookValue // Ensure book value doesn't go significantly below salvage due to rounding
            });

             // Adjust final book value exactly to salvage if needed
             if (year === life && schedule[schedule.length - 1].bookValue !== salvage) {
                 // This indicates a potential rounding accumulation. Adjusting the last entry.
                 const finalEntry = schedule[schedule.length - 1];
                  const neededAdjustment = finalEntry.bookValue - salvage;
                   if (Math.abs(neededAdjustment) > 0.005) { // Only adjust if difference is significant
                     finalEntry.depreciationExpense -= neededAdjustment;
                     finalEntry.accumulatedDepreciation -= neededAdjustment;
                     finalEntry.bookValue = salvage;
                      // Recalculate total depreciation
                      accumulatedDepreciation = schedule.reduce((sum, entry) => sum + entry.depreciationExpense, 0);
                   }
             }

        }

        const totalDepreciationCalc = accumulatedDepreciation; // Should equal depreciableBase if calculated correctly


        return { schedule: schedule, total: totalDepreciationCalc };
    };


    const onSubmit: SubmitHandler<DepreciationFormValues> = (data) => {
        const result = calculateDepreciation(data);
        if (result) {
            setDepreciationSchedule(result.schedule);
            setTotalDepreciation(result.total);

            const methodText = data.method.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            const inputString = `Cost: ${formatCurrency(parseFloat(data.initialCost))}, Salvage: ${formatCurrency(parseFloat(data.salvageValue))}, Life: ${data.usefulLife} yrs, Method: ${methodText}`;
            const resultString = `Total Depreciation: ${formatCurrency(result.total)}. See schedule below.`; // Result focuses on total

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setDepreciationSchedule([]);
            setTotalDepreciation(null);
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
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" /> {/* Method Select */}
                    </div>
                    <Skeleton className="h-10 w-full" /> {/* Button Skeleton */}
                    <Skeleton className="mt-6 h-[300px] w-full" /> {/* Table Skeleton */}
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="initialCost" render={({ field }) => (<FormItem><FormLabel>Initial Cost ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 50000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="salvageValue" render={({ field }) => (<FormItem><FormLabel>Salvage Value ({currency.symbol})</FormLabel><FormControl><Input type="number" placeholder="e.g., 5000" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="usefulLife" render={({ field }) => (<FormItem><FormLabel>Useful Life (Years)</FormLabel><FormControl><Input type="number" placeholder="e.g., 5" {...field} step="1" min="1" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField
                                control={form.control}
                                name="method"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Depreciation Method</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="straight_line">Straight Line</SelectItem>
                                        <SelectItem value="double_declining_balance">Double Declining Balance</SelectItem>
                                        <SelectItem value="sum_of_years_digits">Sum-of-the-Years' Digits</SelectItem>
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Depreciation</Button>
                    </form>
                </Form>

                 {depreciationSchedule.length > 0 && totalDepreciation !== null && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <ListChecks className="h-5 w-5 text-primary" />
                            Depreciation Schedule ({currency.code})
                        </h3>
                         <p className="text-sm mb-2">Total Depreciation: <strong>{formatCurrency(totalDepreciation)}</strong></p>
                        <ScrollArea className="h-[300px] w-full border">
                            <Table className="min-w-[600px]">
                                <TableHeader className="sticky top-0 bg-muted z-10">
                                    <TableRow>
                                        <TableHead className="w-[80px]">Year</TableHead>
                                        <TableHead>Depreciation Expense</TableHead>
                                        <TableHead>Accumulated Depreciation</TableHead>
                                        <TableHead className="text-right">Book Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     {/* Add row for year 0 */}
                                    <TableRow>
                                         <TableCell className="font-medium">0</TableCell>
                                         <TableCell>{formatCurrency(0)}</TableCell>
                                         <TableCell>{formatCurrency(0)}</TableCell>
                                         <TableCell className="text-right">{formatCurrency(parseFloat(form.getValues('initialCost')))}</TableCell>
                                     </TableRow>
                                    {depreciationSchedule.map((entry) => (
                                        <TableRow key={entry.year}>
                                            <TableCell className="font-medium">{entry.year}</TableCell>
                                            <TableCell>{formatCurrency(entry.depreciationExpense)}</TableCell>
                                            <TableCell>{formatCurrency(entry.accumulatedDepreciation)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(entry.bookValue)}</TableCell>
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
