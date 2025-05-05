'use client';

// Reusing the Loan Payment Calculator logic for Repayment Calculation
// This component acts as a wrapper for the LoanPaymentCalculator, potentially
// allowing for future specialization if needed, while leveraging existing logic.

import * as React from 'react';
import { LoanPaymentCalculator } from './loan-payment-calculator'; // Corrected import path
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants'; // Import CurrencyData type

interface RepaymentCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}

// Renamed component
export function RepaymentCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: RepaymentCalculatorProps) {
  // Reusing the LoanPaymentCalculator component directly
  return (
    <LoanPaymentCalculator
      slug={slug}
      calculatorInfo={calculatorInfo}
      onCalculation={onCalculation}
      favorites={favorites}
      setFavorites={setFavorites}
      currency={currency}
    />
  );
}
