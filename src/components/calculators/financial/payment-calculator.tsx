'use client';

// Generic Payment Calculator - essentially the Loan Payment Calculator
// Reusing the LoanPaymentCalculator component logic.
import { LoanPaymentCalculator } from './loan-payment-calculator'; // Corrected import path
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';

interface PaymentCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

// Export a wrapper component that simply renders the existing LoanPaymentCalculator
export function PaymentCalculator(props: PaymentCalculatorProps) {
    // You could potentially modify props or add wrapper elements here if needed
    // to differentiate it slightly from the main Loan Payment calc, but for now, direct reuse is fine.
    return <LoanPaymentCalculator {...props} />; // Use the imported base component
}
