'use client';

import { useState, useEffect } from 'react';

interface CountdownProps {
  targetDate: string;
  textColor?: string;
  bgColor?: string;
  accentColor?: string;
}

export default function Countdown({ targetDate, textColor = '#2C2519', bgColor = '#FAF7F2', accentColor = '#B8975A' }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculate = () => {
      const target = new Date(targetDate + 'T00:00:00').getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const units = [
    { value: timeLeft.days, label: 'DÍAS' },
    { value: timeLeft.hours, label: 'HRS' },
    { value: timeLeft.minutes, label: 'MIN' },
    { value: timeLeft.seconds, label: 'SEG' },
  ];

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      {units.map((unit, i) => (
        <div key={unit.label} className="flex items-center gap-3 sm:gap-4">
          <div className="countdown-card text-center">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center shadow-lg mb-1"
              style={{ backgroundColor: bgColor, border: `1px solid ${accentColor}30` }}
            >
              <span
                className="countdown-number text-2xl sm:text-3xl font-bold"
                style={{ color: textColor }}
              >
                {String(unit.value).padStart(2, '0')}
              </span>
            </div>
            <span className="text-xs font-medium tracking-wider" style={{ color: accentColor }}>
              {unit.label}
            </span>
          </div>
          {i < units.length - 1 && (
            <span className="text-xl font-bold mt-[-16px]" style={{ color: accentColor }}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}
