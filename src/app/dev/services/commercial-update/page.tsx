import { notFound } from 'next/navigation';
import CommercialUpdateWorkbench from './workbench';

export const dynamic = 'force-dynamic';
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <CommercialUpdateWorkbench />;
}
