'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import type { Variants } from 'framer-motion';

// Fade & Slide up variant for scroll animations
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 35 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, ease: "easeOut" } 
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

export default function InvitaliReplicaPage() {
  const [opened, setOpened] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [envelopeFlapOpen, setEnvelopeFlapOpen] = useState(false);
  const [letterSlideOut, setLetterSlideOut] = useState(false);
  
  // Guest params
  const [guestName, setGuestName] = useState('Hugo Zaiduni y Familia');
  const [passes, setPasses] = useState(2);
  const [table, setTable] = useState('6');
  const [guestId, setGuestId] = useState('anpmOT');
  
  // RSVP Form State
  const [attendance, setAttendance] = useState<'Confirmado' | 'Rechazado' | ''>('');
  const [attendeeNames, setAttendeeNames] = useState<string[]>(['', '']);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Countdown State
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('n')) setGuestName(params.get('n')!);
      if (params.get('p')) {
        const pCount = parseInt(params.get('p')!, 10) || 1;
        setPasses(pCount);
        setAttendeeNames(Array(pCount).fill(''));
      }
      if (params.get('m')) setTable(params.get('m')!);
      if (params.get('id')) setGuestId(params.get('id')!);
    }
  }, []);

  useEffect(() => {
    const targetDate = new Date('2026-07-04T12:00:00');
    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60)
        });
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleOpenInvitation = () => {
    // Envelope opening sequence:
    // 1. Break wax seal & flip envelope flap
    setEnvelopeFlapOpen(true);
    // 2. Play music
    if (audioRef.current) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    // 3. Slide letter up & unveil main card
    setTimeout(() => {
      setLetterSlideOut(true);
    }, 600);
    setTimeout(() => {
      setOpened(true);
    }, 1400);
  };

  const handleSubmitRSVP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendance) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#1e2e1c] font-serif text-[#324D2F] antialiased selection:bg-[#B0A181] selection:text-white flex justify-center overflow-x-hidden">
      {/* Audio Element with exact song */}
      <audio
        ref={audioRef}
        src="https://invitali.com/wp-content/uploads/2026/02/One-Direction-Little-Things-OneDirectionVEVO.mp3"
        loop
        preload="auto"
      />

      {/* Floating Audio Controller */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={togglePlay}
          className="w-13 h-13 p-3.5 rounded-full bg-[#324D2F]/90 backdrop-blur-md text-[#B0A181] shadow-2xl border border-[#B0A181]/80 flex items-center justify-center hover:scale-110 active:scale-90 transition-all duration-300 group cursor-pointer"
          aria-label="Reproducir música"
        >
          {isPlaying ? (
            <span className="relative flex h-5 w-5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B0A181] opacity-75"></span>
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </span>
          ) : (
            <svg className="w-5 h-5 fill-current translate-x-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>
      </div>

      {/* REALISTIC 3D ENVELOPE OPENING GATE */}
      <AnimatePresence>
        {!opened && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.08, filter: "blur(8px)", transition: { duration: 0.9, ease: [0.4, 0, 0.2, 1] } }}
            className="fixed inset-0 z-[100] bg-[#223620] flex flex-col items-center justify-center p-4 text-center overflow-hidden"
            style={{
              backgroundImage: 'radial-gradient(circle at center, #2e472a 0%, #172415 100%)'
            }}
          >
            {/* Sparkling Gold Particles Background */}
            <div className="absolute inset-0 pointer-events-none opacity-30">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-[#B0A181] animate-ping"></div>
              <div className="absolute top-3/4 right-1/4 w-2 h-2 rounded-full bg-[#B0A181] animate-ping delay-300"></div>
              <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 rounded-full bg-[#fff] animate-pulse delay-500"></div>
            </div>

            {/* Envelope Card Container */}
            <div className="relative max-w-sm w-full perspective-1000">
              <motion.div
                initial={{ y: 40, opacity: 0, scale: 0.92 }}
                animate={{ y: letterSlideOut ? -80 : 0, opacity: letterSlideOut ? 0 : 1, scale: 1 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="w-full bg-[#FAF5EE] rounded-[32px] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.45)] border border-[#B0A181]/50 relative overflow-hidden flex flex-col items-center"
              >
                {/* Envelope Triangular Flap simulation */}
                <motion.div
                  animate={{ rotateX: envelopeFlapOpen ? 180 : 0 }}
                  transition={{ duration: 0.6 }}
                  className="w-full flex justify-center mb-3"
                >
                  <img
                    src="https://invitali.com/wp-content/uploads/2026/02/SELLO-NEGRO.webp"
                    alt="Sello de Cera Negro"
                    className="w-24 h-24 drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)] cursor-pointer hover:scale-105 transition-transform"
                    onClick={handleOpenInvitation}
                  />
                </motion.div>

                <p className="text-[11px] tracking-[0.35em] uppercase text-[#738271] font-sans font-bold mb-1">
                  Nuestra Boda
                </p>
                <h1 className="text-3xl sm:text-4xl font-serif text-[#324D2F] tracking-wide mb-1 font-normal">
                  Manuel &amp; Maya
                </h1>
                <p className="text-[11px] tracking-[0.3em] text-[#8C7A5B] uppercase font-sans mb-5">
                  · 04 . 07 . 26 ·
                </p>

                {/* Personalized Badge */}
                <div className="w-full bg-[#ede5d8]/70 rounded-2xl p-4 mb-6 border border-[#d8ccb8] shadow-inner">
                  <span className="text-[9px] text-[#738271] uppercase tracking-widest font-sans font-bold block mb-1">
                    Invitación Exclusiva Para
                  </span>
                  <p className="text-base font-serif font-bold text-[#324D2F]">{guestName}</p>
                  <div className="flex justify-center gap-4 text-xs text-[#8C7A5B] mt-1 font-sans font-medium">
                    <span>🎟️ Pases: <strong>{passes}</strong></span>
                    <span>🏷️ Mesa: <strong>{table}</strong></span>
                  </div>
                </div>

                {/* Open Button with Pulse Ripple */}
                <button
                  onClick={handleOpenInvitation}
                  className="w-full py-4 px-6 rounded-full bg-[#324D2F] text-[#FAF7F2] font-serif tracking-[0.25em] text-xs uppercase hover:bg-[#253a23] shadow-lg border border-[#B0A181] transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <span className="group-hover:tracking-[0.3em] transition-all">VER INVITACIÓN</span>
                  <span className="text-[#B0A181] text-sm group-hover:rotate-45 transition-transform">✦</span>
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN INVITATION FRAME (Mobile Max Width view like Invitali) */}
      <div className="w-full max-w-[480px] bg-[#FAF7F2] min-h-screen shadow-2xl relative border-x border-[#d8ccb8]/50 pb-20">
        
        {/* 1. HERO SECTION WITH FADE-IN */}
        <section className="relative min-h-[96vh] flex flex-col justify-between items-center text-center p-6 bg-cover bg-top overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(250,247,242,0.15) 0%, rgba(250,247,242,0.65) 70%, #FAF7F2 100%), url('https://invitali.com/wp-content/uploads/2026/02/Manuel-Maya2.webp')`
          }}
        >
          {/* Top Monogram */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="pt-8"
          >
            <span className="text-[13px] tracking-[0.45em] uppercase text-[#324D2F] font-sans font-bold">
              M &amp; M
            </span>
            <p className="text-[10px] tracking-[0.35em] uppercase text-[#8C7A5B] font-sans mt-0.5">
              · 04 . 07 . 26 ·
            </p>
          </motion.div>

          {/* Couple Announcement with Luxury Animations */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.5 }}
            className="my-auto py-10 w-full"
          >
            <p className="text-xs uppercase tracking-[0.35em] text-[#324D2F] font-sans font-medium mb-3">
              Tenemos el honor<br />de invitarte a nuestra boda
            </p>

            <h1 className="font-serif text-5xl sm:text-6xl text-[#324D2F] font-normal leading-tight">
              Manuel
              <span className="block text-3xl font-light italic text-[#8C7A5B] my-1">&amp;</span>
              Maya
            </h1>

            {/* Date Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="mt-6 inline-block bg-white/85 backdrop-blur-md border border-[#B0A181]/50 rounded-2xl px-7 py-3.5 shadow-md"
            >
              <span className="text-[11px] uppercase tracking-[0.3em] text-[#8C7A5B] block font-sans font-bold">JULIO</span>
              <span className="text-4xl font-bold font-serif text-[#324D2F] leading-none block my-1">04</span>
              <span className="text-[11px] uppercase tracking-[0.25em] text-[#324D2F] font-sans block font-medium">SÁBADO · 12:00 H · 2026</span>
            </motion.div>
          </motion.div>

          {/* Animated Scroll Arrow */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            className="pb-4 text-[#8C7A5B]"
          >
            <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        </section>

        {/* 2. BIBLE VERSE & PARENTS / GODPARENTS */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="px-6 py-14 text-center bg-[#FAF7F2] border-t border-[#E8DFD1]"
        >
          <div className="w-10 h-10 mx-auto mb-3 text-[#B0A181] flex items-center justify-center">
            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <p className="font-serif italic text-base text-[#324D2F] leading-relaxed max-w-xs mx-auto mb-3">
            &ldquo;Dios nos unió con propósito y caminaremos juntos por la eternidad…&rdquo;
          </p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#8C7A5B] font-sans font-bold mb-8">
            1 Corintios 13:4-7
          </p>

          <div className="w-16 h-[1.5px] bg-[#B0A181] mx-auto mb-8 opacity-60"></div>

          <p className="text-xs uppercase tracking-[0.3em] text-[#324D2F] font-sans font-medium mb-1">
            Con la bendición de Dios
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-[#8C7A5B] font-sans font-bold mb-8">
            y de nuestros padres:
          </p>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-5 max-w-xs mx-auto text-sm"
          >
            {/* Padres de la Novia */}
            <motion.div variants={fadeUp} className="bg-white/80 rounded-2xl p-4 border border-[#E8DFD1] shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7A5B] font-sans font-bold block mb-1">
                Padres de la Novia
              </span>
              <p className="font-serif text-[#324D2F] font-semibold">Hugo Zaiduni Salazar</p>
              <p className="font-serif text-[#324D2F] font-semibold">Silvia Peña de Zaiduni</p>
            </motion.div>

            {/* Padres del Novio */}
            <motion.div variants={fadeUp} className="bg-white/80 rounded-2xl p-4 border border-[#E8DFD1] shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7A5B] font-sans font-bold block mb-1">
                Padres del Novio
              </span>
              <p className="font-serif text-[#324D2F] font-semibold">René Mollinedo Noriega</p>
              <p className="font-serif text-[#324D2F] font-semibold">Judith Zeballos de Mollinedo</p>
            </motion.div>

            {/* Padrinos Religiosos */}
            <motion.div variants={fadeUp} className="bg-white/80 rounded-2xl p-4 border border-[#E8DFD1] shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7A5B] font-sans font-bold block mb-1">
                Padrinos Religioso
              </span>
              <p className="font-serif text-[#324D2F] font-semibold">Hugo Zaiduni Salazar</p>
              <p className="font-serif text-[#324D2F] font-semibold">Silvia Peña de Zaiduni</p>
            </motion.div>

            {/* Madrina Civil */}
            <motion.div variants={fadeUp} className="bg-white/80 rounded-2xl p-4 border border-[#E8DFD1] shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7A5B] font-sans font-bold block mb-1">
                Madrina Civil
              </span>
              <p className="font-serif text-[#324D2F] font-semibold">Claudia Mollinedo Zeballos</p>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* 3. GUEST PASS BADGE WITH EMERALD THEME */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="px-6 py-12 bg-[#324D2F] text-[#FAF7F2] text-center relative overflow-hidden"
        >
          {/* Subtle floral pattern overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#B0A181] font-sans font-bold mb-1">
            Pase Personalizado
          </p>
          <h3 className="font-serif text-2xl font-normal text-white mb-5">{guestName}</h3>
          
          <div className="flex justify-center gap-6 text-sm relative z-10">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20 shadow-md">
              <span className="text-[10px] uppercase tracking-widest text-[#B0A181] block font-sans">Pases</span>
              <span className="text-2xl font-serif font-bold text-white">{passes}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20 shadow-md">
              <span className="text-[10px] uppercase tracking-widest text-[#B0A181] block font-sans">Mesa</span>
              <span className="text-2xl font-serif font-bold text-white">{table}</span>
            </div>
          </div>
        </motion.section>

        {/* 4. COUNTDOWN TIMER */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-14 px-6 text-center bg-[#FAF7F2]"
        >
          <p className="text-[11px] uppercase tracking-[0.35em] text-[#8C7A5B] font-sans font-bold mb-1">
            Faltan
          </p>
          <h2 className="font-serif text-3xl text-[#324D2F] mb-7 font-normal">Cuenta Regresiva</h2>

          <div className="grid grid-cols-4 gap-2.5 max-w-xs mx-auto">
            {[
              { val: timeLeft.days, label: 'DÍAS' },
              { val: timeLeft.hours, label: 'HORAS' },
              { val: timeLeft.minutes, label: 'MIN' },
              { val: timeLeft.seconds, label: 'SEG' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-2xl p-3.5 border border-[#E8DFD1] shadow-sm"
              >
                <div className="font-serif text-2xl sm:text-3xl font-bold text-[#324D2F]">
                  {String(item.val).padStart(2, '0')}
                </div>
                <div className="text-[8px] uppercase tracking-widest text-[#8C7A5B] font-sans font-bold mt-1">
                  {item.label}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8">
            <a
              href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Boda+de+Manuel+y+Maya&dates=20260704T120000Z/20260704T230000Z&details=Acompa%C3%B1anos+a+celebrar+nuestra+boda.&location=Catedral+Castrense,+La+Paz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-[#324D2F] text-[#324D2F] text-[11px] uppercase tracking-[0.2em] font-sans font-bold hover:bg-[#324D2F] hover:text-white transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Agendar en Google Calendar
            </a>
          </div>
        </motion.section>

        {/* 5. LOCATIONS WITH REAL PHOTO CARDS */}
        <motion.section
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-14 px-6 bg-[#FAF7F2] border-t border-[#E8DFD1]"
        >
          <div className="space-y-10 max-w-sm mx-auto">
            
            {/* Ceremonia Religiosa */}
            <motion.div variants={fadeUp} className="bg-white rounded-3xl p-6 text-center border border-[#E8DFD1] shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="overflow-hidden rounded-2xl mb-4">
                <img
                  src="https://invitali.com/wp-content/uploads/2026/03/catedral-castrense-la-paz-copia.webp"
                  alt="Catedral Castrense"
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#8C7A5B] font-sans font-bold block mb-1">
                La Ceremonia Religiosa
              </span>
              <h3 className="font-serif text-2xl text-[#324D2F] font-normal mb-1">Catedral Castrense</h3>
              <p className="text-sm font-sans font-bold text-[#8C7A5B] mb-1">12:00 h</p>
              <p className="text-xs text-neutral-500 mb-5 font-sans">Av. Los Sauces, La Paz, Bolivia</p>
              
              <div className="flex gap-2.5 justify-center">
                <a
                  href="https://maps.google.com/?q=Catedral+Castrense+La+Paz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-[#324D2F] text-white rounded-xl text-[11px] uppercase tracking-wider font-sans font-bold hover:bg-[#253a23] transition-colors shadow-sm"
                >
                  Google Maps
                </a>
                <a
                  href="https://waze.com/ul?q=Catedral+Castrense+La+Paz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-[#E8DFD1] text-[#324D2F] rounded-xl text-[11px] uppercase tracking-wider font-sans font-bold hover:bg-[#d8ccb8] transition-colors"
                >
                  Waze
                </a>
              </div>
            </motion.div>

            {/* Recepción Social */}
            <motion.div variants={fadeUp} className="bg-white rounded-3xl p-6 text-center border border-[#E8DFD1] shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="overflow-hidden rounded-2xl mb-4">
                <img
                  src="https://invitali.com/wp-content/uploads/2026/02/Manuel-Maya13.webp"
                  alt="Mirador 360"
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#8C7A5B] font-sans font-bold block mb-1">
                Recepción Social
              </span>
              <h3 className="font-serif text-2xl text-[#324D2F] font-normal mb-1">Mirador 360</h3>
              <p className="text-sm font-sans font-bold text-[#8C7A5B] mb-1">15:00 h</p>
              <p className="text-xs text-neutral-500 mb-5 font-sans">Av. Principal, Calacoto</p>

              <div className="flex gap-2.5 justify-center">
                <a
                  href="https://maps.google.com/?q=Mirador+360+La+Paz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-[#324D2F] text-white rounded-xl text-[11px] uppercase tracking-wider font-sans font-bold hover:bg-[#253a23] transition-colors shadow-sm"
                >
                  Google Maps
                </a>
                <a
                  href="https://waze.com/ul?q=Mirador+360+La+Paz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-[#E8DFD1] text-[#324D2F] rounded-xl text-[11px] uppercase tracking-wider font-sans font-bold hover:bg-[#d8ccb8] transition-colors"
                >
                  Waze
                </a>
              </div>
            </motion.div>

          </div>
        </motion.section>

        {/* 6. TIMELINE / ITINERARIO INTERACTIVO */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-14 px-6 bg-[#324D2F] text-[#FAF7F2]"
        >
          <div className="text-center mb-8">
            <span className="text-[10px] uppercase tracking-[0.35em] text-[#B0A181] font-sans font-bold block mb-1">
              Programa
            </span>
            <h2 className="font-serif text-3xl font-normal text-white">Itinerario</h2>
          </div>

          <div className="space-y-3.5 max-w-xs mx-auto">
            {[
              { time: '12:00 H', title: 'Ceremonia Religiosa', icon: '⛪' },
              { time: '15:00 H', title: 'Recepción y Cocktail', icon: '🍸' },
              { time: '15:30 H', title: 'Vals y Brindis', icon: '🥂' },
              { time: '16:00 H', title: 'Almuerzo', icon: '🍽️' },
              { time: '17:30 H', title: 'Apertura de Pista', icon: '💃' },
              { time: '19:00 H', title: 'Apertura de Bar', icon: '🍹' },
              { time: '21:00 H', title: 'Torta', icon: '🎂' },
              { time: '23:00 H', title: 'Fin de la Fiesta', icon: '✨' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                whileHover={{ x: 6 }}
                className="flex items-center gap-4 bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10 transition-transform"
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1 text-left">
                  <span className="text-xs font-serif font-bold text-[#B0A181] block">{item.time}</span>
                  <span className="text-xs font-sans text-white uppercase tracking-wider">{item.title}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-xs italic text-center text-[#E8DFD1]/80 max-w-xs mx-auto mt-7 leading-relaxed">
            La fiesta comenzará puntualmente, y queremos que disfrutes con nosotros de cada detalle. ¡Te agradeceríamos que llegues a tiempo!
          </p>
        </motion.section>

        {/* 7. DRESS CODE (GALA) */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-14 px-6 text-center bg-[#FAF7F2] border-t border-[#E8DFD1]"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#8C7A5B] font-sans font-bold block mb-1">
            Código de Vestimenta
          </span>
          <h2 className="font-serif text-3xl text-[#324D2F] font-normal mb-2">Gala</h2>
          <p className="text-xs text-neutral-600 max-w-xs mx-auto mb-7 font-sans leading-relaxed">
            Colores reservados exclusivamente para damas de honor (bridesmaids) y caballeros de honor (groomsmen).
          </p>

          <div className="flex justify-center gap-5 max-w-xs mx-auto">
            <motion.div whileHover={{ scale: 1.1 }} className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#1b263b] mx-auto shadow-md border-2 border-white"></div>
              <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-sans mt-1.5 block font-bold">Bridesmaids</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#324D2F] mx-auto shadow-md border-2 border-white"></div>
              <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-sans mt-1.5 block font-bold">Groomsmen</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#B0A181] mx-auto shadow-md border-2 border-white"></div>
              <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-sans mt-1.5 block font-bold">Dorado</span>
            </motion.div>
          </div>
        </motion.section>

        {/* 8. GIFT SUGGESTION (TRANSFERENCIA QR) */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-14 px-6 text-center bg-[#FAF7F2] border-t border-[#E8DFD1]"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#8C7A5B] font-sans font-bold block mb-1">
            Sugerencia de Regalo
          </span>
          <h2 className="font-serif text-3xl text-[#324D2F] font-normal mb-3">Lluvia de Sobres / QR</h2>
          <p className="text-xs text-neutral-600 max-w-xs mx-auto mb-6 font-sans leading-relaxed">
            Su presencia y sus buenos deseos son un regalo invaluable para nuestra historia. Si consideran realizar un presente les damos nuestra mejor opción:
          </p>

          <div className="bg-white rounded-3xl p-6 border border-[#E8DFD1] shadow-md max-w-xs mx-auto text-center">
            <img
              src="https://invitali.com/wp-content/uploads/2026/03/Qr-Manuel-Maya.webp"
              alt="QR Transferencia Manuel y Maya"
              className="w-48 h-48 mx-auto rounded-2xl object-contain shadow-inner"
            />
            <p className="text-xs font-serif font-bold text-[#324D2F] mt-3">TRANSFERENCIA QR</p>
            <p className="text-[11px] text-neutral-500 font-sans">Manuel Mollinedo / Maya Zaiduni</p>
          </div>
        </motion.section>

        {/* 9. ADULTS ONLY BADGE */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-12 px-6 text-center bg-[#324D2F] text-[#FAF7F2]"
        >
          <span className="text-3xl block mb-2">🥂</span>
          <h3 className="font-serif text-2xl font-normal text-white mb-2">Solo Adultos</h3>
          <p className="text-xs italic text-[#E8DFD1] max-w-xs mx-auto leading-relaxed">
            Amamos a sus niños y queremos que ustedes disfruten y bailen sin parar, es por ello que la invitación es solo para adultos.
          </p>
        </motion.section>

        {/* 10. PHOTO GALLERY CAROUSEL */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-14 bg-[#FAF7F2] border-t border-[#E8DFD1]"
        >
          <div className="text-center mb-6 px-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#8C7A5B] font-sans font-bold block mb-1">
              Recuerdos
            </span>
            <h2 className="font-serif text-3xl text-[#324D2F] font-normal">Galería de Fotos</h2>
          </div>

          <div className="flex gap-3.5 overflow-x-auto px-6 pb-4 snap-x no-scrollbar">
            <img
              src="https://invitali.com/wp-content/uploads/2026/02/Manuel-Maya2.webp"
              alt="Manuel y Maya 2"
              className="w-60 h-84 rounded-3xl object-cover snap-center flex-shrink-0 shadow-lg hover:scale-[1.02] transition-transform duration-300"
            />
            <img
              src="https://invitali.com/wp-content/uploads/2026/02/Manuel-Maya11.webp"
              alt="Manuel y Maya 11"
              className="w-60 h-84 rounded-3xl object-cover snap-center flex-shrink-0 shadow-lg hover:scale-[1.02] transition-transform duration-300"
            />
            <img
              src="https://invitali.com/wp-content/uploads/2026/02/Manuel-Maya13.webp"
              alt="Manuel y Maya 13"
              className="w-60 h-84 rounded-3xl object-cover snap-center flex-shrink-0 shadow-lg hover:scale-[1.02] transition-transform duration-300"
            />
            <img
              src="https://invitali.com/wp-content/uploads/2026/02/Manuel-Maya6.webp"
              alt="Manuel y Maya 6"
              className="w-60 h-84 rounded-3xl object-cover snap-center flex-shrink-0 shadow-lg hover:scale-[1.02] transition-transform duration-300"
            />
            <img
              src="https://invitali.com/wp-content/uploads/2026/02/Manuel-Maya12.webp"
              alt="Manuel y Maya 12"
              className="w-60 h-84 rounded-3xl object-cover snap-center flex-shrink-0 shadow-lg hover:scale-[1.02] transition-transform duration-300"
            />
          </div>
        </motion.section>

        {/* 11. RSVP FORM SECTION */}
        <motion.section
          id="rsvp"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-14 px-6 bg-[#FAF7F2] border-t border-[#E8DFD1]"
        >
          <div className="text-center mb-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#8C7A5B] font-sans font-bold block mb-1">
              Confirmar Asistencia
            </span>
            <h2 className="font-serif text-3xl text-[#324D2F] font-normal">RSVP</h2>
            <p className="text-xs text-neutral-600 mt-2 font-sans">
              Por favor confirma antes del <strong className="text-[#324D2F]">10 de Junio</strong>
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFD1] shadow-xl max-w-sm mx-auto">
            {/* Header info */}
            <div className="border-b border-[#E8DFD1] pb-4 mb-5 text-center">
              <span className="text-[9px] uppercase tracking-widest text-[#8C7A5B] font-sans font-bold block mb-1">Invitación Para</span>
              <p className="font-serif text-xl text-[#324D2F] font-semibold">{guestName}</p>
              <div className="flex justify-center gap-4 text-xs text-[#8C7A5B] mt-1.5 font-sans font-medium">
                <span>Pases: <strong>{passes}</strong></span>
                <span>Mesa: <strong>{table}</strong></span>
              </div>
            </div>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4 space-y-4"
              >
                <div className="w-14 h-14 bg-[#324D2F] text-white rounded-full flex items-center justify-center mx-auto text-xl shadow-md">
                  ✓
                </div>
                <h4 className="font-serif text-2xl text-[#324D2F]">
                  {attendance === 'Confirmado' ? '¡Confirmación enviada!' : 'Respuesta Registrada'}
                </h4>
                <p className="text-xs text-neutral-500 font-sans">
                  {attendance === 'Confirmado'
                    ? 'Nos alegra mucho que nos acompañes en este día tan especial.'
                    : 'Lamentamos que no puedas acompañarnos, te tendremos presente.'}
                </p>

                {attendance === 'Confirmado' && (
                  <div className="p-5 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD1] mt-4">
                    <p className="text-xs font-sans font-bold text-[#324D2F] mb-2 uppercase tracking-wider">Tu Código QR de Acceso</p>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=INVITALI-${guestId}`}
                      alt="Pase QR"
                      className="w-36 h-36 mx-auto rounded-xl shadow-sm border-2 border-white"
                    />
                    <p className="text-[10px] text-neutral-400 font-mono mt-2 font-bold">Pase ID: #{guestId}</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <form onSubmit={handleSubmitRSVP} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[#324D2F] mb-2">
                    ¿Asistirás?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAttendance('Confirmado')}
                      className={`py-3 px-4 rounded-xl border text-xs font-sans uppercase tracking-wider font-bold transition-all cursor-pointer ${
                        attendance === 'Confirmado'
                          ? 'bg-[#324D2F] text-white border-[#324D2F] shadow-md'
                          : 'bg-[#FAF7F2] border-[#E8DFD1] text-[#324D2F] hover:bg-[#ede5d8]'
                      }`}
                    >
                      ¡Sí! ✨
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendance('Rechazado')}
                      className={`py-3 px-4 rounded-xl border text-xs font-sans uppercase tracking-wider font-bold transition-all cursor-pointer ${
                        attendance === 'Rechazado'
                          ? 'bg-neutral-700 text-white border-neutral-700 shadow-md'
                          : 'bg-[#FAF7F2] border-[#E8DFD1] text-[#324D2F] hover:bg-[#ede5d8]'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {attendance === 'Confirmado' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-2"
                  >
                    <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[#324D2F]">
                      Introduce los nombres completos:
                    </label>
                    {attendeeNames.map((name, idx) => (
                      <input
                        key={idx}
                        type="text"
                        placeholder={idx === 0 ? 'Ingresa tu nombre completo' : `Acompañante ${idx}`}
                        value={name}
                        onChange={(e) => {
                          const updated = [...attendeeNames];
                          updated[idx] = e.target.value;
                          setAttendeeNames(updated);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] text-xs font-sans focus:outline-none focus:border-[#324D2F] focus:bg-white transition-all"
                        required={idx === 0}
                      />
                    ))}
                  </motion.div>
                )}

                <div>
                  <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[#324D2F] mb-1">
                    Escríbenos un mensaje:
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Nos encantará leer tus felicitaciones o buenos deseos..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] text-xs font-sans focus:outline-none focus:border-[#324D2F] focus:bg-white transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!attendance || isSubmitting}
                  className={`w-full py-4 rounded-xl font-sans text-xs uppercase tracking-widest font-bold transition-all cursor-pointer ${
                    !attendance || isSubmitting
                      ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                      : 'bg-[#324D2F] text-white hover:bg-[#253a23] shadow-lg active:scale-98'
                  }`}
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Confirmación ✦'}
                </button>
              </form>
            )}
          </div>
        </motion.section>

        {/* 12. FINAL FOOTER & BRANDING */}
        <footer className="py-14 px-6 text-center bg-[#324D2F] text-[#FAF7F2]">
          <p className="text-xs uppercase tracking-[0.3em] text-[#B0A181] font-sans font-bold mb-1">
            Con todo nuestro amor
          </p>
          <h3 className="font-serif text-3xl text-white font-normal mb-1">Manuel &amp; Maya</h3>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#E8DFD1] font-sans mb-8">
            04 . 07 . 2026
          </p>

          <div className="pt-6 border-t border-white/10 text-[11px] text-[#E8DFD1]">
            <p>¿Deseas una invitación para tu evento?</p>
            <a
              href="https://wa.link/ywq8q7"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#B0A181] font-bold underline mt-1 inline-block"
            >
              Contáctanos
            </a>
          </div>
        </footer>

      </div>
    </div>
  );
}
