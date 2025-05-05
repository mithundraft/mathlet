
'use client';

// Reuses logic from the more general InterestCalculator, setting type to 'simple'.
import { InterestCalculator } from './interest-calculator'; // Reuse the Interest Calculator logic
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';

interface SimpleInterestCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

// Export a wrapper component that renders the InterestCalculator, potentially pre-setting the type if possible,
// or just rely on the user selecting 'simple' (which is the default in InterestCalculator now).
export function SimpleInterestCalculator(props: SimpleInterestCalculatorProps) {
    // Could potentially pass down a default value for 'interestType' if the base component accepted it
    // For now, just render the base component. The user will see 'Simple' selected by default.
    return <InterestCalculator {...props} />; // Use the imported base component
}

    