
'use client';

// Same logic as Discount Calculator, just a different name
import { DiscountCalculator } from './discount-calculator'; // Reuse Discount Calculator logic
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';

interface PercentOffCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

// Export a wrapper component that simply renders the existing DiscountCalculator
export function PercentOffCalculator(props: PercentOffCalculatorProps) {
    return <DiscountCalculator {...props} />; // Use the imported base component
}

    