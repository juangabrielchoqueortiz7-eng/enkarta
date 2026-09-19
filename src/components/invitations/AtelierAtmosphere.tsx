/* eslint-disable @next/next/no-img-element */
import type {CSSProperties} from 'react';
import styles from './AtelierAtmosphere.module.css';
export default function AtelierAtmosphere({image,night=false}:{image?:string;night?:boolean}){return <div aria-hidden="true" className={`${styles.atmosphere} ${night?styles.night:''}`}>
{image&&[0,1,2,3,4,5].map(i=><img key={i} src={image} alt="" style={{'--turn':i%2?'180deg':'0deg',top:`${i*18}%`,[i%2?'left':'right']:'-70px',animationDelay:`-${i*2}s`} as CSSProperties} loading="lazy"/>)}
{Array.from({length:24},(_,i)=><i key={i} style={{left:`${(i*43+7)%100}%`,top:`${(i*17+3)%100}%`,animationDelay:`-${i%7}s`,'--size':`${i%3+3}px`} as CSSProperties}/>)}</div>}
