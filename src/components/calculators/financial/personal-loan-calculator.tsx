'use client';

// Essentially the same logic as Loan Payment Calculator.
// Reusing the LoanPaymentCalculator component logic.
import { LoanPaymentCalculator as PersonalLoanCalc } from './loan-payment-calculator'; // Corrected import path
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';

interface PersonalLoanCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

// Export a wrapper component that simply renders the existing LoanPaymentCalculator
export function PersonalLoanCalculator(props: PersonalLoanCalculatorProps) {
    // You could add specific context or slightly different UI elements here if needed
    return <PersonalLoanCalc {...props} />;
}
