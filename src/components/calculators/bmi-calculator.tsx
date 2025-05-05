
'use client';

/**
 * A Body Mass Index (BMI) calculator component.
 *
 * This component calculates BMI based on user inputs for height and weight,
 * allowing users to choose between metric and imperial units. It provides
 * feedback on the BMI result, indicating the weight category.
 *
 * @param slug - A unique identifier for the calculator.
 * @param calculatorInfo - Basic calculator information, iincluding name, description, and icon.
 * @param onCalculation - Callback function to store history entries in History page.
 * @param favorites - An array of slugs for bookmarked calculators.
 * @param setFavorites - Setter for the favorites array.
 * @param currency - Currency to render currency values.
 */

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Label is implicitly used by FormLabel, so keep if using <FormLabel>
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, BarChart, Star, Weight as WeightIcon } from 'lucide-react'; // Removed Scale, using icon from props, Import WeightIcon
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { PROFILE_STORAGE_KEY, type CalculatorInfo } from '@/lib/constants'; // Import CALCULATORS to get info and CalculatorInfo type
import type { UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import type { CurrencyData } from '@/lib/constants'; // Import CurrencyData type

// Schema remains the same
const bmiSchema = z.object({
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
        if (heightCm === null || heightCm <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Height must be a positive number.",
                path: ["heightCm"],
            });
        }
         if (weightKg === null || weightKg <= 0) {
             ctx.addIssue({
                 code: z.ZodIssueCode.custom,
                 message: "Weight must be a positive number.",
                 path: ["weightKg"],
             });
         }
    } else { // Imperial
        const heightFt = parseOptionalFloat(data.heightFt);
        const heightIn = parseOptionalFloat(data.heightIn);
        const weightLb = parseOptionalFloat(data.weightLb);

        if (heightFt === null || heightFt < 0) {
             ctx.addIssue({
                 code: z.ZodIssueCode.custom,
                 message: "Feet must be zero or positive.",
                 path: ["heightFt"],
             });
        }
         if (heightIn === null || heightIn < 0) {
             ctx.addIssue({
                 code: z.ZodIssueCode.custom,
                 message: "Inches must be zero or positive.",
                 path: ["heightIn"],
             });
        }
         if ((heightFt === null || heightFt === 0) && (heightIn === null || heightIn === 0)) {
             ctx.addIssue({
                 code: z.ZodIssueCode.custom,
                 message: "Total height must be positive.",
                 path: ["heightFt"], // Report on one field or both
             });
              ctx.addIssue({
                 code: z.ZodIssueCode.custom,
                 message: "Total height must be positive.",
                 path: ["heightIn"],
             });
         }
         if (weightLb === null || weightLb <= 0) {
             ctx.addIssue({
                 code: z.ZodIssueCode.custom,
                 message: "Weight must be a positive number.",
                 path: ["weightLb"],
             });
         }
    }
});

type BmiFormValues = z.infer<typeof bmiSchema>;

interface BmiCalculatorProps {
  slug: string; // Slug is still needed to identify the calculator
  calculatorInfo: CalculatorInfo; // Use the imported type
  onCalculation: (entry: HistoryEntry) => void;
  favorites: FavoriteCalculators;
  setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
  currency: CurrencyData; // Add currency prop (although not used here)
}

export function BmiCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: BmiCalculatorProps) {
  const [profile] = useLocalStorage<UserProfile>(PROFILE_STORAGE_KEY, { preferredUnits: 'metric', preferredCurrency: 'USD' }); // Default preferredCurrency added
  const [bmiResult, setBmiResult] = React.useState<number | null>(null);
  const [bmiCategory, setBmiCategory] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false); // Added mounted state


  const { name, description, icon: Icon } = calculatorInfo; // Destructure info from props
  const isFavorite = favorites.includes(slug);

  React.useEffect(() => {
    setMounted(true);
  }, []); // Set mounted on component mount

  const toggleFavorite = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setFavorites(prevFavorites =>
      prevFavorites.includes(slug)
        ? prevFavorites.filter(fav => fav !== slug)
        : [...prevFavorites, slug]
    );
  };

  const form = useForm<BmiFormValues>({
    resolver: zodResolver(bmiSchema),
    defaultValues: {
      unit: profile?.preferredUnits || 'metric',
      heightCm: '',
      weightKg: '',
      heightFt: '',
      heightIn: '',
      weightLb: '',
    },
  });

   React.useEffect(() => {
      // Reset the unit preference if the profile changes
      form.reset({ ...form.getValues(), unit: profile?.preferredUnits || 'metric' });
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [profile?.preferredUnits]);

    // Reset results if unit preference changes via form
   React.useEffect(() => {
        setBmiResult(null);
        setBmiCategory(null);
        form.clearErrors();
        // Reset specific fields based on the new unit
        const currentUnit = form.getValues('unit');
        if (currentUnit === 'metric') {
            form.setValue('heightFt', '');
            form.setValue('heightIn', '');
            form.setValue('weightLb', '');
        } else {
             form.setValue('heightCm', '');
             form.setValue('weightKg', '');
        }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [form.watch('unit')]);


  const unit = form.watch('unit');

  const calculateBmi = (values: BmiFormValues): number | null => {
    const parseOptionalFloat = (val: string | undefined): number | null => {
        if (val === undefined || val === '') return null;
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
    };

    let heightMeters: number | null = null;
    let weightKgNum: number | null = null;

    if (values.unit === 'metric') {
        const heightCm = parseOptionalFloat(values.heightCm);
        weightKgNum = parseOptionalFloat(values.weightKg);
        if (heightCm !== null) heightMeters = heightCm / 100;
    } else { // Imperial
        const heightFt = parseOptionalFloat(values.heightFt) ?? 0;
        const heightIn = parseOptionalFloat(values.heightIn) ?? 0;
        weightKgNum = parseOptionalFloat(values.weightLb);

        const totalInches = (heightFt * 12) + heightIn;
        if (totalInches > 0) heightMeters = totalInches * 0.0254;
        if (weightKgNum !== null) weightKgNum = weightKgNum * 0.453592;
    }

    if (heightMeters !== null && weightKgNum !== null && heightMeters > 0 && weightKgNum > 0) {
      return weightKgNum / (heightMeters * heightMeters);
    }
    return null;
  };

  const getBmiCategory = (bmi: number): string => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obesity';
  };

  const onSubmit: SubmitHandler<BmiFormValues> = (data) => {
    const result = calculateBmi(data);
    if (result !== null) {
      const roundedResult = parseFloat(result.toFixed(1));
      const category = getBmiCategory(roundedResult);
      setBmiResult(roundedResult);
      setBmiCategory(category);

      const inputString = data.unit === 'metric'
        ? `Unit: Metric, Height: ${data.heightCm || 'N/A'} cm, Weight: ${data.weightKg || 'N/A'} kg`
        : `Unit: Imperial, Height: ${data.heightFt || '0'} ft ${data.heightIn || '0'} in, Weight: ${data.weightLb || 'N/A'} lbs`;

       const resultString = `BMI: ${roundedResult} (${category})`;

       const historyEntry: HistoryEntry = {
         id: Date.now().toString(),
         calculatorSlug: slug, // Use the slug passed via props
         timestamp: new Date(),
         input: inputString,
         result: resultString,
       };
       onCalculation(historyEntry);

    } else {
      setBmiResult(null);
      setBmiCategory(null);
      console.error("Calculation failed. Check inputs.");
    }
  };

    // Skeleton Loader
    if (!mounted) {
      return (
        <Card className="w-full max-w-lg mx-auto transition-subtle">
            <CardHeader className="relative">
                {/* Skeleton for Favorite Button */}
                <Skeleton className="absolute top-3 right-3 h-7 w-7 rounded-full" /> {/* Keep rounded */}
                {/* Skeleton for Title */}
                <div className="flex items-center gap-2 pr-10">
                    <Skeleton className="h-6 w-6" /> {/* Icon - Removed rounded-sm */}
                    <Skeleton className="h-6 w-3/4" /> {/* Title - Removed rounded-md */}
                </div>
                {/* Skeleton for Description */}
                <Skeleton className="h-4 w-full" /> {/* Removed rounded-md */}
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Skeleton for Unit Selector */}
                 <div className="space-y-3">
                     <Skeleton className="h-5 w-1/4" /> {/* Label - Removed rounded-md */}
                     <div className="flex space-x-4">
                         <Skeleton className="h-6 w-1/3" /> {/* Radio Option 1 - Removed rounded-md */}
                         <Skeleton className="h-6 w-1/3" /> {/* Radio Option 2 - Removed rounded-md */}
                     </div>
                 </div>

                {/* Skeleton for Inputs (example for metric) */}
                <div className='space-y-4'>
                     <div className="space-y-2">
                         <Skeleton className="h-5 w-1/3" /> {/* Label - Removed rounded-md */}
                         <Skeleton className="h-10 w-full" /> {/* Input - Removed rounded-md */}
                     </div>
                     <div className="space-y-2">
                         <Skeleton className="h-5 w-1/3" /> {/* Label - Removed rounded-md */}
                         <Skeleton className="h-10 w-full" /> {/* Input - Removed rounded-md */}
                     </div>
                 </div>

                {/* Skeleton for Button */}
                <Skeleton className="h-10 w-full" /> {/* Removed rounded-md */}

                {/* Skeleton for Result Alert (if needed) */}
                <Skeleton className="mt-6 h-20 w-full" />

            </CardContent>
        </Card>
      );
    }

  return (
    <Card className="w-full max-w-lg mx-auto transition-subtle">
      <CardHeader className="relative">
         <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-primary z-10",
              isFavorite && "text-primary"
            )}
            onClick={toggleFavorite}
            aria-label={isFavorite ? `Remove ${name} from bookmarks` : `Add ${name} to bookmarks`}
          >
            <Star className={cn("h-5 w-5", isFavorite && "fill-current")} />
          </Button>
        <CardTitle className="flex items-center gap-2 pr-10">
          <Icon className="h-6 w-6 text-primary" /> {/* Use Icon from props */}
          {name} {/* Use name from props */}
        </CardTitle>
        <CardDescription>{description}</CardDescription> {/* Use description from props */}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Unit System</FormLabel>
                  <FormControl>
                    <RadioGroup
                      // Removed the complex onChange logic here, handled by useEffect
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="metric" id="metric-unit"/>
                        </FormControl>
                        <FormLabel htmlFor="metric-unit" className="font-normal cursor-pointer">Metric (kg, cm)</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="imperial" id="imperial-unit"/>
                        </FormControl>
                        <FormLabel htmlFor="imperial-unit" className="font-normal cursor-pointer">Imperial (lb, ft, in)</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {unit === 'metric' ? (
              <div className='space-y-4'>
                <FormField
                  control={form.control}
                  name="heightCm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 175" {...field} step="0.1" min="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weightKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 70" {...field} step="0.1" min="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <div className='space-y-4'>
                <div className="grid grid-cols-2 gap-4">
                   <FormField
                    control={form.control}
                    name="heightFt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (ft)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 5" {...field} step="1" min="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="heightIn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>(in)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 9" {...field} step="0.1" min="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                 <FormField
                  control={form.control}
                  name="weightLb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (lb)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 155" {...field} step="0.1" min="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <Button type="submit" className="w-full transition-subtle">
              <Calculator className="mr-2 h-4 w-4" /> Calculate BMI
            </Button>
          </form>
        </Form>

        {bmiResult !== null && bmiCategory && (
          <Alert className="mt-6 transition-subtle">
            <BarChart className="h-4 w-4" />
            <AlertTitle>Your BMI Result</AlertTitle>
            <AlertDescription>
              Your BMI is <strong>{bmiResult}</strong>, which is considered <strong>{bmiCategory}</strong>.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

