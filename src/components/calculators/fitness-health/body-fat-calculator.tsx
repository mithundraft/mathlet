'use client';

// IMPORTANT: Body fat calculation using formulas (like Navy or YMCA) provides estimates.
// Accuracy varies based on measurement consistency and individual body composition.
// Consider professional methods (DEXA, hydrostatic weighing) for higher accuracy.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, HeartPulse, PersonStanding, Ruler as RulerIcon, Percent } from 'lucide-react'; // Added Percent
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLocalStorage } from '@/hooks/use-local-storage'; // Corrected import
import { PROFILE_STORAGE_KEY } from '@/lib/constants';
import type { UserProfile } from '@/lib/types';

// Zod Schema for Body Fat Calculator (Navy Method)
const bodyFatSchemaBase = z.object({
    gender: z.enum(['male', 'female']),
    unit: z.enum(['metric', 'imperial']),
    height: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: "Height must be positive." }),
    neck: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: "Neck circumference must be positive." }),
    waist: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: "Waist circumference must be positive." }),
    hip: z.string().optional(), // Required for females only
});

// Conditional validation for hip measurement
const bodyFatSchema = bodyFatSchemaBase.superRefine((data, ctx) => {
    if (data.gender === 'female') {
        const hipVal = data.hip ? parseFloat(data.hip) : NaN;
        if (isNaN(hipVal) || hipVal <= 0) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Hip circumference is required for females and must be positive.",
                path: ["hip"],
            });
        }
    }
});


type BodyFatFormValues = z.infer<typeof bodyFatSchema>;

interface BodyFatCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData; // Keep for consistency, though not used here
}

export function BodyFatCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: BodyFatCalculatorProps) {
    const [profile] = useLocalStorage<UserProfile>(PROFILE_STORAGE_KEY, { preferredUnits: 'metric', preferredCurrency: 'USD' });
    const [bodyFatPercent, setBodyFatPercent] = React.useState<number | null>(null);
    const [fatMass, setFatMass] = React.useState<number | null>(null);
    const [leanMass, setLeanMass] = React.useState<number | null>(null);
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

    const form = useForm<BodyFatFormValues>({
        resolver: zodResolver(bodyFatSchema),
        defaultValues: {
            gender: 'male',
            unit: profile?.preferredUnits || 'imperial', // Default to imperial as Navy method uses inches
            height: '',
            neck: '',
            waist: '',
            hip: '',
        },
    });

     // Reset based on profile unit preference
     React.useEffect(() => {
         if (mounted) {
            form.reset({
                ...form.getValues(),
                unit: profile?.preferredUnits || 'imperial',
            });
            setBodyFatPercent(null);
            setFatMass(null);
            setLeanMass(null);
            form.clearErrors();
         }
     // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [profile?.preferredUnits, mounted]);

     // Reset results if unit/gender changes
      React.useEffect(() => {
         setBodyFatPercent(null);
         setFatMass(null);
         setLeanMass(null);
         form.clearErrors(['height', 'neck', 'waist', 'hip']);
      }, [form.watch('unit'), form.watch('gender')]);

    // Calculate Body Fat Percentage using Navy Method (requires measurements in inches)
    const calculateBodyFat = (values: BodyFatFormValues): { bfp: number; fm: number | null; lm: number | null } | null => {
        const heightRaw = parseFloat(values.height);
        const neckRaw = parseFloat(values.neck);
        const waistRaw = parseFloat(values.waist);
        const hipRaw = values.hip ? parseFloat(values.hip) : null;
        const unit = values.unit;
        const gender = values.gender;

        if (isNaN(heightRaw) || isNaN(neckRaw) || isNaN(waistRaw)) return null;
        if (gender === 'female' && (hipRaw === null || isNaN(hipRaw))) return null;

        // Convert measurements to inches
        const heightIn = unit === 'metric' ? heightRaw / 2.54 : heightRaw;
        const neckIn = unit === 'metric' ? neckRaw / 2.54 : neckRaw;
        const waistIn = unit === 'metric' ? waistRaw / 2.54 : waistRaw;
        const hipIn = (gender === 'female' && hipRaw !== null) ? (unit === 'metric' ? hipRaw / 2.54 : hipRaw) : null;

         if (heightIn <= 0 || neckIn <= 0 || waistIn <= 0) return null;
         if (gender === 'female' && (hipIn === null || hipIn <=0 )) return null;


        let bfp: number;

        if (gender === 'male') {
            // Male Navy formula: %BF = 86.010 * log10(waist - neck) - 70.041 * log10(height) + 36.76
             const waistMinusNeck = waistIn - neckIn;
            if (waistMinusNeck <= 0) return null; // Avoid log(<=0)
             bfp = 86.010 * Math.log10(waistMinusNeck) - 70.041 * Math.log10(heightIn) + 36.76;
        } else { // female
             if(hipIn === null) return null;
            // Female Navy formula: %BF = 163.205 * log10(waist + hip - neck) - 97.684 * log10(height) - 78.387
             const circSum = waistIn + hipIn - neckIn;
             if (circSum <= 0) return null; // Avoid log(<=0)
             bfp = 163.205 * Math.log10(circSum) - 97.684 * Math.log10(heightIn) - 78.387;
        }

        const bodyFatPercentage = Math.max(0, bfp); // Ensure non-negative

        // Optionally calculate Fat Mass and Lean Mass if weight is provided
        // Requires adding a weight field to the form and schema
        // let fm = null;
        // let lm = null;
        // const weightRaw = parseFloat(values.weight || '0'); // Assuming a weight field exists
        // if (!isNaN(weightRaw) && weightRaw > 0) {
        //     const weight = unit === 'metric' ? weightRaw : weightRaw * 0.453592; // Convert to kg if needed
        //     fm = weight * (bodyFatPercentage / 100);
        //     lm = weight - fm;
        // }

        return { bfp: bodyFatPercentage, fm: null, lm: null }; // Update fm, lm if weight is added
    };

    const onSubmit: SubmitHandler<BodyFatFormValues> = (data) => {
        const result = calculateBodyFat(data);
        if (result) {
            setBodyFatPercent(result.bfp);
            setFatMass(result.fm);
            setLeanMass(result.lm);

            const unitLabel = data.unit === 'metric' ? 'cm' : 'in';
            const hipText = data.gender === 'female' ? `, Hip: ${data.hip || 'N/A'} ${unitLabel}` : '';
            const inputString = `Gender: ${data.gender}, Unit: ${data.unit}, Height: ${data.height} ${unitLabel}, Neck: ${data.neck} ${unitLabel}, Waist: ${data.waist} ${unitLabel}${hipText}`;
            const resultString = `Estimated Body Fat: ${result.bfp.toFixed(1)}%`;
            // Add fm/lm to resultString if calculated

            const historyEntry: HistoryEntry = { id: Date.now().toString(), calculatorSlug: slug, timestamp: new Date(), input: inputString, result: resultString };
            onCalculation(historyEntry);
        } else {
            setBodyFatPercent(null);
            setFatMass(null);
            setLeanMass(null);
            form.setError("root", { message: "Calculation failed. Check inputs and ensure measurements are valid (e.g., waist > neck for males)." });
            console.error("Calculation failed. Check inputs.");
        }
    };

    const gender = form.watch('gender');
    const unit = form.watch('unit');
    const unitLabel = unit === 'metric' ? 'cm' : 'in';

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
                     <div className="space-y-3"><Skeleton className="h-5 w-1/4" /><div className="flex space-x-4"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-6 w-1/3" /></div></div>
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" /> {/* Hip (conditional) */}
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
                        <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Gender</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="male" id="bf-gender-male"/></FormControl><FormLabel htmlFor="bf-gender-male" className="font-normal cursor-pointer">Male</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="female" id="bf-gender-female"/></FormControl><FormLabel htmlFor="bf-gender-female" className="font-normal cursor-pointer">Female</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="unit" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Units</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="imperial" id="bf-unit-imp"/></FormControl><FormLabel htmlFor="bf-unit-imp" className="font-normal cursor-pointer">Imperial (in)</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="metric" id="bf-unit-met"/></FormControl><FormLabel htmlFor="bf-unit-met" className="font-normal cursor-pointer">Metric (cm)</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )} />
                         <FormField control={form.control} name="height" render={({ field }) => (<FormItem><FormLabel>Height ({unitLabel})</FormLabel><FormControl><Input type="number" placeholder={`Height in ${unitLabel}`} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="neck" render={({ field }) => (<FormItem><FormLabel>Neck Circumference ({unitLabel})</FormLabel><FormControl><Input type="number" placeholder={`Neck measurement`} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="waist" render={({ field }) => (<FormItem><FormLabel>Waist Circumference ({unitLabel})</FormLabel><FormControl><Input type="number" placeholder={`Waist at narrowest point (men) / navel (women)`} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} />
                         {gender === 'female' && ( <FormField control={form.control} name="hip" render={({ field }) => (<FormItem><FormLabel>Hip Circumference ({unitLabel})</FormLabel><FormControl><Input type="number" placeholder={`Hip measurement (widest point)`} {...field} step="any" min="0" /></FormControl><FormMessage /></FormItem>)} /> )}
                          {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate Body Fat %</Button>
                    </form>
                </Form>

                 {bodyFatPercent !== null && (
                    <Alert className="mt-6">
                        <Percent className="h-4 w-4" />
                        <AlertTitle>Estimated Body Fat (Navy Method)</AlertTitle>
                        <AlertDescription>
                             Your estimated body fat percentage is <strong>{bodyFatPercent.toFixed(1)}%</strong>.
                             {/* Add Fat Mass/Lean Mass if calculated */}
                             {/* {fatMass !== null && leanMass !== null && (
                                 <>
                                     <p>Estimated Fat Mass: <strong>{fatMass.toFixed(1)} {unit === 'metric' ? 'kg' : 'lbs'}</strong></p>
                                     <p>Estimated Lean Mass: <strong>{leanMass.toFixed(1)} {unit === 'metric' ? 'kg' : 'lbs'}</strong></p>
                                 </>
                             )} */}
                             <p className="text-xs mt-1 text-muted-foreground">Note: This is an estimate based on circumference measurements. Accuracy varies.</p>
                         </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
