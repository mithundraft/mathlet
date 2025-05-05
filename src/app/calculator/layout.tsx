
import * as React from 'react';

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout can be used to add specific styling or components
  // common to all calculator pages, if needed in the future.
  return <>{children}</>;
}
