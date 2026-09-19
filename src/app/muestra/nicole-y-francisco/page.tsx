import type { Metadata } from 'next';
import NicoleFrancisco from '@/components/invitations/NicoleFrancisco';
import { nicoleFranciscoDemo } from '@/lib/nicole-francisco';
import { PageMotionProvider } from '@/lib/scroll-motion';
export const metadata:Metadata={title:{absolute:'Nuestra Boda Nicole y Francisco · Muestra Enkarta'},robots:{index:false,follow:false}};
export default function Page({searchParams}:{searchParams:{full?:string;m?:string;n?:string}}){const data=nicoleFranciscoDemo();if(searchParams.m)data.guest_name=searchParams.m;if(searchParams.n)data.guest_passes=Math.max(1,Math.min(20,parseInt(searchParams.n)||2));return <PageMotionProvider value={data.config.motion}><NicoleFrancisco data={data} demo skipEntry={searchParams.full==='1'}/></PageMotionProvider>;}
