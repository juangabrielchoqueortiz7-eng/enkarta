import type { Metadata } from 'next';
import EventLandingPage from '@/components/commercial/EventLandingPage';

export const metadata: Metadata = { title: 'Invitaciones digitales para cumpleaños', description: 'Invitaciones web para cumpleaños con ubicación, cuenta regresiva, programa, música y confirmaciones.', alternates: { canonical: '/cumpleanos' }, openGraph: { title: 'Invitaciones digitales para cumpleaños | Enkarta', description: 'Tu fiesta empieza con una invitación fácil de compartir y actualizar.', url: '/cumpleanos', images: ['/catalog/euforia.jpg'] }, twitter: { card: 'summary_large_image', images: ['/catalog/euforia.jpg'] } };
export default function BirthdayPage() { return <EventLandingPage slug="cumpleanos" />; }
