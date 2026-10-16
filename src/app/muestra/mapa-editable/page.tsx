'use client';
import Link from 'next/link';

import {useState} from 'react';
import {mariaMarioDemo} from '@/lib/maria-mario';
import {DEFAULT_ROUTE} from '@/lib/travel-route';
import TravelRouteFields from '@/components/admin/builder/panels/TravelRouteFields';
import TravelMap from '@/components/invitations/TravelMap';
export default function Page(){const [data,setData]=useState(()=>{const d=mariaMarioDemo();d.config.travelRoute={...DEFAULT_ROUTE};return d;});return <main className="min-h-screen p-6 md:p-12" style={{background:'#f7f4ed',color:'#183a45'}}><Link href="/muestra/coleccion-limpia">← Ver los cinco modelos</Link><h1 className="text-4xl font-serif my-5">El viaje comienza aquí</h1><p className="mb-8">Cambia las ciudades y mira el recorrido. Esta demostración no guarda los cambios; el constructor sí los conserva al guardar la invitación.</p><div className="grid md:grid-cols-[360px_1fr] gap-8"><div className="bg-white p-4 rounded-2xl"><TravelRouteFields data={data} onChange={patch=>setData({...data,...patch})}/></div><div className="rounded-3xl p-5" style={{background:'linear-gradient(135deg,#dfeae2,#f8e8d3)',height:'min(65vh,650px)'}}><TravelMap route={data.config.travelRoute!}/></div></div></main>;}
