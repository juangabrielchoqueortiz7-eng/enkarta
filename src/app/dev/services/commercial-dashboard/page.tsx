import { notFound } from 'next/navigation';
import CommercialDashboardWorkbench from './workbench';

export const dynamic = 'force-dynamic';
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <CommercialDashboardWorkbench />;
}
