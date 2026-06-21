import React from 'react';

export default function Mascot({ width = 260, height = 260 }: { width?: number; height?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <style>{`
        .mascot * { transform-box: fill-box; }
        .ears { transform-origin: center; animation: bob 3s ease-in-out infinite; }
        .breathe { transform-origin: 110px 190px; animation: breathe 3s ease-in-out infinite; }
        .eyes { transform-origin: center; animation: blink 4.2s infinite; }
        .tl1 { transform-origin: left center; animation: type 3.4s ease-in-out infinite; }
        .tl2 { transform-origin: left center; animation: type 3.4s ease-in-out infinite; animation-delay: .4s; }
        @keyframes bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
        @keyframes breathe { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.022) } }
        @keyframes blink { 0%, 90%, 100% { transform: scaleY(1) } 94% { transform: scaleY(.08) } }
        @keyframes type { 0% { transform: scaleX(0) } 30% { transform: scaleX(1) } 82% { transform: scaleX(1) } 92% { transform: scaleX(0) } 100% { transform: scaleX(0) } }
      `}</style>
      <svg className="mascot" width={width} height={height} viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="abg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5566f0" />
            <stop offset="0.55" stopColor="#3730a3" />
            <stop offset="1" stopColor="#1e1b4b" />
          </linearGradient>
          <linearGradient id="apurp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c7b8fd" />
            <stop offset="1" stopColor="#9d7bf0" />
          </linearGradient>
          <clipPath id="asq"><rect x="0" y="0" width="220" height="220" rx="52" /></clipPath>
        </defs>
        <rect x="0" y="0" width="220" height="220" rx="52" fill="url(#abg)" />
        <g className="ears">
          <circle cx="72" cy="50" r="18" fill="url(#apurp)" />
          <circle cx="148" cy="50" r="18" fill="url(#apurp)" />
        </g>
        <g className="breathe">
          <rect x="44" y="60" width="132" height="130" rx="52" fill="url(#apurp)" />
          <ellipse cx="66" cy="131" rx="9" ry="6" fill="#fb7185" fillOpacity="0.5" />
          <ellipse cx="154" cy="131" rx="9" ry="6" fill="#fb7185" fillOpacity="0.5" />
          <g className="eyes">
            <ellipse cx="86" cy="106" rx="18" ry="20" fill="#ffffff" />
            <ellipse cx="134" cy="106" rx="18" ry="20" fill="#ffffff" />
            <circle cx="90" cy="110" r="10" fill="#241a40" />
            <circle cx="130" cy="110" r="10" fill="#241a40" />
            <circle cx="86" cy="106" r="3.5" fill="#ffffff" />
            <circle cx="126" cy="106" r="3.5" fill="#ffffff" />
          </g>
          <rect x="74" y="136" width="72" height="27" rx="9" fill="#161033" />
          <rect className="tl1" x="84" y="144" width="30" height="4.5" rx="2" fill="#facc15" />
          <rect className="tl2" x="84" y="153" width="44" height="4.5" rx="2" fill="#5eead4" />
        </g>
        <g clipPath="url(#asq)">
          <rect x="0" y="0" width="220" height="15" fill="#161033" />
          <rect x="0" y="205" width="220" height="15" fill="#161033" />
          <rect x="10" y="4" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="32" y="4" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="54" y="4" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="76" y="4" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="98" y="4" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="120" y="4" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="142" y="4" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="164" y="4" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="186" y="4" width="11" height="7" rx="2" fill="#c7b8fd" />
          <rect x="10" y="209" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="32" y="209" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="54" y="209" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="76" y="209" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="98" y="209" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="120" y="209" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="142" y="209" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="164" y="209" width="11" height="7" rx="2" fill="#c7b8fd" /><rect x="186" y="209" width="11" height="7" rx="2" fill="#c7b8fd" />
        </g>
      </svg>
    </div>
  );
}
