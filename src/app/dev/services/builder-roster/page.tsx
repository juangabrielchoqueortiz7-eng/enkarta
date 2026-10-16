import { notFound } from 'next/navigation';
import BuilderRosterWorkbench from './workbench';
export const dynamic = 'force-dynamic';
export default function BuilderRosterPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <BuilderRosterWorkbench />;
}
