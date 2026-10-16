import { notFound } from 'next/navigation';
import InvitationBuilder from '@/components/admin/builder/InvitationBuilder';
import { marfilVivoDemo } from '@/lib/marfil-vivo';

/** Same editor as production, synthetic content and persistence disabled. */
export default function BuilderFixturePage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <InvitationBuilder initialData={marfilVivoDemo()} backHref="/dev/invitation-quality" fixtureMode />;
}
