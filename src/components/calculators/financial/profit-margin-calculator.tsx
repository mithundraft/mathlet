
'use client';

// Uses the same logic as Margin Calculator, just focusing on the margin percentage.
import { MarginCalculator } from './margin-calculator'; // Reuse Margin Calculator logic
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';

interface ProfitMarginCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

// Export a wrapper component that renders the MarginCalculator
export function ProfitMarginCalculator(props: ProfitMarginCalculatorProps) {
    return <MarginCalculator {...props} />; // Use the imported base component
}

    