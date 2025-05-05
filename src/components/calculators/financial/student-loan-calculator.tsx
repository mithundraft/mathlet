'use client';

// Similar to Loan Payment Calculator, tailored for student loans.
// Reusing the LoanPaymentCalculator component logic.
import { LoanPaymentCalculator } from './loan-payment-calculator'; // Corrected import path
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';

interface StudentLoanCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

// Export a wrapper component that simply renders the existing LoanPaymentCalculator
export function StudentLoanCalculator(props: StudentLoanCalculatorProps) {
    // Could add student-loan specific notes or UI elements here if desired.
    return <LoanPaymentCalculator {...props} />; // Use the imported base component
}
