
import type { LucideIcon } from "lucide-react";
import type { CurrencyData } from "./constants"; // Import CurrencyData

export type CalculatorCategory = "Financial" | "Fitness & Health" | "Math" | "Other";

export interface CalculatorInfo {
  slug: string;
  name: string;
  description: string; // Should be concise for card/list views
  category: CalculatorCategory;
  icon: LucideIcon;
  seoTitle?: string; // Optional: Specific SEO title for the calculator page
  seoDescription?: string; // Optional: Specific meta description
  seoKeywords?: string[]; // Optional: Keywords for meta tags
}

export interface HistoryEntry {
  id: string; // Unique identifier for the entry
  calculatorSlug: string; // Slug of the calculator used (e.g., 'bmi-calculator', 'loan-payment')
  timestamp: Date;
  input: string; // User input for the calculation
  result: string; // Result of the calculation
}

export interface UserProfile {
  name?: string;
  preferredUnits?: 'metric' | 'imperial';
  preferredCurrency: string; // e.g., 'USD', 'EUR'. Default will be USD.
}

export type FavoriteCalculators = string[]; // Array of calculator slugs
