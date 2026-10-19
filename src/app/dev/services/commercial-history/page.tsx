import { notFound } from 'next/navigation';
import Workbench from './workbench';

export const dynamic = 'force-dynamic';

export default function CommercialHistoryWorkbench() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <Workbench />;
}
