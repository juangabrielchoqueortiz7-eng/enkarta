import type { Metadata } from 'next';
import EventLandingPage from '@/components/commercial/EventLandingPage';

export const metadata: Metadata = { title: 'Invitaciones digitales para bodas', description: 'Invitaciones web para bodas con música, itinerario, RSVP, pases personalizados y acceso QR según el paquete.', alternates: { canonical: '/bodas' }, openGraph: { title: 'Invitaciones digitales para bodas | Enkarta', description: 'Una experiencia editorial para compartir, confirmar y organizar tu boda.', url: '/bodas', images: ['/catalog/solar-original.png'] }, twitter: { card: 'summary_large_image', images: ['/catalog/solar-original.png'] } };
export default function WeddingsPage() { return <EventLandingPage slug="bodas" />; }
