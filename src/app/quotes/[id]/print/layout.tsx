import React from 'react';
import '@/app/globals.css';

// This layout is for the print page.
// It doesn't add any extra structure, allowing the page to be rendered
// within the root layout context but with specific print styles applied via CSS.
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
