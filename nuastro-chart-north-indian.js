// nuastro-chart-north-indian.js — North Indian Vedic chart rendering
// Depends on: nuastro-calc.js (window.NuastroCalc)

(function(global){
'use strict';

const D2R = Math.PI/180;

function n360(v){ return ((v%360)+360)%360; }

// North Indian chart layout:
// Fixed diamond grid, ASC always at top-left (house 1)
// Houses go clockwise: 1(top-left), 2(top), 3(top-right),
// 4(right), 5(bottom-right), 6(bottom), 7(bottom-left),
// 8(left), 9(top-left inner), 10(top inner), 11(top-right inner), 12(left inner)
// Actually the standard North Indian layout:
// Top-left triangle = H1 (ASC)
// Top triangle = H2
// Top-right triangle = H3
// Right triangle = H4
// Bottom-right triangle = H5
// Bottom triangle = H6
// Bottom-left triangle = H7 (DSC)
// Left triangle = H8
// Center-top-left = H12
// Center-top = H11
// Center-top-right = H10 (MC)
// Center-right = H9
// Center-bottom-right = H (continues...)
// Standard North Indian house positions (clockwise from ASC at top-left):
// Outer ring (triangles): H1(top-left), H2(top), H3(top-right), H4(right),
//   H5(bottom-right), H6(bottom), H7(bottom-left), H8(left)
// Inner ring (diamonds): H12(top-left), H11(top), H10(top-right),
//   H9(right), ... going clockwise

function draw(svgEl, result){
  const C = window.NuastroCalc;
  svgEl.innerHTML = '';
  const S = 480; // square size
  const ox = (680 - S) / 2; // center horizontally
  const oy = 20;
  const cx = ox + S/2;
  const cy = oy + S/2;
  const H = S; // half size
  const h = S/2; // half
  const q = S/4; // quarter

  // Ayanamsa shift for sidereal positions
  const ayan = result.ayan;
  const asc = n360(result.asc - ayan); // sidereal ASC
  const ascSign = Math.floor(asc / 30); // 0=Aries ... 11=Pisces

  const SIGN_NAMES = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
    'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const SIGN_ABBR = ['Ari','Tau','Gem','Cnc','Leo','Vir',
    'Lib','Sco','Sgr','Cap','Aqr','Psc'];

  function ns(tag, attrs){
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for(const [k,v] of Object.entries(attrs)) e.setAttribute(k,v);
    return e;
  }
  function tx(text, x, y, opts={}){
    const{sz=11,fill='#111110',anchor='middle',font='Jost,sans-serif',wt='300'}=opts;
    const t = ns('text',{x,y,'text-anchor':anchor,'dominant-baseline':'central',
      fill,'font-size':sz,'font-family':font,'font-weight':wt});
    t.textContent = text; return t;
  }

  // North Indian house grid — 12 house cells defined by polygon points
  // Grid is a 4x4 square with corner triangles and inner diamond cells
  // Coordinates relative to top-left of grid (ox, oy)
  // S = total size, q = S/4, h = S/2, tq = 3*S/4

  const tq = S * 3/4;

  // Each house: {points: polygon, labelX, labelY, houseNum}
  // House 1 = ASC sign, going clockwise
  const HOUSES = [
    // H1: top-left outer triangle
    { pts:`${ox},${oy} ${ox+h},${oy} ${ox+q},${oy+q}`, lx:ox+q*0.7, ly:oy+q*0.45 },
    // H2: top outer triangle
    { pts:`${ox+h},${oy} ${ox+S},${oy} ${ox+h+q},${oy+q} ${ox+q},${oy+q}`, lx:ox+h, ly:oy+q*0.55 },
    // H3: top-right outer triangle
    { pts:`${ox+S},${oy} ${ox+S},${oy+h} ${ox+tq},${oy+q}`, lx:ox+tq+q*0.3, ly:oy+q*0.45 },
    // H4: right outer triangle
    { pts:`${ox+S},${oy+h} ${ox+S},${oy+S} ${ox+tq},${oy+h+q} ${ox+tq},${oy+q}`, lx:ox+tq+q*0.55, ly:oy+h },
    // H5: bottom-right outer triangle
    { pts:`${ox+S},${oy+S} ${ox+h},${oy+S} ${ox+tq},${oy+tq}`, lx:ox+tq+q*0.3, ly:oy+tq+q*0.55 },
    // H6: bottom outer triangle
    { pts:`${ox+h},${oy+S} ${ox},${oy+S} ${ox+q},${oy+tq} ${ox+h+q},${oy+tq}`, lx:ox+h, ly:oy+tq+q*0.45 },
    // H7: bottom-left outer triangle
    { pts:`${ox},${oy+S} ${ox},${oy+h} ${ox+q},${oy+tq}`, lx:ox+q*0.7, ly:oy+tq+q*0.55 },
    // H8: left outer triangle
    { pts:`${ox},${oy+h} ${ox},${oy} ${ox+q},${oy+q} ${ox+q},${oy+tq}`, lx:ox+q*0.45, ly:oy+h },
    // H9: center-bottom-right diamond
    { pts:`${ox+h},${oy+S} ${ox+tq},${oy+tq} ${ox+h},${oy+h} ${ox+q},${oy+tq}`, lx:ox+h+q*0.3, ly:oy+h+q*0.55 },
    // H10: center-right diamond  (MC)
    { pts:`${ox+S},${oy+h} ${ox+tq},${oy+tq} ${ox+h},${oy+h} ${ox+tq},${oy+q}`, lx:ox+h+q*0.55, ly:oy+h },
    // H11: center-top-right diamond
    { pts:`${ox+h},${oy} ${ox+tq},${oy+q} ${ox+h},${oy+h} ${ox+q},${oy+q}`, lx:ox+h+q*0.3, ly:oy+h-q*0.55 },
    // H12: center-top-left diamond  — wait, let me fix the layout

    // Actually standard North Indian:
    // Inner diamond split into 4 triangles meeting at center
    // H9=bottom, H10=right, H11=top, H12=left of inner diamond
  ];

  // Redefined properly:
  // Outer 8 triangles + inner 4 triangles = 12 houses
  const HOUSE_CELLS = [
    // H1: top-left outer
    { pts:[ox,oy, ox+h,oy, ox+q,oy+q], lx:ox+q*0.8, ly:oy+q*0.5 },
    // H2: top outer (trapezoid)
    { pts:[ox+h,oy, ox+S,oy, ox+tq,oy+q, ox+q,oy+q], lx:ox+h, ly:oy+q*0.5 },
    // H3: top-right outer
    { pts:[ox+S,oy, ox+S,oy+h, ox+tq,oy+q], lx:ox+tq+q*0.35, ly:oy+q*0.5 },
    // H4: right outer (trapezoid)
    { pts:[ox+S,oy+h, ox+S,oy+S, ox+tq,oy+tq, ox+tq,oy+q], lx:ox+tq+q*0.55, ly:oy+h },
    // H5: bottom-right outer
    { pts:[ox+S,oy+S, ox+h,oy+S, ox+tq,oy+tq], lx:ox+tq+q*0.35, ly:oy+tq+q*0.5 },
    // H6: bottom outer (trapezoid)
    { pts:[ox+h,oy+S, ox,oy+S, ox+q,oy+tq, ox+tq,oy+tq], lx:ox+h, ly:oy+tq+q*0.5 },
    // H7: bottom-left outer
    { pts:[ox,oy+S, ox,oy+h, ox+q,oy+tq], lx:ox+q*0.65, ly:oy+tq+q*0.5 },
    // H8: left outer (trapezoid)
    { pts:[ox,oy+h, ox,oy, ox+q,oy+q, ox+q,oy+tq], lx:ox+q*0.45, ly:oy+h },
    // H9: inner-bottom triangle
    { pts:[ox+q,oy+tq, ox+tq,oy+tq, ox+h,oy+h], lx:ox+h, ly:oy+h+q*0.5 },
    // H10: inner-right triangle (MC)
    { pts:[ox+tq,oy+q, ox+tq,oy+tq, ox+h,oy+h], lx:ox+h+q*0.5, ly:oy+h },
    // H11: inner-top triangle
    { pts:[ox+q,oy+q, ox+tq,oy+q, ox+h,oy+h], lx:ox+h, ly:oy+h-q*0.5 },
    // H12: inner-left triangle
    { pts:[ox+q,oy+q, ox+q,oy+tq, ox+h,oy+h], lx:ox+h-q*0.5, ly:oy+h },
  ];

  // Draw background
  svgEl.appendChild(ns('rect',{x:0,y:0,width:680,height:S+oy*2+20,fill:'#FFFFFF'}));
  // Outer square
  svgEl.appendChild(ns('rect',{x:ox,y:oy,width:S,height:S,fill:'none',stroke:'#111110','stroke-width':1.5}));
  // Inner diamond lines
  svgEl.appendChild(ns('line',{x1:ox+q,y1:oy+q,x2:ox+tq,y2:oy+q,stroke:'#111110','stroke-width':1}));
  svgEl.appendChild(ns('line',{x1:ox+tq,y1:oy+q,x2:ox+tq,y2:oy+tq,stroke:'#111110','stroke-width':1}));
  svgEl.appendChild(ns('line',{x1:ox+tq,y1:oy+tq,x2:ox+q,y2:oy+tq,stroke:'#111110','stroke-width':1}));
  svgEl.appendChild(ns('line',{x1:ox+q,y1:oy+tq,x2:ox+q,y2:oy+q,stroke:'#111110','stroke-width':1}));
  // Diagonal lines corner to corner
  svgEl.appendChild(ns('line',{x1:ox,y1:oy,x2:ox+S,y2:oy+S,stroke:'#111110','stroke-width':1}));
  svgEl.appendChild(ns('line',{x1:ox+S,y1:oy,x2:ox,y2:oy+S,stroke:'#111110','stroke-width':1}));
  // Inner diagonals
  svgEl.appendChild(ns('line',{x1:ox+q,y1:oy+q,x2:ox+h,y2:oy+h,stroke:'#111110','stroke-width':0.5}));
  svgEl.appendChild(ns('line',{x1:ox+tq,y1:oy+q,x2:ox+h,y2:oy+h,stroke:'#111110','stroke-width':0.5}));
  svgEl.appendChild(ns('line',{x1:ox+tq,y1:oy+tq,x2:ox+h,y2:oy+h,stroke:'#111110','stroke-width':0.5}));
  svgEl.appendChild(ns('line',{x1:ox+q,y1:oy+tq,x2:ox+h,y2:oy+h,stroke:'#111110','stroke-width':0.5}));

  // Planet glyphs
  const PLANET_IDS=['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron'];
  const PLANET_GLYPHS={sun:'☉',moon:'☽',mercury:'☿',venus:'♀',mars:'♂',
    jupiter:'♃',saturn:'♄',uranus:'♅',neptune:'♆',pluto:'♇',chiron:'⚷'};

  // Group planets by house (sidereal)
  const houseGroups = {};
  for(let i=0;i<12;i++) houseGroups[i]=[];

  // Angles
  const angles = [
    {label:'ASC', lon:result.asc},
    {label:'MC',  lon:result.mc},
  ];

  for(const id of PLANET_IDS){
    const lon = result.planets[id].lon;
    const sidLon = n360(lon - ayan);
    const signIdx = Math.floor(sidLon / 30); // 0-11
    // House relative to ASC sign
    const houseIdx = (signIdx - ascSign + 12) % 12;
    houseGroups[houseIdx].push({
      glyph: PLANET_GLYPHS[id],
      rx: result.planets[id].rx,
      deg: (sidLon % 30).toFixed(0),
    });
  }

  // Draw each house cell
  for(let i=0;i<12;i++){
    const cell = HOUSE_CELLS[i];
    const signIdx = (ascSign + i) % 12;
    const houseNum = i + 1;

    // Sign name at label position
    svgEl.appendChild(tx(SIGN_ABBR[signIdx], cell.lx, cell.ly - 10,
      {sz:10, fill:'#888888', font:"'Cormorant Garamond',serif", wt:'500'}));

    // House number smaller
    svgEl.appendChild(tx(String(houseNum), cell.lx, cell.ly + 4,
      {sz:9, fill:'#CCCCCC', wt:'300'}));

    // Planets in this house
    const planets = houseGroups[i];
    if(planets.length > 0){
      const lineH = 14;
      const startY = cell.ly + 16;
      planets.forEach((p, j) => {
        const py = startY + j * lineH;
        const rxStr = p.rx ? '℞' : '';
        svgEl.appendChild(tx(p.glyph + rxStr, cell.lx, py,
          {sz:12, fill:'#111110', font:"'Cormorant Garamond',serif", wt:'400'}));
      });
    }
  }

  // ASC marker — highlight H1 cell
  svgEl.appendChild(ns('polygon',{
    points: HOUSE_CELLS[0].pts.map((v,i)=>v).join(' '),
    fill:'#F8F8F6', stroke:'none'
  }));
  // Redraw H1 label on top
  svgEl.appendChild(tx('ASC', HOUSE_CELLS[0].lx, HOUSE_CELLS[0].ly - 22,
    {sz:9, fill:'#C9A84C', wt:'600', font:'Jost,sans-serif'}));

  // Labels outside the grid
  svgEl.appendChild(tx('ASC', ox - 14, oy + q*0.5, {sz:9,fill:'#888888',wt:'600',font:'Jost,sans-serif',anchor:'end'}));
  svgEl.appendChild(tx('DSC', ox + S + 14, oy + tq + q*0.5, {sz:9,fill:'#888888',wt:'600',font:'Jost,sans-serif',anchor:'start'}));
  svgEl.appendChild(tx('MC', ox + tq + q*0.5, oy - 10, {sz:9,fill:'#888888',wt:'600',font:'Jost,sans-serif'}));
  svgEl.appendChild(tx('IC', ox + q*0.5, oy + S + 10, {sz:9,fill:'#888888',wt:'600',font:'Jost,sans-serif'}));
}

global.NuastroChartNorthIndian = { draw };
})(window);
