import { notFound } from 'next/navigation';
import RecoverySafetyWorkbench from './workbench';

export const dynamic = 'force-dynamic';
export default function RecoverySafetyPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <RecoverySafetyWorkbench />;
}
