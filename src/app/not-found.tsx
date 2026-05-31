import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-enkarta-cream flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-enkarta-gold/10 flex items-center justify-center">
          <span className="text-4xl">💌</span>
        </div>
        <h1 className="font-playfair text-3xl text-enkarta-dark mb-3">Invitación no encontrada</h1>
        <p className="text-gray-500 font-outfit mb-8">
          Lo sentimos, la invitación que buscas no existe o el enlace es incorrecto.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-enkarta-gold text-white rounded-xl font-outfit font-medium hover:bg-enkarta-gold/90 transition-all shadow-lg shadow-enkarta-gold/20"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
