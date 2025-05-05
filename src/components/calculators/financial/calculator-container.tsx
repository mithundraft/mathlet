'use client';

import * as React from 'react';
// Import specific calculator components with standardized names
import { BmiCalculator } from './bmi-calculator';
import { LoanPaymentCalculator } from './loan-payment-calculator';
import { CompoundInterestCalculator } from './financial/compound-interest-calculator';
import { SavingsCalculator } from './financial/savings-calculator';
import { RetirementCalculator } from './financial/retirement-calculator';
import { InvestmentGrowthCalculator } from './financial/investment-growth-calculator';
import { MortgageCalculator } from './financial/mortgage-calculator';
import { AprCalculator } from './financial/apr-calculator';
import { AnnuityCalculator } from './financial/annuity-calculator';
import { BondYieldCalculator } from './financial/bond-yield-calculator';
import { NpvCalculator } from './financial/npv-calculator';
import { IrrCalculator } from './financial/irr-calculator';
import { BreakevenPointCalculator } from './financial/breakeven-point-calculator';
import { ProfitMarginCalculator } from './financial/profit-margin-calculator';
import { CurrencyConverter } from './financial/currency-converter';
import { TaxCalculator } from './financial/tax-calculator';
import { GratuityCalculator } from './financial/gratuity-calculator';
import { EmiCalculator } from './financial/emi-calculator';
import { SipCalculator } from './financial/sip-calculator';
import { InflationCalculator } from './financial/inflation-calculator';
import { AutoLoanCalculator } from './financial/auto-loan-calculator';
import { InterestCalculator } from './financial/interest-calculator';
import { PaymentCalculator } from './financial/payment-calculator';
import { AmortizationCalculator } from './financial/amortization-calculator';
import { FinanceCalculator } from './financial/finance-calculator';
import { MortgagePayoffCalculator } from './financial/mortgage-payoff-calculator';
import { SalaryCalculator } from './financial/salary-calculator';
import { K401Calculator } from './financial/401k-calculator';
import { InterestRateCalculator } from './financial/interest-rate-calculator';
import { SalesTaxCalculator } from './financial/sales-tax-calculator';
import { HouseAffordabilityCalculator } from './financial/house-affordability-calculator';
import { RentCalculator } from './financial/rent-calculator';
import { MarriageTaxCalculator } from './financial/marriage-tax-calculator';
import { EstateTaxCalculator } from './financial/estate-tax-calculator';
import { PensionCalculator } from './financial/pension-calculator';
import { SocialSecurityCalculator } from './financial/social-security-calculator';
import { AnnuityPayoutCalculator } from './financial/annuity-payout-calculator';
import { CreditCardCalculator } from './financial/credit-card-calculator';
import { CreditCardsPayoffCalculator } from './financial/credit-cards-payoff-calculator';
import { DebtPayoffCalculator } from './financial/debt-payoff-calculator';
import { DebtConsolidationCalculator } from './financial/debt-consolidation-calculator';
import { RepaymentCalculator } from './financial/repayment-calculator';
import { StudentLoanCalculator } from './financial/student-loan-calculator';
import { CollegeCostCalculator } from './financial/college-cost-calculator';
import { SimpleInterestCalculator } from './financial/simple-interest-calculator';
import { CdCalculator } from './financial/cd-calculator';
import { BondCalculator } from './financial/bond-calculator';
import { RothIraCalculator } from './financial/roth-ira-calculator';
import { IraCalculator } from './financial/ira-calculator';
import { RmdCalculator } from './financial/rmd-calculator';
import { VatCalculator } from './financial/vat-calculator';
import { CashBackOrLowInterestCalculator } from './financial/cash-back-or-low-interest';
import { AutoLeaseCalculator } from './financial/auto-lease-calculator';
import { DepreciationCalculator } from './financial/depreciation-calculator';
import { AverageReturnCalculator } from './financial/average-return-calculator';
import { MarginCalculator } from './financial/margin-calculator';
import { DiscountCalculator } from './financial/discount-calculator';
import { BusinessLoanCalculator } from './financial/business-loan-calculator';
import { DebtToIncomeRatioCalculator } from './financial/debt-to-income-ratio';
import { RealEstateCalculator } from './financial/real-estate-calculator';
import { TakeHomePaycheckCalculator } from './financial/take-home-paycheck-calculator';
import { PersonalLoanCalculator } from './financial/personal-loan-calculator';
import { LeaseCalculator } from './financial/lease-calculator';
import { RefinanceCalculator } from './financial/refinance-calculator';
import { BudgetCalculator } from './financial/budget-calculator';
import { RentalPropertyCalculator } from './financial/rental-property-calculator';
import { RoiCalculator } from './financial/roi-calculator';
import { FhaLoanCalculator } from './financial/fha-loan-calculator';
import { VaMortgageCalculator } from './financial/va-mortgage-calculator';
import { DownPaymentCalculator } from './financial/down-payment-calculator';
import { PaybackPeriodCalculator } from './financial/payback-period-calculator';
import { PresentValueCalculator } from './financial/present-value-calculator';
import { FutureValueCalculator } from './financial/future-value-calculator';
import { CommissionCalculator } from './financial/commission-calculator';
import { MortgageCalculatorUK } from './financial/mortgage-calculator-uk';
import { CanadianMortgageCalculator } from './financial/canadian-mortgage-calculator';
import { MortgageAmortizationCalculator } from './financial/mortgage-amortization-calculator';
import { PercentOffCalculator } from './financial/percent-off-calculator';

// Fitness & Health
import { CalorieCalculator } from './fitness-health/calorie-calculator';
import { BodyFatCalculator } from './fitness-health/body-fat-calculator';
import { BmrCalculator } from './fitness-health/bmr-calculator';
import { MacroCalculator } from './fitness-health/macro-calculator';
import { IdealWeightCalculator } from './fitness-health/ideal-weight-calculator';
import { PregnancyCalculator } from './fitness-health/pregnancy-calculator';
import { PregnancyWeightGainCalculator } from './fitness-health/pregnancy-weight-gain';
import { PregnancyConceptionCalculator } from './fitness-health/pregnancy-conception';
import { DueDateCalculator } from './fitness-health/due-date-calculator';
import { PaceCalculator } from './fitness-health/pace-calculator';
import { ArmyBodyFatCalculator } from './fitness-health/army-body-fat-calculator';
import { CarbohydrateCalculator } from './fitness-health/carbohydrate-calculator';
import { LeanBodyMassCalculator } from './fitness-health/lean-body-mass';
import { HealthyWeightCalculator } from './fitness-health/healthy-weight-calculator';
import { CaloriesBurnedCalculator } from './fitness-health/calories-burned-calculator';
import { OneRepMaxCalculator } from './fitness-health/one-rep-max-calculator';
import { ProteinCalculator } from './fitness-health/protein-calculator';
import { FatIntakeCalculator } from './fitness-health/fat-intake-calculator';
import { TdeeCalculator } from './fitness-health/tdee-calculator';
import { OvulationCalculator } from './fitness-health/ovulation-calculator';
import { ConceptionCalculator } from './fitness-health/conception-calculator';
import { PeriodCalculator } from './fitness-health/period-calculator';
import { GfrCalculator } from './fitness-health/gfr-calculator';
import { BodyTypeCalculator } from './fitness-health/body-type-calculator';
import { BodySurfaceAreaCalculator } from './fitness-health/body-surface-area';
import { BacCalculator } from './fitness-health/bac-calculator';
import { WeightWatcherPointsCalculator } from './fitness-health/weight-watcher-points';

// Math
import { ScientificCalculator } from './math/scientific-calculator';
import { FractionCalculator } from './math/fraction-calculator';
import { PercentageCalculator } from './math/percentage-calculator';
import { TriangleCalculator } from './math/triangle-calculator';
import { VolumeCalculator } from './math/volume-calculator';
import { StandardDeviationCalculator } from './math/standard-deviation';
import { RandomNumberGenerator } from './math/random-number-generator';
import { NumberSequenceCalculator } from './math/number-sequence';
import { PercentErrorCalculator } from './math/percent-error-calculator';
import { ExponentCalculator } from './math/exponent-calculator';
import { BinaryCalculator } from './math/binary-calculator';
import { HexCalculator } from './math/hex-calculator';
import { HalfLifeCalculator } from './math/half-life-calculator';
import { QuadraticFormulaCalculator } from './math/quadratic-formula';
import { SlopeCalculator } from './math/slope-calculator';
import { LogCalculator } from './math/log-calculator';
import { AreaCalculator } from './math/area-calculator';
import { SampleSizeCalculator } from './math/sample-size-calculator';
import { ProbabilityCalculator } from './math/probability-calculator';
import { StatisticsCalculator } from './math/statistics-calculator';
import { MeanMedianModeRangeCalculator } from './math/mean-median-mode-range';
import { PermutationCombinationCalculator } from './math/permutation-combination';
import { ZScoreCalculator } from './math/z-score-calculator';
import { ConfidenceIntervalCalculator } from './financial/confidence-interval'; // Corrected path
import { RatioCalculator } from './math/ratio-calculator';
import { DistanceCalculator } from './math/distance-calculator';
import { CircleCalculator } from './math/circle-calculator';
import { SurfaceAreaCalculator } from './math/surface-area-calculator';
import { PythagoreanTheoremCalculator } from './math/pythagorean-theorem';
import { RightTriangleCalculator } from './math/right-triangle-calculator';
import { RootCalculator } from './math/root-calculator';
import { LeastCommonMultipleCalculator } from './math/least-common-multiple';
import { GreatestCommonFactorCalculator } from './math/greatest-common-factor';
import { FactorCalculator } from './math/factor-calculator';
import { RoundingCalculator } from './math/rounding-calculator';
import { MatrixCalculator } from './math/matrix-calculator';
import { ScientificNotationCalculator } from './math/scientific-notation';
import { BigNumberCalculator } from './math/big-number-calculator';
import { PrimeFactorizationCalculator } from './math/prime-factorization';
import { CommonFactorCalculator } from './math/common-factor-calculator';
import { BasicCalculator } from './math/basic-calculator';
import { LongDivisionCalculator } from './math/long-division-calculator';
import { AverageCalculator } from './math/average-calculator';
import { PValueCalculator } from './math/p-value-calculator';

// Other
import { AgeCalculator } from './other/age-calculator';
import { DateCalculator } from './other/date-calculator';
import { TimeCalculator } from './other/time-calculator';
import { HoursCalculator } from './other/hours-calculator';
import { GpaCalculator } from './other/gpa-calculator';
import { GradeCalculator } from './other/grade-calculator';
import { HeightCalculator } from './other/height-calculator';
import { ConcreteCalculator } from './other/concrete-calculator';
import { IpSubnetCalculator } from './other/ip-subnet-calculator';
import { BraSizeCalculator } from './other/bra-size-calculator';
import { PasswordGenerator } from './other/password-generator';
import { DiceRoller } from './other/dice-roller';
import { ConversionCalculator } from './other/conversion-calculator';
import { FuelCostCalculator } from './other/fuel-cost-calculator';
import { VoltageDropCalculator } from './other/voltage-drop-calculator';
import { BtuCalculator } from './other/btu-calculator';
import { SquareFootageCalculator } from './other/square-footage-calculator';
import { TimeCardCalculator } from './other/time-card-calculator';
import { TimeZoneCalculator } from './other/time-zone-calculator';
import { LoveCalculator } from './other/love-calculator'; // Placeholder/Fun
import { GdpCalculator } from './other/gdp-calculator';
import { GasMileageCalculator } from './other/gas-mileage-calculator';
import { HorsepowerCalculator } from './other/horsepower-calculator';
import { EngineHorsepowerCalculator } from './other/engine-horsepower-calculator';
import { StairCalculator } from './other/stair-calculator';
import { ResistorCalculator } from './other/resistor-calculator';
import { OhmsLawCalculator } from './other/ohms-law-calculator';
import { ElectricityCalculator } from './other/electricity-calculator';
import { TipCalculator } from './other/tip-calculator';
import { MileageCalculator } from './other/mileage-calculator';
import { DensityCalculator } from './other/density-calculator';
import { MassCalculator } from './other/mass-calculator';
import { WeightCalculator } from './other/weight-calculator';
import { SpeedCalculator } from './other/speed-calculator';
import { MolarityCalculator } from './other/molarity-calculator';
import { MolecularWeightCalculator } from './other/molecular-weight-calculator';
import { RomanNumeralConverter } from './other/roman-numeral-converter';
import { GolfHandicapCalculator } from './other/golf-handicap-calculator';
import { SleepCalculator } from './other/sleep-calculator';
import { TireSizeCalculator } from './other/tire-size-calculator';
import { RoofingCalculator } from './other/roofing-calculator';
import { TileCalculator } from './other/tile-calculator';
import { MulchCalculator } from './other/mulch-calculator';
import { GravelCalculator } from './other/gravel-calculator';
import { WindChillCalculator } from './other/wind-chill-calculator';
import { HeatIndexCalculator } from './other/heat-index-calculator';
import { DewPointCalculator } from './other/dew-point-calculator';
import { BandwidthCalculator } from './other/bandwidth-calculator';
import { TimeDurationCalculator } from './other/time-duration-calculator';
import { DayCounter } from './other/day-counter';
import { DayOfTheWeekCalculator } from './other/day-of-the-week-calculator';

// General Imports
import { useLocalStorage } from '@/hooks/use-local-storage';
import { HISTORY_STORAGE_KEY, FAVORITES_STORAGE_KEY, CALCULATORS, PROFILE_STORAGE_KEY, CURRENCIES } from '@/lib/constants';
import type { HistoryEntry, FavoriteCalculators, UserProfile } from '@/lib/types';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { CurrencyData } from '@/lib/constants';

interface CalculatorContainerProps {
  slug: string;
}

// Skeleton specific to the container before the actual calculator loads
function CalculatorContainerSkeleton() {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
          <Skeleton className="h-[450px] w-full" />
          <Skeleton className="mt-6 h-[300px] w-full" />
      </div>
    );
}


export function CalculatorContainer({ slug }: CalculatorContainerProps) {
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(HISTORY_STORAGE_KEY, []);
  const [favorites, setFavorites] = useLocalStorage<FavoriteCalculators>(FAVORITES_STORAGE_KEY, []);
  const [profile] = useLocalStorage<UserProfile>(PROFILE_STORAGE_KEY, { preferredCurrency: 'USD', preferredUnits: 'metric' });
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
      setMounted(true);
  }, []);


  const calculatorInfo = CALCULATORS.find((calc) => calc.slug === slug);
  const currency = React.useMemo(() => {
      return CURRENCIES.find(c => c.code === (profile?.preferredCurrency || 'USD')) || CURRENCIES.find(c => c.code === 'USD')!;
  }, [profile?.preferredCurrency]);

  // Handle not found early
  if (!calculatorInfo && mounted) {
     console.error(`Calculator with slug "${slug}" not found.`);
     // notFound(); Reverting this since it breaks app
  }

  // Show skeleton if not mounted or if calculatorInfo/currency hasn't resolved yet
  if (!mounted || !calculatorInfo || !currency) {
      return <CalculatorContainerSkeleton />;
  }

  const handleCalculation = (entry: HistoryEntry) => {
    setHistory(prevHistory => [entry, ...prevHistory].slice(0, 50));
  };

  const renderCalculator = () => {
    // Pass all necessary props down, including the resolved currency object
    const commonProps = {
      slug: calculatorInfo.slug,
      onCalculation: handleCalculation,
      favorites: favorites,
      setFavorites: setFavorites,
      calculatorInfo: calculatorInfo,
      currency: currency, // Pass the resolved currency object
    };

    // Map slugs to components
    const calculatorComponents: { [key: string]: React.ComponentType<any> } = {
        'bmi-calculator': BmiCalculator,
        'loan-payment': LoanPaymentCalculator,
        'compound-interest': CompoundInterestCalculator,
        'savings': SavingsCalculator,
        'retirement': RetirementCalculator,
        'investment-growth': InvestmentGrowthCalculator,
        'mortgage': MortgageCalculator,
        'apr': AprCalculator,
        'annuity': AnnuityCalculator,
        'bond-yield': BondYieldCalculator,
        'npv': NpvCalculator,
        'irr': IrrCalculator,
        'breakeven': BreakevenPointCalculator,
        'profit-margin': ProfitMarginCalculator,
        'currency-converter': CurrencyConverter,
        'tax': TaxCalculator,
        'gratuity': GratuityCalculator,
        'emi': EmiCalculator,
        'sip': SipCalculator,
        'inflation': InflationCalculator,
        'auto-loan': AutoLoanCalculator,
        'interest-calculator': InterestCalculator,
        'payment-calculator': PaymentCalculator,
        'amortization-calculator': AmortizationCalculator,
        'finance-calculator': FinanceCalculator,
        'mortgage-payoff': MortgagePayoffCalculator,
        'salary-calculator': SalaryCalculator,
        '401k-calculator': K401Calculator,
        'interest-rate-calculator': InterestRateCalculator,
        'sales-tax-calculator': SalesTaxCalculator,
        'house-affordability': HouseAffordabilityCalculator,
        'rent-calculator': RentCalculator,
        'marriage-tax-calculator': MarriageTaxCalculator,
        'estate-tax-calculator': EstateTaxCalculator,
        'pension-calculator': PensionCalculator,
        'social-security-calculator': SocialSecurityCalculator,
        'annuity-payout-calculator': AnnuityPayoutCalculator,
        'credit-card-calculator': CreditCardCalculator,
        'credit-cards-payoff-calculator': CreditCardsPayoffCalculator,
        'debt-payoff-calculator': DebtPayoffCalculator,
        'debt-consolidation-calculator': DebtConsolidationCalculator,
        'repayment-calculator': RepaymentCalculator,
        'student-loan-calculator': StudentLoanCalculator,
        'college-cost-calculator': CollegeCostCalculator,
        'simple-interest-calculator': SimpleInterestCalculator,
        'cd-calculator': CdCalculator,
        'bond-calculator': BondCalculator,
        'roth-ira-calculator': RothIraCalculator,
        'ira-calculator': IraCalculator,
        'rmd-calculator': RmdCalculator,
        'vat-calculator': VatCalculator,
        'cash-back-or-low-interest': CashBackOrLowInterestCalculator,
        'auto-lease-calculator': AutoLeaseCalculator,
        'depreciation-calculator': DepreciationCalculator,
        'average-return-calculator': AverageReturnCalculator,
        'margin-calculator': MarginCalculator,
        'discount-calculator': DiscountCalculator,
        'business-loan-calculator': BusinessLoanCalculator,
        'debt-to-income-ratio': DebtToIncomeRatioCalculator,
        'real-estate-calculator': RealEstateCalculator,
        'take-home-paycheck-calculator': TakeHomePaycheckCalculator,
        'personal-loan-calculator': PersonalLoanCalculator,
        'lease-calculator': LeaseCalculator,
        'refinance-calculator': RefinanceCalculator,
        'budget-calculator': BudgetCalculator,
        'rental-property-calculator': RentalPropertyCalculator,
        'roi-calculator': RoiCalculator,
        'fha-loan-calculator': FhaLoanCalculator,
        'va-mortgage-calculator': VaMortgageCalculator,
        'down-payment-calculator': DownPaymentCalculator,
        'payback-period-calculator': PaybackPeriodCalculator,
        'present-value-calculator': PresentValueCalculator,
        'future-value-calculator': FutureValueCalculator,
        'commission-calculator': CommissionCalculator,
        'mortgage-calculator-uk': MortgageCalculatorUK,
        'canadian-mortgage-calculator': CanadianMortgageCalculator,
        'mortgage-amortization-calculator': MortgageAmortizationCalculator,
        'percent-off-calculator': PercentOffCalculator,
        'calorie-calculator': CalorieCalculator,
        'body-fat-calculator': BodyFatCalculator,
        'bmr-calculator': BmrCalculator,
        'macro-calculator': MacroCalculator,
        'ideal-weight-calculator': IdealWeightCalculator,
        'pregnancy-calculator': PregnancyCalculator,
        'pregnancy-weight-gain': PregnancyWeightGainCalculator,
        'pregnancy-conception': PregnancyConceptionCalculator,
        'due-date-calculator': DueDateCalculator,
        'pace-calculator': PaceCalculator,
        'army-body-fat-calculator': ArmyBodyFatCalculator,
        'carbohydrate-calculator': CarbohydrateCalculator,
        'lean-body-mass': LeanBodyMassCalculator,
        'healthy-weight-calculator': HealthyWeightCalculator,
        'calories-burned-calculator': CaloriesBurnedCalculator,
        'one-rep-max-calculator': OneRepMaxCalculator,
        'protein-calculator': ProteinCalculator,
        'fat-intake-calculator': FatIntakeCalculator,
        'tdee-calculator': TdeeCalculator,
        'ovulation-calculator': OvulationCalculator,
        'conception-calculator': ConceptionCalculator,
        'period-calculator': PeriodCalculator,
        'gfr-calculator': GfrCalculator,
        'body-type-calculator': BodyTypeCalculator,
        'body-surface-area': BodySurfaceAreaCalculator,
        'bac-calculator': BacCalculator,
        'weight-watcher-points': WeightWatcherPointsCalculator,
        'scientific-calculator': ScientificCalculator,
        'fraction-calculator': FractionCalculator,
        'percentage-calculator': PercentageCalculator,
        'triangle-calculator': TriangleCalculator,
        'volume-calculator': VolumeCalculator,
        'standard-deviation': StandardDeviationCalculator,
        'random-number-generator': RandomNumberGenerator,
        'number-sequence': NumberSequenceCalculator,
        'percent-error-calculator': PercentErrorCalculator,
        'exponent-calculator': ExponentCalculator,
        'binary-calculator': BinaryCalculator,
        'hex-calculator': HexCalculator,
        'half-life-calculator': HalfLifeCalculator,
        'quadratic-formula': QuadraticFormulaCalculator,
        'slope-calculator': SlopeCalculator,
        'log-calculator': LogCalculator,
        'area-calculator': AreaCalculator,
        'sample-size-calculator': SampleSizeCalculator,
        'probability-calculator': ProbabilityCalculator,
        'statistics-calculator': StatisticsCalculator,
        'mean-median-mode-range': MeanMedianModeRangeCalculator,
        'permutation-combination': PermutationCombinationCalculator,
        'z-score-calculator': ZScoreCalculator,
        'confidence-interval': ConfidenceIntervalCalculator,
        'ratio-calculator': RatioCalculator,
        'distance-calculator': DistanceCalculator,
        'circle-calculator': CircleCalculator,
        'surface-area-calculator': SurfaceAreaCalculator,
        'pythagorean-theorem': PythagoreanTheoremCalculator,
        'right-triangle-calculator': RightTriangleCalculator,
        'root-calculator': RootCalculator,
        'least-common-multiple': LeastCommonMultipleCalculator,
        'greatest-common-factor': GreatestCommonFactorCalculator,
        'factor-calculator': FactorCalculator,
        'rounding-calculator': RoundingCalculator,
        'matrix-calculator': MatrixCalculator,
        'scientific-notation': ScientificNotationCalculator,
        'big-number-calculator': BigNumberCalculator,
        'prime-factorization': PrimeFactorizationCalculator,
        'common-factor-calculator': CommonFactorCalculator,
        'basic-calculator': BasicCalculator,
        'long-division-calculator': LongDivisionCalculator,
        'average-calculator': AverageCalculator,
        'p-value-calculator': PValueCalculator,
        'age-calculator': AgeCalculator,
        'date-calculator': DateCalculator,
        'time-calculator': TimeCalculator,
        'hours-calculator': HoursCalculator,
        'gpa-calculator': GpaCalculator,
        'grade-calculator': GradeCalculator,
        'height-calculator': HeightCalculator,
        'concrete-calculator': ConcreteCalculator,
        'ip-subnet-calculator': IpSubnetCalculator,
        'bra-size-calculator': BraSizeCalculator,
        'password-generator': PasswordGenerator,
        'dice-roller': DiceRoller,
        'conversion-calculator': ConversionCalculator,
        'fuel-cost-calculator': FuelCostCalculator,
        'voltage-drop-calculator': VoltageDropCalculator,
        'btu-calculator': BtuCalculator,
        'square-footage-calculator': SquareFootageCalculator,
        'time-card-calculator': TimeCardCalculator,
        'time-zone-calculator': TimeZoneCalculator,
        'love-calculator': LoveCalculator,
        'gdp-calculator': GdpCalculator,
        'gas-mileage-calculator': GasMileageCalculator,
        'horsepower-calculator': HorsepowerCalculator,
        'engine-horsepower-calculator': EngineHorsepowerCalculator,
        'stair-calculator': StairCalculator,
        'resistor-calculator': ResistorCalculator,
        'ohms-law-calculator': OhmsLawCalculator,
        'electricity-calculator': ElectricityCalculator,
        'tip-calculator': TipCalculator,
        'mileage-calculator': MileageCalculator,
        'density-calculator': DensityCalculator,
        'mass-calculator': MassCalculator,
        'weight-calculator': WeightCalculator,
        'speed-calculator': SpeedCalculator,
        'molarity-calculator': MolarityCalculator,
        'molecular-weight-calculator': MolecularWeightCalculator,
        'roman-numeral-converter': RomanNumeralConverter,
        'golf-handicap-calculator': GolfHandicapCalculator,
        'sleep-calculator': SleepCalculator,
        'tire-size-calculator': TireSizeCalculator,
        'roofing-calculator': RoofingCalculator,
        'tile-calculator': TileCalculator,
        'mulch-calculator': MulchCalculator,
        'gravel-calculator': GravelCalculator,
        'wind-chill-calculator': WindChillCalculator,
        'heat-index-calculator': HeatIndexCalculator,
        'dew-point-calculator': DewPointCalculator,
        'bandwidth-calculator': BandwidthCalculator,
        'time-duration-calculator': TimeDurationCalculator,
        'day-counter': DayCounter,
        'day-of-the-week-calculator': DayOfTheWeekCalculator,
        // Add other calculators here as they are implemented
    };

    const CalculatorComponent = calculatorComponents[calculatorInfo.slug];

    if (!CalculatorComponent) {
        console.warn(`Calculator component for slug "${slug}" is not explicitly handled or implemented.`);
        return (
            <div className="p-4 md:p-8 max-w-lg mx-auto text-center text-muted-foreground" role="alert">
                <p>The calculator component for &quot;{calculatorInfo.name}&quot; is currently unavailable or not implemented.</p>
                <p className="text-xs mt-1">(Slug: {slug})</p>
            </div>
        );
    }

    return <CalculatorComponent {...commonProps} />;
  };

  return (
    <>
      {renderCalculator()}
    </>
  );
}

    
