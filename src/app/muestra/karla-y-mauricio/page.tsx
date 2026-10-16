import type { Metadata } from 'next';
import KarlaMauricio from '@/components/invitations/KarlaMauricio';
import { karlaMauricioDemo } from '@/lib/karla-mauricio';
import { PageMotionProvider } from '@/lib/scroll-motion';
export const metadata:Metadata={title:{absolute:'Nuestra Boda Karla y Mauricio · Muestra Enkarta'},robots:{index:false,follow:false}};
export default async function Page({searchParams: searchParamsPromise}:{searchParams:Promise<{full?:string;m?:string;n?:string}>}){
  const searchParams = await searchParamsPromise;
const data=karlaMauricioDemo();if(searchParams.m)data.guest_name=searchParams.m;if(searchParams.n)data.guest_passes=Math.max(1,Math.min(20,parseInt(searchParams.n)||2));return <PageMotionProvider value={data.config.motion}><KarlaMauricio data={data} demo skipEntry={searchParams.full==='1'}/></PageMotionProvider>;}
