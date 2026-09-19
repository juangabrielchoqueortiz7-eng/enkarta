'use client';
/* eslint-disable @next/next/no-img-element */
import {useRef} from 'react';
import {motion,useScroll,useTransform} from 'framer-motion';
import {usePageMotion} from '@/lib/scroll-motion';

function Photo({url,index,names,direction,onPhoto}:{url:string;index:number;names:string;direction:number;onPhoto:(url:string)=>void}){
 const ref=useRef<HTMLButtonElement>(null),context=usePageMotion();
 const {scrollYProgress}=useScroll({target:ref,container:context.scrollRoot,offset:['start end','end start']});
 const rotate=useTransform(scrollYProgress,p=>(50-p*100)*.1*direction);
 return <motion.button ref={ref} type="button" aria-label={'Abrir foto '+(index+1)} style={{rotate:context.reduced||context.preset==='none'?0:rotate,width:'100%'}} onClick={()=>onPhoto(url)}><img src={url} alt={names+' · foto '+(index+1)} loading="lazy"/></motion.button>;
}
function Column({items,names,direction,onPhoto}:{items:{url:string;index:number}[];names:string;direction:number;onPhoto:(url:string)=>void}){
 const ref=useRef<HTMLDivElement>(null),context=usePageMotion();
 const {scrollYProgress}=useScroll({target:ref,container:context.scrollRoot,offset:['start end','end start']});
 // Original Elementor settings: translation speed .4, rotation .1; viewport 52–100%.
 const x=useTransform(scrollYProgress,p=>(50-Math.max(direction===1?53:52,Math.min(100,p*100)))*.4*direction);
 const rotate=useTransform(scrollYProgress,p=>(50-Math.max(52,Math.min(100,p*100)))*.1*direction);
 const still=context.reduced||context.preset==='none';
 return <motion.div ref={ref} style={{x:still?0:x,rotate:still?0:rotate,display:'flex',flexDirection:'column',gap:'var(--collage-gap,35px)',minWidth:0}}>{items.map(({url,index})=><Photo key={index} {...{url,index,names,direction,onPhoto}}/>)}</motion.div>;
}

function Center({items,names,onPhoto}:{items:{url:string;index:number}[];names:string;onPhoto:(url:string)=>void}){
 const ref=useRef<HTMLDivElement>(null),context=usePageMotion();const {scrollYProgress}=useScroll({target:ref,container:context.scrollRoot,offset:['start end','end start']});const y=useTransform(scrollYProgress,p=>(50-p*100)*.9);
 return <motion.div ref={ref} style={{y:context.reduced||context.preset==='none'?0:y,display:'flex',flexDirection:'column',gap:20,minWidth:0}}>{items.map(({url,index})=><button key={index} onClick={()=>onPhoto(url)} aria-label={'Abrir foto '+(index+1)}><img src={url} alt={names+' · foto '+(index+1)} loading="lazy"/></button>)}</motion.div>;
}
export default function PaulaScrollCollage({images,names,className,onPhoto}:{images:string[];names:string;className:string;onPhoto:(url:string)=>void}){const items=images.map((url,index)=>({url,index}));return <section className={className} aria-label="Galería de fotografías"><Column items={items.slice(0,3)} direction={1} {...{names,onPhoto}}/><Center items={items.slice(3,7)} {...{names,onPhoto}}/><Column items={items.slice(7)} direction={-1} {...{names,onPhoto}}/></section>;}
