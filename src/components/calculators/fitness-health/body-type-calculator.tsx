'use client';

// IMPORTANT: Body type classifications (ectomorph, mesomorph, endomorph) are observational
// and lack rigorous scientific definition or validation. They are general categories and
// individual body composition and metabolism can vary widely within these types.
// This calculator provides a very basic, subjective assessment.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, Star, PersonStanding, ScanLine, HelpCircle } from 'lucide-react'; // Using ScanLine for assessment
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLocalStorage } from '@/hooks/use-local-storage'; // Corrected import
import { PROFILE_STORAGE_KEY } from '@/lib/constants';
import type { UserProfile } from '@/lib/types';

// Zod Schema - Simple questions for subjective assessment
const bodyTypeSchema = z.object({
    frameSize: z.enum(['small', 'medium', 'large']).optional(), // e.g., Wrist measurement or observation
    muscleGain: z.enum(['easy', 'moderate', 'hard']).optional(),
    fatGain: z.enum(['easy', 'moderate', 'hard']).optional(),
    bodyShape: z.enum(['lean_linear', 'muscular_athletic', 'soft_round']).optional(),
});

type BodyTypeFormValues = z.infer<typeof bodyTypeSchema>;

interface BodyTypeCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData; // Keep for consistency
}

export function BodyTypeCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: BodyTypeCalculatorProps) {
    const [profile] = useLocalStorage<UserProfile>(PROFILE_STORAGE_KEY, { preferredUnits: 'metric', preferredCurrency: 'USD' });
    const [estimatedBodyType, setEstimatedBodyType] = React.useState<'Ectomorph' | 'Mesomorph' | 'Endomorph' | 'Combination' | null>(null);
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

    const form = useForm<BodyTypeFormValues>({
        resolver: zodResolver(bodyTypeSchema),
        defaultValues: {
            // No defaults needed as they are optional
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset();
            setEstimatedBodyType(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted]);

    // Subjective Assessment Logic
    const determineBodyType = (values: BodyTypeFormValues): 'Ectomorph' | 'Mesomorph' | 'Endomorph' | 'Combination' | null => {
        let ectoScore = 0;
        let mesoScore = 0;
        let endoScore = 0;

        if (!values.frameSize && !values.muscleGain && !values.fatGain && !values.bodyShape) {
            form.setError("root", { message: "Please answer at least one question." });
            return null;
        }

        // Assign points based on answers (highly subjective)
        switch (values.frameSize) {
            case 'small': ectoScore++; break;
            case 'medium': mesoScore++; break;
            case 'large': endoScore++; break;
        }
        switch (values.muscleGain) {
            case 'hard': ectoScore++; break;
            case 'easy': mesoScore++; break;
            case 'moderate': mesoScore++; endoScore++; break; // Can overlap
        }
         switch (values.fatGain) {
            case 'hard': ectoScore++; mesoScore++; break; // Can overlap
            case 'easy': endoScore++; break;
            case 'moderate': endoScore++; break;
        }
         switch (values.bodyShape) {
            case 'lean_linear': ectoScore++; break;
            case 'muscular_athletic': mesoScore++; break;
            case 'soft_round': endoScore++; break;
        }

        // Determine dominant type
        const scores = { Ectomorph: ectoScore, Mesomorph: mesoScore, Endomorph: endoScore };
        const maxScore = Math.max(ectoScore, mesoScore, endoScore);

        if (maxScore === 0) return null; // No significant input

        const dominantTypes = Object.entries(scores)
                                    .filter(([_, score]) => score === maxScore)
                                    .map(([type]) => type);

        if (dominantTypes.length === 1) {
            return dominantTypes[0] as 'Ectomorph' | 'Mesomorph' | 'Endomorph';
        } else {
            return 'Combination'; // If scores are tied
        }
    };

    const onSubmit: SubmitHandler<BodyTypeFormValues> = (data) => {
        const result = determineBodyType(data);
        if (result) {
            setEstimatedBodyType(result);

            const inputString = `Frame: ${data.frameSize || 'N/A'}, Muscle Gain: ${data.muscleGain || 'N/A'}, Fat Gain: ${data.fatGain || 'N/A'}, Shape: ${data.bodyShape || 'N/A'}`;
            const resultString = `Estimated Body Type: ${result}`;

            const historyEntry: HistoryEntry = { id: Date.now().toString(), calculatorSlug: slug, timestamp: new Date(), input: inputString, result: resultString };
            onCalculation(historyEntry);
        } else {
            setEstimatedBodyType(null);
            // Error likely set in determineBodyType if no input
            console.error("Calculation failed. Ensure at least one characteristic is selected.");
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
                     {/* Question Skeletons */}
                     <div className="space-y-3"><Skeleton className="h-5 w-1/2 mb-2"/><div className="flex flex-col sm:flex-row gap-4"><Skeleton className="h-6 w-1/4"/><Skeleton className="h-6 w-1/4"/><Skeleton className="h-6 w-1/4"/></div></div>
                     <div className="space-y-3"><Skeleton className="h-5 w-1/2 mb-2"/><div className="flex flex-col sm:flex-row gap-4"><Skeleton className="h-6 w-1/4"/><Skeleton className="h-6 w-1/4"/><Skeleton className="h-6 w-1/4"/></div></div>
                     <div className="space-y-3"><Skeleton className="h-5 w-1/2 mb-2"/><div className="flex flex-col sm:flex-row gap-4"><Skeleton className="h-6 w-1/4"/><Skeleton className="h-6 w-1/4"/><Skeleton className="h-6 w-1/4"/></div></div>
                     <div className="space-y-3"><Skeleton className="h-5 w-1/2 mb-2"/><div className="flex flex-col sm:flex-row gap-4"><Skeleton className="h-6 w-1/4"/><Skeleton className="h-6 w-1/4"/><Skeleton className="h-6 w-1/4"/></div></div>
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
                <CardDescription>{description} <strong className='text-destructive'>(Subjective Estimate)</strong></CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Subjective Questions */}
                        <FormField control={form.control} name="frameSize" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Your Bone Structure / Frame Size:</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col sm:flex-row gap-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="small" id="frame-small"/></FormControl><FormLabel htmlFor="frame-small" className="font-normal cursor-pointer">Small / Delicate</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="medium" id="frame-medium"/></FormControl><FormLabel htmlFor="frame-medium" className="font-normal cursor-pointer">Medium / Average</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="large" id="frame-large"/></FormControl><FormLabel htmlFor="frame-large" className="font-normal cursor-pointer">Large / Thick</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="muscleGain" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>How Easily Do You Gain Muscle?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col sm:flex-row gap-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="hard" id="muscle-hard"/></FormControl><FormLabel htmlFor="muscle-hard" className="font-normal cursor-pointer">Hard</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="moderate" id="muscle-mod"/></FormControl><FormLabel htmlFor="muscle-mod" className="font-normal cursor-pointer">Moderately</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="easy" id="muscle-easy"/></FormControl><FormLabel htmlFor="muscle-easy" className="font-normal cursor-pointer">Easily</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="fatGain" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>How Easily Do You Gain Fat?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col sm:flex-row gap-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="hard" id="fat-hard"/></FormControl><FormLabel htmlFor="fat-hard" className="font-normal cursor-pointer">Hard</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="moderate" id="fat-mod"/></FormControl><FormLabel htmlFor="fat-mod" className="font-normal cursor-pointer">Moderately</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="easy" id="fat-easy"/></FormControl><FormLabel htmlFor="fat-easy" className="font-normal cursor-pointer">Easily</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="bodyShape" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Your Natural Body Shape Tends To Be:</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col sm:flex-row gap-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="lean_linear" id="shape-lean"/></FormControl><FormLabel htmlFor="shape-lean" className="font-normal cursor-pointer">Lean / Linear</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="muscular_athletic" id="shape-musc"/></FormControl><FormLabel htmlFor="shape-musc" className="font-normal cursor-pointer">Muscular / Athletic</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="soft_round" id="shape-soft"/></FormControl><FormLabel htmlFor="shape-soft" className="font-normal cursor-pointer">Soft / Round</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )} />

                         {form.formState.errors.root && (<FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>)}
                        <Button type="submit" className="w-full"><ScanLine className="mr-2 h-4 w-4" /> Estimate Body Type</Button>
                    </form>
                </Form>

                {estimatedBodyType && (
                    <Alert className="mt-6">
                         <HelpCircle className="h-4 w-4" />
                        <AlertTitle>Estimated Body Type (Somatotype)</AlertTitle>
                        <AlertDescription>
                            Based on your answers, your body type leans towards: <strong>{estimatedBodyType}</strong>.
                             <p className="text-xs mt-2 text-muted-foreground">
                                <strong>Ectomorph:</strong> Lean, difficulty gaining muscle/fat.<br />
                                <strong>Mesomorph:</strong> Athletic build, gains muscle easily.<br />
                                <strong>Endomorph:</strong> Softer build, gains fat easily.<br />
                                <strong>Combination:</strong> Shares traits of multiple types.
                            </p>
                            <p className="text-xs mt-1 font-semibold text-destructive">Disclaimer: Body types are general concepts, not strict scientific categories. This is a subjective assessment for informational purposes only.</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
