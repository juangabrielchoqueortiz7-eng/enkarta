import Velada from '@/components/invitations/Velada';
import {atelierDemo} from '@/lib/atelier-editions';
import {PageMotionProvider} from '@/lib/scroll-motion';
export const metadata={title:'Velada · Antonia y Rafael',robots:{index:false,follow:false}};
export default function Page({searchParams}:{searchParams:{m?:string;n?:string;full?:string}}){const data=atelierDemo('velada');if(searchParams.m)data.guest_name=searchParams.m;if(searchParams.n)data.guest_passes=Math.max(1,Math.min(20,parseInt(searchParams.n)||2));return <PageMotionProvider value={data.config.motion}><Velada data={data} demo skipEntry={searchParams.full==='1'}/></PageMotionProvider>;}
