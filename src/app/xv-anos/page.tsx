import type { Metadata } from 'next';
import EventLandingPage from '@/components/commercial/EventLandingPage';

export const metadata: Metadata = { title: 'Invitaciones digitales para XV años', description: 'Invitaciones web para XV años con fotografías, música, itinerario, pases y confirmaciones según el paquete.', alternates: { canonical: '/xv-anos' }, openGraph: { title: 'Invitaciones digitales para XV años | Enkarta', description: 'Fotografías, música, agenda y pases con una identidad propia.', url: '/xv-anos', images: ['/catalog/rosegold.jpg'] }, twitter: { card: 'summary_large_image', images: ['/catalog/rosegold.jpg'] } };
export default function QuincePage() { return <EventLandingPage slug="xv-anos" />; }
