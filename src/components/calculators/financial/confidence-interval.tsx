
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
import { Calculator, Star, Sigma, BarChart } from 'lucide-react';
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Z-score values for common confidence levels
const zScores: { [key: string]: number } = {
    "80": 1.282,
    "85": 1.440,
    "90": 1.645,
    "95": 1.960,
    "99": 2.576,
    "99.5": 2.807,
    "99.9": 3.291,
};

// Zod Schema for Confidence Interval Calculator
const confidenceIntervalSchema = z.object({
    sampleMean: z.string().refine(val => !isNaN(parseFloat(val)), {
        message: "Sample mean must be a number.",
    }),
    sampleSize: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Sample size must be a positive integer.",
    }),
    // Allow population SD or sample SD
    populationStdDev: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: "Population standard deviation must be zero or positive.",
    }).optional(),
    sampleStdDev: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
         message: "Sample standard deviation must be zero or positive.",
    }).optional(),
    confidenceLevel: z.enum(Object.keys(zScores) as [keyof typeof zScores, ...(keyof typeof zScores)[]]),
}).superRefine((data, ctx) => {
    if (!data.populationStdDev && !data.sampleStdDev) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Either Population or Sample Standard Deviation is required.",
            path: ["populationStdDev"], // Report on one field or both
        });
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Either Population or Sample Standard Deviation is required.",
            path: ["sampleStdDev"],
        });
    }
    if (data.populationStdDev && data.sampleStdDev) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Provide only one standard deviation (Population or Sample).",
            path: ["populationStdDev"],
        });
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Provide only one standard deviation (Population or Sample).",
            path: ["sampleStdDev"],
        });
    }
      // If using sample SD, sample size should generally be > 30 for Z-interval, or use T-interval (not implemented here)
     if (data.sampleStdDev && parseInt(data.sampleSize) <= 30) {
         console.warn("Sample size <= 30 with Sample SD; T-interval might be more appropriate, but Z-interval is used here.");
         // Could add a non-blocking warning if desired
     }

});

type ConfidenceIntervalFormValues = z.infer<typeof confidenceIntervalSchema>;

interface ConfidenceIntervalCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData; // Although currency isn't used, keep prop for consistency
}

export function ConfidenceIntervalCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: ConfidenceIntervalCalculatorProps) {
    const [lowerBound, setLowerBound] = React.useState<number | null>(null);
    const [upperBound, setUpperBound] = React.useState<number | null>(null);
    const [marginOfError, setMarginOfError] = React.useState<number | null>(null);
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

    const form = useForm<ConfidenceIntervalFormValues>({
        resolver: zodResolver(confidenceIntervalSchema),
        defaultValues: {
            sampleMean: '',
            sampleSize: '',
            populationStdDev: '',
            sampleStdDev: '',
            confidenceLevel: '95', // Default to 95%
        },
    });

     React.useEffect(() => {
        if (mounted) {
            form.reset({ confidenceLevel: '95' });
            setLowerBound(null);
            setUpperBound(null);
            setMarginOfError(null);
            form.clearErrors();
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted]); // No currency dependency here

    // Function to calculate Confidence Interval
    const calculateConfidenceInterval = (values: ConfidenceIntervalFormValues): { lower: number; upper: number; moe: number } | null => {
        const mean = parseFloat(values.sampleMean);
        const n = parseInt(values.sampleSize);
        const confLevel = values.confidenceLevel;
        const popSD = values.populationStdDev ? parseFloat(values.populationStdDev) : undefined;
        const sampleSD = values.sampleStdDev ? parseFloat(values.sampleStdDev) : undefined;

        if (isNaN(mean) || isNaN(n) || n <= 0) {
            return null;
        }

        const stdDev = popSD ?? sampleSD; // Use population SD if available, otherwise sample SD
        if (stdDev === undefined || isNaN(stdDev) || stdDev < 0) {
            return null;
        }

        // Get Z-score for the confidence level
        const z = zScores[confLevel];
        if (!z) return null; // Should not happen with enum validation

        // Calculate Standard Error (SE)
        const standardError = stdDev / Math.sqrt(n);

        // Calculate Margin of Error (MOE)
        const marginOfErrorCalc = z * standardError;

        // Calculate Confidence Interval bounds
        const lowerBoundCalc = mean - marginOfErrorCalc;
        const upperBoundCalc = mean + marginOfErrorCalc;

        return { lower: lowerBoundCalc, upper: upperBoundCalc, moe: marginOfErrorCalc };
    };


    const onSubmit: SubmitHandler<ConfidenceIntervalFormValues> = (data) => {
        const result = calculateConfidenceInterval(data);
        if (result) {
            setLowerBound(result.lower);
            setUpperBound(result.upper);
            setMarginOfError(result.moe);

             const sdType = data.populationStdDev ? `Pop SD: ${data.populationStdDev}` : `Sample SD: ${data.sampleStdDev}`;
             const inputString = `Mean: ${data.sampleMean}, Size (n): ${data.sampleSize}, ${sdType}, Confidence: ${data.confidenceLevel}%`;
             const resultString = `Interval: [${result.lower.toFixed(4)}, ${result.upper.toFixed(4)}], Margin of Error: ±${result.moe.toFixed(4)}`;


            const historyEntry: HistoryEntry = {
                id: Date.now().toString(),
                calculatorSlug: slug,
                timestamp: new Date(),
                input: inputString,
                result: resultString,
            };
            onCalculation(historyEntry);
        } else {
            setLowerBound(null);
            setUpperBound(null);
            setMarginOfError(null);
             form.setError("root", {message: "Calculation failed. Ensure standard deviation is provided correctly."})
            console.error("Calculation failed. Check inputs.");
        }
    };

     // Skeleton Loader
    if (!mounted) {
        return (
            <Card className="w-full max-w-lg mx-auto">
                <CardHeader className="relative">
                    <Skeleton className="absolute top-3 right-3 h-7 w-7 rounded-full" />
                    <div className="flex items-center gap-2 pr-10">
                        <Skeleton className="h-6 w-6" />
                        <Skeleton className="h-6 w-3/4" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-6">
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" /> {/* Button Skeleton */}
                     <Skeleton className="mt-6 h-20 w-full" /> {/* Result Skeleton */}
                 </CardContent>
            </Card>
        );
    }


    return (
        <Card className="w-full max-w-lg mx-auto">
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <FormField
                            control={form.control}
                            name="sampleMean"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sample Mean (x̄)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 50" {...field} step="any" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="sampleSize"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sample Size (n)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 100" {...field} step="1" min="1" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Standard Deviation Inputs */}
                         <p className="text-sm font-medium">Standard Deviation (Provide One)</p>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                             <FormField
                                control={form.control}
                                name="populationStdDev"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Population (σ)</FormLabel>
                                         <FormControl>
                                             <Input
                                                 type="number"
                                                 placeholder="If known"
                                                 {...field}
                                                 step="any"
                                                 min="0"
                                                 disabled={!!form.watch('sampleStdDev')} // Disable if sample SD is filled
                                             />
                                         </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="sampleStdDev"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sample (s)</FormLabel>
                                         <FormControl>
                                             <Input
                                                 type="number"
                                                 placeholder="If population unknown"
                                                 {...field}
                                                 step="any"
                                                 min="0"
                                                 disabled={!!form.watch('populationStdDev')} // Disable if pop SD is filled
                                             />
                                         </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                         <FormField
                            control={form.control}
                            name="confidenceLevel"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confidence Level</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select confidence level" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.entries(zScores).map(([level, zVal]) => (
                                                <SelectItem key={level} value={level}>
                                                    {level}% (Z = {zVal})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         {form.formState.errors.root && (
                            <FormMessage className="text-destructive">{form.formState.errors.root.message}</FormMessage>
                         )}
                        <Button type="submit" className="w-full">
                            <Calculator className="mr-2 h-4 w-4" /> Calculate Confidence Interval
                        </Button>
                    </form>
                </Form>

                {lowerBound !== null && upperBound !== null && marginOfError !== null && (
                    <Alert className="mt-6">
                        <BarChart className="h-4 w-4" />
                        <AlertTitle>Confidence Interval Results</AlertTitle>
                        <AlertDescription>
                            <p>The {form.watch('confidenceLevel')}% confidence interval for the population mean is:</p>
                             <p className='font-semibold'>[{lowerBound.toFixed(4)}, {upperBound.toFixed(4)}]</p>
                             <p>Margin of Error: ±{marginOfError.toFixed(4)}</p>
                             <p className="text-xs mt-2 text-muted-foreground">
                                 We are {form.watch('confidenceLevel')}% confident that the true population mean lies within this interval.
                                 {form.watch('sampleStdDev') && parseInt(form.watch('sampleSize')) <= 30 && " (Note: Using Z-interval with small sample size & sample SD; T-interval may be more accurate)."}
                             </p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
