
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
import { Calculator, Star, School, PiggyBank, PlusCircle, Trash2 } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Sub-schema for cost items
const costItemSchema = z.object({
    name: z.string().min(1, "Name cannot be empty."),
    annualCost: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Annual cost must be zero or positive.",
    }),
    inflationRate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Inflation rate must be zero or positive.",
    }).optional().default("3"), // Default inflation rate (e.g., 3%)
});

// Zod Schema for College Cost Calculator
const collegeCostSchema = z.object({
    yearsUntilCollege: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
        message: "Years until college must be zero or positive.",
    }),
    yearsInCollege: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Years in college must be a positive integer.",
    }),
    costItems: z.array(costItemSchema).min(1, "Add at least one cost item (e.g., Tuition, Room & Board)."),
});

type CollegeCostFormValues = z.infer<typeof collegeCostSchema>;

interface CollegeCostCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

export function CollegeCostCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: CollegeCostCalculatorProps) {
    const [totalEstimatedCost, setTotalEstimatedCost] = React.useState<number | null>(null);
    const [firstYearCost, setFirstYearCost] = React.useState<number | null>(null);
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

    const form = useForm<CollegeCostFormValues>({
        resolver: zodResolver(collegeCostSchema),
        defaultValues: {
            yearsUntilCollege: '',
            yearsInCollege: '4', // Default to 4 years
            costItems: [{ name: 'Tuition & Fees', annualCost: '', inflationRate: '3' }, { name: 'Room & Board', annualCost: '', inflationRate: '3' }],
        },
    });

     // UseFieldArray hook for cost items
     const { fields: costFields, append: appendCost, remove: removeCost } = useFieldArray({
        control: form.control,
        name: "costItems",
    });


    React.useEffect(() => {
        if (mounted) {
            form.reset({
                yearsUntilCollege: '',
                yearsInCollege: '4',
                costItems: [{ name: 'Tuition & Fees', annualCost: '', inflationRate: '3' }, { name: 'Room & Board', annualCost: '', inflationRate: '3' }],
            });
            setTotalEstimatedCost(null);
            setFirstYearCost(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency.code, mounted]);

    const formatCurrency = React.useCallback((value: number | null) => {
        if (value === null) return 'N/A';
        return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency.symbol]);

    // Calculate Future College Costs
    const calculateCollegeCost = (values: CollegeCostFormValues): { total: number; firstYear: number } | null => {
        const yearsUntil = parseInt(values.yearsUntilCollege);
        const yearsIn = parseInt(values.yearsInCollege);

        if (isNaN(yearsUntil) || yearsUntil < 0 || isNaN(yearsIn) || yearsIn <= 0) {
            return null;
        }

        let totalCost = 0;
        let firstYearTotal = 0;

        for (const item of values.costItems) {
            const annualCost = parseFloat(item.annualCost);
            const inflation = parseFloat(item.inflationRate || '0') / 100;

            if (isNaN(annualCost) || annualCost < 0 || isNaN(inflation) || inflation < 0) {
                console.error("Invalid cost item data", item);
                form.setError("costItems", { message: "Invalid cost or inflation rate found."}); // General error on array
                return null; // Skip item or return null if critical
            }

            // Calculate cost for each year of college, accounting for inflation until that year
            for (let i = 0; i < yearsIn; i++) {
                const yearsToInflate = yearsUntil + i; // Years until this specific year of college starts
                const inflatedCost = annualCost * Math.pow(1 + inflation, yearsToInflate);
                totalCost += inflatedCost;
                 if (i === 0) {
                    firstYearTotal += inflatedCost; // Sum up costs for the first year
                 }
            }
        }

        return { total: totalCost, firstYear: firstYearTotal };
    };


    const onSubmit: SubmitHandler<CollegeCostFormValues> = (data) => {
        const result = calculateCollegeCost(data);
        if (result) {
            setTotalEstimatedCost(result.total);
            setFirstYearCost(result.firstYear);

            const costSummary = data.costItems.map(i => `${i.name}: ${formatCurrency(parseFloat(i.annualCost))} @ ${i.inflationRate || '0'}%`).join(', ');
            const inputString = `Years Until: ${data.yearsUntilCollege}, Years In: ${data.yearsInCollege}, Costs: [${costSummary}]`;
            const resultString = `Total Estimated Cost: ${formatCurrency(result.total)}, Est. First Year Cost: ${formatCurrency(result.firstYear)}`;

            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setTotalEstimatedCost(null);
            setFirstYearCost(null);
             // Error might be set in calculate function
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
                    {/* Timing Skeletons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    {/* Costs Section Skeleton */}
                    <div>
                        <Skeleton className="h-6 w-1/4 mb-2" />
                        <div className="space-y-2">
                             {/* Skeleton for one cost item row */}
                             <div className="flex gap-2 items-start">
                                 <Skeleton className="h-10 flex-1" />
                                 <Skeleton className="h-10 flex-1" />
                                 <Skeleton className="h-10 w-1/4" />
                                 <Skeleton className="h-10 w-10" />
                             </div>
                             <div className="flex gap-2 items-start">
                                 <Skeleton className="h-10 flex-1" />
                                 <Skeleton className="h-10 flex-1" />
                                 <Skeleton className="h-10 w-1/4" />
                                 <Skeleton className="h-10 w-10" />
                             </div>
                        </div>
                        <Skeleton className="h-9 w-32 mt-2" /> {/* Add button skeleton */}
                    </div>
                    <Skeleton className="h-10 w-full" /> {/* Calculate Button Skeleton */}
                    <Skeleton className="mt-6 h-20 w-full" /> {/* Result Skeleton */}
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
                         {/* Timing Inputs */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="yearsUntilCollege"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Years Until College Starts</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 10" {...field} step="1" min="0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="yearsInCollege"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Years In College</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 4" {...field} step="1" min="1" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                         {/* Cost Items Section */}
                        <div className="space-y-3 border-t pt-4">
                             <h3 className="text-lg font-semibold">Annual College Costs (Current Value)</h3>
                             {costFields.map((field, index) => (
                                <div key={field.id} className="flex flex-col md:flex-row gap-2 items-start border p-3">
                                    <FormField
                                        control={form.control}
                                        name={`costItems.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1 w-full md:w-auto">
                                                <FormLabel>Cost Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Tuition" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name={`costItems.${index}.annualCost`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1 w-full md:w-auto">
                                                <FormLabel>Annual Cost ({currency.symbol})</FormLabel>
                                                <FormControl>
                                                     <Input type="number" placeholder="e.g., 20000" {...field} step="any" min="0" />
                                                 </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name={`costItems.${index}.inflationRate`}
                                        render={({ field }) => (
                                            <FormItem className="w-full md:w-auto md:max-w-[120px]">
                                                 <FormLabel>Inflation (%)</FormLabel>
                                                 <FormControl>
                                                    <Input type="number" placeholder="e.g., 3" {...field} step="any" min="0" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeCost(index)}
                                        disabled={costFields.length <= 1}
                                         className="mt-auto text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed self-end md:self-center"
                                         aria-label="Remove cost item"
                                     >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                             <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => appendCost({ name: '', annualCost: '', inflationRate: '3' })}
                             >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Cost Item
                            </Button>
                             <FormMessage>{form.formState.errors.costItems?.root?.message || form.formState.errors.costItems?.message}</FormMessage>
                        </div>


                         {form.formState.errors.root && (
                            <FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>
                         )}
                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Estimate College Costs
                        </Button>
                    </form>
                </Form>

                {totalEstimatedCost !== null && firstYearCost !== null && (
                    <Alert className="mt-6">
                        <PiggyBank className="h-4 w-4" />
                        <AlertTitle>Estimated College Costs ({currency.code})</AlertTitle>
                        <AlertDescription>
                            <p>Estimated Total Cost for {form.watch('yearsInCollege')} years: <strong>{formatCurrency(totalEstimatedCost)}</strong></p>
                             <p>Estimated Cost for the First Year: <strong>{formatCurrency(firstYearCost)}</strong></p>
                            <p className="text-xs mt-2 text-muted-foreground">Estimates based on current costs inflated over the specified period. Does not account for savings growth, financial aid, or scholarships.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
