// Dad, drawn in SVG as a felt hand puppet. Classes on the parts are animated from styles.css.
export const DAD_SVG = `
<svg class="dad" viewBox="0 0 220 262" aria-hidden="true">
  <defs>
    <filter id="djg-felt" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="3" seed="7" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 -0.45 0.32" result="speckle"/>
      <feComposite in="speckle" in2="SourceGraphic" operator="in" result="fuzz"/>
      <feBlend in="SourceGraphic" in2="fuzz" mode="multiply"/>
    </filter>
    <radialGradient id="djg-skin" cx="50%" cy="38%" r="65%">
      <stop offset="0" stop-color="#fbdcbc"/>
      <stop offset=".7" stop-color="#f4c9a3"/>
      <stop offset="1" stop-color="#e3b18a"/>
    </radialGradient>
    <radialGradient id="djg-nose" cx="45%" cy="60%" r="60%">
      <stop offset="0" stop-color="#fad6b4"/>
      <stop offset=".75" stop-color="#ecbb93"/>
      <stop offset="1" stop-color="#d49e75"/>
    </radialGradient>
    <pattern id="djg-tie" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="#e5862a"/>
      <rect x="1" y="1" width="3" height="3" rx=".8" fill="#b4521b"/>
      <circle cx="2.5" cy="2.5" r=".7" fill="#f6c27a"/>
    </pattern>
  </defs>

  <g class="dad-body">
    <path d="M10 262 Q12 204 62 188 L110 204 L158 188 Q208 204 210 262 Z" fill="#1d1d22"/>
    <path d="M84 186 L110 240 L136 186 Z" fill="#c4d8f1"/>
    <path d="M86 186 L110 244 L94 252 L66 196 Z" fill="#2a2a31"/>
    <path d="M134 186 L110 244 L126 252 L154 196 Z" fill="#2a2a31"/>
    <g class="dad-tie">
      <path d="M103 200 L117 200 L114.5 213 L105.5 213 Z" fill="url(#djg-tie)"/>
      <path d="M105.5 213 L114.5 213 L120 246 L110 258 L100 246 Z" fill="url(#djg-tie)"/>
    </g>
    <circle cx="110" cy="236" r="2.5" fill="#111"/>
  </g>

  <g class="dad-head">
    <g filter="url(#djg-felt)">
      <circle cx="39" cy="108" r="16" fill="#efbf98"/>
      <circle cx="181" cy="108" r="16" fill="#efbf98"/>
      <circle cx="41" cy="109" r="8" fill="#d39c72"/>
      <circle cx="179" cy="109" r="8" fill="#d39c72"/>
      <path d="M110 6 C162 6 178 46 178 96 L178 136 C178 172 150 190 110 190 C70 190 42 172 42 136 L42 96 C42 46 58 6 110 6 Z" fill="url(#djg-skin)"/>
      <ellipse cx="48" cy="86" rx="5" ry="16" fill="#c7ab97" opacity=".45"/>
      <ellipse cx="172" cy="86" rx="5" ry="16" fill="#c7ab97" opacity=".45"/>
    </g>

    <g class="dad-brows">
      <path d="M66 72 Q85 59 103 70" stroke="#6e4b3a" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M117 70 Q135 59 154 72" stroke="#6e4b3a" stroke-width="9" fill="none" stroke-linecap="round"/>
    </g>

    <g class="dad-eye">
      <ellipse cx="86" cy="94" rx="17" ry="14" fill="#fff"/>
      <circle cx="88" cy="96" r="7.5" fill="#86461f"/>
      <circle cx="88" cy="96" r="3.8" fill="#111"/>
      <circle cx="90" cy="93.5" r="1.4" fill="#fff"/>
      <path d="M67 95 Q86 72 105 95 Q86 87 67 95 Z" fill="#f4c7a1"/>
      <path d="M68 94 Q86 87 104 94" stroke="#a8693f" stroke-width="2" fill="none"/>
    </g>
    <g class="dad-eye">
      <ellipse cx="134" cy="94" rx="17" ry="14" fill="#fff"/>
      <circle cx="136" cy="96" r="7.5" fill="#86461f"/>
      <circle cx="136" cy="96" r="3.8" fill="#111"/>
      <circle cx="138" cy="93.5" r="1.4" fill="#fff"/>
      <path d="M115 95 Q134 72 153 95 Q134 87 115 95 Z" fill="#f4c7a1"/>
      <path d="M116 94 Q134 87 152 94" stroke="#a8693f" stroke-width="2" fill="none"/>
    </g>

    <path class="dad-mouth" d="M60 141 Q110 152 160 141 Q152 186 110 188 Q68 186 60 141 Z" fill="#5b1515"/>
    <ellipse cx="120" cy="163" rx="24" ry="8" fill="#d07a78"/>

    <g class="dad-jaw" filter="url(#djg-felt)">
      <path d="M56 148 Q110 186 164 148 Q170 196 110 202 Q50 196 56 148 Z" fill="#f2c39d"/>
      <path d="M62 152 Q110 188 158 152" stroke="#8c3a2c" stroke-width="3" fill="none"/>
    </g>

    <g filter="url(#djg-felt)">
      <path d="M58 140 Q110 154 162 140 Q150 124 110 128 Q70 124 58 140 Z" fill="#f4c7a1"/>
      <ellipse cx="110" cy="134" rx="15" ry="5" fill="#cf9a72" opacity=".6"/>
      <path d="M102 84 C99 104 90 114 91 127 C92 144 128 144 129 127 C130 114 121 104 118 84 Z" fill="url(#djg-nose)" stroke="#d29a70" stroke-width="1.5"/>
      <ellipse cx="106" cy="122" rx="6" ry="4" fill="#fde3c8" opacity=".7"/>
    </g>
    <path d="M58 140 Q110 154 162 140" stroke="#8c3a2c" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="102" cy="134" rx="4" ry="2" fill="#b97c55"/>
    <ellipse cx="118" cy="134" rx="4" ry="2" fill="#b97c55"/>
  </g>

  <g class="dad-collar">
    <path d="M80 182 L110 204 L95 214 Z" fill="#d3e3f6" stroke="#9fb8d8" stroke-width="1.5"/>
    <path d="M140 182 L110 204 L125 214 Z" fill="#d3e3f6" stroke="#9fb8d8" stroke-width="1.5"/>
  </g>
</svg>`;
