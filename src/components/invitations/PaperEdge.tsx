import type {CSSProperties} from 'react';
import styles from './PaperEdge.module.css';
/** Original section silhouettes; independent from the archived Lottie artwork. */
const curves={
 petals:[
  'M0 46 C110 115 170 0 290 43 S465 130 590 47 S795 5 895 55 S1100 125 1200 35',
  'M0 64 C110 130 200 18 310 61 S485 145 625 66 S820 25 935 75 S1100 132 1200 57',
  'M0 90 C125 145 195 48 320 85 S490 155 640 93 S825 57 950 99 S1110 151 1200 82',
 ],
 drape:[
  'M0 12 C240 18 345 115 600 115 C855 115 960 18 1200 12',
  'M0 36 C250 35 370 132 600 132 C830 132 950 35 1200 36',
  'M0 65 C255 60 380 147 600 147 C820 147 945 60 1200 65',
 ],
 ribbon:[
  'M0 80 C170 85 230 18 410 28 C590 38 710 135 870 108 C1010 85 1100 10 1200 20',
  'M0 96 C180 101 250 40 420 49 C600 58 735 151 890 126 C1020 106 1110 32 1200 43',
  'M0 118 C180 118 270 68 445 72 C620 76 745 168 915 143 C1040 125 1120 62 1200 68',
 ],
} as const;
export default function PaperEdge({variant,top=false,color,height}:{variant:keyof typeof curves;top?:boolean;color?:string;height?:number}){return <div aria-hidden="true" className={`${styles.edge} ${top?styles.top:''}`} style={{'--edge-color':color??'var(--paper)','--edge-height':height?`${height}px`:undefined} as CSSProperties}><svg viewBox="0 0 1200 180" preserveAspectRatio="none">{curves[variant].map((d,i)=><path key={i} d={`${d} L1200 181 L0 181 Z`} opacity={[.3,.55,1][i]}/>)}</svg></div>;}
