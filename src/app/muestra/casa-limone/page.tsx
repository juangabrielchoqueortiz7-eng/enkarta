import CasaLimone from '@/components/invitations/CasaLimone';
import {limoneDemo} from '@/lib/casa-limone';
import {PageMotionProvider} from '@/lib/scroll-motion';
export const metadata={title:'Votos · Lucía y Nicolás',robots:{index:false,follow:false}};
export default async function Page({searchParams: searchParamsPromise}:{searchParams:Promise<{m?:string;n?:string;full?:string}>}){
  const searchParams = await searchParamsPromise;
const data=limoneDemo();if(searchParams.m)data.guest_name=searchParams.m;if(searchParams.n)data.guest_passes=Math.max(1,Math.min(20,parseInt(searchParams.n)||2));return <PageMotionProvider value={data.config.motion}><CasaLimone data={data} demo skipEntry={searchParams.full==='1'}/></PageMotionProvider>;}
