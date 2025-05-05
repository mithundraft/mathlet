'use client';

// IMPORTANT: Body Surface Area (BSA) formulas (Mosteller, Du Bois, etc.) provide estimates.
// Accuracy can vary, and clinical decisions should rely on appropriate medical judgment.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, Ruler as RulerIcon, Scale } from 'lucide-react'; // Using RulerIcon
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLocalStorage } from '@/hooks/use-local-storage'; // Corrected import
import { PROFILE_STORAGE_KEY } from '@/lib/constants';
import type { UserProfile } from '@/lib/types';

// Zod Schema for Body Surface Area Calculator
const bsaSchema = z.object({
    unit: z.enum(['metric', 'imperial']),
    heightCm: z.string().optional(),
    weightKg: z.string().optional(),
    heightFt: z.string().optional(),
    heightIn: z.string().optional(),
    weightLb: z.string().optional(),
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


type BsaFormValues = z.infer<typeof bsaSchema>;

interface BodySurfaceAreaCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData; // Keep for consistency
}

export function BodySurfaceAreaCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: BodySurfaceAreaCalculatorProps) {
    const [profile] = useLocalStorage<UserProfile>(PROFILE_STORAGE_KEY, { preferredUnits: 'metric', preferredCurrency: 'USD' });
    const [bsaResult, setBsaResult] = React.useState<number | null>(null);
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

    const form = useForm<BsaFormValues>({
        resolver: zodResolver(bsaSchema),
        defaultValues: {
            unit: profile?.preferredUnits || 'metric',
            heightCm: '', weightKg: '',
            heightFt: '', heightIn: '', weightLb: '',
        },
    });

     // Reset based on profile unit preference
     React.useEffect(() => {
         if (mounted) {
            form.reset({
                ...form.getValues(),
                unit: profile?.preferredUnits || 'metric',
            });
            setBsaResult(null);
            form.clearErrors();
         }
     // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [profile?.preferredUnits, mounted]);

     // Reset results if unit changes
      React.useEffect(() => {
         setBsaResult(null);
         form.clearErrors(['heightCm', 'weightKg', 'heightFt', 'heightIn', 'weightLb']);
      }, [form.watch('unit')]);

    // Calculate BSA using Mosteller formula
    const calculateBsa = (values: BsaFormValues): number | null => {
        const unit = values.unit;
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

        if (isNaN(weightKg) || weightKg <= 0 || isNaN(heightCm) || heightCm <= 0) {
            return null;
        }

        // Mosteller Formula: BSA (m²) = sqrt((Height(cm) * Weight(kg)) / 3600)
        const bsa = Math.sqrt((heightCm * weightKg) / 3600);
        return bsa;
    };

    const onSubmit: SubmitHandler<BsaFormValues> = (data) => {
        const result = calculateBsa(data);
        if (result !== null) {
            setBsaResult(result);

            const heightText = data.unit === 'metric' ? `${data.heightCm} cm` : `${data.heightFt || '0'} ft ${data.heightIn || '0'} in`;
            const weightText = data.unit === 'metric' ? `${data.weightKg} kg` : `${data.weightLb} lbs`;
            const inputString = `Unit: ${data.unit}, Height: ${heightText}, Weight: ${weightText}`;
            const resultString = `Estimated Body Surface Area (BSA): ${result.toFixed(2)} m²`;

            const historyEntry: HistoryEntry = { id: Date.now().toString(), calculatorSlug: slug, timestamp: new Date(), input: inputString, result: resultString };
            onCalculation(historyEntry);
        } else {
            setBsaResult(null);
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
                    {/* Inputs (conditionally shown) */}
                    <div className="grid grid-cols-2 gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
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
                        <FormField control={form.control} name="unit" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Units</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="metric" id="bsa-unit-met"/></FormControl><FormLabel htmlFor="bsa-unit-met" className="font-normal cursor-pointer">Metric (kg, cm)</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="imperial" id="bsa-unit-imp"/></FormControl><FormLabel htmlFor="bsa-unit-imp" className="font-normal cursor-pointer">Imperial (lb, ft, in)</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )} />

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
                          {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><Calculator className="mr-2 h-4 w-4" /> Calculate BSA</Button>
                    </form>
                </Form>

                 {bsaResult !== null && (
                    <Alert className="mt-6">
                         <RulerIcon className="h-4 w-4" />
                        <AlertTitle>Estimated Body Surface Area (BSA)</AlertTitle>
                        <AlertDescription>
                             The estimated Body Surface Area (BSA) is <strong>{bsaResult.toFixed(2)} m²</strong> (using Mosteller formula).
                             <p className="text-xs mt-1 text-muted-foreground">BSA is often used in medical contexts, particularly for calculating drug dosages.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
