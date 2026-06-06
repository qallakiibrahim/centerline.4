import React, { useState } from 'react';
import { MachinePoint } from '../types';

interface PhasingGaugeProps {
  currentDegree: number;
  points: MachinePoint[];
  theme?: 'light' | 'dark';
}

const PhasingGauge: React.FC<PhasingGaugeProps> = ({ currentDegree, points, theme = 'dark' }) => {
  const [testDegree, setTestDegree] = useState(currentDegree);

  // Filter points that have a valid phaseAngle
  const phasePoints = points
    .filter(p => typeof p.phaseAngle === 'number' && !isNaN(p.phaseAngle))
    .sort((a, b) => (a.phaseAngle || 0) - (b.phaseAngle || 0));

  const radius = 120;
  const center = 150;

  // Helper to calculate position on circle
  const getPos = (deg: number, r: number) => {
    const rad = (deg - 90) * (Math.PI / 180);
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  const needlePos = getPos(testDegree, radius - 10);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    // Only drag if mouse is down or it's a touch event
    if ('buttons' in e && e.buttons !== 1 && e.type !== 'touchstart' && e.type !== 'touchmove') return;

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left - center;
    const y = clientY - rect.top - center;
    
    // Calculate angle in degrees
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    
    setTestDegree(Math.round(angle));
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 flex flex-col items-center shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic flex items-center gap-3 justify-center">
          <span className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
          360° Cykel Synk
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-md mx-auto">
          Master Encoder Visualisering. Verifiera timing för kritiska moment för att undvika mekaniska krascher och optimera hastighet.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full items-start">
        {/* Gauge Section */}
        <div className="flex flex-col items-center space-y-8">
          <div className="relative w-[300px] h-[300px]">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-cyan-500/5 blur-[60px] rounded-full" />
            
            <svg 
              width="300" height="300" 
              className="relative z-10 drop-shadow-2xl cursor-crosshair touch-none"
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseMove}
              onTouchMove={handleMouseMove}
            >
              {/* Outer Ring */}
              <circle 
                cx={center} cy={center} r={radius} 
                className="fill-gray-50 dark:fill-black stroke-gray-200 dark:stroke-gray-800 transition-colors duration-300" 
                strokeWidth="16" 
              />
              
              {/* Inner Ring (Track) */}
              <circle 
                cx={center} cy={center} r={radius - 20} 
                className="fill-none stroke-gray-100 dark:stroke-gray-900/50" 
                strokeWidth="1" 
                strokeDasharray="4 4"
              />
              
              {/* Ticks */}
              {Array.from({ length: 72 }).map((_, i) => {
                const deg = i * 5;
                const isMajor = i % 18 === 0; // 0, 90, 180, 270
                const isMedium = i % 6 === 0; // Every 30 deg
                const p1 = getPos(deg, radius - (isMajor ? 12 : isMedium ? 8 : 4));
                const p2 = getPos(deg, radius + (isMajor ? 12 : isMedium ? 8 : 4));
                return (
                  <line 
                    key={i} 
                    x1={p1.x} y1={p1.y} 
                    x2={p2.x} y2={p2.y} 
                    className={`${isMajor ? 'stroke-cyan-500' : isMedium ? 'stroke-gray-400 dark:stroke-gray-500' : 'stroke-gray-300 dark:stroke-gray-700'} transition-colors duration-300`}
                    strokeWidth={isMajor ? 3 : isMedium ? 2 : 1} 
                  />
                );
              })}

              {/* Major Labels */}
              {[0, 90, 180, 270].map(deg => {
                const pos = getPos(deg, radius + 25);
                return (
                  <text 
                    key={deg}
                    x={pos.x} y={pos.y}
                    textAnchor="middle" alignmentBaseline="middle"
                    className="fill-gray-400 dark:fill-gray-600 font-black text-[10px] tracking-tighter"
                  >
                    {deg}°
                  </text>
                );
              })}

              {/* Phase Points */}
              {phasePoints.map((p) => {
                const pos = getPos(p.phaseAngle!, radius);
                const isNear = Math.abs(testDegree - p.phaseAngle!) < 8;
                const color = p.criticality.includes('P1') ? '#ef4444' : '#3b82f6';
                
                return (
                  <g key={p.id} className="cursor-pointer group">
                    {/* Connection line to center when active */}
                    {isNear && (
                      <line 
                        x1={center} y1={center} x2={pos.x} y2={pos.y} 
                        stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.5"
                      />
                    )}
                    
                    {/* Point Circle */}
                    <circle 
                      cx={pos.x} 
                      cy={pos.y} 
                      r={isNear ? 10 : 6} 
                      fill={isNear ? color : 'transparent'} 
                      stroke={color}
                      strokeWidth="2"
                      className="transition-all duration-300"
                    />
                    
                    {/* Label when near */}
                    {isNear && (
                      <g>
                        <rect 
                          x={pos.x + 12} y={pos.y - 12} 
                          width="80" height="24" rx="6" 
                          className="fill-black/80 backdrop-blur-md" 
                        />
                        <text 
                          x={pos.x + 18} y={pos.y + 4} 
                          className="fill-white font-bold text-[10px]"
                        >
                          {p.id} ({p.phaseAngle}°)
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Needle */}
              <g className="transition-transform duration-100">
                <line 
                  x1={center} y1={center} 
                  x2={needlePos.x} y2={needlePos.y} 
                  stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" 
                  className="drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                />
                <circle cx={center} cy={center} r="12" className="fill-gray-900 dark:fill-white" />
                <circle cx={center} cy={center} r="6" fill="#06b6d4" />
              </g>
              
              {/* Digital Readout */}
              <text x={center} y={center + 60} textAnchor="middle" className="fill-cyan-500 font-black text-3xl italic tracking-tighter">
                {testDegree}°
              </text>
            </svg>
          </div>

          <div className="w-full max-w-xs">
            <div className="flex justify-between items-end mb-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Master Encoder Simulator</label>
              <span className="text-cyan-500 font-mono font-bold text-lg">{testDegree}°</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="360" 
              value={testDegree} 
              onChange={(e) => setTestDegree(Number(e.target.value))}
              className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </div>

        {/* Info & Legend Section */}
        <div className="space-y-8">
          <div className="bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800 rounded-3xl p-6">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              Synkroniserade Punkter ({phasePoints.length})
            </h4>
            
            {phasePoints.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                {phasePoints.map(p => {
                  const isNear = Math.abs(testDegree - p.phaseAngle!) < 8;
                  return (
                    <div 
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 ${
                        isNear 
                          ? 'bg-cyan-500/10 border-cyan-500/30 scale-[1.02]' 
                          : 'bg-white dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-bold ${
                          p.criticality.includes('P1') ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {p.phaseAngle}°
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{p.id}</div>
                          <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{p.name}</div>
                        </div>
                      </div>
                      {isNear && (
                        <div className="text-[10px] font-black text-cyan-500 animate-pulse uppercase italic">Aktiv</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <div className="text-gray-600 dark:text-gray-700 italic text-xs">Inga synkroniserade punkter hittades.</div>
                <p className="text-[10px] text-gray-500 max-w-[200px] mx-auto">
                  Gå till "Maskinkarta" och redigera en punkt för att lägga till en <strong>Fasningsvinkel</strong>.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
              <h5 className="text-[10px] font-black text-red-500 uppercase mb-1">Kollisionsrisk</h5>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Var extra uppmärksam på punkter som ligger inom ±15° från varandra men befinner sig i olika sektioner.
              </p>
            </div>
            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
              <h5 className="text-[10px] font-black text-blue-500 uppercase mb-1">Timing-optimering</h5>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Genom att visualisera cykeln kan man ofta hitta "dötid" där maskinen kan accelereras utan att påverka kvaliteten.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhasingGauge;
