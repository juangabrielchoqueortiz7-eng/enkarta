import { notFound } from 'next/navigation';
import InvitationQualityWorkbench from '@/components/dev/InvitationQualityWorkbench';

/** Local regression workspace: never available in a production build. */
export default function InvitationQualityPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <InvitationQualityWorkbench />;
}
