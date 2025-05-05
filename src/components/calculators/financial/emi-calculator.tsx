'use client';

// Equivalent to Loan Payment Calculator, just a different name often used in India/Asia.
// We can reuse the LoanPaymentCalculator logic.
import * as React from 'react';
import { LoanPaymentCalculator as EmiCalc } from './loan-payment-calculator'; // Correct import path and rename
import type { HistoryEntry, FavoriteCalculators } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { CalculatorInfo, CurrencyData } from '@/lib/constants';


interface EmiCalculatorProps {
    slug: string;
    calculatorInfo: CalculatorInfo;
    onCalculation: (entry: HistoryEntry) => void;
    favorites: FavoriteCalculators;
    setFavorites: (value: FavoriteCalculators | ((val: FavoriteCalculators) => FavoriteCalculators)) => void;
    currency: CurrencyData;
}


export function EmiCalculator({ slug, calculatorInfo, onCalculation, favorites, setFavorites, currency }: EmiCalculatorProps) {
    // Reusing the LoanPaymentCalculator component directly
    return (
        <EmiCalc
            slug={slug}
            calculatorInfo={calculatorInfo}
            onCalculation={onCalculation}
            favorites={favorites}
            setFavorites={setFavorites}
            currency={currency}
        />
    );
}
