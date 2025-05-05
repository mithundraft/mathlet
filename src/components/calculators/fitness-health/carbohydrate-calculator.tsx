'use client';

// IMPORTANT: Carbohydrate needs depend on activity level, goals, health status, etc.
// This is a very basic calculator based on general guidelines (e.g., % of TDEE).
// Consult a nutritionist or healthcare professional for personalized advice.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Wheat, Activity, Percent } from 'lucide-react'; // Added Percent
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Zod Schema for Carbohydrate Calculator
const carbSchema = z.object({
    totalDailyCalories: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Total daily calories must be positive.",
    }),
    carbPercentage: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
        message: "Carbohydrate percentage must be between 0 and 100.",
    }).default("50"), // Common guideline: 45-65%
});

type CarbFormValues = z.infer<typeof carbSchema>;

interface CarbohydrateCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData; // Keep for consistency
}

export function CarbohydrateCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: CarbohydrateCalculatorProps) {
    const [carbGrams, setCarbGrams] = React.useState<number | null>(null);
    const [carbCalories, setCarbCalories] = React.useState<number | null>(null);
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

    const form = useForm<CarbFormValues>({
        resolver: zodResolver(carbSchema),
        defaultValues: {
            totalDailyCalories: '',
            carbPercentage: '50',
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset({ carbPercentage: '50' });
            setCarbGrams(null);
            setCarbCalories(null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted]);

    // Calculate Carbohydrate Needs
    const calculateCarbs = (values: CarbFormValues): { grams: number; calories: number } | null => {
        const totalCalories = parseFloat(values.totalDailyCalories);
        const percent = parseFloat(values.carbPercentage) / 100;

        if (isNaN(totalCalories) || totalCalories <= 0 || isNaN(percent) || percent < 0 || percent > 1) {
            return null;
        }

        // Calories from carbs = Total Calories * Percentage
        const caloriesFromCarbs = totalCalories * percent;

        // Grams of carbs = Calories from Carbs / 4 (approx. 4 kcal per gram)
        const gramsOfCarbs = caloriesFromCarbs / 4;

        return { grams: Math.round(gramsOfCarbs), calories: Math.round(caloriesFromCarbs) };
    };

    const onSubmit: SubmitHandler<CarbFormValues> = (data) => {
        const result = calculateCarbs(data);
        if (result) {
            setCarbGrams(result.grams);
            setCarbCalories(result.calories);

            const inputString = `Daily Calories: ${data.totalDailyCalories} kcal, Carb Percentage: ${data.carbPercentage}%`;
            const resultString = `Estimated Carb Needs: ${result.grams}g/day (${result.calories} kcal/day)`;

            const historyEntry: HistoryEntry = { id: Date.now().toString(), calculatorSlug: slug, timestamp: new Date(), input: inputString, result: resultString };
            onCalculation(historyEntry);
        } else {
            setCarbGrams(null);
            setCarbCalories(null);
             form.setError("root", { message: "Calculation failed. Check inputs." });
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
                    <Skeleton className="h-10 w-full" /> {/* Button */}
                    <Skeleton className="mt-6 h-20 w-full" /> {/* Result */}
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
                        <FormField control={form.control} name="totalDailyCalories" render={({ field }) => (<FormItem><FormLabel>Total Daily Calories (kcal)</FormLabel><FormControl><Input type="number" placeholder="Your TDEE or target intake" {...field} step="1" min="0" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="carbPercentage" render={({ field }) => (<FormItem><FormLabel>Desired Carbohydrate Percentage (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 50" {...field} step="any" min="0" max="100"/></FormControl><FormDescription className="text-xs">Common range is 45-65% of total calories.</FormDescription><FormMessage /></FormItem>)} />
                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Carb Needs</Button>
                    </form>
                </Form>

                 {carbGrams !== null && carbCalories !== null && (
                    <Alert className="mt-6">
                         <Wheat className="h-4 w-4" />
                         <AlertTitle>Estimated Carbohydrate Needs</AlertTitle>
                         <AlertDescription>
                             <p>Estimated Daily Carbohydrate Intake: <strong>{carbGrams} grams</strong></p>
                             <p>(Approximately <strong>{carbCalories} kcal</strong> from carbohydrates)</p>
                             <p className="text-xs mt-1 text-muted-foreground">Based on {form.watch('carbPercentage')}% of {form.watch('totalDailyCalories')} kcal. Needs vary based on activity and goals.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
