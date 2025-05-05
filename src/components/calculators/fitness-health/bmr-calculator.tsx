'use client';

// IMPORTANT: BMR formulas (Harris-Benedict, Mifflin-St Jeor) provide estimates. Actual BMR varies.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, PersonStanding, Ruler as RulerIcon, Activity, BrainCircuit } from 'lucide-react'; // Used BrainCircuit for BMR
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { PROFILE_STORAGE_KEY } from '@/lib/constants';
import type { UserProfile } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


// BMR Formulas constants (using Mifflin-St Jeor as it's considered more accurate)
const MALE_S_FACTOR = 5;
const FEMALE_S_FACTOR = -161;

// Activity level multipliers for TDEE (Total Daily Energy Expenditure)
const activityLevels = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
};

type ActivityLevel = keyof typeof activityLevels;

// Zod Schema for BMR Calculator
const bmrSchema = z.object({
    gender: z.enum(['male', 'female']),
    age: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) < 120, {
        message: "Age must be a positive number.",
    }),
    unit: z.enum(['metric', 'imperial']),
    heightCm: z.string().optional(),
    weightKg: z.string().optional(),
    heightFt: z.string().optional(),
    heightIn: z.string().optional(),
    weightLb: z.string().optional(),
     activityLevel: z.enum(Object.keys(activityLevels) as [ActivityLevel, ...(ActivityLevel)[]]).default('sedentary'),
}).superRefine((data, ctx) => {
    const parseOptionalFloat = (val: string | undefined): number | null => {
        if (val === undefined || val === '') return null;
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
    };

    if (data.unit === 'metric') {
        const heightCm = parseOptionalFloat(data.heightCm);
        const weightKg = parseOptionalFloat(data.weightKg);
        if (heightCm === null || heightCm <= 0) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Height (cm) must be positive.", path: ["heightCm"] }); }
        if (weightKg === null || weightKg <= 0) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Weight (kg) must be positive.", path: ["weightKg"] }); }
    } else { // Imperial
        const heightFt = parseOptionalFloat(data.heightFt);
        const heightIn = parseOptionalFloat(data.heightIn);
        const weightLb = parseOptionalFloat(data.weightLb);
        if (heightFt === null || heightFt < 0) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Feet must be zero or positive.", path: ["heightFt"] }); }
        if (heightIn === null || heightIn < 0) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Inches must be zero or positive.", path: ["heightIn"] }); }
        if ((heightFt === null || heightFt <= 0) && (heightIn === null || heightIn <= 0)) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Total height must be positive.", path: ["heightFt"] }); }
        if (weightLb === null || weightLb <= 0) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Weight (lb) must be positive.", path: ["weightLb"] }); }
    }
});

type BmrFormValues = z.infer<typeof bmrSchema>;

interface BmrCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData; // Not used but kept for consistency
}

export function BmrCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: BmrCalculatorProps) {
    const [profile] = useLocalStorage<UserProfile>(PROFILE_STORAGE_KEY, { preferredUnits: 'metric', preferredCurrency: 'USD' });
    const [bmrResult, setBmrResult] = React.useState<number | null>(null);
     const [tdeeResult, setTdeeResult] = React.useState<number | null>(null);
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

    const form = useForm<BmrFormValues>({
        resolver: zodResolver(bmrSchema),
        defaultValues: {
            gender: 'male',
            age: '',
            unit: profile?.preferredUnits || 'metric', // Default to profile or metric
            heightCm: '', weightKg: '',
            heightFt: '', heightIn: '', weightLb: '',
            activityLevel: 'sedentary',
        },
    });

    // Reset based on profile unit preference
     React.useEffect(() => {
         if (mounted) {
            form.reset({
                ...form.getValues(),
                unit: profile?.preferredUnits || 'metric',
            });
            setBmrResult(null);
             setTdeeResult(null);
            form.clearErrors();
         }
     // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [profile?.preferredUnits, mounted]);

     // Reset results if unit/gender changes
      React.useEffect(() => {
         setBmrResult(null);
          setTdeeResult(null);
         form.clearErrors(['heightCm', 'weightKg', 'heightFt', 'heightIn', 'weightLb', 'age']);
      }, [form.watch('unit'), form.watch('gender')]);


    // Calculate BMR using Mifflin-St Jeor
    const calculateBmr = (values: BmrFormValues): { bmr: number; tdee: number } | null => {
        const age = parseInt(values.age);
        const gender = values.gender;
        const unit = values.unit;
        const activityLevel = values.activityLevel;

        let weightKg: number;
        let heightCm: number;

        if (unit === 'metric') {
            weightKg = parseFloat(values.weightKg || '0');
            heightCm = parseFloat(values.heightCm || '0');
        } else { // Imperial
            const ft = parseFloat(values.heightFt || '0');
            const inches = parseFloat(values.heightIn || '0');
            const lbs = parseFloat(values.weightLb || '0');
            weightKg = lbs * 0.453592;
            heightCm = ((ft * 12) + inches) * 2.54;
        }

        if (isNaN(age) || age <= 0 || isNaN(weightKg) || weightKg <= 0 || isNaN(heightCm) || heightCm <= 0) {
            return null;
        }

        // Mifflin-St Jeor Formula:
        // BMR = (10 * weight in kg) + (6.25 * height in cm) - (5 * age in years) + s
        // where s is +5 for males and -161 for females.
        const s = gender === 'male' ? MALE_S_FACTOR : FEMALE_S_FACTOR;
        const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + s;

        // Calculate TDEE
         const tdee = bmr * activityLevels[activityLevel];


        return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
    };

    const onSubmit: SubmitHandler<BmrFormValues> = (data) => {
        const result = calculateBmr(data);
        if (result) {
            setBmrResult(result.bmr);
             setTdeeResult(result.tdee);

            const heightText = data.unit === 'metric' ? `${data.heightCm} cm` : `${data.heightFt || '0'} ft ${data.heightIn || '0'} in`;
            const weightText = data.unit === 'metric' ? `${data.weightKg} kg` : `${data.weightLb} lbs`;
            const inputString = `Gender: ${data.gender}, Age: ${data.age}, Height: ${heightText}, Weight: ${weightText}, Activity: ${data.activityLevel}`;
            const resultString = `BMR: ${result.bmr} kcal/day, TDEE: ${result.tdee} kcal/day`;

            const historyEntry: HistoryEntry = { id: Date.now().toString(), calculatorSlug: slug, timestamp: new Date(), input: inputString, result: resultString };
            onCalculation(historyEntry);
        } else {
            setBmrResult(null);
             setTdeeResult(null);
            form.setError("root", { message: "Calculation failed. Check inputs." });
            console.error("Calculation failed. Check inputs.");
        }
    };

    const unit = form.watch('unit');

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
                    <div className="space-y-3"><Skeleton className="h-5 w-1/4" /><div className="flex space-x-4"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-6 w-1/3" /></div></div>
                     <Skeleton className="h-10 w-full" /> {/* Age */}
                    <div className="space-y-3"><Skeleton className="h-5 w-1/4" /><div className="flex space-x-4"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-6 w-1/3" /></div></div>
                     {/* Inputs (conditionally shown) */}
                     <div className="grid grid-cols-2 gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                     <Skeleton className="h-10 w-full" /> {/* Activity Level */}
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
                         <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Gender</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="male" id="bmr-gender-male"/></FormControl><FormLabel htmlFor="bmr-gender-male" className="font-normal cursor-pointer">Male</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="female" id="bmr-gender-female"/></FormControl><FormLabel htmlFor="bmr-gender-female" className="font-normal cursor-pointer">Female</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )} />
                         <FormField control={form.control} name="age" render={({ field }) => ( <FormItem><FormLabel>Age (years)</FormLabel><FormControl><Input type="number" placeholder="e.g., 30" {...field} step="1" min="1" /></FormControl><FormMessage /></FormItem> )} />
                         <FormField control={form.control} name="unit" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Units</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="metric" id="bmr-unit-met"/></FormControl><FormLabel htmlFor="bmr-unit-met" className="font-normal cursor-pointer">Metric (kg, cm)</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="imperial" id="bmr-unit-imp"/></FormControl><FormLabel htmlFor="bmr-unit-imp" className="font-normal cursor-pointer">Imperial (lb, ft, in)</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )} />

                        {unit === 'metric' ? (
                            <div className='grid grid-cols-2 gap-4'>
                                <FormField control={form.control} name="heightCm" render={({ field }) => (<FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" placeholder="e.g., 175" {...field} step="0.1" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="weightKg" render={({ field }) => (<FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" placeholder="e.g., 70" {...field} step="0.1" min="0" /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        ) : (
                            <div className='space-y-4'>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="heightFt" render={({ field }) => (<FormItem><FormLabel>Height (ft)</FormLabel><FormControl><Input type="number" placeholder="e.g., 5" {...field} step="1" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="heightIn" render={({ field }) => (<FormItem><FormLabel>(in)</FormLabel><FormControl><Input type="number" placeholder="e.g., 9" {...field} step="0.1" min="0" /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField control={form.control} name="weightLb" render={({ field }) => (<FormItem><FormLabel>Weight (lb)</FormLabel><FormControl><Input type="number" placeholder="e.g., 155" {...field} step="0.1" min="0" /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        )}
                         <FormField control={form.control} name="activityLevel" render={({ field }) => ( <FormItem><FormLabel>Activity Level</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger></FormControl><SelectContent>
                                     {Object.entries(activityLevels).map(([key, value]) => (
                                        <SelectItem key={key} value={key}>
                                            {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')} (x{value})
                                        </SelectItem>
                                     ))}
                                </SelectContent></Select><FormMessage /></FormItem> )}
                        />

                          {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate BMR & TDEE</Button>
                    </form>
                </Form>

                {bmrResult !== null && tdeeResult !== null && (
                    <Alert className="mt-6">
                        <BrainCircuit className="h-4 w-4" />
                        <AlertTitle>Estimated Calorie Needs</AlertTitle>
                        <AlertDescription>
                            <p>Basal Metabolic Rate (BMR): <strong>{bmrResult} kcal/day</strong> (Calories burned at rest)</p>
                             <p>Total Daily Energy Expenditure (TDEE): <strong>{tdeeResult} kcal/day</strong> (Estimated daily calorie needs based on activity level)</p>
                             <p className="text-xs mt-1 text-muted-foreground">Estimates based on the Mifflin-St Jeor equation.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
