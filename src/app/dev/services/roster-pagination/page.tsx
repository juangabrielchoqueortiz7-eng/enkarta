import { notFound } from 'next/navigation';
import PaginationWorkbench from './workbench';
export const dynamic = 'force-dynamic';
export default function PaginationQaPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <PaginationWorkbench />;
}
