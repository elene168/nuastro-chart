// nuastro-calc.js — all astrological calculations
// Depends on: nuastro-ephemeris.js (window.NuastroEph)

(function(global){
'use strict';

const D2R = Math.PI/180;
function n360(v){ return ((v%360)+360)%360; }

// ── IAU constellation boundaries (tropical J2000, validated) ─────────────────
const IAU = [
  {n:'Aries',      abbr:'Ari', lo:29.00,  hi:53.41},
  {n:'Taurus',     abbr:'Tau', lo:53.41,  hi:90.46},
  {n:'Gemini',     abbr:'Gem', lo:90.46,  hi:118.23},
  {n:'Cancer',     abbr:'Cnc', lo:118.23, hi:138.18},
  {n:'Leo',        abbr:'Leo', lo:138.18, hi:174.07},
  {n:'Virgo',      abbr:'Vir', lo:174.07, hi:217.84},
  {n:'Libra',      abbr:'Lib', lo:217.84, hi:241.03},
  {n:'Scorpio',    abbr:'Sco', lo:241.03, hi:247.74},
  {n:'Ophiuchus',  abbr:'Oph', lo:247.74, hi:266.55},
  {n:'Sagittarius',abbr:'Sgr', lo:266.55, hi:299.71},
  {n:'Capricorn',  abbr:'Cap', lo:299.71, hi:327.61},
  {n:'Aquarius',   abbr:'Aqr', lo:327.61, hi:351.65},
  {n:'Pisces',     abbr:'Psc', lo:351.65, hi:389.00},
];

// ── Tropical sign names ───────────────────────────────────────────────────────
const TROP_NAMES = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const TROP_ABBR  = ['Ari','Tau','Gem','Cnc','Leo','Vir',
  'Lib','Sco','Sgr','Cap','Aqr','Psc'];

// ── Fixed house wheel (arc sizes = IAU arc sizes in zodiac order, never change)
const FIXED_ARCS = [24.41,37.05,27.77,19.95,35.89,43.77,23.19,6.71,18.81,33.16,27.90,24.04,37.35];
const FIXED = FIXED_ARCS.map((arc,i)=>({h:i+1,arc}));
let _c=0; FIXED.forEach(h=>{h.start=_c; _c+=h.arc;});

// ── IAU helpers ───────────────────────────────────────────────────────────────
function iauIdx(lon){
  const l=n360(lon);
  for(let i=0;i<IAU.length;i++){
    const c=IAU[i], hi=c.hi>360?c.hi-360:c.hi;
    if(c.lo>hi){ if(l>=c.lo||l<hi) return i; }
    else        { if(l>=c.lo&&l<c.hi) return i; }
  }
  return 12;
}

function degInIAU(lon){
  const i=iauIdx(lon), c=IAU[i], l=n360(lon), hi=c.hi>360?c.hi-360:c.hi;
  return c.lo>hi ? (l>=c.lo ? l-c.lo : (360-c.lo)+l) : l-c.lo;
}

// ── Sign placement functions ──────────────────────────────────────────────────
function nuastroPlacement(lon){
  const i=iauIdx(lon), c=IAU[i];
  return { n:c.n, abbr:c.abbr, deg:degInIAU(lon), oph:c.n==='Ophiuchus' };
}

function tropicalPlacement(lon){
  const l=n360(lon), i=Math.floor(l/30);
  return { n:TROP_NAMES[i], abbr:TROP_ABBR[i], deg:l-i*30 };
}

function vedicPlacement(lon, ayan){
  const s=n360(lon-ayan), i=Math.floor(s/30);
  return { n:TROP_NAMES[i], abbr:TROP_ABBR[i], deg:s-i*30 };
}

// ── House number from ecliptic offset from ASC ────────────────────────────────
// wheelDeg = how far ahead of ASC in ecliptic degrees (0–360)
// Maps into the fixed house arcs to find house number
function houseNumber(lon, asc){
  const wDeg = n360(lon - asc);
  for(let i=0;i<13;i++){
    const next = i<12 ? FIXED[i+1].start : 360;
    if(wDeg >= FIXED[i].start && wDeg < next) return i+1;
  }
  return 13;
}

// ── Format degrees ────────────────────────────────────────────────────────────
function fmtDeg(d){
  d = Math.max(0, d);
  return String(Math.floor(d)).padStart(2,'0') + '°' +
         String(Math.floor((d%1)*60)).padStart(2,'0') + "'";
}

// ── Main calculation entry point ──────────────────────────────────────────────
function calculate(year, month, day, hour, min, utcOffset, lat, lng){
  const data = window.NuastroEph.calculate(year, month, day, hour, min, utcOffset, lat, lng);

  const asc  = data.asc;
  const mc   = data.mc;
  const ic   = n360(mc + 180);
  const dsc  = n360(asc + 180);
  const ayan = data.ayan;

  // Build planet placements
  const planets = {};
  for(const [id, p] of Object.entries(data.planets)){
    planets[id] = {
      lon:  p.lon,
      rx:   p.rx,
      nu:   nuastroPlacement(p.lon),
      trop: tropicalPlacement(p.lon),
      ved:  vedicPlacement(p.lon, ayan),
      house: houseNumber(p.lon, asc),
    };
  }

  // Build angle placements
  const angles = {
    asc: { lon:asc,  nu:nuastroPlacement(asc),  trop:tropicalPlacement(asc),  ved:vedicPlacement(asc,ayan),  house:1 },
    ic:  { lon:ic,   nu:nuastroPlacement(ic),   trop:tropicalPlacement(ic),   ved:vedicPlacement(ic,ayan),   house:houseNumber(ic,asc) },
    dsc: { lon:dsc,  nu:nuastroPlacement(dsc),  trop:tropicalPlacement(dsc),  ved:vedicPlacement(dsc,ayan),  house:houseNumber(dsc,asc) },
    mc:  { lon:mc,   nu:nuastroPlacement(mc),   trop:tropicalPlacement(mc),   ved:vedicPlacement(mc,ayan),   house:houseNumber(mc,asc) },
  };

  return { asc, mc, ic, dsc, ayan, planets, angles, raw:data };
}

// ── Exports ───────────────────────────────────────────────────────────────────
global.NuastroCalc = {
  IAU, FIXED, TROP_NAMES, TROP_ABBR,
  iauIdx, degInIAU,
  nuastroPlacement, tropicalPlacement, vedicPlacement,
  houseNumber, fmtDeg, calculate,
  n360,
};

})(window);
