import JardinDeSeda from '@/components/invitations/JardinDeSeda';
import {silkDemo} from '@/lib/jardin-de-seda';
import {PageMotionProvider} from '@/lib/scroll-motion';
export const metadata={title:'Jardín de Seda · Isabella y Gabriel',robots:{index:false,follow:false}};
export default function Page({searchParams}:{searchParams:{m?:string;n?:string;full?:string}}){const data=silkDemo();if(searchParams.m)data.guest_name=searchParams.m;if(searchParams.n)data.guest_passes=Math.max(1,Math.min(20,parseInt(searchParams.n)||2));return <PageMotionProvider value={data.config.motion}><JardinDeSeda data={data} demo skipEntry={searchParams.full==='1'}/></PageMotionProvider>;}
