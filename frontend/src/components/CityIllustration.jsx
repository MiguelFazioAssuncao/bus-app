import { Link } from "react-router-dom";
import { Icon } from "./ui.jsx";

// An illustration, never presented as a live map or a calculated route.
export default function CityIllustration() {
  return (
    <div className="city-map-card">
      <div className="map-card-heading">
        <span className="eyebrow">CADA CAMINHO, UMA DESCOBERTA</span>
        <h2>
          A cidade é sua.
          <br />
          Vá do seu jeito.
        </h2>
        <span className="map-city-badge">
          <span /> São Paulo
        </span>
      </div>
      <svg
        className="city-illustration"
        viewBox="0 0 620 480"
        role="img"
        aria-label="Ilustração de São Paulo com ruas e parques, sem escala geográfica"
      >
        <defs>
          <pattern
            id="city-blocks"
            width="100"
            height="82"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-26)"
          >
            <rect width="100" height="82" fill="#f2f1e9" />
            <rect x="9" y="9" width="36" height="27" rx="3" fill="#e5e6de" />
            <rect x="52" y="9" width="38" height="27" rx="3" fill="#e8e8e0" />
            <rect x="9" y="44" width="36" height="29" rx="3" fill="#e7e8df" />
            <rect x="52" y="44" width="38" height="29" rx="3" fill="#e3e5db" />
          </pattern>
          <filter id="map-shadow">
            <feDropShadow dx="0" dy="5" stdDeviation="6" floodOpacity=".12" />
          </filter>
        </defs>
        <rect width="620" height="480" fill="url(#city-blocks)" />
        <path
          d="M-10 330c120-80 150-90 165-160S255 46 255-20"
          fill="none"
          stroke="#d4e5e4"
          strokeWidth="24"
        />
        <path
          d="m416 258 42-19 30 4 25 40-6 79-40 24-37-7-30-60z"
          fill="#c8dcc0"
        />
        <path d="m446 269 33-13 20 27-6 63-30 19-29-40z" fill="#bcd3b5" />
        <path d="m83 405 36-44 83 25 8 37-49 31-66-17z" fill="#d0dfc5" />
        <g fill="none" stroke="#fffdf6" strokeWidth="14">
          <path d="M-20 100 640 415M-20 259 600-25M33 500 378-20M290 500 562-20M-20 420 620 118" />
          <path d="m-20 35 660 318" strokeWidth="9" />
        </g>
        <g fill="none" stroke="#ddd9ca" strokeWidth="1">
          <path d="M-20 100 640 415M-20 259 600-25M33 500 378-20M290 500 562-20M-20 420 620 118" />
        </g>
        <path
          d="m147 344 93-45 30-55 65-32 41 19 45-84"
          fill="none"
          stroke="#fff"
          strokeWidth="12"
          strokeLinejoin="round"
        />
        <path
          d="m147 344 93-45 30-55 65-32 41 19 45-84"
          fill="none"
          stroke="#ec8750"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g fontFamily="Arial,sans-serif" fill="#757b6e">
          <text x="110" y="265" fontSize="10" letterSpacing="2">
            BELA VISTA
          </text>
          <text x="419" y="110" fontSize="10" letterSpacing="2">
            CENTRO
          </text>
          <text
            x="439"
            y="315"
            fontSize="10"
            textAnchor="middle"
            transform="rotate(-65 439 315)"
          >
            ÁREA VERDE
          </text>
          <text x="200" y="387" fontSize="10" transform="rotate(-26 200 387)">
            AV. PAULISTA
          </text>
          <text x="323" y="412" fontSize="10" letterSpacing="2">
            JARDINS
          </text>
        </g>
        <g filter="url(#map-shadow)">
          <circle cx="147" cy="344" r="13" fill="#fff" />
          <circle cx="147" cy="344" r="6" fill="#202c45" />
          <g transform="translate(394 105)">
            <path
              d="M26 0a26 26 0 0 1 26 26c0 20-26 39-26 39S0 46 0 26A26 26 0 0 1 26 0Z"
              fill="#26324b"
            />
            <rect
              x="15"
              y="13"
              width="22"
              height="25"
              rx="5"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
            />
            <path d="M16 25h20M19 38v4M33 38v4" stroke="#fff" strokeWidth="2" />
            <circle cx="21" cy="32" r="1.5" fill="#ffa652" />
            <circle cx="31" cy="32" r="1.5" fill="#ffa652" />
          </g>
          <g transform="translate(262 187)">
            <rect width="110" height="43" rx="12" fill="#fff" />
            <circle cx="21" cy="21" r="10" fill="#fff0df" />
            <path d="m17 21 4-6 4 6-4 6z" fill="#d6773e" />
            <text
              x="40"
              y="26"
              fill="#29334b"
              fontFamily="Arial,sans-serif"
              fontSize="12"
              fontWeight="600"
            >
              Explore SP
            </text>
          </g>
        </g>
      </svg>
      <div className="map-card-footer">
        <span>
          <Icon name="map" size={15} /> Mapa ilustrativo · sem escala
        </span>
        <Link to="/stations" aria-label="Abrir mapa interativo">
          <Icon name="arrow-up-right" size={22} />
        </Link>
      </div>
    </div>
  );
}
