// nuastro-chart.js — SVG chart rendering
// Depends on: nuastro-calc.js (window.NuastroCalc)

(function(global){
'use strict';

const D2R = Math.PI/180;
const C    = window.NuastroCalc;

function n360(v){ return ((v%360)+360)%360; }
function n180(v){ v=n360(v); return v>180?v-360:v; }

function draw(svgEl, result){
  svgEl.innerHTML = '';
  const cx=340, cy=340;
  // Radii — two independent rings
  const Ro=300,  // outer edge
        Rs=268,  // constellation belt outer (boundary spokes start here)
        Rm=240,  // constellation belt inner = house ring outer
        Rp=200,  // planet glyph radius
        Ri=215,  // inner house ring (between Rm and Rc)
        Rc=90,   // inner circle
        Rcore=50;

  const asc = result.asc;
  const mc  = result.mc;

  // ── SVG helpers ──────────────────────────────────────────────────────────────
  function ns(tag, attrs){
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for(const [k,v] of Object.entries(attrs)) e.setAttribute(k,v);
    return e;
  }

  // OUTER RING: ecliptic → SVG
  // ASC always at SVG 270° (9 o'clock). Ecliptic increases CCW → subtract.
  function e2svg(lon){ return n360(270 - (lon - asc)); }

  // INNER RING: fixed house wheel → SVG
  // H1 at 270°. Fixed arcs, CCW → subtract.
  function h2svg(wdeg){ return n360(270 - wdeg); }

  function pt(ang, r){
    const a = ang * D2R;
    return { x: cx + r*Math.sin(a), y: cy - r*Math.cos(a) };
  }

  function ln(x1,y1,x2,y2,stroke,sw,dash){
    const l = ns('line',{x1,y1,x2,y2,stroke,'stroke-width':sw});
    if(dash) l.setAttribute('stroke-dasharray', dash);
    return l;
  }

  function tx(text, x, y, opts={}){
    const {sz=11,fill='#111110',anchor='middle',font='Jost,sans-serif',wt='300'} = opts;
    const t = ns('text',{x,y,'text-anchor':anchor,'dominant-baseline':'central',
      fill,'font-size':sz,'font-family':font,'font-weight':wt});
    t.textContent = text;
    return t;
  }

  function circ(r, fill, stroke, sw){
    return ns('circle',{cx,cy,r,fill,stroke,'stroke-width':sw});
  }

  // ── Background ───────────────────────────────────────────────────────────────
  svgEl.appendChild(ns('rect',{x:0,y:0,width:680,height:680,fill:'#FFFFFF'}));
  svgEl.appendChild(circ(Ro,'#FFFFFF','#111110',1.8));

  // ── OUTER RING: constellation belt ───────────────────────────────────────────
  // Natural IAU arc sizes, rotates with ASC
  for(let i=0; i<C.IAU.length; i++){
    const c = C.IAU[i];
    const startSvg = e2svg(c.lo);
    const endHi    = c.hi > 360 ? c.hi - 360 : c.hi;
    const endSvg   = e2svg(endHi);

    // Boundary spoke from Ro down to Rm
    const p1=pt(startSvg,Ro), p2=pt(startSvg,Rm);
    svgEl.appendChild(ln(p1.x,p1.y,p2.x,p2.y,'#111110',0.9));

    // Ophiuchus subtle fill
    if(c.n === 'Ophiuchus'){
      const pO1=pt(startSvg,Ro), pO2=pt(endSvg,Ro);
      const pM1=pt(startSvg,Rm), pM2=pt(endSvg,Rm);
      const d=`M${pO1.x},${pO1.y} A${Ro},${Ro} 0 0,0 ${pO2.x},${pO2.y} L${pM2.x},${pM2.y} A${Rm},${Rm} 0 0,1 ${pM1.x},${pM1.y} Z`;
      svgEl.appendChild(ns('path',{d,fill:'#F0EDE6',opacity:'0.9'}));
    }

    // Constellation label at natural midpoint
    const midLon = c.n==='Pisces' ? n360((351.65+360+29.0)/2) : (c.lo+Math.min(c.hi,360))/2;
    const gp = pt(e2svg(n360(midLon)), (Ro+Rm)/2);
    svgEl.appendChild(tx(c.abbr, gp.x, gp.y,
      {sz:11, fill:'#111110', font:"'Cormorant Garamond',serif", wt:'600'}));
  }

  // Outer ring border
  svgEl.appendChild(circ(Rm,'none','#111110',1));

  // ── INNER RING: fixed house wheel ────────────────────────────────────────────
  // Never rotates — H1 always at 9 o'clock, fixed arc sizes
  for(let i=0; i<13; i++){
    const spokeAng = h2svg(C.FIXED[i].start);
    // Spoke from Rm to Rc
    const p1=pt(spokeAng,Rm), p2=pt(spokeAng,Rc);
    svgEl.appendChild(ln(p1.x,p1.y,p2.x,p2.y,'#BBBBBB',0.5));
    // House number at midpoint
    const midH = n360(C.FIXED[i].start + C.FIXED[i].arc/2);
    const hn = pt(h2svg(midH), (Rm+Rc)/2);
    svgEl.appendChild(tx(String(i+1), hn.x, hn.y,
      {sz:10, fill:'#CCCCCC', wt:'300'}));
  }

  // Inner circles
  svgEl.appendChild(circ(Rc,'none','#BBBBBB',0.7));
  svgEl.appendChild(circ(Rcore,'none','#BBBBBB',1));

  // ── FOUR AXIS LINES ───────────────────────────────────────────────────────────
  // ASC–DSC: always perfectly horizontal through center
  svgEl.appendChild(ln(cx-Ro, cy, cx+Ro, cy, '#111110', 1.5));

  // MC–IC: direct ecliptic mapping, always through center
  const mcSvg = e2svg(mc);
  const icSvg = e2svg(n360(mc+180));
  const mcPt  = pt(mcSvg, Ro);
  const icPt  = pt(icSvg, Ro);
  svgEl.appendChild(ln(mcPt.x, mcPt.y, icPt.x, icPt.y, '#111110', 1.5));

  // Labels — MC at top (smaller y), IC at bottom
  const lS = {sz:9, fill:'#888888', wt:'600', font:'Jost,sans-serif'};
  svgEl.appendChild(tx('ASC', cx-Ro-12, cy, {...lS, anchor:'end'}));
  svgEl.appendChild(tx('DSC', cx+Ro+12, cy, {...lS, anchor:'start'}));
  const topPt = mcPt.y <= icPt.y ? mcPt : icPt;
  const botPt = mcPt.y <= icPt.y ? icPt : mcPt;
  svgEl.appendChild(tx('MC', topPt.x, topPt.y-14, lS));
  svgEl.appendChild(tx('IC', botPt.x, botPt.y+14, lS));

  // ── ASPECT LINES ─────────────────────────────────────────────────────────────
  const aspIds = ['sun','moon','mercury','venus','mars'];
  for(let a=0; a<aspIds.length; a++){
    for(let b=a+1; b<aspIds.length; b++){
      const diff = Math.abs(n180(result.planets[aspIds[a]].lon - result.planets[aspIds[b]].lon));
      if([0,60,90,120,180].some(m=>Math.abs(diff-m)<8)){
        const pa = pt(e2svg(result.planets[aspIds[a]].lon), Rcore-6);
        const pb = pt(e2svg(result.planets[aspIds[b]].lon), Rcore-6);
        const l  = ln(pa.x,pa.y,pb.x,pb.y,'#CCCCCC',0.7);
        l.setAttribute('opacity','0.6');
        svgEl.appendChild(l);
      }
    }
  }

  // Center diamond
  const d=7;
  svgEl.appendChild(ns('polygon',{
    points:`${cx},${cy-d} ${cx+d},${cy} ${cx},${cy+d} ${cx-d},${cy}`,
    fill:'#999999'}));

  // ── PLANETS ───────────────────────────────────────────────────────────────────
  // Placed using e2svg — natural ecliptic position, preserves true arc sizes
  const PLANET_IDS = ['sun','moon','mercury','venus','mars','jupiter',
                      'saturn','uranus','neptune','pluto','chiron'];
  const PLANET_GLYPHS = {
    sun:'☉', moon:'☽', mercury:'☿', venus:'♀', mars:'♂',
    jupiter:'♃', saturn:'♄', uranus:'♅', neptune:'♆', pluto:'♇', chiron:'⚷'
  };

  const pl = PLANET_IDS.map(id=>({
    id,
    g: PLANET_GLYPHS[id],
    origA: e2svg(result.planets[id].lon),
    ang:   e2svg(result.planets[id].lon),
    rx:    result.planets[id].rx,
  }));

  pl.sort((a,b) => a.ang - b.ang);

  // Spread overlapping glyphs
  for(let iter=0; iter<12; iter++){
    for(let i=0; i<pl.length; i++){
      const j = (i+1) % pl.length;
      const diff = n180(pl[j].ang - pl[i].ang);
      const minSep = 13;
      if(Math.abs(diff) < minSep){
        const push = (minSep - Math.abs(diff))/2 + 0.4;
        if(diff >= 0){ pl[i].ang = n360(pl[i].ang-push); pl[j].ang = n360(pl[j].ang+push); }
        else         { pl[i].ang = n360(pl[i].ang+push); pl[j].ang = n360(pl[j].ang-push); }
      }
    }
  }

  for(const p of pl){
    // Tick at actual position
    const t1=pt(p.origA, Rm+1), t2=pt(p.origA, Rm-10);
    svgEl.appendChild(ln(t1.x,t1.y,t2.x,t2.y,'#AAAAAA',0.7));
    // Glyph at spread position
    const gp = pt(p.ang, Rp);
    svgEl.appendChild(tx(p.g, gp.x, gp.y,
      {sz:15, fill:'#111110', font:"'Cormorant Garamond',serif", wt:'400'}));
    if(p.rx) svgEl.appendChild(tx('℞', gp.x+11, gp.y-9,
      {sz:9, fill:'#A03030', wt:'400'}));
  }

  // ASC constellation label inside wheel near 9 o'clock
  const ascIAU = C.IAU[C.iauIdx(asc)];
  svgEl.appendChild(tx(ascIAU.abbr, pt(272, Rm-16).x, pt(272, Rm-16).y,
    {sz:10, fill:'#888888', font:"'Cormorant Garamond',serif", wt:'600'}));
}

global.NuastroChart = { draw };

})(window);
