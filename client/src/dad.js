// Dad, drawn in SVG in an outlined cartoon style. Classes on the parts are animated from styles.css.
const INK = '#2a2420';
const line = `stroke="${INK}" stroke-linecap="round" stroke-linejoin="round"`;

export const DAD_SVG = `
<svg class="dad" viewBox="0 0 220 262" aria-hidden="true">
  <defs>
    <radialGradient id="djg-skin" cx="42%" cy="34%" r="70%">
      <stop offset="0" stop-color="#f5c7a2"/>
      <stop offset=".65" stop-color="#ebb48d"/>
      <stop offset="1" stop-color="#d69a74"/>
    </radialGradient>
    <pattern id="djg-tie" width="14" height="14" patternUnits="userSpaceOnUse">
      <rect width="14" height="14" fill="#d9822a"/>
      <path d="M2 7 C2 2 9 2 9 6 C9 9 5 9 5 7" stroke="#f4b64e" stroke-width="1.4" fill="none"/>
      <path d="M8 13 C10 10 14 11 13 14" stroke="#f4b64e" stroke-width="1.2" fill="none"/>
      <circle cx="12" cy="3" r="1" fill="#a9541c"/>
    </pattern>
    <clipPath id="djg-eye-l"><path d="M69 90 C75 76 97 76 103 90 C97 101 75 101 69 90 Z"/></clipPath>
    <clipPath id="djg-eye-r"><path d="M151 90 C145 76 123 76 117 90 C123 101 145 101 151 90 Z"/></clipPath>
  </defs>

  <g class="dad-body">
    <path d="M8 262 C10 220 30 200 70 190 L110 206 L150 190 C190 200 210 220 212 262 Z" fill="#2c2c30" ${line} stroke-width="2.5"/>
    <path d="M80 186 L110 250 L140 186 Z" fill="#a9c0e6" ${line} stroke-width="2"/>
    <path d="M86 160 L86 194 C98 202 122 202 134 194 L134 160 Z" fill="#d39570" ${line} stroke-width="2"/>
  </g>

  <g class="dad-head">
    <path d="M53 92 C40 84 32 96 36 110 C40 124 50 130 58 126 Z" fill="#e5a983" ${line} stroke-width="2.5"/>
    <path d="M48 100 C42 103 42 112 49 118" fill="none" ${line} stroke-width="1.5" opacity=".6"/>
    <path d="M167 92 C180 84 188 96 184 110 C180 124 170 130 162 126 Z" fill="#e5a983" ${line} stroke-width="2.5"/>
    <path d="M172 100 C178 103 178 112 171 118" fill="none" ${line} stroke-width="1.5" opacity=".6"/>

    <path d="M110 8 C150 8 170 38 170 82 C170 112 166 138 156 156 C146 174 130 186 110 186 C90 186 74 174 64 156 C54 138 50 112 50 82 C50 38 70 8 110 8 Z" fill="url(#djg-skin)" ${line} stroke-width="3"/>
    <ellipse cx="94" cy="36" rx="24" ry="12" fill="#fff" opacity=".22" transform="rotate(-15 94 36)"/>
    <path d="M96 52 C104 49 116 49 124 52" fill="none" ${line} stroke-width="1.2" opacity=".35"/>

    <path d="M66 140 C72 170 92 186 110 186 C128 186 148 170 154 140 C140 150 128 140 110 142 C92 140 80 150 66 140 Z" fill="#7d6a5f" opacity=".14"/>
    <ellipse cx="110" cy="145" rx="22" ry="5" fill="#7d6a5f" opacity=".08"/>

    <g class="dad-brows" fill="#4a3428">
      <path d="M68 73 C78 62 92 62 103 68 L101 74 C90 70 80 70 70 78 Z"/>
      <path d="M152 73 C142 62 128 62 117 68 L119 74 C130 70 140 70 150 78 Z"/>
    </g>

    <g class="dad-eye">
      <path d="M69 90 C75 76 97 76 103 90 C97 101 75 101 69 90 Z" fill="#fff"/>
      <g clip-path="url(#djg-eye-l)">
        <circle cx="87" cy="89" r="8.5" fill="#7b4320" stroke="${INK}" stroke-width="1"/>
        <circle cx="87" cy="89" r="4" fill="#140d0a"/>
        <circle cx="89.5" cy="86.5" r="1.7" fill="#fff"/>
      </g>
      <path d="M68 90 C75 75 97 75 104 89" fill="none" ${line} stroke-width="3.2"/>
      <path d="M71 93 C78 100 94 101 101 93" fill="none" ${line} stroke-width="1.2" opacity=".7"/>
    </g>
    <g class="dad-eye">
      <path d="M151 90 C145 76 123 76 117 90 C123 101 145 101 151 90 Z" fill="#fff"/>
      <g clip-path="url(#djg-eye-r)">
        <circle cx="133" cy="89" r="8.5" fill="#7b4320" stroke="${INK}" stroke-width="1"/>
        <circle cx="133" cy="89" r="4" fill="#140d0a"/>
        <circle cx="135.5" cy="86.5" r="1.7" fill="#fff"/>
      </g>
      <path d="M152 90 C145 75 123 75 116 89" fill="none" ${line} stroke-width="3.2"/>
      <path d="M149 93 C142 100 126 101 119 93" fill="none" ${line} stroke-width="1.2" opacity=".7"/>
    </g>
    <g class="dad-crinkle" fill="none" ${line} stroke-width="1.2">
      <path d="M75 101 C82 104 92 104 98 101"/><path d="M122 101 C128 104 138 104 145 101"/>
      <path d="M66 93 L61 91"/><path d="M66 97 L61 98"/>
      <path d="M154 93 L159 91"/><path d="M154 97 L159 98"/>
    </g>

    <path d="M105 92 C103 103 101 110 99 116" fill="none" ${line} stroke-width="1.4" opacity=".45"/>
    <path d="M98 114 C90 116 88 128 96 132 C100 136 120 136 124 132 C132 128 130 116 122 114 C118 104 102 104 98 114 Z" fill="#eeb48d"/>
    <ellipse cx="113" cy="120" rx="3" ry="4" fill="#fff" opacity=".6"/>
    <g fill="none" ${line} stroke-width="2.2">
      <path d="M97 119 C88 123 89 133 98 133"/>
      <path d="M123 119 C132 123 131 133 122 133"/>
      <path d="M102 134 C106 137 114 137 118 134"/>
    </g>
    <g fill="none" ${line} stroke-width="1.3" opacity=".45">
      <path d="M88 128 C82 138 84 147 88 152"/>
      <path d="M132 128 C138 138 136 147 132 151"/>
      <path d="M100 176 C106 179 114 179 120 176"/>
    </g>

    <g class="dad-mouth-smile">
      <path d="M98 157 C106 162 116 162 124 156" fill="none" stroke="#c9786a" stroke-width="3" stroke-linecap="round"/>
      <path d="M90 151 C100 159 120 159 132 149" fill="none" ${line} stroke-width="3"/>
      <path d="M88 149 L91 154" fill="none" ${line} stroke-width="1.6"/>
    </g>
    <g class="dad-mouth-open">
      <path d="M94 150 C102 147 120 147 128 150 C124 166 100 166 94 150 Z" fill="#5a1c1c" ${line} stroke-width="2.5"/>
      <ellipse cx="111" cy="159" rx="9" ry="3.5" fill="#d0716b"/>
    </g>
    <g class="dad-mouth-grin">
      <path d="M84 147 C100 152 122 152 138 145 C134 174 90 176 84 147 Z" fill="#5a1c1c" ${line} stroke-width="2.8"/>
      <path d="M88 149 C100 153 122 153 134 147 L133 154 C120 158 100 158 90 155 Z" fill="#fff"/>
      <ellipse cx="112" cy="165" rx="14" ry="5" fill="#d0716b"/>
    </g>
  </g>

  <g class="dad-tie">
    <path d="M102 202 L118 202 L115 217 L105 217 Z" fill="url(#djg-tie)" ${line} stroke-width="2"/>
    <path d="M105 217 L115 217 L124 252 L110 262 L96 252 Z" fill="url(#djg-tie)" ${line} stroke-width="2"/>
  </g>
  <g class="dad-collar" fill="#bcd0ef" ${line} stroke-width="2">
    <path d="M84 180 L109 204 L93 219 L77 194 Z"/>
    <path d="M136 180 L111 204 L127 219 L143 194 Z"/>
  </g>
  <g fill="#36363b" ${line} stroke-width="2.2">
    <path d="M80 188 L62 206 L74 214 L66 224 L100 262 L108 252 Z"/>
    <path d="M140 188 L158 206 L146 214 L154 224 L120 262 L112 252 Z"/>
  </g>
</svg>`;
