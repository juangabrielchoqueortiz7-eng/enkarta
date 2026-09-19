import Promesa from '@/components/invitations/Promesa';
import {promesaDemo} from '@/lib/promesa';
import {PageMotionProvider} from '@/lib/scroll-motion';
export const metadata={title:'Promesa · Emilia y Alejandro',robots:{index:false,follow:false}};
export default function Page({searchParams}:{searchParams:{m?:string;n?:string;full?:string}}){const data=promesaDemo();if(searchParams.m)data.guest_name=searchParams.m;if(searchParams.n)data.guest_passes=Math.max(1,Math.min(20,parseInt(searchParams.n)||2));return <PageMotionProvider value={data.config.motion}><Promesa data={data} demo skipEntry={searchParams.full==='1'}/></PageMotionProvider>;}
