import React from 'react';

/** One optical size and stroke weight. Custom uploaded icons are never replaced. */
const paths: Record<string, React.ReactNode> = {
  church: <><path d="M4 21V11l8-6 8 6v10M2 21h20M12 2v5M10 4h4M9 21v-6a3 3 0 0 1 6 0v6" /><path d="M7 12h1m8 0h1" /></>,
  rings: <><circle cx="8" cy="14" r="6" /><circle cx="16" cy="14" r="6" /><path d="m10 4 2-2 2 2-2 3z" /></>,
  cheers: <><path d="m4 3 6 2-2 6a3 3 0 0 1-6-2l2-6Zm16 0-6 2 2 6a3 3 0 0 0 6-2l-2-6ZM5 13l-2 7m-2 0 5 1m13-8 2 7m-3 1 5-1M11 2l1 2 1-2" /></>,
  dinner: <><path d="M3 17a9 9 0 0 1 18 0H3Zm-1 3h20M12 8V5m-2 0h4" /></>,
  dance: <><circle cx="14" cy="4" r="2" /><path d="m7 7 6 2 4-2 4 3m-8-1-3 6 5 2 2 5m-7-7-5 3-2 4m4-15L4 3" /></>,
  party: <><path d="m3 21 4-12 8 8-12 4ZM7 9l8 8M13 4l-1 4m5-2 3-3m-1 9 3-1M9 3v1m12 4h1m-5 12v1" /><path d="m14 11 2-2" /></>,
  camera: <><path d="M3 6h5l2-3h4l2 3h5v15H3z" /><circle cx="12" cy="13" r="4" /></>,
  music: <><path d="M9 17V5l12-3v12M9 8l12-3" /><ellipse cx="6" cy="18" rx="3" ry="2" /><ellipse cx="18" cy="15" rx="3" ry="2" /></>,
  cake: <><path d="M4 21V11h16v10M2 21h20M8 11V7h8v4M12 7V4M4 15q2 3 4 0 2 3 4 0 2 3 4 0 2 3 4 0M12 4q-3-2 0-3 3 1 0 3Z" /></>,
  couple: <><circle cx="7" cy="10" r="3" /><circle cx="17" cy="10" r="3" /><path d="M2 22v-3a5 5 0 0 1 10 0v3m0-3a5 5 0 0 1 10 0v3M9 3q0-3 3-1 3-2 3 1l-3 3-3-3Z" /></>,
  gift: <><path d="M3 10h18v4H3zM5 14v7h14v-7M12 10v11" /><path d="M12 10C0 10 7-3 12 10Zm0 0C24 10 17-3 12 10Z" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 2v6m10-6v6M3 11h18m-14 4h2m3 0h2m3 0h1" /></>,
  location: <><path d="M19 9c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 14 0Z" /><circle cx="12" cy="9" r="2" /></>,
  flowers: <><path d="m7 11 5 11 5-11M8 18h8" /><circle cx="12" cy="8" r="3" /><path d="M9 6C3 0 0 9 7 11M15 6c6-6 9 3 2 5M10 5c-3-5 7-5 4 0" /></>,
  dress: <path d="M8 2h2l2 4 2-4h2l-1 7 6 12H3L9 9 8 2Zm1 7h6" />,
  dove: <path d="M2 14c5-1 7-5 7-10 6 0 6 6 6 6 3-5 7-2 7 1l-3 1c0 6-7 10-12 6l-5 3 2-6-2-1Z" />,
};

export function EditorialEventIcon({ name, color, className }: { name: string; color: string; className?: string }) {
  const drawing = paths[name];
  return drawing ? <svg viewBox="0 0 24 24" className={className} fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">{drawing}</svg> : null;
}

export const EDITORIAL_ICON_NAMES = Object.keys(paths);
