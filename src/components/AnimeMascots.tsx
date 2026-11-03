import React from 'react';

/**
 * Authentic Japanese manga/anime stamps, badges, and cartoon mascots for Fourth Down Lab.
 * Completely vector-based, responsive, and lightweight.
 */

interface MascotProps {
  className?: string;
  mood?: 'happy' | 'determined' | 'shocked' | 'intense';
}

/**
 * Chibi Blitz-kun (ブリッツ君) - The fiery shonen anime football mascot
 */
export const BlitzMascot: React.FC<MascotProps> = ({ className = 'h-16 w-16', mood = 'determined' }) => {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Blitz-kun Anime Mascot">
      <defs>
        <radialGradient id="auraGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="helmetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>
        <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#a5f3fc" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>

      {/* Energy Aura */}
      <circle cx="60" cy="60" r="56" fill="url(#auraGlow)" />

      {/* Lightning Sparks around head */}
      <path d="M15 45L22 48L18 55L28 50L22 62" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M102 42L95 46L98 52L90 48L94 60" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Football Helmet Body */}
      <circle cx="60" cy="58" r="38" fill="url(#helmetGrad)" stroke="#0c4a6e" strokeWidth="3" />

      {/* Helmet Center Racing Stripe */}
      <path d="M56 20C58 20 62 20 64 20L64 45L56 45Z" fill="url(#goldGrad)" />
      <path d="M54 20L55 45" stroke="#ffffff" strokeWidth="1.5" />
      <path d="M65 20L66 45" stroke="#ffffff" strokeWidth="1.5" />

      {/* Helmet Wing / Lightning Decal on Side */}
      <path d="M30 45L42 35L38 42L48 38L35 52" fill="#facc15" />

      {/* Anime Visor (Glowing Eye Shield) */}
      <path
        d="M32 50C32 46 88 46 88 50C88 64 82 72 60 72C38 72 32 64 32 50Z"
        fill="url(#visorGrad)"
        stroke="#0891b2"
        strokeWidth="2"
      />

      {/* Visor Reflection Sheen */}
      <path d="M38 52C42 49 52 49 56 52L52 64C48 62 42 62 38 64Z" fill="#ffffff" fillOpacity="0.6" />
      <circle cx="76" cy="54" r="3" fill="#ffffff" fillOpacity="0.8" />

      {/* Anime Glowing Eyes inside Visor */}
      {mood === 'intense' || mood === 'determined' ? (
        <g>
          <path d="M44 58L54 59" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <path d="M66 59L76 58" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        </g>
      ) : mood === 'happy' ? (
        <g>
          <path d="M44 60C46 56 52 56 54 60" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M66 60C68 56 74 56 76 60" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      ) : (
        <g>
          <circle cx="48" cy="58" r="4" fill="#ffffff" />
          <circle cx="72" cy="58" r="4" fill="#ffffff" />
        </g>
      )}

      {/* Facemask Grill (Metallic 3D bars) */}
      <path d="M40 70C40 85 80 85 80 70" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M45 74L45 92C45 94 75 94 75 92L75 74" stroke="#cbd5e1" strokeWidth="3.5" fill="none" />
      <path d="M53 78L53 93" stroke="#64748b" strokeWidth="2.5" />
      <path d="M60 78L60 93" stroke="#64748b" strokeWidth="2.5" />
      <path d="M67 78L67 93" stroke="#64748b" strokeWidth="2.5" />

      {/* Chin Strap */}
      <rect x="52" y="90" width="16" height="7" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />

      {/* Cute Anime Football in hands below */}
      <g transform="translate(42, 94) scale(0.6)">
        <ellipse cx="30" cy="20" rx="28" ry="18" fill="#92400e" stroke="#451a03" strokeWidth="3" />
        <path d="M12 12C16 17 16 23 12 28" stroke="#ffffff" strokeWidth="2.5" fill="none" />
        <path d="M48 12C44 17 44 23 48 28" stroke="#ffffff" strokeWidth="2.5" fill="none" />
        <line x1="20" y1="20" x2="40" y2="20" stroke="#ffffff" strokeWidth="3" />
        <line x1="25" y1="16" x2="25" y2="24" stroke="#ffffff" strokeWidth="2" />
        <line x1="30" y1="16" x2="30" y2="24" stroke="#ffffff" strokeWidth="2" />
        <line x1="35" y1="16" x2="35" y2="24" stroke="#ffffff" strokeWidth="2" />
      </g>
    </svg>
  );
};

/**
 * Sensei Zebra (審判ゼブラ先生) - Chibi anime referee with penalty flag
 */
export const RefereeMascot: React.FC<MascotProps> = ({ className = 'h-14 w-14' }) => {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Referee Anime Mascot">
      {/* Anime sweat drops of shock */}
      <path d="M78 22C78 22 84 28 82 32C80 36 74 34 74 30C74 26 78 22 78 22Z" fill="#38bdf8" />

      {/* Referee Cap with Whistle */}
      <ellipse cx="50" cy="38" rx="26" ry="18" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
      <path d="M26 38C26 38 48 30 74 38L78 42L22 42Z" fill="#020617" />
      <path d="M72 40L88 44L78 47Z" fill="#020617" />

      {/* Face */}
      <circle cx="50" cy="56" r="22" fill="#fed7aa" stroke="#ea580c" strokeWidth="1.5" />

      {/* Eyes - Wide Anime Expression */}
      <ellipse cx="42" cy="54" rx="4" ry="6" fill="#0f172a" />
      <ellipse cx="58" cy="54" rx="4" ry="6" fill="#0f172a" />
      <circle cx="43" cy="52" r="1.5" fill="#ffffff" />
      <circle cx="59" cy="52" r="1.5" fill="#ffffff" />

      {/* Blushing Anime Cheeks */}
      <ellipse cx="36" cy="62" rx="3" ry="1.5" fill="#f43f5e" fillOpacity="0.6" />
      <ellipse cx="64" cy="62" rx="3" ry="1.5" fill="#f43f5e" fillOpacity="0.6" />

      {/* Whistle in mouth */}
      <rect x="46" y="60" width="12" height="6" rx="2" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />
      <circle cx="58" cy="63" r="4" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />

      {/* Striped Shirt Collar */}
      <path d="M32 76C32 76 40 86 50 86C60 86 68 76 68 76L74 98L26 98Z" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
      <line x1="40" y1="78" x2="40" y2="98" stroke="#0f172a" strokeWidth="4" />
      <line x1="50" y1="86" x2="50" y2="98" stroke="#0f172a" strokeWidth="4" />
      <line x1="60" y1="78" x2="60" y2="98" stroke="#0f172a" strokeWidth="4" />

      {/* Yellow Penalty Flag in Hand */}
      <g transform="translate(64, 45) rotate(15)">
        <ellipse cx="14" cy="10" rx="8" ry="6" fill="#eab308" stroke="#a16207" strokeWidth="1.5" />
        <path d="M12 10C8 16 6 26 8 32C12 28 16 26 18 20Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
      </g>
    </svg>
  );
};

/**
 * Authentic Japanese Hanko / Manga Stamp (判子スタンプ)
 */
interface StampProps {
  kanji: string;
  subtext: string;
  variant?: 'hissho' | 'kekkoh' | 'teki' | 'haran' | 'teppeki';
  className?: string;
}

export const MangaStamp: React.FC<StampProps> = ({
  kanji,
  subtext,
  variant = 'hissho',
  className = '',
}) => {
  const colorMap = {
    hissho: 'border-amber-400 bg-amber-500/10 text-amber-300 shadow-amber-500/20',
    kekkoh: 'border-cyan-400 bg-cyan-500/10 text-cyan-300 shadow-cyan-500/20',
    teki: 'border-emerald-400 bg-emerald-500/10 text-emerald-300 shadow-emerald-500/20',
    haran: 'border-rose-400 bg-rose-500/10 text-rose-300 shadow-rose-500/20',
    teppeki: 'border-indigo-400 bg-indigo-500/10 text-indigo-300 shadow-indigo-500/20',
  };

  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded border-2 px-1.5 py-0.5 tracking-tighter uppercase font-black transform -rotate-1 select-none shadow-sm ${colorMap[variant]} ${className}`}
      style={{
        textShadow: '0 0 8px currentColor',
      }}
    >
      <span className="text-[13px] leading-tight font-extrabold">{kanji}</span>
      <span className="text-[8px] font-bold tracking-widest">{subtext}</span>
    </div>
  );
};

/**
 * Dynamic Manga Action Burst / Katakana Sound Effect (オノマトペ)
 */
export const MangaSoundEffect: React.FC<{ sound: string; english: string; className?: string }> = ({
  sound,
  english,
  className = 'text-amber-400',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 font-black italic tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${className}`}
    >
      <span className="text-base sm:text-lg animate-pulse">{sound}</span>
      <span className="text-[9px] uppercase tracking-wider not-italic text-slate-300 font-bold bg-slate-900/80 px-1 py-0.5 rounded border border-slate-700">
        {english}
      </span>
    </span>
  );
};
