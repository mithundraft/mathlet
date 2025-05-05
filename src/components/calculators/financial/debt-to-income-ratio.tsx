
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
import { Calculator, Star, Divide, Percent, PlusCircle, Trash2, Smile, Meh, Frown } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Sub-schema for debt payments
const monthlyDebtSchema = z.object({
    name: z.string().optional().default('Debt'),
    monthlyPayment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Monthly payment must be zero or positive.",
    }),
});

// Zod Schema for DTI Calculator
const dtiSchema = z.object({
    monthlyGrossIncome: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Monthly gross income must be a positive number.",
    }),
    debts: z.array(monthlyDebtSchema).min(1, "Add at least one monthly debt payment (e.g., rent/mortgage, loans)."),
});

type DtiFormValues = z.infer<typeof dtiSchema>;

interface DebtToIncomeRatioCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function DebtToIncomeRatioCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: DebtToIncomeRatioCalculatorProps) {
    const [dtiRatio, setDtiRatio] = React.useState<number | null>(null);
    const [dtiCategory, setDtiCategory] = React.useState<string | null>(null);
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

    const form = useForm<DtiFormValues>({
        resolver: zodResolver(dtiSchema),
        defaultValues: {
            monthlyGrossIncome: '',
            debts: [{ name: 'Rent/Mortgage', monthlyPayment: '' }],
        },
    });

    const { fields: debtFields, append: appendDebt, remove: removeDebt } = useFieldArray({
        control: form.control,
        name: "debts",
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset({ debts: [{ name: 'Rent/Mortgage', monthlyPayment: '' }] });
            setDtiRatio(null);
            setDtiCategory(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    const calculateDti = (values: DtiFormValues): { ratio: number; category: string } | null => {
        const income = parseFloat(values.monthlyGrossIncome);
        const totalDebtPayments = values.debts.reduce((sum, debt) => sum + parseFloat(debt.monthlyPayment || '0'), 0);

        if (isNaN(income) || income <= 0 || isNaN(totalDebtPayments) || totalDebtPayments < 0) {
            return null;
        }

        const ratio = (totalDebtPayments / income) * 100;

        let category = 'High';
        let CategoryIcon = Frown; // Default Icon
         if (ratio <= 35) {
             category = 'Ideal';
             CategoryIcon = Smile;
         } else if (ratio <= 43) {
             category = 'Manageable';
             CategoryIcon = Meh;
         } else if (ratio <= 50) {
             category = 'Concerning';
             CategoryIcon = Frown;
         }
        // category 'High' uses default Frown

        return { ratio: ratio, category: category };
    };

    const getDtiCategoryInfo = (ratio: number | null): { category: string; icon: React.ElementType, colorClass: string } => {
         if (ratio === null) return { category: 'N/A', icon: Meh, colorClass: 'text-muted-foreground' };

         if (ratio <= 35) return { category: 'Ideal', icon: Smile, colorClass: 'text-green-600 dark:text-green-400' };
         if (ratio <= 43) return { category: 'Manageable', icon: Meh, colorClass: 'text-yellow-600 dark:text-yellow-400' };
         if (ratio <= 50) return { category: 'Concerning', icon: Frown, colorClass: 'text-orange-600 dark:text-orange-400' };
         return { category: 'High', icon: Frown, colorClass: 'text-red-600 dark:text-red-400' };
     };

    const onSubmit: SubmitHandler<DtiFormValues> = (data) => {
        const result = calculateDti(data);
        if (result) {
            setDtiRatio(result.ratio);
            setDtiCategory(result.category);

            const debtSummary = data.debts.map(d => `${d.name || 'Debt'}: ${formatCurrency(parseFloat(d.monthlyPayment))}`).join(', ');
            const inputString = `Income: ${formatCurrency(parseFloat(data.monthlyGrossIncome))}, Debts: [${debtSummary}]`;
            const resultString = `DTI Ratio: ${result.ratio.toFixed(2)}% (${result.category})`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setDtiRatio(null);
            setDtiCategory(null);
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
                     <Skeleton className="h-10 w-full" /> {/* Income Skeleton */}
                    {/* Debts Section Skeleton */}
                    <div>
                        <Skeleton className="h-6 w-1/4 mb-2" />
                        <div className="space-y-2">
                            <div className="flex gap-2 items-start"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-10" /></div>
                        </div>
                        <Skeleton className="h-9 w-32 mt-2" /> {/* Add button skeleton */}
                    </div>
                    <Skeleton className="h-10 w-full" /> {/* Calculate Button Skeleton */}
                    <Skeleton className="mt-6 h-20 w-full" /> {/* Result Skeleton */}
                </CardContent>
            </Card>
        );
    }

    const DtiIcon = getDtiCategoryInfo(dtiRatio).icon;
    const dtiColorClass = getDtiCategoryInfo(dtiRatio).colorClass;

    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="relative">
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                         <FormField
                            control={form.control}
                            name="monthlyGrossIncome"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Monthly Gross Income ({currency.symbol})</FormLabel>
                                    <FormControl><Input type="number" placeholder="Before taxes/deductions" {...field} step="any" min="0" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         {/* Debts Section */}
                        <div className="space-y-3 border-t pt-4">
                            <h3 className="text-lg font-semibold">Monthly Debt Payments</h3>
                             {debtFields.map((field, index) => (
                                <div key={field.id} className="flex gap-2 items-start">
                                     <FormField control={form.control} name={`debts.${index}.name`} render={({ field }) => (<FormItem className="flex-1"><FormLabel className="sr-only">Debt Name</FormLabel><FormControl><Input placeholder="e.g., Mortgage/Rent" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField control={form.control} name={`debts.${index}.monthlyPayment`} render={({ field }) => (<FormItem className="flex-1"><FormLabel className="sr-only">Monthly Payment</FormLabel><FormControl><Input type="number" placeholder={`Payment (${currency.symbol})`} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                     <Button type="button" variant="ghost" size="icon" onClick={() => removeDebt(index)} disabled={debtFields.length <= 1} className="mt-1 text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed self-end" aria-label="Remove debt payment"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendDebt({ name: '', monthlyPayment: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Debt Payment</Button>
                            <FormMessage>{form.formState.errors.debts?.root?.message || form.formState.errors.debts?.message}</FormMessage>
                        </div>
                         {form.formState.errors.root && (
                             <FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>
                         )}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate DTI Ratio</Button>
                    </form>
                </Form>

                {dtiRatio !== null && dtiCategory !== null && (
                    <Alert className="mt-6">
                         <DtiIcon className={cn("h-4 w-4", dtiColorClass)} />
                         <AlertTitle>Debt-to-Income (DTI) Ratio</AlertTitle>
                         <AlertDescription>
                            <p>Your DTI Ratio is <strong className="text-lg">{dtiRatio.toFixed(2)}%</strong>.</p>
                            <p>This is generally considered <strong className={cn("font-semibold", dtiColorClass)}>{dtiCategory}</strong>.</p>
                             <ul className="text-xs mt-2 list-disc list-inside text-muted-foreground space-y-1">
                                <li><strong>Ideal (≤35%):</strong> Good financial health, easier loan qualification.</li>
                                <li><strong>Manageable (36%-43%):</strong> Generally acceptable, but room for improvement.</li>
                                <li><strong>Concerning (44%-50%):</strong> May indicate financial stress, harder loan qualification.</li>
                                <li><strong>High (&gt;50%):</strong> Significant financial risk, very difficult loan qualification.</li>
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
