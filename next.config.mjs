/** @type {import('next').NextConfig} */
const configuredImageHosts = (process.env.ENKARTA_IMAGE_HOSTS || '').split(',').map(host => host.trim()).filter(host => /^[a-z0-9.-]+$/i.test(host) && host.includes('.'));
let storageHost;
try { storageHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname; } catch { /* no storage configured */ }
const imageHosts = [...new Set(['images.unsplash.com', 'invitali.com', ...configuredImageHosts, ...(storageHost ? [storageHost] : [])])];
const nextConfig = {
  poweredByHeader: false,
  // Transpilar framer-motion evita el error recurrente en dev
  // "Cannot find module './vendor-chunks/motion-dom.js'" al recompilar.
  transpilePackages: ['framer-motion'],
  images: {
    // Existing archives stay local; remote optimization is restricted to known sources.
    remotePatterns: [...imageHosts.map(hostname => ({ protocol: 'https', hostname })),
      { protocol: 'https', hostname: 'api.qrserver.com', pathname: '/v1/create-qr-code/**' }],
    formats: ['image/webp'],
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
