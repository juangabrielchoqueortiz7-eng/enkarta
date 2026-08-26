/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpilar framer-motion evita el error recurrente en dev
  // "Cannot find module './vendor-chunks/motion-dom.js'" al recompilar.
  transpilePackages: ['framer-motion'],
  images: {
    // Las fotos las sube el cliente (Supabase Storage) o vienen de samples
    // externos; se permite cualquier host https y next/image las optimiza.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
