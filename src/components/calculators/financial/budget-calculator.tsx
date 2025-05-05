
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, WalletCards, PlusCircle, Trash2, LineChart } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Sub-schemas for income and expenses
const itemSchema = z.object({
    name: z.string().min(1, "Name cannot be empty."),
    amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Amount must be zero or positive.",
    }),
});

// Zod Schema for Budget Calculator
const budgetSchema = z.object({
    incomeSources: z.array(itemSchema).min(1, "Add at least one income source."),
    expenseItems: z.array(itemSchema).min(1, "Add at least one expense item."),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

interface BudgetCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function BudgetCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: BudgetCalculatorProps) {
    const [totalIncome, setTotalIncome] = React.useState<number | null>(null);
    const [totalExpenses, setTotalExpenses] = React.useState<number | null>(null);
    const [netAmount, setNetAmount] = React.useState<number | null>(null); // Surplus or deficit
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

    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(budgetSchema),
        defaultValues: {
            incomeSources: [{ name: '', amount: '' }],
            expenseItems: [{ name: '', amount: '' }],
        },
    });

     // UseFieldArray hooks
     const { fields: incomeFields, append: appendIncome, remove: removeIncome } = useFieldArray({
        control: form.control,
        name: "incomeSources",
    });
     const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({
        control: form.control,
        name: "expenseItems",
    });

    React.useEffect(() => {
        if (mounted) {
            form.reset({
                incomeSources: [{ name: '', amount: '' }],
                expenseItems: [{ name: '', amount: '' }],
            });
            setTotalIncome(null);
            setTotalExpenses(null);
            setNetAmount(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateBudget = (values: BudgetFormValues): { income: number; expenses: number; net: number } | null => {
        const income = values.incomeSources.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);
        const expenses = values.expenseItems.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);

        if (isNaN(income) || isNaN(expenses)) return null;

        const net = income - expenses;
        return { income, expenses, net };
    };

    const onSubmit: SubmitHandler<BudgetFormValues> = (data) => {
        const result = calculateBudget(data);
        if (result) {
            setTotalIncome(result.income);
            setTotalExpenses(result.expenses);
            setNetAmount(result.net);

            const incomeSummary = data.incomeSources.map(i => `${i.name}: ${formatCurrency(parseFloat(i.amount))}`).join(', ');
            const expenseSummary = data.expenseItems.map(e => `${e.name}: ${formatCurrency(parseFloat(e.amount))}`).join(', ');
            const inputString = `Income: [${incomeSummary}] | Expenses: [${expenseSummary}]`;
            const resultString = `Total Income: ${formatCurrency(result.income)}, Total Expenses: ${formatCurrency(result.expenses)}, Net Amount: ${formatCurrency(result.net)} (${result.net >= 0 ? 'Surplus' : 'Deficit'})`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString, // Consider truncating if too long
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setTotalIncome(null);
            setTotalExpenses(null);
            setNetAmount(null);
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
                <CardContent className="space-y-6">
                    {/* Income Section Skeleton */}
                    <div>
                        <Skeleton className="h-6 w-1/4 mb-2" />
                        <div className="space-y-2">
                            <div className="flex gap-2"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-10" /></div>
                        </div>
                        <Skeleton className="h-9 w-32 mt-2" /> {/* Add button skeleton */}
                    </div>
                    {/* Expense Section Skeleton */}
                    <div>
                        <Skeleton className="h-6 w-1/4 mb-2" />
                        <div className="space-y-2">
                            <div className="flex gap-2"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-10" /></div>
                        </div>
                        <Skeleton className="h-9 w-36 mt-2" /> {/* Add button skeleton */}
                    </div>
                    <Skeleton className="h-10 w-full" /> {/* Calculate Button Skeleton */}
                    <Skeleton className="mt-6 h-24 w-full" /> {/* Result Skeleton */}
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Income Section */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">Income Sources</h3>
                             {incomeFields.map((field, index) => (
                                <div key={field.id} className="flex gap-2 items-start">
                                     <FormField
                                        control={form.control}
                                        name={`incomeSources.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel className="sr-only">Income Source Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Salary" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name={`incomeSources.${index}.amount`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel className="sr-only">Income Amount</FormLabel>
                                                <FormControl>
                                                     <Input type="number" placeholder={`Amount (${currency.symbol})`} {...field} step="any" min="0" />
                                                 </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeIncome(index)}
                                        disabled={incomeFields.length <= 1}
                                        className="mt-1 text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Remove income source"
                                     >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                             <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => appendIncome({ name: '', amount: '' })}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Income Source
                            </Button>
                             <FormMessage>{form.formState.errors.incomeSources?.root?.message || form.formState.errors.incomeSources?.message}</FormMessage>
                        </div>

                        {/* Expense Section */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">Expense Items</h3>
                             {expenseFields.map((field, index) => (
                                <div key={field.id} className="flex gap-2 items-start">
                                     <FormField
                                        control={form.control}
                                        name={`expenseItems.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                 <FormLabel className="sr-only">Expense Item Name</FormLabel>
                                                 <FormControl>
                                                    <Input placeholder="e.g., Rent" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name={`expenseItems.${index}.amount`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                 <FormLabel className="sr-only">Expense Amount</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder={`Amount (${currency.symbol})`} {...field} step="any" min="0" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeExpense(index)}
                                        disabled={expenseFields.length <= 1}
                                        className="mt-1 text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                                         aria-label="Remove expense item"
                                     >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => appendExpense({ name: '', amount: '' })}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Expense Item
                            </Button>
                            <FormMessage>{form.formState.errors.expenseItems?.root?.message || form.formState.errors.expenseItems?.message}</FormMessage>
                        </div>


                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate Budget
                        </Button>
                    </form>
                </Form>

                {totalIncome !== null && totalExpenses !== null && netAmount !== null && (
                    <Alert className="mt-6">
                        <LineChart className="h-4 w-4" />
                        <AlertTitle>Budget Summary ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Total Income: <strong>{formatCurrency(totalIncome)}</strong></p>
                            <p>Total Expenses: <strong>{formatCurrency(totalExpenses)}</strong></p>
                             <p className={cn("font-semibold", netAmount >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                                 Net Amount ({netAmount >= 0 ? 'Surplus' : 'Deficit'}): <strong>{formatCurrency(netAmount)}</strong>
                            </p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
