import CleanInvitation from '@/components/invitations/CleanInvitation';
import {cleanDemo} from '@/lib/clean-starters';
import {PageMotionProvider} from '@/lib/scroll-motion';
export const metadata={title:'Carta Malva · Muestra',robots:{index:false,follow:false}};
export default function Page({searchParams}:{searchParams:{m?:string;n?:string}}){const data=cleanDemo('carta-malva');if(searchParams.m)data.guest_name=searchParams.m;if(searchParams.n)data.guest_passes=Math.max(1,Math.min(20,parseInt(searchParams.n)||2));return <PageMotionProvider value={data.config.motion}><CleanInvitation data={data} demo skipEntry/></PageMotionProvider>;}
