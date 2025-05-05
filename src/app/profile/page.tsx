
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocalStorage } from '@/hooks/use-local-storage';
import { PROFILE_STORAGE_KEY, CURRENCIES, APP_NAME } from '@/lib/constants'; // Import CURRENCIES & APP_NAME
import type { UserProfile } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { User, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { JsonLd } from '@/components/seo/json-ld'; // Import JsonLd component

// Define a basic profile schema
const profileSchema = z.object({
  name: z.string().optional(),
  preferredUnits: z.enum(['metric', 'imperial']).optional().default('metric'),
  // Ensure currency is a valid 3-char code from our list
  preferredCurrency: z.string().length(3, { message: "Invalid currency code" }).default('USD'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const [profile, setProfile] = useLocalStorage<UserProfile>(PROFILE_STORAGE_KEY, { preferredUnits: 'metric', preferredCurrency: 'USD' });
  const { toast } = useToast();
  const [mounted, setMounted] = React.useState(false);

   React.useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
        name: profile.name || '',
        preferredUnits: profile.preferredUnits || 'metric',
        preferredCurrency: profile.preferredCurrency || 'USD'
    }
  });

   React.useEffect(() => {
      if (mounted) {
          form.reset({
            name: profile.name || '',
            preferredUnits: profile.preferredUnits || 'metric',
            preferredCurrency: profile.preferredCurrency || 'USD'
        });
      }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [profile, mounted]);


  const onSubmit: SubmitHandler<ProfileFormValues> = (data) => {
     const profileToSave: UserProfile = {
        name: data.name || undefined,
        preferredUnits: data.preferredUnits,
        preferredCurrency: data.preferredCurrency,
     };
    setProfile(profileToSave);
    toast({
      title: "Profile Saved",
      description: "Your preferences have been updated.",
    });
  };

  // Define ProfilePage schema
  const profilePageSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "name": "User Profile and Preferences",
    "url": `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/profile`,
    "description": `Page for managing user preferences like display name, units, and currency on ${APP_NAME}.`,
    "isPartOf": {
        "@type": "WebSite",
        "url": process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002',
        "name": APP_NAME
    },
  };

  // Skeleton Loader
  if (!mounted) {
      return (
          <div className="p-4 md:p-8 max-w-3xl mx-auto">
              <JsonLd data={profilePageSchema} />
              <div className="flex items-center gap-2 mb-6">
                  <Skeleton className="h-8 w-8" /> {/* Icon Skeleton - Removed rounded-md */}
                  <Skeleton className="h-8 w-40" /> {/* Title Skeleton - Removed rounded-md */}
              </div>
              <Skeleton className="h-4 w-3/4 mb-6" /> {/* Description Skeleton - Removed rounded-md */}
              <Card>
                  <CardHeader>
                      <Skeleton className="h-6 w-1/2 mb-1" /> {/* Card Title - Removed rounded-md */}
                      <Skeleton className="h-4 w-3/4" /> {/* Card Description - Removed rounded-md */}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Skeleton for Name Input */}
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" /> {/* Label - Removed rounded-md */}
                        <Skeleton className="h-10 w-full" /> {/* Input - Removed rounded-md */}
                    </div>
                    {/* Skeleton for Unit Preference */}
                     <div className="space-y-3">
                         <Skeleton className="h-4 w-1/3 mb-2" /> {/* Label - Removed rounded-md */}
                        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                           <Skeleton className="h-6 w-1/3" /> {/* Radio Option 1 - Removed rounded-md */}
                           <Skeleton className="h-6 w-1/3" /> {/* Radio Option 2 - Removed rounded-md */}
                        </div>
                        <Skeleton className="h-3 w-1/2" /> {/* Description - Removed rounded-md */}
                    </div>
                    {/* Skeleton for Currency Preference */}
                    <div className="space-y-2">
                       <Skeleton className="h-4 w-1/4" /> {/* Label - Removed rounded-md */}
                       <Skeleton className="h-10 w-full" /> {/* Select Trigger - Removed rounded-md */}
                       <Skeleton className="h-3 w-1/2" /> {/* Description - Removed rounded-md */}
                    </div>
                    {/* Skeleton for Save Button */}
                    <Skeleton className="h-10 w-32" /> {/* Removed rounded-md */}
                  </CardContent>
              </Card>
          </div>
      );
  }

  // Actual Content
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
       <JsonLd data={profilePageSchema} />
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
         <User className="h-8 w-8 text-primary" />
         User Profile
      </h1>
       <p className="text-muted-foreground mb-6 text-sm">
         Manage your display name and default settings for units and currency used across applicable calculators. These preferences are saved locally in your browser.
       </p>
      <Card>
        <CardHeader>
          <CardTitle>Your Preferences</CardTitle>
          <CardDescription>Manage your profile settings and preferences for calculations.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="How you'd like to be greeted" {...field} value={field.value ?? ''} />
                    </FormControl>
                     <FormDescription>
                       This name is stored locally and not shared.
                     </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredUnits"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Preferred Units</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="metric" id="metric-units"/>
                          </FormControl>
                          <FormLabel htmlFor="metric-units" className="font-normal cursor-pointer">Metric (kg, cm)</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="imperial" id="imperial-units" />
                          </FormControl>
                          <FormLabel htmlFor="imperial-units" className="font-normal cursor-pointer">Imperial (lb, ft, in)</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                     <FormDescription>
                       Sets the default unit system for relevant calculators (e.g., BMI, Body Fat).
                     </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredCurrency"
                render={({ field }) => (
                   <FormItem>
                    <FormLabel>Preferred Currency</FormLabel>
                     <Select
                       onValueChange={field.onChange}
                       value={field.value || 'USD'}
                       >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map(currency => (
                            <SelectItem key={currency.code} value={currency.code}>
                               {currency.symbol} - {currency.name} ({currency.code})
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     <FormDescription>
                        Sets the default currency for financial calculators (e.g., Loan Payment, Savings).
                     </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full sm:w-auto transition-subtle">
                <Save className="mr-2 h-4 w-4" /> Save Preferences
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
