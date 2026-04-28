// nuastro-chart.js — SVG chart rendering
// Depends on: nuastro-calc.js (window.NuastroCalc)
// Supports mode: 'nuastro' | 'tropical' | 'vedic'

(function(global){
'use strict';

const D2R = Math.PI/180;
// C is read lazily inside draw() to ensure nuastro-calc.js is loaded first
function n360(v){ return ((v%360)+360)%360; }
function n180(v){ v=n360(v); return v>180?v-360:v; }

// ── Tropical sign names ───────────────────────────────────────────────────────
const TROP12 = [
  {n:'Aries',abbr:'Ari'},{n:'Taurus',abbr:'Tau'},{n:'Gemini',abbr:'Gem'},
  {n:'Cancer',abbr:'Cnc'},{n:'Leo',abbr:'Leo'},{n:'Virgo',abbr:'Vir'},
  {n:'Libra',abbr:'Lib'},{n:'Scorpio',abbr:'Sco'},{n:'Sagittarius',abbr:'Sgr'},
  {n:'Capricorn',abbr:'Cap'},{n:'Aquarius',abbr:'Aqr'},{n:'Pisces',abbr:'Psc'},
];

function draw(svgEl, result, mode){
  const C = window.NuastroCalc; // read here, after all scripts loaded
  mode = mode || 'nuastro';
  svgEl.innerHTML = '';
  const cx=340, cy=340;
  const Ro=300, Rm=240, Rp=200, Rc=90, Rcore=50;

  const asc = result.asc;
  const mc  = result.mc;

  // For vedic: shift by ayanamsa
  const ascForWheel = mode==='vedic' ? n360(asc - result.ayan) : asc;
  const mcForWheel  = mode==='vedic' ? n360(mc  - result.ayan) : mc;

  // For tropical: the wheel rotates so ASC is at 9 o'clock (270° SVG)
  // e2svg(lon) = 270 - (lon - ascForWheel)
  // For tropical, we additionally need MC at exactly 12 o'clock (0° SVG)
  // MC is at 270 - (mc - asc) in SVG. For it to be at 0°:
  // 270 - (mc - asc) = 0  →  not generally true
  // So for tropical we accept ASC at 9 o'clock and draw MC/IC as a forced vertical line
  // The sign ring still rotates with ASC — which is correct tropical behaviour

  // ── SVG helpers ───────────────────────────────────────────────────────────────
  function ns(tag, attrs){
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for(const [k,v] of Object.entries(attrs)) e.setAttribute(k,v);
    return e;
  }
  // Ecliptic → SVG: ASC at 270° (9 o'clock), CCW
  function e2svg(lon){ return n360(270-(lon-ascForWheel)); }
  // Fixed house wheel → SVG
  function h2svg(w){ return n360(270-w); }

  function pt(a,r){ const rad=a*D2R; return{x:cx+r*Math.sin(rad),y:cy-r*Math.cos(rad)}; }
  function ln(x1,y1,x2,y2,s,w,dash){
    const l=ns('line',{x1,y1,x2,y2,stroke:s,'stroke-width':w});
    if(dash) l.setAttribute('stroke-dasharray',dash);
    return l;
  }
  function tx(t,x,y,opts={}){
    const{sz=11,fill='#111110',anchor='middle',font='Jost,sans-serif',wt='300'}=opts;
    const el=ns('text',{x,y,'text-anchor':anchor,'dominant-baseline':'central',
      fill,'font-size':sz,'font-family':font,'font-weight':wt});
    el.textContent=t; return el;
  }
  function circ(r,fill,stroke,sw){ return ns('circle',{cx,cy,r,fill,stroke,'stroke-width':sw}); }

  // Background
  svgEl.appendChild(ns('rect',{x:0,y:0,width:680,height:680,fill:'#FFFFFF'}));
  svgEl.appendChild(circ(Ro,'#FFFFFF','#111110',1.8));

  // ── OUTER SIGN RING ───────────────────────────────────────────────────────────
  if(mode === 'nuastro'){
    // 13 IAU constellations — natural arc sizes, rotates with ASC
    for(let i=0; i<C.IAU.length; i++){
      const c = C.IAU[i];
      const startSvg = e2svg(c.lo);
      const endHi    = c.hi>360 ? c.hi-360 : c.hi;
      const endSvg   = e2svg(endHi);
      // Boundary spoke Ro → Rm
      const p1=pt(startSvg,Ro), p2=pt(startSvg,Rm);
      svgEl.appendChild(ln(p1.x,p1.y,p2.x,p2.y,'#111110',0.9));
      // Ophiuchus fill
      if(c.n==='Ophiuchus'){
        const pO1=pt(startSvg,Ro),pO2=pt(endSvg,Ro);
        const pM1=pt(startSvg,Rm),pM2=pt(endSvg,Rm);
        const d=`M${pO1.x},${pO1.y} A${Ro},${Ro} 0 0,0 ${pO2.x},${pO2.y} L${pM2.x},${pM2.y} A${Rm},${Rm} 0 0,1 ${pM1.x},${pM1.y} Z`;
        svgEl.appendChild(ns('path',{d,fill:'#F0EDE6',opacity:'0.9'}));
      }
      // Label at natural midpoint
      const midLon = c.n==='Pisces' ? n360((351.65+360+29.0)/2) : (c.lo+Math.min(c.hi,360))/2;
      const gp=pt(e2svg(n360(midLon)),(Ro+Rm)/2);
      svgEl.appendChild(tx(c.abbr,gp.x,gp.y,{sz:11,fill:'#111110',font:"'Cormorant Garamond',serif",wt:'600'}));
    }
  } else {
    // 12 equal 30° signs — tropical or vedic
    // For vedic: signs start at sidereal Aries (asc shifted by ayanamsa already)
    for(let i=0; i<12; i++){
      const sigLon = i*30; // start of each sign in ecliptic (0=Aries for trop, sidereal for vedic)
      // Convert to tropical lon for placement
      const tropLon = mode==='vedic' ? n360(sigLon + result.ayan) : sigLon;
      const startSvg = e2svg(tropLon);
      const p1=pt(startSvg,Ro), p2=pt(startSvg,Rm);
      svgEl.appendChild(ln(p1.x,p1.y,p2.x,p2.y,'#111110',0.9));
      // Label at midpoint
      const midTrop = mode==='vedic' ? n360((i+0.5)*30 + result.ayan) : (i+0.5)*30;
      const gp=pt(e2svg(midTrop),(Ro+Rm)/2);
      svgEl.appendChild(tx(TROP12[i].abbr,gp.x,gp.y,
        {sz:11,fill:'#111110',font:"'Cormorant Garamond',serif",wt:'600'}));
    }
  }

  // Outer ring border
  svgEl.appendChild(circ(Rm,'none','#111110',1));

  // ── INNER HOUSE WHEEL ─────────────────────────────────────────────────────────
  if(mode === 'nuastro'){
    // Fixed unequal arcs (Nuastro system)
    for(let i=0; i<13; i++){
      const spokeAng = h2svg(C.FIXED[i].start);
      const p1=pt(spokeAng,Rm), p2=pt(spokeAng,Rc);
      svgEl.appendChild(ln(p1.x,p1.y,p2.x,p2.y,'#BBBBBB',0.5));
      const midH = n360(C.FIXED[i].start + C.FIXED[i].arc/2);
      const hn=pt(h2svg(midH),(Rm+Rc)/2);
      svgEl.appendChild(tx(String(i+1),hn.x,hn.y,{sz:10,fill:'#CCCCCC',wt:'300'}));
    }
  } else {
    // 12 equal 30° houses — Whole Sign system
    // H1 = ASC's sign, H2 = next sign, etc.
    // House boundaries align exactly with sign boundaries
    const ascSignStart = Math.floor(ascForWheel / 30) * 30; // start of ASC's sign
    for(let i=0; i<12; i++){
      // House boundary in ecliptic longitude
      const hBoundary = n360(ascSignStart + i*30);
      const spokeAng = e2svg(hBoundary);
      const p1=pt(spokeAng,Rm), p2=pt(spokeAng,Rc);
      svgEl.appendChild(ln(p1.x,p1.y,p2.x,p2.y,'#BBBBBB',0.5));
      // House number at midpoint of sign
      const midLon = n360(ascSignStart + i*30 + 15);
      const hn=pt(e2svg(midLon),(Rm+Rc)/2);
      svgEl.appendChild(tx(String(i+1),hn.x,hn.y,{sz:10,fill:'#CCCCCC',wt:'300'}));
    }
  }

  svgEl.appendChild(circ(Rc,'none','#BBBBBB',0.7));
  svgEl.appendChild(circ(Rcore,'none','#BBBBBB',1));

  // ── FOUR AXIS LINES ───────────────────────────────────────────────────────────
  // ASC–DSC: always perfectly horizontal through center
  svgEl.appendChild(ln(cx-Ro,cy,cx+Ro,cy,'#111110',1.5));

  const lS={sz:9,fill:'#888888',wt:'600',font:'Jost,sans-serif'};
  svgEl.appendChild(tx('ASC',cx-Ro-12,cy,{...lS,anchor:'end'}));
  svgEl.appendChild(tx('DSC',cx+Ro+12,cy,{...lS,anchor:'start'}));

  if(mode === 'tropical'){
    // Tropical whole-sign: MC/IC line points to actual MC degree on outer ring
    // but ASC/DSC are always horizontal. MC line passes through center.
    const mcSvgAng = e2svg(mcForWheel);
    const icSvgAng = n360(mcSvgAng+180);
    const mcPt2 = pt(mcSvgAng,Ro);
    const icPt2 = pt(icSvgAng,Ro);
    svgEl.appendChild(ln(mcPt2.x,mcPt2.y,icPt2.x,icPt2.y,'#111110',1.5));
    const topPt2 = mcPt2.y<=icPt2.y ? mcPt2 : icPt2;
    const botPt2 = mcPt2.y<=icPt2.y ? icPt2 : mcPt2;
    svgEl.appendChild(tx('MC',topPt2.x,topPt2.y-14,lS));
    svgEl.appendChild(tx('IC',botPt2.x,botPt2.y+14,lS));
  } else {
    // Nuastro: MC/IC at actual ecliptic position, guaranteed through center
    const mcSvgAng = e2svg(mcForWheel);
    const icSvgAng = n360(mcSvgAng+180);
    const mcPt = pt(mcSvgAng,Ro);
    const icPt = pt(icSvgAng,Ro);
    svgEl.appendChild(ln(mcPt.x,mcPt.y,icPt.x,icPt.y,'#111110',1.5));
    const topPt = mcPt.y<=icPt.y ? mcPt : icPt;
    const botPt = mcPt.y<=icPt.y ? icPt  : mcPt;
    svgEl.appendChild(tx('MC',topPt.x,topPt.y-14,lS));
    svgEl.appendChild(tx('IC',botPt.x,botPt.y+14,lS));
  }

  // ── ASPECT LINES ─────────────────────────────────────────────────────────────
  const aspIds=['sun','moon','mercury','venus','mars'];
  for(let a=0; a<aspIds.length; a++){
    for(let b=a+1; b<aspIds.length; b++){
      const diff=Math.abs(n180(result.planets[aspIds[a]].lon-result.planets[aspIds[b]].lon));
      if([0,60,90,120,180].some(m=>Math.abs(diff-m)<8)){
        const pa=pt(e2svg(result.planets[aspIds[a]].lon),Rcore-6);
        const pb=pt(e2svg(result.planets[aspIds[b]].lon),Rcore-6);
        const l=ln(pa.x,pa.y,pb.x,pb.y,'#CCCCCC',0.7);
        l.setAttribute('opacity','0.6'); svgEl.appendChild(l);
      }
    }
  }

  // Center diamond
  const d=7;
  svgEl.appendChild(ns('polygon',{
    points:`${cx},${cy-d} ${cx+d},${cy} ${cx},${cy+d} ${cx-d},${cy}`,fill:'#999999'}));

  // ── PLANETS ───────────────────────────────────────────────────────────────────
  const PLANET_IDS=['sun','moon','mercury','venus','mars','jupiter',
                    'saturn','uranus','neptune','pluto','chiron'];
  const PLANET_GLYPHS={sun:'☉',moon:'☽',mercury:'☿',venus:'♀',mars:'♂',
    jupiter:'♃',saturn:'♄',uranus:'♅',neptune:'♆',pluto:'♇',chiron:'⚷'};

  // For vedic/tropical: place planets at their respective sidereal/tropical positions
  function planetSvg(id){
    const lon = result.planets[id].lon;
    if(mode==='vedic'){
      // Sidereal lon for placement
      return e2svg(n360(lon - result.ayan));
    }
    return e2svg(lon);
  }

  const pl = PLANET_IDS.map(id=>({
    id, g:PLANET_GLYPHS[id],
    origA:planetSvg(id), ang:planetSvg(id),
    rx:result.planets[id].rx,
  }));
  pl.sort((a,b)=>a.ang-b.ang);
  for(let iter=0; iter<12; iter++){
    for(let i=0; i<pl.length; i++){
      const j=(i+1)%pl.length;
      const diff=n180(pl[j].ang-pl[i].ang);
      const minSep=13;
      if(Math.abs(diff)<minSep){
        const push=(minSep-Math.abs(diff))/2+0.4;
        if(diff>=0){pl[i].ang=n360(pl[i].ang-push);pl[j].ang=n360(pl[j].ang+push);}
        else{pl[i].ang=n360(pl[i].ang+push);pl[j].ang=n360(pl[j].ang-push);}
      }
    }
  }
  for(const p of pl){
    const t1=pt(p.origA,Rm+1),t2=pt(p.origA,Rm-10);
    svgEl.appendChild(ln(t1.x,t1.y,t2.x,t2.y,'#AAAAAA',0.7));
    const gp=pt(p.ang,Rp);
    svgEl.appendChild(tx(p.g,gp.x,gp.y,{sz:15,fill:'#111110',font:"'Cormorant Garamond',serif",wt:'400'}));
    if(p.rx) svgEl.appendChild(tx('℞',gp.x+11,gp.y-9,{sz:9,fill:'#A03030',wt:'400'}));
  }

  // ASC label inside wheel
  let ascLabel;
  if(mode==='nuastro')     ascLabel = C.IAU[C.iauIdx(asc)].abbr;
  else if(mode==='vedic')  ascLabel = TROP12[Math.floor(n360(asc-result.ayan)/30)].abbr;
  else                     ascLabel = TROP12[Math.floor(n360(asc)/30)].abbr;
  svgEl.appendChild(tx(ascLabel,pt(272,Rm-16).x,pt(272,Rm-16).y,
    {sz:10,fill:'#888888',font:"'Cormorant Garamond',serif",wt:'600'}));
}

global.NuastroChart = { draw };
})(window);
