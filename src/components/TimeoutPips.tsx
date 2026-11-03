import React from 'react';

interface TimeoutPipsProps {
  timeouts: number; // 0 to 3
  teamAbbr: string;
  align?: 'left' | 'right';
  className?: string;
}

export const TimeoutPips: React.FC<TimeoutPipsProps> = ({
  timeouts,
  teamAbbr,
  align = 'left',
  className = '',
}) => {
  const safeTimeouts = Math.max(0, Math.min(3, Math.round(timeouts || 0)));

  return (
    <div
      className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''} ${className}`}
      title={`${teamAbbr}: ${safeTimeouts} of 3 timeouts remaining`}
      aria-label={`${teamAbbr} has ${safeTimeouts} timeouts remaining`}
    >
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-0.5">
        TO
      </span>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((idx) => {
          const isAvailable = idx < safeTimeouts;
          return (
            <span
              key={idx}
              className={`h-2 w-3 rounded-xs transition-all ${
                isAvailable
                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)] border border-amber-300/80'
                  : 'bg-slate-800 border border-slate-700/60 opacity-40'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
