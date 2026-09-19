'use client';
import type {CSSProperties} from 'react';
import {usePageMotion} from '@/lib/scroll-motion';
// Same ranges as the original: 30 lights, 10–30px, ±100px, 4–7s, delays 0–5s.
// Seeded positions avoid hydration changes; the source also randomizes each light.
const lights=Array.from({length:30},(_,i)=>{const value=(salt:number)=>{let x=Math.imul(i+1,374761393)^Math.imul(salt,668265263);x=Math.imul(x^(x>>>13),1274126177);return ((x^(x>>>16))>>>0)/4294967296;};return {left:value(1)*100+'%',top:value(2)*100+'%','--size':(10+value(3)*20)+'px','--dx':(value(4)*200-100)+'px','--dy':(value(5)*200-100)+'px','--duration':(4+value(6)*3)+'s','--delay':(value(7)*5)+'s','--easing':['linear','ease-in','ease-out','ease-in-out'][Math.floor(value(8)*4)]} as CSSProperties;});
export default function OriginalFireflies({className,lightClassName}:{className:string;lightClassName:string}){const context=usePageMotion();if(context.reduced||context.preset==='none')return null;return <div aria-hidden="true" className={className}>{lights.map((style,i)=><i key={i} className={lightClassName} style={style}/>)}</div>;}
