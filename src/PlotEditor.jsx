import React, { useState, useRef } from 'react';
import { 
  Square, GitCommit, CornerDownRight, Trees as TreeIcon, Navigation, Trash2, Undo2, Redo2, 
  Sparkles, Layers, FileText, Copy, Sliders, Move, Download, Check,
  ZoomIn, ZoomOut, RotateCcw, PanelRightClose, PanelRightOpen, Type
} from 'lucide-react';
import './PlotEditor.css';
import { getRoadPath, getSmoothPath, getRoadSegmentLabels, getPolygonCentroid, getPointsString } from './utils/mapUtils.js';

export { getRoadSegmentLabels };

export default function PlotEditor({ initialData, onSave }) {
  const [mapData, setMapData] = useState(initialData || {
    projectTitle: "Untitled Project",
    totalLandArea: "5000 SQ YARD",
    totalPlotArea: "0 SQ YARD",
    totalRoadArea: "0 SQ YARD",
    canvasWidth: 1300,
    canvasHeight: 900,
    compass: null,
    roads: [],
    trees: [],
    plots: []
  });

  const [history, setHistory] = useState([initialData]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Active Right Inspector Tab: 'inspector' | 'layers' | 'json'
  const [activeTab, setActiveTab] = useState('json');
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.1));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  
  const handleCenterCanvas = () => {
    if (!svgRef.current) return;
    const rect = svgRef.current.parentElement.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setPan({
      x: cx - (1300 / 2) * zoom,
      y: cy - (900 / 2) * zoom
    });
  };

  React.useEffect(() => {
    // Initial reset position on page refresh
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  // Canvas Selection & Dragging State
  const [selectedElement, setSelectedElement] = useState(null);
  const [draggedCanvasItem, setDraggedCanvasItem] = useState(null);
  const [draggedCornerNode, setDraggedCornerNode] = useState(null);

  // Inline Double-Click Editing State
  const [editingPlotId, setEditingPlotId] = useState(null);
  const [inlinePlotNo, setInlinePlotNo] = useState('');
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);

  const svgRef = useRef(null);

  const pushHistory = (newData) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newData);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setMapData(newData);
    if (onSave) onSave(newData);
  };

  const handleFreshCanvas = () => {
    const freshData = {
      projectTitle: "NEW 2D TOWNSHIP LAYOUT",
      totalLandArea: "5000 SQ YARD",
      totalPlotArea: "0 SQ YARD",
      totalRoadArea: "0 SQ YARD",
      canvasWidth: 1300,
      canvasHeight: 900,
      compass: null,
      roads: [],
      trees: [],
      plots: []
    };
    pushHistory(freshData);
    setSelectedElement(null);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setMapData(history[prevIndex]);
      if (onSave) onSave(history[prevIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setMapData(history[nextIndex]);
      if (onSave) onSave(history[nextIndex]);
    }
  };

  // Get SVG Scaled Mouse Coordinates
  const getSVGCoordinates = (e) => {
    if (!svgRef.current) return { x: 450, y: 350 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left - pan.x) / zoom);
    const y = Math.round((e.clientY - rect.top - pan.y) / zoom);
    return { x, y };
  };

  const GRID_STEP = 4;
  const snapToGrid = (val, step = GRID_STEP) => Math.round(val / step) * step;

  const addItemToCanvas = (itemType, dropPos) => {
    const rawX = dropPos ? dropPos.x : 450;
    const rawY = dropPos ? dropPos.y : 350;
    const x = snapToGrid(rawX);
    const y = snapToGrid(rawY);

    if (itemType === 'plot-rect') {
      const count = mapData.plots.length + 1;
      const colors = ["#fecaca", "#bfdbfe", "#fbcfe8", "#e9d5ff", "#fef08a"];
      const w = 120, h = 80;
      const x1 = snapToGrid(x - w / 2);
      const y1 = snapToGrid(y - h / 2);
      const newPlot = {
        id: `plot-${Date.now()}`,
        plotNo: `P.N.${count}`,
        areaSqYard: "100.00",
        dimensions: "30' x 40'",
        status: "available",
        fillColor: colors[(count - 1) % colors.length],
        points: [[x1, y1], [x1 + w, y1], [x1 + w, y1 + h], [x1, y1 + h]]
      };
      pushHistory({ ...mapData, plots: [...mapData.plots, newPlot] });
    } else if (itemType === 'plot-corner') {
      const count = mapData.plots.length + 1;
      const x1 = snapToGrid(x - 80);
      const y1 = snapToGrid(y - 40);
      const newPlot = {
        id: `plot-${Date.now()}`,
        plotNo: `P.N.${count}`,
        areaSqYard: "120.00",
        dimensions: "35' x 45'",
        status: "available",
        fillColor: "#bfdbfe",
        points: [[x1, y1], [x1 + 160, y1], [x1 + 160, y1 + 80], [x1 + 80, y1 + 80], [x1, y1 + 40]]
      };
      pushHistory({ ...mapData, plots: [...mapData.plots, newPlot] });
    } else if (itemType === 'road-h') {
      const newRoad = {
        id: `road-${Date.now()}`,
        name: "30 FT MAIN ROAD",
        width: 32,
        color: "#475569",
        points: [[x - 160, y], [x + 160, y]]
      };
      pushHistory({ ...mapData, roads: [...(mapData.roads || []), newRoad] });
    } else if (itemType === 'road-v') {
      const newRoad = {
        id: `road-${Date.now()}`,
        name: "25 FT ACCESS ROAD",
        width: 28,
        color: "#475569",
        points: [[x, y - 160], [x, y + 160]]
      };
      pushHistory({ ...mapData, roads: [...(mapData.roads || []), newRoad] });
    } else if (itemType === 'road-corner') {
      const newRoad = {
        id: `road-${Date.now()}`,
        name: "30 FT CORNER ROAD",
        width: 32,
        color: "#475569",
        points: [[x - 140, y], [x, y], [x, y + 140]]
      };
      pushHistory({ ...mapData, roads: [...(mapData.roads || []), newRoad] });
    } else if (itemType === 'tree') {
      const newTree = { id: `tree-${Date.now()}-${Math.floor(Math.random() * 1000)}`, x, y };
      const newTrees = [...(mapData.trees || []), newTree];
      pushHistory({ ...mapData, trees: newTrees });
    } else if (itemType === 'compass') {
      pushHistory({ ...mapData, compass: { ...(mapData.compass || { rotation: 0 }), x, y } });
    } else if (itemType === 'text') {
      const newLabel = {
        id: `label-${Date.now()}`,
        plotNo: "NEW TEXT",
        x: x,
        y: y,
        color: "#ffffff"
      };
      pushHistory({ ...mapData, labels: [...(mapData.labels || []), newLabel] });
    }
  };

  // HTML5 Drag from Palette to Canvas Drop
  const handlePaletteDragStart = (e, itemType) => {
    e.dataTransfer.setData("text/plain", itemType);
    e.dataTransfer.setData("itemType", itemType);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleCanvasDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCanvasDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const itemType = e.dataTransfer.getData("itemType") || e.dataTransfer.getData("text/plain");
    if (!itemType || !svgRef.current) return;

    const coords = getSVGCoordinates(e);
    addItemToCanvas(itemType, coords);
  };

  // Whole Shape Drag Repositioning
  const handleShapeMouseDown = (e, type, item) => {
    e.stopPropagation();
    setSelectedElement({ type, item });
    const { x, y } = getSVGCoordinates(e);

    if (type === 'plot' || type === 'road') {
      const firstPt = item.points[0];
      setDraggedCanvasItem({ type, id: item.id, offsetX: x - firstPt[0], offsetY: y - firstPt[1] });
    } else if (type === 'label' || type === 'tree' || type === 'compass') {
      setDraggedCanvasItem({ type, id: item.id, offsetX: x - item.x, offsetY: y - item.y });
    }
  };

  // Corner Control Dots Drag Reshaping
  const handleCornerNodeMouseDown = (e, type, id, pointIndex) => {
    e.stopPropagation();
    setDraggedCornerNode({ type, id, pointIndex });
  };

  const handleAddRoadNode = (e, roadId, insertIndex, point) => {
    e.stopPropagation();
    const updatedRoads = mapData.roads.map(r => {
      if (r.id === roadId) {
        const newPts = [...r.points];
        newPts.splice(insertIndex, 0, point);
        return { ...r, points: newPts };
      }
      return r;
    });
    pushHistory({ ...mapData, roads: updatedRoads });
    setSelectedElement(prev => (prev && prev.item.id === roadId ? { ...prev, item: { ...prev.item, points: updatedRoads.find(r => r.id === roadId).points } } : prev));
  };

  const handleRemoveRoadNode = (e, roadId, pointIndex) => {
    e.stopPropagation();
    e.preventDefault();
    const targetRoad = mapData.roads.find(r => r.id === roadId);
    if (!targetRoad || targetRoad.points.length <= 2) return;
    const newPts = targetRoad.points.filter((_, i) => i !== pointIndex);
    const updatedRoads = mapData.roads.map(r => r.id === roadId ? { ...r, points: newPts } : r);
    pushHistory({ ...mapData, roads: updatedRoads });
    setSelectedElement(prev => (prev && prev.item.id === roadId ? { ...prev, item: { ...prev.item, points: newPts } } : prev));
  };

  const handleAddPlotNode = (e, plotId, insertIndex, point) => {
    e.stopPropagation();
    const updatedPlots = mapData.plots.map(p => {
      if (p.id === plotId) {
        const newPts = [...p.points];
        newPts.splice(insertIndex, 0, point);
        return { ...p, points: newPts };
      }
      return p;
    });
    pushHistory({ ...mapData, plots: updatedPlots });
    setSelectedElement(prev => (prev && prev.item.id === plotId ? { ...prev, item: { ...prev.item, points: updatedPlots.find(p => p.id === plotId).points } } : prev));
  };

  const handleRemovePlotNode = (e, plotId, pointIndex) => {
    e.stopPropagation();
    e.preventDefault();
    const targetPlot = mapData.plots.find(p => p.id === plotId);
    if (!targetPlot || targetPlot.points.length <= 3) return;
    const newPts = targetPlot.points.filter((_, i) => i !== pointIndex);
    const updatedPlots = mapData.plots.map(p => p.id === plotId ? { ...p, points: newPts } : p);
    pushHistory({ ...mapData, plots: updatedPlots });
    setSelectedElement(prev => (prev && prev.item.id === plotId ? { ...prev, item: { ...prev.item, points: newPts } } : prev));
  };

  const handleCanvasMouseDown = (e) => {
    setSelectedElement(null);
  };

  const handleCanvasMouseMove = (e) => {


    const { x, y } = getSVGCoordinates(e);
    setCursorPos({ x, y });

    if (draggedCornerNode) {
      const snappedX = snapToGrid(x);
      const snappedY = snapToGrid(y);

      if (draggedCornerNode.type === 'plot') {
        const updatedPlots = mapData.plots.map(p => {
          if (p.id === draggedCornerNode.id) {
            const newPoints = [...p.points];
            newPoints[draggedCornerNode.pointIndex] = [snappedX, snappedY];
            return { ...p, points: newPoints };
          }
          return p;
        });
        setMapData({ ...mapData, plots: updatedPlots });
      } else if (draggedCornerNode.type === 'road') {
        const updatedRoads = mapData.roads.map(r => {
          if (r.id === draggedCornerNode.id) {
            const newPoints = [...r.points];
            newPoints[draggedCornerNode.pointIndex] = [snappedX, snappedY];
            return { ...r, points: newPoints };
          }
          return r;
        });
        setMapData({ ...mapData, roads: updatedRoads });
      }
      return;
    }

    if (draggedCanvasItem) {
      if (draggedCanvasItem.type === 'plot') {
        const targetPlot = mapData.plots.find(p => p.id === draggedCanvasItem.id);
        if (!targetPlot) return;
        const targetX = snapToGrid(x - draggedCanvasItem.offsetX);
        const targetY = snapToGrid(y - draggedCanvasItem.offsetY);
        const dx = targetX - targetPlot.points[0][0];
        const dy = targetY - targetPlot.points[0][1];

        if (dx !== 0 || dy !== 0) {
          const newPoints = targetPlot.points.map(([px, py]) => [px + dx, py + dy]);
          const updatedPlots = mapData.plots.map(p => p.id === draggedCanvasItem.id ? { ...p, points: newPoints } : p);
          setMapData({ ...mapData, plots: updatedPlots });
        }
      } else if (draggedCanvasItem.type === 'road') {
        const targetRoad = mapData.roads.find(r => r.id === draggedCanvasItem.id);
        if (!targetRoad) return;
        const targetX = snapToGrid(x - draggedCanvasItem.offsetX);
        const targetY = snapToGrid(y - draggedCanvasItem.offsetY);
        const dx = targetX - targetRoad.points[0][0];
        const dy = targetY - targetRoad.points[0][1];

        if (dx !== 0 || dy !== 0) {
          const newPoints = targetRoad.points.map(([px, py]) => [px + dx, py + dy]);
          const updatedRoads = mapData.roads.map(r => r.id === draggedCanvasItem.id ? { ...r, points: newPoints } : r);
          setMapData({ ...mapData, roads: updatedRoads });
        }
      } else if (draggedCanvasItem.type === 'label') {
        const targetLabel = (mapData.labels || []).find(l => l.id === draggedCanvasItem.id);
        if (!targetLabel) return;
        const targetX = snapToGrid(x - draggedCanvasItem.offsetX);
        const targetY = snapToGrid(y - draggedCanvasItem.offsetY);
        const dx = targetX - targetLabel.x;
        const dy = targetY - targetLabel.y;
        
        if (dx !== 0 || dy !== 0) {
          const updatedLabels = mapData.labels.map(l => l.id === draggedCanvasItem.id ? { ...l, x: l.x + dx, y: l.y + dy } : l);
          setMapData({ ...mapData, labels: updatedLabels });
        }
      } else if (draggedCanvasItem.type === 'compass') {
        const nx = snapToGrid(x - draggedCanvasItem.offsetX);
        const ny = snapToGrid(y - draggedCanvasItem.offsetY);
        setMapData({ ...mapData, compass: { ...mapData.compass, x: nx, y: ny } });
      } else if (draggedCanvasItem.type === 'tree') {
        const targetX = snapToGrid(x - draggedCanvasItem.offsetX);
        const targetY = snapToGrid(y - draggedCanvasItem.offsetY);
        const updatedTrees = (mapData.trees || []).map((t, idx) => {
          const tId = t.id || `tree-${idx}`;
          return tId === draggedCanvasItem.id ? { ...t, id: tId, x: targetX, y: targetY } : t;
        });
        setMapData({ ...mapData, trees: updatedTrees });
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (draggedCanvasItem || draggedCornerNode) {
      pushHistory(mapData);
      setDraggedCanvasItem(null);
      setDraggedCornerNode(null);
    }
  };

  const handlePlotDoubleClick = (plot) => {
    setEditingPlotId(plot.id);
    setInlinePlotNo(plot.plotNo);
  };

  const saveInlinePlotNo = (id) => {
    if (!inlinePlotNo.trim()) return;
    if (editingPlotId.startsWith('plot-')) {
      const updatedPlots = mapData.plots.map(p => p.id === id ? { ...p, plotNo: inlinePlotNo.trim() } : p);
      pushHistory({ ...mapData, plots: updatedPlots });
    } else if (editingPlotId.startsWith('road-')) {
      const updatedRoads = mapData.roads.map(r => r.id === id ? { ...r, name: inlinePlotNo.trim() } : r);
      pushHistory({ ...mapData, roads: updatedRoads });
    } else if (editingPlotId.startsWith('label-')) {
      const updatedLabels = mapData.labels.map(l => l.id === id ? { ...l, plotNo: inlinePlotNo.trim() } : l);
      pushHistory({ ...mapData, labels: updatedLabels });
    }
    setEditingPlotId(null);
  };

  const handleDeleteElement = (type, id) => {
    if (type === 'plot') {
      pushHistory({ ...mapData, plots: mapData.plots.filter(p => p.id !== id) });
    } else if (type === 'road') {
      pushHistory({ ...mapData, roads: mapData.roads.filter(r => r.id !== id) });
    } else if (type === 'label') {
      pushHistory({ ...mapData, labels: (mapData.labels || []).filter(l => l.id !== id) });
    } else if (type === 'compass') {
      pushHistory({ ...mapData, compass: null });
    } else if (type === 'tree') {
      pushHistory({ ...mapData, trees: (mapData.trees || []).filter((t, idx) => (t.id || `tree-${idx}`) !== id) });
    }
    setSelectedElement(null);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(mapData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mapData, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", `master_plan_layout_${Date.now()}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <div className="ps-editor-container">
      {/* Top Header Controls */}
      <div className="ps-top-ribbon">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            className="ps-ribbon-btn"
            onClick={handleFreshCanvas}
            style={{ background: '#3b82f622', color: '#60a5fa', borderColor: '#3b82f644', fontWeight: '700' }}
          >
            <Sparkles size={16} /> <span>Fresh Canvas</span>
          </button>

          <button className="ps-ribbon-btn" onClick={handleUndo} disabled={historyIndex <= 0} style={{ opacity: historyIndex <= 0 ? 0.3 : 1 }}>
            <Undo2 size={16} /> <span>Undo</span>
          </button>

          <button className="ps-ribbon-btn" onClick={handleRedo} disabled={historyIndex >= history.length - 1} style={{ opacity: historyIndex >= history.length - 1 ? 0.3 : 1 }}>
            <Redo2 size={16} /> <span>Redo</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#0f172a', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid #334155' }}>
            <FileText size={14} color="#60a5fa" />
            <input 
              type="text" 
              value={mapData.projectTitle || ''} 
              onChange={(e) => {
                const val = e.target.value;
                setMapData(prev => {
                  const updated = { ...prev, projectTitle: val };
                  if (onSave) onSave(updated);
                  return updated;
                });
              }}
              placeholder="Project Name..."
              title="Edit Project Name"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontWeight: '700',
                fontSize: '0.82rem',
                outline: 'none',
                width: '180px'
              }}
            />
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#38bdf8' }}>
          🖐️ DRAG TO PLACE | DRAG BLUE DOTS TO RESHAPE CORNERS | DOUBLE-CLICK TO EDIT LABEL
        </div>
      </div>

      {/* TOP DRAG & DROP PALETTE BAR */}
      <div className="ps-top-palette-bar">
        <div className="ps-palette-title">
          <Layers size={14} color="#38bdf8" /> PALETTE:
        </div>

        <div className="drag-palette-row">
          <div 
            className="drag-palette-card-horizontal" 
            draggable 
            onDragStart={(e) => handlePaletteDragStart(e, 'plot-rect')}
            onClick={() => addItemToCanvas('plot-rect')}
            title="Drag to canvas or click to add"
          >
            <Square size={16} color="#fecaca" />
            <span>Standard Plot Box</span>
          </div>

          <div 
            className="drag-palette-card-horizontal" 
            draggable 
            onDragStart={(e) => handlePaletteDragStart(e, 'road-h')}
            onClick={() => addItemToCanvas('road-h')}
            title="Drag to canvas or click to add"
          >
            <GitCommit size={16} color="#fde047" />
            <span>Road</span>
          </div>

          <div 
            className="drag-palette-card-horizontal" 
            draggable 
            onDragStart={(e) => handlePaletteDragStart(e, 'tree')}
            onClick={() => addItemToCanvas('tree')}
            title="Drag to canvas or click to add"
          >
            <TreeIcon size={16} color="#4ade80" />
            <span>Tree Stamp</span>
          </div>

          <div 
            className="drag-palette-card-horizontal" 
            draggable 
            onDragStart={(e) => handlePaletteDragStart(e, 'text')}
            onClick={() => addItemToCanvas('text')}
            title="Drag to canvas or click to add"
          >
            <Type size={16} color="#ffffff" />
            <span>Text Label</span>
          </div>

          <div 
            className="drag-palette-card-horizontal" 
            draggable 
            onDragStart={(e) => handlePaletteDragStart(e, 'compass')}
            onClick={() => addItemToCanvas('compass')}
            title="Drag to canvas or click to add"
          >
            <Navigation size={16} color="#ef4444" />
            <span>Compass Star</span>
          </div>
        </div>
      </div>

      <div className="ps-studio-workspace" style={{ flex: 1, minHeight: 0 }}>

        {/* CANVAS WORKSPACE */}
        <main 
          className="ps-canvas-viewport"
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={(e) => {
            // Canvas scrolling disabled
            e.preventDefault();
          }}
        >
          <div className="ps-canvas-stage">
            <svg 
              ref={svgRef}
              className="map-svg-overlay"
              style={{ touchAction: 'none' }}
            >
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                <defs>
                  <pattern id="ps-pixel-grid" width="4" height="4" patternUnits="userSpaceOnUse">
                    <path d="M 4 0 L 0 0 0 4" fill="none" stroke="#1e293b" strokeWidth="0.4" />
                  </pattern>
                </defs>
                <rect id="master-grid" x="-10000" y="-10000" width="20000" height="20000" fill="url(#ps-pixel-grid)" onClick={() => setSelectedElement(null)} />



              <g transform="translate(80, 55)">
                <text x="0" y="0" fill="#f8fafc" fontSize="16" fontWeight="800" fontFamily="sans-serif">
                  {mapData.projectTitle}
                </text>
              </g>

              {/* Roads Base (Borders to make intersections seamless) */}
              <g className="roads-borders-layer">
                {mapData.roads && mapData.roads.map((road) => {
                  if (!road.points || road.points.length < 2) return null;
                  const pathD = getRoadPath(road.points, road.isSmooth);
                  return (
                    <path key={`border-${road.id}`} d={pathD} fill="none" stroke="#1e293b" strokeWidth={(road.width || 28) + 6} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
                  );
                })}
              </g>

              {/* Roads Main (Asphalt, Centerlines, and Text) */}
              <g className="roads-main-layer">
                {mapData.roads && mapData.roads.map((road) => {
                  if (!road.points || road.points.length < 2) return null;
                  const pathD = getRoadPath(road.points, road.isSmooth);

                  const isSelected = selectedElement?.item?.id === road.id;

                  return (
                    <g 
                      key={road.id} 
                      onMouseDown={(e) => handleShapeMouseDown(e, 'road', road)}
                      onDoubleClick={() => {
                        setEditingPlotId(road.id);
                        setInlinePlotNo(road.name);
                      }}
                      style={{ cursor: 'move' }}
                    >
                      <path id={`path-${road.id}`} d={pathD} fill="none" stroke={road.color || "#475569"} strokeWidth={road.width || 28} strokeLinecap="round" strokeLinejoin="round" />
                      
                      {/* Center dashed line */}
                      <path d={pathD} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="8 8" pointerEvents="none" opacity="0.6" />

                      {/* Road Segment-Aware Clean Text */}
                      {getRoadSegmentLabels(road).map((label, lIdx) => (
                        <text 
                          key={lIdx}
                          x={label.mx} 
                          y={label.my} 
                          transform={`rotate(${label.angle}, ${label.mx}, ${label.my})`}
                          dy="4"
                          style={{ 
                            fontSize: "11px", 
                            fontWeight: "800", 
                            fill: "#f8fafc", 
                            textAnchor: "middle", 
                            pointerEvents: "none", 
                            letterSpacing: "1px", 
                            textShadow: "0 1px 3px rgba(0,0,0,0.9)" 
                          }}
                        >
                          {label.text}
                        </text>
                      ))}

                      {isSelected && (
                        <>
                          {/* Midpoint '+' buttons to insert new road nodes */}
                          {road.points.slice(0, -1).map((pt, idx) => {
                            const nextPt = road.points[idx + 1];
                            const mx = (pt[0] + nextPt[0]) / 2;
                            const my = (pt[1] + nextPt[1]) / 2;
                            return (
                              <g 
                                key={`mid-${idx}`}
                                onClick={(e) => handleAddRoadNode(e, road.id, idx + 1, [snapToGrid(mx), snapToGrid(my)])}
                                style={{ cursor: 'pointer' }}
                              >
                                <circle cx={mx} cy={my} r={8} fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
                                <text x={mx} y={my} fill="#ffffff" fontSize="11" fontWeight="900" textAnchor="middle" dominantBaseline="central" pointerEvents="none">+</text>
                              </g>
                            );
                          })}

                          {/* Existing Control Nodes */}
                          {road.points.map(([x, y], idx) => (
                            <circle
                              key={idx}
                              cx={x} cy={y} r={7}
                              fill="#38bdf8" stroke="#ffffff" strokeWidth="2"
                              style={{ cursor: 'grab' }}
                              title="Drag to reshape | Double-click to delete node"
                              onMouseDown={(e) => handleCornerNodeMouseDown(e, 'road', road.id, idx)}
                              onDoubleClick={(e) => handleRemoveRoadNode(e, road.id, idx)}
                            />
                          ))}
                        </>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Trees */}
              {mapData.trees && mapData.trees.map((tree, idx) => {
                const treeId = tree.id || `tree-${idx}`;
                const isSelected = selectedElement?.item?.id === treeId;
                return (
                  <g 
                    key={treeId} 
                    transform={`translate(${tree.x}, ${tree.y})`}
                    onMouseDown={(e) => handleShapeMouseDown(e, 'tree', { ...tree, id: treeId })}
                    style={{ cursor: 'move' }}
                  >
                    <circle cx="0" cy="0" r="14" fill="#166534" stroke={isSelected ? "#38bdf8" : "#4ade80"} strokeWidth={isSelected ? 3 : 2} />
                    <circle cx="0" cy="0" r="7" fill="#22c55e" />
                    {isSelected && (
                      <circle cx="0" cy="0" r="20" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                    )}
                  </g>
                );
              })}

              {/* Compass */}
              {mapData.compass && (
                <g 
                  transform={`translate(${mapData.compass.x}, ${mapData.compass.y}) rotate(${mapData.compass.rotation || 0})`}
                  onMouseDown={(e) => handleShapeMouseDown(e, 'compass', { ...mapData.compass, id: 'compass' })}
                  style={{ cursor: 'move' }}
                >
                  <circle cx="0" cy="0" r="32" fill="#0f172a" stroke={selectedElement?.type === 'compass' ? "#38bdf8" : "#0284c7"} strokeWidth={selectedElement?.type === 'compass' ? 3 : 2} />
                  <path d="M 0 -28 L 6 0 L 0 4 L -6 0 Z" fill="#ef4444" />
                  <path d="M 0 28 L 6 0 L 0 -4 L -6 0 Z" fill="#94a3b8" />
                  <text x="0" y="-34" fill="#ef4444" fontSize="12" fontWeight="800" textAnchor="middle">N</text>
                  {selectedElement?.type === 'compass' && (
                    <circle cx="0" cy="0" r="38" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" />
                  )}
                </g>
              )}

              {/* Plots */}
              {mapData.plots.map((plot) => {
                const isSelected = selectedElement?.item?.id === plot.id;
                const centroid = getPolygonCentroid(plot.points);
                const isEditingThisPlot = editingPlotId === plot.id;

                return (
                  <g 
                    key={plot.id} 
                    onMouseDown={(e) => handleShapeMouseDown(e, 'plot', plot)}
                    onDoubleClick={() => handlePlotDoubleClick(plot)}
                    style={{ cursor: 'move' }}
                  >
                    <polygon
                      points={getPointsString(plot.points)}
                      fill={plot.fillColor || "#fecaca"}
                      stroke={isSelected ? "#38bdf8" : "#ffffff"}
                      strokeWidth={isSelected ? 3.5 : 1.5}
                      className={`plot-polygon ${plot.status}`}
                    />

                    {!isEditingThisPlot && (
                      <text x={centroid.x} y={centroid.y} className="plot-label">
                        {plot.plotNo}
                      </text>
                    )}

                    {isSelected && (
                      <>
                        {/* Midpoint '+' buttons to insert new plot corners */}
                        {plot.points.map((pt, idx) => {
                          const nextPt = plot.points[(idx + 1) % plot.points.length];
                          const mx = (pt[0] + nextPt[0]) / 2;
                          const my = (pt[1] + nextPt[1]) / 2;
                          return (
                            <g 
                              key={`plot-mid-${idx}`}
                              onClick={(e) => handleAddPlotNode(e, plot.id, idx + 1, [snapToGrid(mx), snapToGrid(my)])}
                              style={{ cursor: 'pointer' }}
                            >
                              <circle cx={mx} cy={my} r={7} fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                              <text x={mx} y={my} fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" dominantBaseline="central" pointerEvents="none">+</text>
                            </g>
                          );
                        })}

                        {/* Corner nodes */}
                        {plot.points.map(([x, y], idx) => (
                          <circle
                            key={idx}
                            cx={x} cy={y} r={7}
                            fill="#38bdf8" stroke="#ffffff" strokeWidth="2"
                            style={{ cursor: 'grab' }}
                            title="Drag corner | Double-click to delete corner"
                            onMouseDown={(e) => handleCornerNodeMouseDown(e, 'plot', plot.id, idx)}
                            onDoubleClick={(e) => handleRemovePlotNode(e, plot.id, idx)}
                          />
                        ))}
                      </>
                    )}
                  </g>
                );
              })}

              {/* Free Text Labels */}
              {mapData.labels && mapData.labels.map((label) => {
                const isSelected = selectedElement?.item?.id === label.id;
                const isEditingThisLabel = editingPlotId === label.id;

                return (
                  <g 
                    key={label.id}
                    onMouseDown={(e) => handleShapeMouseDown(e, 'label', label)}
                    onDoubleClick={() => handlePlotDoubleClick(label)}
                    style={{ cursor: 'move' }}
                  >
                    {!isEditingThisLabel && (
                      <text x={label.x} y={label.y} fontSize={16} fill={label.color || "#ffffff"} fontWeight="800" textAnchor="middle" dominantBaseline="central">
                        {label.plotNo}
                      </text>
                    )}
                    {isSelected && !isEditingThisLabel && (
                       <rect x={label.x - 50} y={label.y - 12} width="100" height="24" fill="none" stroke="#38bdf8" strokeDasharray="4 4" pointerEvents="none" />
                    )}
                  </g>
                );
              })}
              </g>
            </svg>

            {/* Inline Text Edit Overlay */}
            {editingPlotId && (() => {
              let centroid = { x: 0, y: 0 };
              if (editingPlotId.startsWith('plot-')) {
                const currentPlot = mapData.plots.find(p => p.id === editingPlotId);
                if (!currentPlot) return null;
                centroid = getPolygonCentroid(currentPlot.points);
              } else if (editingPlotId.startsWith('road-')) {
                const currentRoad = mapData.roads.find(r => r.id === editingPlotId);
                if (!currentRoad || !currentRoad.points || currentRoad.points.length < 2) return null;
                const p1 = currentRoad.points[0];
                const p2 = currentRoad.points[currentRoad.points.length - 1];
                centroid = { x: Math.round((p1[0] + p2[0]) / 2), y: Math.round((p1[1] + p2[1]) / 2) };
              } else if (editingPlotId.startsWith('label-')) {
                const currentLabel = (mapData.labels || []).find(l => l.id === editingPlotId);
                if (!currentLabel) return null;
                centroid = { x: currentLabel.x, y: currentLabel.y };
              } else {
                return null;
              }

              return (
                <div 
                  style={{
                    position: 'absolute',
                    top: `${centroid.y - 18}px`,
                    left: `${centroid.x - 55}px`,
                    zIndex: 100
                  }}
                >
                  <input
                    type="text"
                    value={inlinePlotNo}
                    onChange={(e) => setInlinePlotNo(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveInlinePlotNo(editingPlotId); }}
                    onBlur={() => saveInlinePlotNo(editingPlotId)}
                    autoFocus
                    style={{
                      width: '110px',
                      padding: '0.25rem 0.4rem',
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      textAlign: 'center',
                      background: '#0f172a',
                      color: '#38bdf8',
                      border: '2px solid #38bdf8',
                      borderRadius: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.8)'
                    }}
                  />
                </div>
              );
            })()}
          </div>

          {/* Floating Controls */}
          <div className="floating-controls">
            <button 
              className="control-btn" 
              onClick={() => setIsInspectorOpen(!isInspectorOpen)} 
              title={isInspectorOpen ? "Fullscreen Canvas View" : "Show Inspector Sidebar"}
              style={{ background: isInspectorOpen ? '#1e293b' : '#3b82f6', color: '#ffffff' }}
            >
              {isInspectorOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </button>
            <button className="control-btn" onClick={handleCenterCanvas} title="Center Canvas">
              <Move size={18} />
            </button>
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
        </main>

        {/* 📋 RIGHT INSPECTOR TABS (Properties, Layers, JSON Export) */}
        <aside className={`ps-inspector-right ${isInspectorOpen ? '' : 'collapsed'}`}>
          <div className="ps-inspector-tabs">
            <button 
              className={`ps-inspector-tab-btn ${activeTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setActiveTab('inspector')}
            >
              <Sliders size={15} /> Properties
            </button>

            <button 
              className={`ps-inspector-tab-btn ${activeTab === 'layers' ? 'active' : ''}`}
              onClick={() => setActiveTab('layers')}
            >
              <Layers size={15} /> Layers ({mapData.plots.length + mapData.roads.length})
            </button>

            <button 
              className={`ps-inspector-tab-btn ${activeTab === 'json' ? 'active' : ''}`}
              onClick={() => setActiveTab('json')}
            >
              <FileText size={15} /> JSON Schema
            </button>
          </div>

          <div className="ps-inspector-content">
            {activeTab === 'inspector' && (
              <>
                {selectedElement ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#38bdf8' }}>
                        Selected: {selectedElement.item.plotNo || selectedElement.item.name}
                      </h3>
                      <button 
                        onClick={() => handleDeleteElement(selectedElement.type, selectedElement.item.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {selectedElement.type === 'plot' && (() => {
                      const activePlot = mapData.plots.find(p => p.id === selectedElement.item.id) || selectedElement.item;
                      return (
                        <>
                          <div className="form-group">
                            <label className="form-label">Plot Number</label>
                            <input 
                              type="text" className="form-input" 
                              value={activePlot.plotNo || ''} 
                              onChange={(e) => {
                                const val = e.target.value;
                                const updatedPlots = mapData.plots.map(p => p.id === activePlot.id ? { ...p, plotNo: val } : p);
                                setMapData({ ...mapData, plots: updatedPlots });
                                setSelectedElement({ ...selectedElement, item: { ...activePlot, plotNo: val } });
                              }}
                              onBlur={() => pushHistory(mapData)}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Area (SQ.YD)</label>
                            <input 
                              type="text" className="form-input" 
                              value={activePlot.areaSqYard || ''} 
                              onChange={(e) => {
                                const val = e.target.value;
                                const updatedPlots = mapData.plots.map(p => p.id === activePlot.id ? { ...p, areaSqYard: val } : p);
                                setMapData({ ...mapData, plots: updatedPlots });
                                setSelectedElement({ ...selectedElement, item: { ...activePlot, areaSqYard: val } });
                              }}
                              onBlur={() => pushHistory(mapData)}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Dimensions (e.g. 30' x 40')</label>
                            <input 
                              type="text" className="form-input" 
                              value={activePlot.dimensions || ''} 
                              onChange={(e) => {
                                const val = e.target.value;
                                const updatedPlots = mapData.plots.map(p => p.id === activePlot.id ? { ...p, dimensions: val } : p);
                                setMapData({ ...mapData, plots: updatedPlots });
                                setSelectedElement({ ...selectedElement, item: { ...activePlot, dimensions: val } });
                              }}
                              onBlur={() => pushHistory(mapData)}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Color Theme</label>
                            <select 
                              className="form-select"
                              value={activePlot.fillColor || '#bfdbfe'}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updatedPlots = mapData.plots.map(p => p.id === activePlot.id ? { ...p, fillColor: val } : p);
                                pushHistory({ ...mapData, plots: updatedPlots });
                                setSelectedElement({ ...selectedElement, item: { ...activePlot, fillColor: val } });
                              }}
                            >
                              <option value="#fecaca">Red Pastel</option>
                              <option value="#bfdbfe">Blue Pastel</option>
                              <option value="#fbcfe8">Pink Pastel</option>
                              <option value="#e9d5ff">Purple Pastel</option>
                              <option value="#fef08a">Yellow Pastel</option>
                              <option value="#bbf7d0">Green Pastel</option>
                              <option value="#fed7aa">Orange Pastel</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Plot Status</label>
                            <select 
                              className="form-select"
                              value={activePlot.status || 'available'}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updatedPlots = mapData.plots.map(p => p.id === activePlot.id ? { ...p, status: val } : p);
                                pushHistory({ ...mapData, plots: updatedPlots });
                                setSelectedElement({ ...selectedElement, item: { ...activePlot, status: val } });
                              }}
                            >
                              <option value="available">Available (Green)</option>
                              <option value="booked">Booked (Yellow)</option>
                              <option value="sold">Sold (Red)</option>
                            </select>
                          </div>

                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', background: '#0f172a', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #334155' }}>
                            💡 <b>Tip:</b> Click blue <b>+</b> icons along plot borders to add extra corners. Double-click corner dots to remove.
                          </div>
                        </>
                      );
                    })()}

                    {selectedElement.type === 'road' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Road Name / Text</label>
                          <input 
                            type="text" className="form-input" 
                            value={selectedElement.item.name || ''} 
                            onChange={(e) => {
                              const val = e.target.value;
                              const updatedRoads = mapData.roads.map(r => r.id === selectedElement.item.id ? { ...r, name: val } : r);
                              pushHistory({ ...mapData, roads: updatedRoads });
                              setSelectedElement({ ...selectedElement, item: { ...selectedElement.item, name: val } });
                            }}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Road Width: {selectedElement.item.width || 28}px</label>
                          <input 
                            type="range" min="16" max="70" step="2"
                            className="form-input"
                            value={selectedElement.item.width || 28} 
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              const updatedRoads = mapData.roads.map(r => r.id === selectedElement.item.id ? { ...r, width: val } : r);
                              pushHistory({ ...mapData, roads: updatedRoads });
                              setSelectedElement({ ...selectedElement, item: { ...selectedElement.item, width: val } });
                            }}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Road Surface Color</label>
                          <select 
                            className="form-select"
                            value={selectedElement.item.color || '#475569'}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updatedRoads = mapData.roads.map(r => r.id === selectedElement.item.id ? { ...r, color: val } : r);
                              pushHistory({ ...mapData, roads: updatedRoads });
                              setSelectedElement({ ...selectedElement, item: { ...selectedElement.item, color: val } });
                            }}
                          >
                            <option value="#334155">Dark Asphalt (#334155)</option>
                            <option value="#475569">Medium Slate (#475569)</option>
                            <option value="#1e293b">Black Road (#1e293b)</option>
                            <option value="#64748b">Concrete Grey (#64748b)</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Road Curvature / Geometry</label>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="ps-ribbon-btn"
                              style={{
                                flex: 1,
                                justifyContent: 'center',
                                background: !selectedElement.item.isSmooth ? '#3b82f622' : 'transparent',
                                borderColor: !selectedElement.item.isSmooth ? '#3b82f6' : '#334155',
                                color: !selectedElement.item.isSmooth ? '#60a5fa' : '#94a3b8'
                              }}
                              onClick={() => {
                                const updatedRoads = mapData.roads.map(r => r.id === selectedElement.item.id ? { ...r, isSmooth: false } : r);
                                pushHistory({ ...mapData, roads: updatedRoads });
                                setSelectedElement({ ...selectedElement, item: { ...selectedElement.item, isSmooth: false } });
                              }}
                            >
                              Straight / 90°
                            </button>
                            <button
                              type="button"
                              className="ps-ribbon-btn"
                              style={{
                                flex: 1,
                                justifyContent: 'center',
                                background: selectedElement.item.isSmooth ? '#3b82f622' : 'transparent',
                                borderColor: selectedElement.item.isSmooth ? '#3b82f6' : '#334155',
                                color: selectedElement.item.isSmooth ? '#60a5fa' : '#94a3b8'
                              }}
                              onClick={() => {
                                const updatedRoads = mapData.roads.map(r => r.id === selectedElement.item.id ? { ...r, isSmooth: true } : r);
                                pushHistory({ ...mapData, roads: updatedRoads });
                                setSelectedElement({ ...selectedElement, item: { ...selectedElement.item, isSmooth: true } });
                              }}
                            >
                              Smooth Curve
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', background: '#0f172a', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #334155' }}>
                          💡 <b>Tip:</b> Click green <b>+</b> icons between points to add new curves/turns. Double-click blue dots to remove points.
                        </div>
                      </>
                    )}

                    {selectedElement.type === 'compass' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Rotate Compass: {mapData.compass?.rotation || 0}°</label>
                          <input 
                            type="range" min="0" max="360" step="5"
                            className="form-input"
                            value={mapData.compass?.rotation || 0} 
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              pushHistory({ ...mapData, compass: { ...mapData.compass, rotation: val } });
                            }}
                          />
                        </div>

                        <button 
                          className="ps-ribbon-btn"
                          onClick={() => handleDeleteElement('compass', 'compass')}
                          style={{ background: '#ef444422', color: '#ef4444', borderColor: '#ef4444', width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                        >
                          <Trash2 size={16} /> Delete Compass
                        </button>
                      </>
                    )}

                    {selectedElement.type === 'tree' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Landscaping Tree Stamp</label>
                          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Drag on canvas to place anywhere or align with plots/roads.</p>
                        </div>

                        <button 
                          className="ps-ribbon-btn"
                          onClick={() => handleDeleteElement('tree', selectedElement.item.id)}
                          style={{ background: '#ef444422', color: '#ef4444', borderColor: '#ef4444', width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                        >
                          <Trash2 size={16} /> Delete Tree
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Move size={32} style={{ color: '#38bdf8', opacity: 0.6, marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>Select Any Canvas Item</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Click any plot or road on canvas to view and edit its properties.
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'layers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>PLOTS LAYER ({mapData.plots.length})</span>
                {mapData.plots.map(plot => (
                  <div key={plot.id} className="ps-layer-item">
                    <span style={{ fontWeight: '700', color: '#38bdf8' }}>{plot.plotNo} ({plot.areaSqYard} SQ.YD)</span>
                    <div className="ps-layer-actions">
                      <Trash2 size={14} onClick={() => handleDeleteElement('plot', plot.id)} />
                    </div>
                  </div>
                ))}

                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginTop: '0.5rem' }}>ROADS LAYER ({mapData.roads.length})</span>
                {mapData.roads.map(road => (
                  <div key={road.id} className="ps-layer-item">
                    <span style={{ fontWeight: '600', color: '#fde047' }}>{road.name} ({road.width}px)</span>
                    <div className="ps-layer-actions">
                      <Trash2 size={14} onClick={() => handleDeleteElement('road', road.id)} />
                    </div>
                  </div>
                ))}

                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginTop: '0.5rem' }}>TREES LAYER ({(mapData.trees || []).length})</span>
                {(mapData.trees || []).map((tree, idx) => {
                  const tId = tree.id || `tree-${idx}`;
                  return (
                    <div key={tId} className="ps-layer-item">
                      <span style={{ fontWeight: '600', color: '#4ade80' }}>Tree #{idx + 1} ({tree.x}, {tree.y})</span>
                      <div className="ps-layer-actions">
                        <Trash2 size={14} onClick={() => handleDeleteElement('tree', tId)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 📄 LIVE JSON SCHEMA & EXPORT TAB */}
            {activeTab === 'json' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Generated JSON Layout Output</span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn-secondary" onClick={handleCopyJson} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                      {copied ? <Check size={14} color="#4ade80" /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button className="btn-secondary" onClick={handleDownloadJson} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>
                <pre className="json-preview-box">
                  {JSON.stringify(mapData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 📊 BOTTOM FOOTER STATUS BAR */}
      <footer className="ps-bottom-status-bar">
        <div className="ps-status-group">
          <div className="ps-status-item">
            <span>CURSOR:</span>
            <span style={{ color: '#38bdf8', fontWeight: '700' }}>X: {cursorPos.x}px | Y: {cursorPos.y}px</span>
          </div>

          <div className="ps-status-item">
            <span>CANVAS SIZE:</span>
            <span style={{ color: '#e2e8f0', fontWeight: '700' }}>1300 x 900 px</span>
          </div>
        </div>

        <div className="ps-status-group">
          <span style={{ color: '#4ade80', fontWeight: '700' }}>STATUS: READY & SYNCED</span>
          <span style={{ color: '#fbbf24', fontWeight: '700' }}>ZOOM: {Math.round(zoom * 100)}%</span>
        </div>
      </footer>
    </div>
  );
}
