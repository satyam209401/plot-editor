import React, { useState } from 'react';
import PlotViewer from './PlotViewer.jsx';
import PlotEditor from './PlotEditor.jsx';
import { Eye, Edit3, Layers } from 'lucide-react';

const emptyProject = {
  projectTitle: "Untitled Project",
  totalLandArea: "0 SQ YARD",
  totalPlotArea: "0 SQ YARD",
  totalRoadArea: "0 SQ YARD",
  canvasWidth: 1300,
  canvasHeight: 900,
  compass: null,
  roads: [],
  trees: [],
  plots: []
};

export default function App() {
  const [activeTab, setActiveTab] = useState('editor'); // Default to Photoshop CAD Studio Editor
  const [plotData, setPlotData] = useState(emptyProject);

  const handleDataSave = (updatedData) => {
    setPlotData(updatedData);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Navigation Header */}
      <header className="app-header">
        <div className="brand-title">
          <Layers size={24} color="#60a5fa" />
          <span>React 2D CAD Plot Map Studio</span>
        </div>

        {/* View / Edit Mode Switcher Tabs */}
        <div className="tab-group">
          <button 
            type="button"
            className={`tab-btn ${activeTab === 'viewer' ? 'active' : ''}`}
            onClick={() => setActiveTab('viewer')}
          >
            <Eye size={16} />
            <span>Viewer Panel</span>
          </button>
          <button 
            type="button"
            className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            <Edit3 size={16} />
            <span>Photoshop Studio Editor</span>
          </button>
        </div>
      </header>

      {/* Main Mode Viewport */}
      <main style={{ flex: 1, position: 'relative' }}>
        {activeTab === 'viewer' ? (
          <PlotViewer data={plotData} />
        ) : (
          <PlotEditor initialData={plotData} onSave={handleDataSave} />
        )}
      </main>
    </div>
  );
}
