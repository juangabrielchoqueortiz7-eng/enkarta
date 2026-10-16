import type { Metadata } from 'next';
import LauraAndres from '@/components/invitations/LauraAndres';
import { lauraAndresDemo } from '@/lib/laura-andres';
import { PageMotionProvider } from '@/lib/scroll-motion';

export const metadata: Metadata = {
  title: { absolute: 'Nuestra Boda Laura y Andrés · Muestra Enkarta' },
  robots: { index: false, follow: false },
  alternates: { canonical: '/muestra/laura-y-andres' },
};

export default async function Page({searchParams: searchParamsPromise}:{searchParams:Promise<{full?:string}>}) {
  const searchParams = await searchParamsPromise;

  const data=lauraAndresDemo();
  return <PageMotionProvider value={data.config.motion}><LauraAndres data={data} demo skipEntry={searchParams.full==='1'} /></PageMotionProvider>;
}
