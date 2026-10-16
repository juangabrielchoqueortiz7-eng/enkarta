import type { Metadata } from 'next';
import PaulaJuanFelipe from '@/components/invitations/PaulaJuanFelipe';
import { paulaJuanFelipeDemo } from '@/lib/paula-juan-felipe';
import { PageMotionProvider } from '@/lib/scroll-motion';
export const metadata:Metadata={title:{absolute:'Nuestra Boda Paula y Juan Felipe · Muestra Enkarta'},robots:{index:false,follow:false}};
export default async function Page({searchParams: searchParamsPromise}:{searchParams:Promise<{full?:string;m?:string;n?:string}>}){
  const searchParams = await searchParamsPromise;
const data=paulaJuanFelipeDemo();if(searchParams.m)data.guest_name=searchParams.m;if(searchParams.n)data.guest_passes=Math.max(1,Math.min(20,parseInt(searchParams.n)||2));return <PageMotionProvider value={data.config.motion}><PaulaJuanFelipe data={data} demo skipEntry={searchParams.full==='1'}/></PageMotionProvider>;}
