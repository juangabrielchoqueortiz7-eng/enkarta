import CleanInvitation from '@/components/invitations/CleanInvitation';
import {cleanDemo} from '@/lib/clean-starters';
import {PageMotionProvider} from '@/lib/scroll-motion';
export const metadata={title:'Jardín de Salvia · Muestra',robots:{index:false,follow:false}};
export default async function Page({searchParams: searchParamsPromise}:{searchParams:Promise<{m?:string;n?:string}>}){
  const searchParams = await searchParamsPromise;
const data=cleanDemo('jardin-salvia');if(searchParams.m)data.guest_name=searchParams.m;if(searchParams.n)data.guest_passes=Math.max(1,Math.min(20,parseInt(searchParams.n)||2));return <PageMotionProvider value={data.config.motion}><CleanInvitation data={data} demo skipEntry/></PageMotionProvider>;}
