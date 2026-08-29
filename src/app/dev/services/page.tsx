import { notFound } from 'next/navigation';
import ServicesWorkbench from './workbench';

export const dynamic = 'force-dynamic';
export default function ServicesQaPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <ServicesWorkbench />;
}
