
'use client';

// Essentially the same as the regular Amortization Calculator, just named specifically for mortgages.
// Reusing the AmortizationCalculator component logic.
import { AmortizationCalculator } from './amortization-calculator'; // Import the base component
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';

interface MortgageAmortizationCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

// Export a wrapper component that simply renders the existing AmortizationCalculator
export function MortgageAmortizationCalculator(props: MortgageAmortizationCalculatorProps) {
    return <AmortizationCalculator {...props} />; // Use the imported base component
}

    