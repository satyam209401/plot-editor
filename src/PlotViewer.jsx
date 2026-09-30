import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Search, Filter, MapPin, Compass, FileText, Layers, PanelRightClose, PanelRightOpen, Maximize2 } from 'lucide-react';
import './PlotViewer.css';
import { getRoadPath, getSmoothPath, getPolygonCentroid, getPointsString } from './utils/mapUtils.js';

export { getRoadPath, getSmoothPath, getPolygonCentroid, getPointsString };

export default function PlotViewer({ data, onPlotSelect, showSidebar = true }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handlePlotSelect = (plot) => {
    setSelectedPlot(plot);
    if (onPlotSelect) onPlotSelect(plot);
  };

  const handleClearSelection = () => {
    setSelectedPlot(null);
    if (onPlotSelect) onPlotSelect(null);
  };

  const containerRef = useRef(null);

  if (!data || !data.plots) {
    return (
      <div className="empty-state">
        <p>No 2D map layout data loaded.</p>
      </div>
    );
  }

  const getPolygonCentroid = (points) => {
    if (!points || points.length === 0) return { x: 0, y: 0 };
    let xSum = 0;
    let ySum = 0;
    points.forEach(([x, y]) => {
      xSum += x;
      ySum += y;
    });
    return {
      x: xSum / points.length,
      y: ySum / points.length
    };
  };

  const getPointsString = (points) => points.map(([x, y]) => `${x},${y}`).join(' ');

  const handleMouseDown = (e) => {
    // Fixed map - pan disabled
  };

  const handleMouseMove = (e) => {
    // Fixed map - pan disabled
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const filteredPlots = data.plots.filter(plot => {
    const matchesSearch = plot.plotNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (plot.areaSqYard && plot.areaSqYard.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || plot.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPlots = data.plots.length;
  const availableCount = data.plots.filter(p => p.status === 'available').length;
  const bookedCount = data.plots.filter(p => p.status === 'booked').length;
  const soldCount = data.plots.filter(p => p.status === 'sold').length;

  return (
    <div className="main-wrapper">
      <div 
        className="map-canvas-container"
        ref={containerRef}
      >
        <div 
          className="map-wrapper"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: data.canvasWidth || 1300,
            height: data.canvasHeight || 900,
            background: '#0f172a'
          }}
        >
          {data.mapImageUrl && (
            <img 
              src={data.mapImageUrl} 
              alt="Master Layout Map" 
              className="map-bg-image"
              style={{ width: data.canvasWidth || 1300, height: data.canvasHeight || 900 }}
            />
          )}

          <svg 
            className="map-svg-overlay" 
            viewBox={`0 0 ${data.canvasWidth || 1300} ${data.canvasHeight || 900}`}
          >
            <defs>
              <pattern id="cad-grid" width="4" height="4" patternUnits="userSpaceOnUse">
                <path d="M 4 0 L 0 0 0 4" fill="none" stroke="#1e293b" strokeWidth="0.4" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cad-grid)" onClick={handleClearSelection} style={{ cursor: 'default' }} />

            {data.projectTitle && (
              <g transform="translate(80, 55)">
                <text x="0" y="0" fill="#f8fafc" fontSize="16" fontWeight="800" fontFamily="sans-serif">
                  {data.projectTitle}
                </text>
              </g>
            )}

            {/* Roads */}
            {data.roads && data.roads.map((road) => {
              if (!road.points || road.points.length < 2) return null;
              const pathD = getRoadPath(road.points, road.isSmooth);

              return (
                <g key={road.id}>
                  <path 
                    d={pathD} 
                    fill="none" 
                    stroke={road.color || "#475569"} 
                    strokeWidth={road.width || 28} 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d={pathD} 
                    fill="none" 
                    stroke="#cbd5e1" 
                    strokeWidth="1.5" 
                    strokeDasharray="8 8" 
                    opacity="0.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

            {/* Trees */}
            {data.trees && data.trees.map((tree, idx) => (
              <g key={idx} transform={`translate(${tree.x}, ${tree.y})`}>
                <circle cx="0" cy="0" r="10" fill="#166534" stroke="#4ade80" strokeWidth="2" />
                <circle cx="0" cy="0" r="5" fill="#22c55e" />
              </g>
            ))}

            {/* Compass */}
            {data.compass && (
              <g transform={`translate(${data.compass.x}, ${data.compass.y}) rotate(${data.compass.rotation || 0})`}>
                <circle cx="0" cy="0" r="32" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                <path d="M 0 -28 L 6 0 L 0 4 L -6 0 Z" fill="#ef4444" />
                <path d="M 0 28 L 6 0 L 0 -4 L -6 0 Z" fill="#94a3b8" />
                <text x="0" y="-34" fill="#ef4444" fontSize="12" fontWeight="800" textAnchor="middle">N</text>
              </g>
            )}

            {/* Plots */}
            {filteredPlots.map((plot) => {
              const centroid = getPolygonCentroid(plot.points);
              const isSelected = selectedPlot?.id === plot.id;

              return (
                <g key={plot.id} onClick={(e) => { e.stopPropagation(); handlePlotSelect(plot); }}>
                  <polygon
                    points={getPointsString(plot.points)}
                    fill={plot.fillColor || (plot.status === 'available' ? '#22c55e44' : plot.status === 'booked' ? '#f59e0b44' : '#ef444444')}
                    stroke={isSelected ? "#38bdf8" : "#ffffff"}
                    strokeWidth={isSelected ? 3.5 : 1.5}
                    className={`plot-polygon ${plot.status} ${isSelected ? 'selected' : ''}`}
                  />
                  <text 
                    x={centroid.x} 
                    y={centroid.y - 6} 
                    className="plot-label"
                  >
                    {plot.plotNo}
                  </text>
                  {plot.areaSqYard && (
                    <text 
                      x={centroid.x} 
                      y={centroid.y + 8} 
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="8.5"
                      fill="#f1f5f9"
                      className="plot-sublabel"
                    >
                      {plot.areaSqYard} SQ.YD
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Floating Controls */}
        <div className="floating-controls">
          {showSidebar && (
            <button 
              className="control-btn" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              title={isSidebarOpen ? "Fullscreen Map View" : "Show Inspector Sidebar"}
              style={{ background: isSidebarOpen ? '#1e293b' : '#3b82f6', color: '#ffffff' }}
            >
              {isSidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </button>
          )}
          <button className="control-btn" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn size={18} />
          </button>
          <button className="control-btn" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut size={18} />
          </button>
          <button className="control-btn" onClick={handleResetZoom} title="Reset View">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Sidebar Panel */}
      {showSidebar && (
        <div className={`sidebar-panel ${isSidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="sidebar-title">
              <Layers size={20} className="text-blue-400" />
              <span>2D Master Layout Plan</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {data.projectTitle || 'BINGWAN CITY KANPUR'}
            </p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}
            title="Hide Sidebar"
          >
            <PanelRightClose size={18} />
          </button>
        </div>

        <div className="sidebar-body">
          <div style={{ background: '#1e293b', padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '0.4rem' }}>
              LAYOUT AREA SUMMARY
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>LAND AREA:</span>
                <span style={{ fontWeight: '700', display: 'block', color: '#38bdf8' }}>{data.totalLandArea || '5000 SQ YARD'}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>PLOT AREA:</span>
                <span style={{ fontWeight: '700', display: 'block', color: '#4ade80' }}>{data.totalPlotArea || '0 SQ YARD'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', textAlign: 'center' }}>
            <div style={{ background: '#1e293b', padding: '0.5rem', borderRadius: '6px', border: '1px solid #334155' }}>
              <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: '800', color: '#4ade80' }}>{availableCount}</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '700' }}>AVAILABLE</span>
            </div>
            <div style={{ background: '#1e293b', padding: '0.5rem', borderRadius: '6px', border: '1px solid #334155' }}>
              <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: '800', color: '#fbbf24' }}>{bookedCount}</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '700' }}>BOOKED</span>
            </div>
            <div style={{ background: '#1e293b', padding: '0.5rem', borderRadius: '6px', border: '1px solid #334155' }}>
              <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: '800', color: '#f87171' }}>{soldCount}</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '700' }}>SOLD</span>
            </div>
          </div>

          <div className="search-input-wrapper">
            <Search size={16} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search Plot (e.g. P.N.1)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-badge-group">
            <button 
              className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({totalPlots})
            </button>
            <button 
              className={`filter-chip ${statusFilter === 'available' ? 'active' : ''}`}
              onClick={() => setStatusFilter('available')}
            >
              Available ({availableCount})
            </button>
            <button 
              className={`filter-chip ${statusFilter === 'booked' ? 'active' : ''}`}
              onClick={() => setStatusFilter('booked')}
            >
              Booked ({bookedCount})
            </button>
            <button 
              className={`filter-chip ${statusFilter === 'sold' ? 'active' : ''}`}
              onClick={() => setStatusFilter('sold')}
            >
              Sold ({soldCount})
            </button>
          </div>

          {selectedPlot ? (
            <div className="plot-details-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#38bdf8' }}>{selectedPlot.plotNo}</h3>
                <span className={`badge ${selectedPlot.status}`}>
                  {selectedPlot.status}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Plot Area:</span>
                <span className="detail-value">{selectedPlot.areaSqYard} SQ.YARD</span>
              </div>

              {selectedPlot.dimensions && (
                <div className="detail-row">
                  <span className="detail-label">Dimensions:</span>
                  <span className="detail-value">{selectedPlot.dimensions}</span>
                </div>
              )}

              {selectedPlot.price && (
                <div className="detail-row">
                  <span className="detail-label">Price Rate:</span>
                  <span className="detail-value" style={{ color: '#4ade80' }}>{selectedPlot.price}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state" style={{ background: '#1e293b', borderRadius: '12px', padding: '1.25rem 1rem' }}>
              <MapPin size={28} style={{ color: '#38bdf8', marginBottom: '0.4rem', opacity: 0.8 }} />
              <p style={{ fontWeight: '600', fontSize: '0.85rem' }}>Select any plot on 2D Map</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click a plot box to view exact dimensions & pricing.</p>
            </div>
          )}

          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={16} color="#38bdf8" /> CAD Plot Schedule Table
            </h4>
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #334155', borderRadius: '8px' }}>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#020617', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '0.4rem 0.5rem' }}>PLOT NO</th>
                    <th style={{ padding: '0.4rem 0.5rem' }}>DIMENSIONS</th>
                    <th style={{ padding: '0.4rem 0.5rem' }}>AREA SQ.YD</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlots.map((plot) => (
                    <tr 
                      key={plot.id}
                      onClick={() => handlePlotSelect(plot)}
                      style={{ 
                        borderBottom: '1px solid #1e293b', 
                        cursor: 'pointer',
                        background: selectedPlot?.id === plot.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent' 
                      }}
                    >
                      <td style={{ padding: '0.4rem 0.5rem', fontWeight: '700', color: '#38bdf8' }}>{plot.plotNo}</td>
                      <td style={{ padding: '0.4rem 0.5rem', color: '#e2e8f0' }}>{plot.dimensions || '-'}</td>
                      <td style={{ padding: '0.4rem 0.5rem', fontWeight: '700', color: '#4ade80' }}>{plot.areaSqYard} Sq.yard</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
