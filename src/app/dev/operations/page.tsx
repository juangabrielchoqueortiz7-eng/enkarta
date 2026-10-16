import { notFound } from 'next/navigation';
import OperationsWorkbench from './workbench';

export const dynamic = 'force-dynamic';
export default function OperationsQaPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <OperationsWorkbench />;
}
