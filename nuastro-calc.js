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

// ── Placidus house cusps ──────────────────────────────────────────────────────
// extAsc/extMc/extIc/extDsc: pass the ephemeris values so the 4 cardinal cusps
// are pinned to the same axes drawn on the chart (prevents axis/spoke drift).
function calcPlacidus(jd, lat, lng, extAsc, extMc, extIc, extDsc){
  const T=(jd-2451545)/36525;
  const GMST=n360(280.46061837+360.98564736629*(jd-2451545)+0.000387933*T*T);
  const RAMC=n360(GMST+lng);
  const e=(23.439291111-0.013004167*T)*Math.PI/180;
  const latR=lat*Math.PI/180;
  const D2R=Math.PI/180, R2D=180/Math.PI;

  // MC (used only as seed for the Placidus iteration)
  let mc=Math.atan2(Math.sin(RAMC*D2R),Math.cos(RAMC*D2R)*Math.cos(e))*R2D;
  if(mc<0)mc+=360;
  // ASC quadrant fix: ASC must be within 180° ahead of MC (same convention as ephemeris)
  const yA=-Math.cos(RAMC*D2R),xA=Math.sin(e)*Math.tan(latR)+Math.cos(e)*Math.sin(RAMC*D2R);
  let asc=Math.atan2(yA,xA)*R2D; if(asc<0)asc+=360;
  if(n360(asc-mc)>180) asc=n360(asc+180);

  function placCusp(fraction, fromIC){
    const base=fromIC?n360(RAMC+180):RAMC;
    let lon=n360(mc+(fromIC?180:0)+fraction*90);
    for(let i=0;i<100;i++){
      const prev=lon,lonR=lon*D2R;
      const dec=Math.asin(Math.sin(e)*Math.sin(lonR));
      const cosD=-Math.tan(latR)*Math.tan(dec);
      if(Math.abs(cosD)>1) break;
      const DSA=Math.acos(cosD)*R2D, NSA=180-DSA;
      const SA=fromIC?NSA:DSA;
      const RA=Math.atan2(Math.sin(lonR)*Math.cos(e),Math.cos(lonR))*R2D;
      const AD=Math.asin(Math.sin(dec)/Math.cos(dec)*Math.tan(latR))*R2D;
      const targetOX=fromIC?n360(base-fraction*SA):n360(base+fraction*SA);
      const targetRA=fromIC?n360(targetOX-AD):n360(targetOX+AD);
      lon=n360(Math.atan2(Math.sin(targetRA*D2R)/Math.cos(e),Math.cos(targetRA*D2R))*R2D);
      if(Math.abs(n360(lon-prev+180)-180)<0.0001) break;
    }
    return n360(lon);
  }

  const h11=placCusp(1/3,false), h12=placCusp(2/3,false);
  const h3=placCusp(1/3,true),   h2=placCusp(2/3,true);

  // Pin the 4 cardinal cusps to the ephemeris values so axis lines and spokes
  // are always perfectly aligned, regardless of minor GMST rounding differences.
  const useAsc = extAsc !== undefined ? extAsc : asc;
  const useMc  = extMc  !== undefined ? extMc  : mc;
  const useIc  = extIc  !== undefined ? extIc  : n360(mc+180);
  const useDsc = extDsc !== undefined ? extDsc : n360(asc+180);

  return [
    useAsc,        // H1  ASC
    h2,            // H2
    h3,            // H3
    useIc,         // H4  IC
    n360(h11+180), // H5
    n360(h12+180), // H6
    useDsc,        // H7  DSC
    n360(h2+180),  // H8
    n360(h3+180),  // H9
    useMc,         // H10 MC
    h11,           // H11
    h12,           // H12
  ];
}


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

  // Placidus house cusps (for tropical chart wheel)
  // Recalculate JD from the same inputs
  function jdate2(yr,mo,dy,hr){
    let y=yr,m=mo;
    if(m<=2){y--;m+=12}
    const A=Math.floor(y/100),B=2-A+Math.floor(A/4);
    return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+dy+hr/86400+B-1524.5;
  }
  const utHr=(hour+min/60-utcOffset)*3600; // seconds → pass hours
  const jdCalc=jdate2(year,month,day,hour+min/60-utcOffset);
  const placidus = (lat!==0||lng!==0) ? calcPlacidus(jdCalc, lat, lng, asc, mc, ic, dsc) : null;

  return { asc, mc, ic, dsc, ayan, planets, angles, placidus, raw:data };
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
