import type { Metadata } from 'next';
import AnnieMicky from '@/components/invitations/AnnieMicky';
import { annieMickyDemo } from '@/lib/annie-micky';
import { PageMotionProvider } from '@/lib/scroll-motion';

export const metadata: Metadata = {
  title: { absolute: 'Nuestra Boda Annie y Micky · Muestra Enkarta' },
  robots: { index: false, follow: false },
  alternates: { canonical: '/muestra/annie-y-micky' },
};

export default function Page({searchParams}:{searchParams:{full?:string}}) {
  const data=annieMickyDemo();
  return <PageMotionProvider value={data.config.motion}><AnnieMicky data={data} demo skipEntry={searchParams.full==='1'} /></PageMotionProvider>;
}
