import type { Metadata } from 'next';
import Link from 'next/link';
import BrandByline from '@/components/brand/BrandByline';
import CommercialLink from '@/components/commercial/CommercialLink';
import CommercialTracker from '@/components/commercial/CommercialTracker';
import { PACKAGE_CATALOG, PACKAGE_ORDER } from '@/lib/packages';

export const metadata: Metadata = {
  title: 'Cómo contratar tu invitación',
  description: 'Reserva, entrega, revisiones, aprobación, pago y vigencia de las invitaciones digitales Enkarta.',
  alternates: { canonical: '/proceso' },
};

const journey = [
  { number: '01', title: 'Elige diseño y paquete', text: 'Indica el tipo de evento, la colección que te gusta y el paquete que necesitas. Te ayudamos a confirmar que el alcance sea adecuado.' },
  { number: '02', title: 'Recibe el resumen', text: 'Antes de pagar recibirás por escrito: paquete, precio total, adicionales, plazo, rondas de cambios y enlaces a las políticas aplicables.' },
  { number: '03', title: 'Reserva con 200 Bs', text: 'Te enviamos las instrucciones de pago. La reserva se descuenta del total y asegura un espacio en producción.' },
  { number: '04', title: 'Confirmamos tu pedido', text: 'Al verificar la reserva recibirás una referencia, el importe recibido, saldo pendiente, alcance y fecha estimada. Grupo JABA emitirá el documento comercial o fiscal correspondiente.' },
  { number: '05', title: 'Envía tus materiales', text: 'Comparte nombres, fecha, lugares, horarios, fotografías, música y textos. El plazo inicia el siguiente día hábil después de recibir la reserva y todo el material necesario.' },
  { number: '06', title: 'Revisa tu invitación', text: 'Recibes un enlace privado para ver el diseño real. Cada ronda reúne una lista consolidada de observaciones; corregir errores de Enkarta no consume rondas.' },
  { number: '07', title: 'Aprueba y paga el saldo', text: 'Cuando apruebes la versión final, cancelas el saldo. Luego hacemos la publicación, activamos accesos y realizamos la comprobación final.' },
  { number: '08', title: 'Comparte y recibe soporte', text: 'Entregamos el enlace y las instrucciones contratadas. El equipo Enkarta by Grupo JABA atiende el soporte por WhatsApp durante la vigencia del servicio.' },
];

const delivery: Record<(typeof PACKAGE_ORDER)[number], { first: string; rounds: number }> = {
  plus: { first: '3 días hábiles', rounds: 1 },
  premium: { first: '4 días hábiles', rounds: 2 },
  exclusive: { first: '5 días hábiles', rounds: 4 },
};

export default function ProcessPage() {
  return <main className="min-h-screen bg-[#f5f0e8] text-[#30291f]">
    <CommercialTracker event="process_view" placement="commercial_process" />
    <header className="border-b border-[#d9cdbb]/70 bg-[#fbf9f5]/95 px-5 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="leading-none" aria-label="Volver a Enkarta">
          <span className="font-cinzel text-xl tracking-[.12em] text-[#6e6048]">ENKARTA</span>
          <BrandByline tone="warm" className="mt-1.5" />
        </Link>
        <Link href="/#precios" className="rounded-full border border-[#cbbb9f] px-4 py-2 font-outfit text-xs font-semibold text-[#6e6048]">Ver paquetes</Link>
      </div>
    </header>

    <section className="relative overflow-hidden px-5 pb-16 pt-20 text-center sm:pb-20 sm:pt-24">
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-[#d8c096]/20 blur-3xl" />
      <div className="relative mx-auto max-w-4xl">
        <p className="font-outfit text-[10px] font-semibold uppercase tracking-[.28em] text-[#a48754]">Proceso comercial transparente</p>
        <h1 className="mt-5 font-playfair text-5xl leading-[1.05] sm:text-7xl">De la elección a una invitación lista para compartir</h1>
        <p className="mx-auto mt-6 max-w-2xl font-outfit text-base leading-7 text-[#716657]">Sin pagos confusos ni alcances implícitos. Cada pedido queda identificado por una referencia y un resumen escrito antes de iniciar.</p>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-5 pb-20">
      <div className="grid gap-4 md:grid-cols-2">
        {journey.map(item => <article key={item.number} className="rounded-[1.75rem] border border-[#ded2c1] bg-white p-6 shadow-[0_16px_50px_rgba(88,69,40,.06)] sm:p-8">
          <div className="flex items-start gap-5">
            <span className="font-playfair text-4xl text-[#c0a46d]">{item.number}</span>
            <div><h2 className="font-playfair text-2xl text-[#342d24]">{item.title}</h2><p className="mt-3 font-outfit text-sm leading-6 text-[#71685b]">{item.text}</p></div>
          </div>
        </article>)}
      </div>
    </section>

    <section className="bg-[#27231d] px-5 py-20 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl"><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.24em] text-[#d4b979]">Condiciones por paquete</p><h2 className="mt-3 font-playfair text-4xl sm:text-5xl">Sabes qué incluye antes de reservar</h2></div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PACKAGE_ORDER.slice().reverse().map(key => {
            const pkg = PACKAGE_CATALOG[key]; const terms = delivery[key];
            return <article key={key} className="flex flex-col rounded-[1.75rem] border border-white/10 bg-white/[.055] p-6">
              <div className="flex items-baseline justify-between gap-3"><h3 className="font-cinzel text-lg tracking-[.12em] text-[#e0c98f]">{pkg.label}</h3><span className="font-playfair text-2xl">{pkg.bs} Bs</span></div>
              <dl className="mt-6 space-y-3 border-t border-white/10 pt-5 font-outfit text-sm text-white/65">
                <div className="flex justify-between gap-4"><dt>Primera entrega</dt><dd className="text-right text-white">{terms.first}</dd></div>
                <div className="flex justify-between gap-4"><dt>Rondas incluidas</dt><dd className="text-right text-white">{terms.rounds}</dd></div>
                <div className="flex justify-between gap-4"><dt>En línea después del evento</dt><dd className="text-right text-white">{pkg.days} días</dd></div>
                <div className="flex justify-between gap-4"><dt>Reserva</dt><dd className="text-right text-white">200 Bs</dd></div>
              </dl>
              <CommercialLink packageKey={key} placement="process_package" className="mt-7 block rounded-full bg-[#b8975a] px-5 py-3 text-center font-outfit text-xs font-semibold text-white">Consultar {pkg.label}</CommercialLink>
            </article>;
          })}
        </div>
      </div>
    </section>

    <section className="mx-auto grid max-w-6xl gap-5 px-5 py-20 lg:grid-cols-3">
      <article className="rounded-3xl border border-[#ded2c1] bg-white p-7"><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.2em] text-[#a48754]">Cambios</p><h2 className="mt-3 font-playfair text-2xl">Una ronda es una lista</h2><p className="mt-3 font-outfit text-sm leading-6 text-[#71685b]">Agrupa tus observaciones para mantener el plazo. Cambiar de plantilla o reconstruir una estructura aprobada puede requerir una nueva cotización.</p></article>
      <article className="rounded-3xl border border-[#ded2c1] bg-white p-7"><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.2em] text-[#a48754]">Cancelaciones</p><h2 className="mt-3 font-playfair text-2xl">Dependen del avance real</h2><p className="mt-3 font-outfit text-sm leading-6 text-[#71685b]">Antes de iniciar se devuelve la reserva. Si ya existe trabajo, se informa qué parte fue ejecutada. Consulta la <Link href="/legal/pagos" className="font-semibold text-[#8b7348] underline">política completa</Link>.</p></article>
      <article className="rounded-3xl border border-[#ded2c1] bg-white p-7"><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.2em] text-[#a48754]">Soporte</p><h2 className="mt-3 font-playfair text-2xl">Un responsable identificable</h2><p className="mt-3 font-outfit text-sm leading-6 text-[#71685b]">El equipo Enkarta by Grupo JABA atiende por el WhatsApp comercial. La confirmación de pedido informa disponibilidad y responsable; la primera respuesta se entrega dentro del siguiente día hábil.</p></article>
    </section>

    <section className="px-5 pb-24 text-center"><div className="mx-auto max-w-3xl rounded-[2rem] bg-[#ebe0cf] px-6 py-12 sm:px-12"><h2 className="font-playfair text-4xl">¿Empezamos con tu evento?</h2><p className="mx-auto mt-4 max-w-xl font-outfit text-sm leading-6 text-[#6f6354]">El mensaje llevará una referencia para conservar el diseño, paquete y campaña que originaron tu consulta.</p><CommercialLink placement="process_final" className="mt-7 inline-flex rounded-full bg-[#806b48] px-7 py-3.5 font-outfit text-sm font-semibold text-white">Hablar con Enkarta</CommercialLink></div></section>
  </main>;
}
