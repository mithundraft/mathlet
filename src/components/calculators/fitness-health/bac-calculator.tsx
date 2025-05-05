'use client';

// IMPORTANT: BAC calculation is an estimate and depends on many factors (metabolism, food, medication, etc.).
// It should NOT be used to determine if it's safe to drive or operate machinery.
// Legal BAC limits vary by jurisdiction. Always prioritize safety and obey local laws.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Wine, UserCheck, AlertTriangle } from 'lucide-react'; // Using Wine icon
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLocalStorage } from '@/hooks/use-local-storage'; // Corrected import
import { PROFILE_STORAGE_KEY } from '@/lib/constants';
import type { UserProfile } from '@/lib/types';

// Widmark formula constants
const MALE_DISTRIBUTION_RATIO = 0.68;
const FEMALE_DISTRIBUTION_RATIO = 0.55;
const ALCOHOL_DENSITY = 0.789; // g/mL
const METABOLISM_RATE = 0.015; // % per hour (average, varies greatly)

// Zod Schema for BAC Calculator
const bacSchema = z.object({
    gender: z.enum(['male', 'female']),
    weight: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Weight must be a positive number.",
    }),
    unit: z.enum(['metric', 'imperial']), // kg or lb
    drinksConsumed: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
        message: "Number of standard drinks must be zero or positive.",
    }),
    drinkingPeriodHours: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Drinking period (hours) must be zero or positive.",
    }),
});
// Assuming a "standard drink" contains roughly 14 grams (or 17.7 mL) of pure alcohol (e.g., 12oz beer, 5oz wine, 1.5oz spirits)

type BacFormValues = z.infer<typeof bacSchema>;

interface BacCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData; // Not used but kept for consistency
}

export function BacCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: BacCalculatorProps) {
    const [profile] = useLocalStorage<UserProfile>(PROFILE_STORAGE_KEY, { preferredUnits: 'imperial', preferredCurrency: 'USD' });
    const [estimatedBac, setEstimatedBac] = React.useState<number | null>(null);
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

    const form = useForm<BacFormValues>({
        resolver: zodResolver(bacSchema),
        defaultValues: {
            gender: 'male',
            weight: '',
            unit: profile?.preferredUnits || 'imperial',
            drinksConsumed: '1',
            drinkingPeriodHours: '1',
        },
    });

     // Reset based on profile unit preference
     React.useEffect(() => {
         if (mounted) {
            form.reset({
                ...form.getValues(),
                unit: profile?.preferredUnits || 'imperial',
            });
            setEstimatedBac(null);
            form.clearErrors();
         }
     // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [profile?.preferredUnits, mounted]);

     // Reset results if unit/gender changes
      React.useEffect(() => {
         setEstimatedBac(null);
         form.clearErrors(['weight', 'drinksConsumed', 'drinkingPeriodHours']);
      }, [form.watch('unit'), form.watch('gender')]);

    // Calculate BAC using Widmark formula
    const calculateBac = (values: BacFormValues): number | null => {
        const weightRaw = parseFloat(values.weight);
        const drinks = parseInt(values.drinksConsumed);
        const hours = parseFloat(values.drinkingPeriodHours);
        const gender = values.gender;
        const unit = values.unit;

        if (isNaN(weightRaw) || weightRaw <= 0 || isNaN(drinks) || drinks < 0 || isNaN(hours) || hours < 0) {
            return null;
        }

        // Convert weight to grams
        const weightGrams = unit === 'metric' ? weightRaw * 1000 : weightRaw * 453.592;

        // Calculate total grams of alcohol consumed (1 standard drink ≈ 14g)
        const totalAlcoholGrams = drinks * 14;

        // Distribution ratio based on gender
        const distributionRatio = gender === 'male' ? MALE_DISTRIBUTION_RATIO : FEMALE_DISTRIBUTION_RATIO;

        // Calculate BAC before metabolism
        // BAC % = (Alcohol Consumed (g) / (Body Weight (g) * Distribution Ratio)) * 100
        const bacPeak = (totalAlcoholGrams / (weightGrams * distributionRatio)) * 100;

        // Account for alcohol metabolism over time
        const bacCurrent = bacPeak - (METABOLISM_RATE * hours);

        // BAC cannot be negative
        return Math.max(0, bacCurrent);
    };

    const onSubmit: SubmitHandler<BacFormValues> = (data) => {
        const result = calculateBac(data);
        if (result !== null) {
            setEstimatedBac(result);

            const unitLabel = data.unit === 'metric' ? 'kg' : 'lbs';
            const inputString = `Gender: ${data.gender}, Weight: ${data.weight} ${unitLabel}, Drinks: ${data.drinksConsumed} (std), Hours: ${data.drinkingPeriodHours}`;
            const resultString = `Estimated BAC: ${result.toFixed(3)}%`;

            const historyEntry: HistoryEntry = { id: Date.now().toString(), calculatorSlug: slug, timestamp: new Date(), input: inputString, result: resultString };
            onCalculation(historyEntry);
        } else {
            setEstimatedBac(null);
            form.setError("root", { message: "Calculation failed. Check inputs." });
            console.error("Calculation failed. Check inputs.");
        }
    };

    const unit = form.watch('unit');
    const unitLabel = unit === 'metric' ? 'kg' : 'lbs';

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
                     {/* Gender Radio Skeleton */}
                     <div className="space-y-3"><Skeleton className="h-5 w-1/4" /><div className="flex space-x-4"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-6 w-1/3" /></div></div>
                     {/* Unit Radio Skeleton */}
                     <div className="space-y-3"><Skeleton className="h-5 w-1/4" /><div className="flex space-x-4"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-6 w-1/3" /></div></div>
                     <Skeleton className="h-10 w-full" /> {/* Weight */}
                     <Skeleton className="h-10 w-full" /> {/* Drinks */}
                     <Skeleton className="h-10 w-full" /> {/* Hours */}
                    <Skeleton className="h-10 w-full" /> {/* Button */}
                    <Skeleton className="mt-6 h-20 w-full" /> {/* Result */}
                    <Skeleton className="h-16 w-full" /> {/* Disclaimer */}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="relative">
                <Button variant="ghost" size="icon" className={cn("absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10", isFavorite && "text-primary")} onClick={toggleFavorite} aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}><Star className={cn("h-5 w-5", isFavorite && "fill-current")} /></Button>
                <CardTitle className="flex items-center gap-2 pr-10"><Icon className="h-6 w-6 text-primary" />{name}</CardTitle>
                <CardDescription>{description} <strong className='text-destructive'>(Estimate Only)</strong></CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="gender" render={({ field }) => (
                                <FormItem className="space-y-3"><FormLabel>Gender</FormLabel><FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="male" id="bac-gender-male"/></FormControl><FormLabel htmlFor="bac-gender-male" className="font-normal cursor-pointer">Male</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="female" id="bac-gender-female"/></FormControl><FormLabel htmlFor="bac-gender-female" className="font-normal cursor-pointer">Female</FormLabel></FormItem>
                                </RadioGroup></FormControl><FormMessage /></FormItem>
                            )}
                        />
                        <FormField control={form.control} name="unit" render={({ field }) => (
                                <FormItem className="space-y-3"><FormLabel>Units</FormLabel><FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="imperial" id="bac-unit-imp"/></FormControl><FormLabel htmlFor="bac-unit-imp" className="font-normal cursor-pointer">Imperial (lbs)</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="metric" id="bac-unit-met"/></FormControl><FormLabel htmlFor="bac-unit-met" className="font-normal cursor-pointer">Metric (kg)</FormLabel></FormItem>
                                </RadioGroup></FormControl><FormMessage /></FormItem>
                            )}
                        />
                         <FormField control={form.control} name="weight" render={({ field }) => (<FormItem><FormLabel>Body Weight ({unitLabel})</FormLabel><FormControl><Input type="number" placeholder={`Weight in ${unitLabel}`} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="drinksConsumed" render={({ field }) => (<FormItem><FormLabel>Standard Drinks Consumed</FormLabel><FormControl><Input type="number" placeholder="Number of drinks" {...field} step="1" min="0" /></FormControl><FormDescription className="text-xs">1 standard drink ≈ 14g alcohol (12oz beer, 5oz wine, 1.5oz spirits).</FormDescription><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="drinkingPeriodHours" render={({ field }) => (<FormItem><FormLabel>Drinking Period (Hours)</FormLabel><FormControl><Input type="number" placeholder="Hours since first drink" {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                          {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Estimate BAC</Button>
                    </form>
                </Form>

                 {estimatedBac !== null && (
                    <Alert className="mt-6">
                        <Wine className="h-4 w-4" />
                        <AlertTitle>Estimated Blood Alcohol Content (BAC)</AlertTitle>
                        <AlertDescription>
                             <p>Your estimated BAC is approximately <strong>{estimatedBac.toFixed(3)}%</strong>.</p>
                             <p className="text-xs mt-2 font-semibold text-destructive">Disclaimer: This is an estimate. Actual BAC is affected by metabolism, food intake, medication, health conditions, and other factors. It does NOT indicate legal fitness to drive. Never drink and drive. Legal BAC limits vary.</p>
                        </AlertDescription>
                    </Alert>
                )}
                  {!estimatedBac && (
                     <Alert variant="destructive" className="mt-6">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Important Safety Warning</AlertTitle>
                         <AlertDescription>
                              BAC calculators provide rough estimates only. Individual factors significantly impact alcohol absorption and metabolism. Do not use this estimate to determine if you are safe to drive or operate machinery. Always prioritize safety, designate a driver, or use alternative transportation if you have consumed alcohol. Obey all local laws regarding alcohol consumption and driving.
                         </AlertDescription>
                    </Alert>
                  )}
            </CardContent>
        </Card>
    );
}
