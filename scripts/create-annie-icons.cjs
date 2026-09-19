// Local, editable Lottie variants. Outline geometry checked against the rendered reference.
const fs = require('node:fs');
const root = 'public/lottie/boda/';
const color = [129/255,133/255,102/255,1];
const fixed = k => ({a:0,k});
const stroke = () => ({ty:'st',c:fixed(color),o:fixed(100),w:fixed(5),lc:2,lj:2});
for (const [source,target] of [['honeymoon','annie-auto'],['photo','annie-fotografia']]) {
  const data = JSON.parse(fs.readFileSync(root+source+'.json'));
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    // Keep occluding surfaces white so linework remains visible, including the lens.
    if (value.ty === 'fl') { value.c=fixed([1,1,1,1]); }
    if (value.ty === 'st') { value.c=fixed(color); value.w=fixed(5); }
    if (Array.isArray(value.it) && value.it.some(s=>s.ty==='fl') && !value.it.some(s=>s.ty==='st')) value.it.splice(value.it.length-1,0,stroke());
    for (const item of Object.values(value)) if (Array.isArray(item)) item.forEach(walk); else if (item && typeof item==='object') walk(item);
  }
  walk(data);data.nm=target;
  fs.writeFileSync(root+target+'.json',JSON.stringify(data));
}
function paths(d,dx,dy) {
  const tokens=d.match(/[MCZ]|-?\d+(?:\.\d+)?/gi);let at=0,result=[],shape;
  const point=()=>[+tokens[at++]+dx,+tokens[at++]+dy];
  while(at<tokens.length){const cmd=tokens[at++].toUpperCase();if(cmd==='M'){shape={v:[point()],i:[[0,0]],o:[[0,0]],c:false};result.push(shape);}else if(cmd==='C'){const a=point(),b=point(),p=point(),last=shape.v.length-1;shape.o[last]=a.map((n,i)=>n-shape.v[last][i]);shape.v.push(p);shape.i.push(b.map((n,i)=>n-p[i]));shape.o.push([0,0]);}else if(cmd==='Z'){shape.c=true;}}
  return result.map(k=>({ty:'sh',ks:fixed(k),nm:'Contorno'}));
}
function make(name,size,groups){const data={v:'5.9.0',fr:30,ip:0,op:121,w:size,h:size,nm:name,ddd:0,assets:[],layers:groups.map((g,i)=>({ddd:0,ind:i+1,ty:4,nm:g.name,sr:1,ks:{o:fixed(100),r:fixed(0),p:fixed([0,0,0]),a:fixed([0,0,0]),s:fixed([100,100,100])},shapes:[...paths(g.d,g.x||0,g.y||0),{...stroke(),w:fixed(size===120?1.5:5)},...(g.fill?[{ty:'fl',c:fixed(color),o:fixed(100)}]:[])],ip:0,op:121,st:0,bm:0})),markers:[]};return data;}
const heart='M0,40.703 C0,40.703 -30.682,16.786 -30.682,16.786 C-40.143,9.413 -45.675,-1.913 -45.675,-13.909 C-45.675,-28.656 -33.487,-40.701 -18.754,-40.062 C-11.208,-39.735 -4.505,-36.164 0,-30.709 C4.504,-36.164 11.208,-39.734 18.754,-40.062 C33.487,-40.703 45.675,-28.656 45.675,-13.909 C45.675,-1.913 40.143,9.413 30.682,16.786 C30.682,16.786 0,40.703 0,40.703Z';
const couple=make('Annie · Pareja y corazón',500,[
 {name:'Corazón',x:256,y:123.297,d:heart},
 {name:'Velo',x:341.702,y:310.388,d:'M53.26,-88.852 C53.26,-88.852 58.544,-73.554 58.544,-73.554 C76.587,-21.308 85.798,33.579 85.798,88.852 M-53.261,-88.852 C-53.261,-88.852 -58.544,-73.554 -58.544,-73.554 C-76.587,-21.308 -85.798,33.579 -85.798,88.852'},
 {name:'Novio',x:175.405,y:300.1,d:'M18.86,24.347 C58.745,24.914 90.905,57.417 90.905,97.437 C90.905,97.437 90.905,127.4 90.905,127.4 C90.905,127.4 -90.905,127.4 -90.905,127.4 C-90.905,127.4 -90.905,97.437 -90.905,97.437 C-90.905,57.417 -58.745,24.914 -18.86,24.347 M-18.859,3.812 C-18.859,3.812 -18.859,25.553 -18.859,25.553 C-18.859,25.553 0.011,44.424 0.011,44.424 C7.38,37.054 11.512,32.922 18.882,25.553 C18.882,25.553 18.882,3.812 18.882,3.812 M-48.23,-76.903 C-48.23,-76.903 -48.23,-42.748 -48.23,-42.748 C-48.23,-16.105 -26.632,5.493 0.011,5.493 C26.654,5.493 48.252,-16.105 48.252,-42.748 C48.252,-42.748 48.252,-76.903 48.252,-76.903 M48.252,-66.282 C48.252,-66.282 48.252,-92.281 48.252,-92.281 C48.252,-111.677 32.529,-127.4 13.133,-127.4 C13.133,-127.4 -13.111,-127.4 -13.111,-127.4 C-32.507,-127.4 -48.23,-111.677 -48.23,-92.281 C-48.23,-92.281 -48.23,-66.282 -48.23,-66.282 C-23.857,-66.282 -0.655,-71.289 20.413,-80.319 C26.742,-71.816 36.838,-66.282 48.252,-66.282Z M50.038,31.797 C50.038,31.797 0.011,127.4 0.011,127.4 M-50.016,31.797 C-50.016,31.797 0.011,127.4 0.011,127.4'},
 {name:'Novia',x:341.75,y:287.492,d:'M-51.729,140.008 C-51.729,140.008 -51.729,118.544 -51.729,118.544 C-51.729,103.728 -39.719,91.718 -24.903,91.718 C-13.614,91.718 -3.96,98.694 0,108.568 C3.959,98.694 13.613,91.718 24.902,91.718 C39.718,91.718 51.728,103.728 51.728,118.544 C51.728,118.544 51.728,140.008 51.728,140.008 C51.728,140.008 -51.729,140.008 -51.729,140.008Z M24.576,-97.835 C26.91,-101.945 28.249,-106.694 28.249,-111.758 C28.249,-127.36 15.602,-140.008 0,-140.008 C-15.602,-140.008 -28.25,-127.36 -28.25,-111.758 C-28.25,-106.694 -26.911,-101.945 -24.577,-97.835 M39.967,-7.054 C50.173,-17.273 56.484,-31.382 56.484,-46.966 C56.484,-78.161 31.195,-103.45 0,-103.45 C-31.196,-103.45 -56.485,-78.161 -56.485,-46.966 C-56.485,-31.382 -50.173,-17.273 -39.968,-7.054 M-16.8,22.043 C-16.8,22.043 -16.8,42.798 -16.8,42.798 C-54.88,42.798 -85.75,73.667 -85.75,111.747 C-85.75,111.747 -85.75,140.008 -85.75,140.008 C-85.75,140.008 85.75,140.008 85.75,140.008 C85.75,140.008 85.75,111.747 85.75,111.747 C85.75,73.667 54.88,42.798 16.8,42.798 C16.8,42.798 16.8,22.043 16.8,22.043 M-41.104,-16.641 C-41.104,6.06 -22.701,24.463 0,24.463 C22.7,24.463 41.103,6.06 41.103,-16.641 C41.103,-16.641 41.103,-33.269 41.103,-33.269 C25.064,-33.311 10.545,-39.809 0,-50.297 C-10.546,-39.809 -25.065,-33.311 -41.104,-33.269 C-41.104,-33.269 -41.104,-16.641 -41.104,-16.641Z'}
]);
const ease={i:{x:[.67],y:[1]},o:{x:[.33],y:[0]}};
couple.layers[0].ks.a=fixed([256,123.297,0]);couple.layers[0].ks.p=fixed([256,123.297,0]);
couple.layers[0].ks.s={a:1,k:[{t:0,s:[100,100,100],...ease},{t:60,s:[110,110,100],...ease},{t:120,s:[100,100,100]}]};
fs.writeFileSync(root+'annie-pareja.json',JSON.stringify(couple));
const clock=make('Annie · Reloj de arena',120,[
 {name:'Marco',d:'M40,29 C40,29 80,29 80,29 M40,91 C40,91 80,91 80,91 M44,32 C44,32 76,32 76,32 C76,44 76,45 67,54 C63,58 63,62 67,66 C76,75 76,77 76,88 C76,88 44,88 44,88 C44,77 44,75 53,66 C57,62 57,58 53,54 C44,45 44,44 44,32Z'},
 {name:'Arena',fill:true,d:'M48,39 C48,39 72,39 72,39 C72,46 66,49 60,55 C54,49 48,46 48,39Z M48,84 C48,78 55,76 60,72 C65,76 72,78 72,84 C72,84 48,84 48,84Z M60,57 C60,57 60,70 60,70'}
]);
for(const layer of clock.layers){layer.ks.a=fixed([60,60,0]);layer.ks.p=fixed([60,60,0]);layer.ks.r={a:1,k:[{t:0,s:[0],...ease},{t:85,s:[0],...ease},{t:120,s:[180]}]};}
fs.writeFileSync(root+'annie-reloj.json',JSON.stringify(clock));

// Three separate curved paths, rather than the previous polygonal shared pulse.
const trioPath='M81.84,-150 C44.17,-150 12.1,-126.05 0,-92.55 C-12.1,-126.05 -44.16,-150 -81.84,-150 C-129.88,-150 -168.83,-111.05 -168.83,-63.01 C-168.83,60.27 0,150 0,150 C0,150 168.83,60.27 168.83,-63.01 C168.83,-111.05 129.88,-150 81.84,-150Z';
const trio=make('Annie · Tres corazones',100,[0,1,2].map(i=>({name:'Corazón '+(i+1),d:trioPath})));
[[50,49,14.2,0],[20,23,5.4,15],[81,76,4.8,30]].forEach(([x,y,scale,phase],i)=>{
 const layer=trio.layers[i];
 layer.shapes[layer.shapes.length-1].w=fixed(1.25*100/scale);
 layer.ks.p={a:1,k:[{t:0,s:[x,y,0],...ease},{t:30+phase,s:[x,y-2,0],...ease},{t:75+phase,s:[x,y+1,0],...ease},{t:120,s:[x,y,0]}]};
 layer.ks.s={a:1,k:[{t:0,s:[scale,scale,100],...ease},{t:25+phase,s:[scale*1.07,scale*1.07,100],...ease},{t:70+phase,s:[scale,scale,100],...ease},{t:120,s:[scale,scale,100]}]};
});
fs.writeFileSync(root+'annie-tres-corazones.json',JSON.stringify(trio));
