import { notFound } from 'next/navigation';
import SalesQuoteWorkbench from './workbench';

export const dynamic = 'force-dynamic';
export default function SalesQuoteQaPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <SalesQuoteWorkbench />;
}
