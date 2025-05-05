
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CALCULATORS, APP_NAME } from '@/lib/constants';
import { CalculatorContainer } from '@/components/calculators/calculator-container';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { JsonLd } from '@/components/seo/json-ld'; // Import JsonLd component

interface CalculatorPageProps {
  params: {
    slug: string;
  };
}

// Skeleton component for CalculatorContainer
function CalculatorLoadingSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto"> {/* Adjusted max-width to match Loan calc */}
       {/* H1 Skeleton */}
       <Skeleton className="h-8 w-3/4 mb-2" /> {/* Removed rounded-md */}
       {/* Description Skeleton */}
       <Skeleton className="h-4 w-full mb-6" /> {/* Removed rounded-md */}
       {/* Mimic the Card structure */}
       <Skeleton className="h-[450px] w-full" /> {/* Removed rounded-lg */}
       {/* Skeleton for potential table/additional content */}
       <Skeleton className="mt-6 h-[300px] w-full" /> {/* Removed rounded-lg */}
    </div>
  );
}

export async function generateMetadata({ params }: CalculatorPageProps): Promise<Metadata> {
  const calculator = CALCULATORS.find((calc) => calc.slug === params.slug);

  if (!calculator) {
    return {
      title: `Calculator Not Found | ${APP_NAME}`,
    };
  }

  // Use specific SEO fields if available, otherwise fallback to name/description
  const title = calculator.seoTitle || `${calculator.name} - Online Calculator | ${APP_NAME}`;
  const description = calculator.seoDescription || `Use the free online ${calculator.name} on ${APP_NAME}. ${calculator.description}`;
  const keywords = calculator.seoKeywords || [calculator.name, calculator.category, 'calculator', 'online calculator', 'free calculator', APP_NAME.toLowerCase()];
  const url = `/calculator/${calculator.slug}`;

  return {
    title: title,
    description: description,
    keywords: keywords,
    alternates: { // Add canonical URL
      canonical: url,
    },
     // Add other meta tags as needed (e.g., Open Graph)
     openGraph: {
        title: title,
        description: description,
        type: 'website', // Could potentially be 'article' if content is substantial
        url: url,
        siteName: APP_NAME,
         // Add an image URL if you have one for social sharing
         // images: [ { url: `/images/calculators/${calculator.slug}.png` } ],
      },
      twitter: {
        card: 'summary', // or 'summary_large_image'
        title: title,
        description: description,
        // Add Twitter-specific image if needed
        // images: [`/images/calculators/${calculator.slug}.png`],
      },
  };
}

// Generate static paths for all calculators
export async function generateStaticParams() {
  return CALCULATORS.map((calc) => ({
    slug: calc.slug,
  }));
}

export default function CalculatorPage({ params }: CalculatorPageProps) {
  const calculatorInfo = CALCULATORS.find((calc) => calc.slug === params.slug);

  if (!calculatorInfo) {
    notFound();
  }

   // Structured Data for SEO (BreadcrumbList and HowToTool)
   const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/calculator/${calculatorInfo.slug}`;

   const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": APP_NAME,
        "item": process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002' // Link to homepage
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": calculatorInfo.category,
        // Optionally link to a category page if you create them later
        // "item": `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/category/${calculatorInfo.category.toLowerCase().replace(/ /g, '-')}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": calculatorInfo.name,
        "item": pageUrl // Link to the current page
      }
    ]
  };

  // Basic HowToTool schema - Can be expanded with specific steps/inputs later if needed
  const howToToolSchema = {
      "@context": "https://schema.org",
      "@type": "HowToTool",
      "name": calculatorInfo.name,
      "description": calculatorInfo.seoDescription || `Use the free online ${calculatorInfo.name} on ${APP_NAME}. ${calculatorInfo.description}`,
      "url": pageUrl,
      "potentialAction": {
          "@type": "Action", // More specific action type might be suitable depending on calculator
          "target": pageUrl // Indicates the tool is used on this page
      },
      // Add steps if you want to detail how to use the calculator
      // "step": [
      //   { "@type": "HowToStep", "name": "Enter Input 1", "text": "Describe entering the first input." },
      //   { "@type": "HowToStep", "name": "Enter Input 2", "text": "Describe entering the second input." },
      //   { "@type": "HowToStep", "name": "Calculate", "text": "Click the calculate button to see the result." }
      // ]
  };

  return (
    <div className="p-4 md:p-8">
      {/* Add JSON-LD Schema */}
       <JsonLd data={breadcrumbSchema} />
       <JsonLd data={howToToolSchema} />

       {/* Add H1 and Description */}
       <h1 className="text-3xl font-bold mb-2">{calculatorInfo.name}</h1>
       <p className="text-muted-foreground mb-6">{calculatorInfo.description}</p>

       {/* Wrap CalculatorContainer in Suspense */}
       <Suspense fallback={<CalculatorLoadingSkeleton />}>
          <CalculatorContainer slug={params.slug} />
       </Suspense>
    </div>
  );
}
