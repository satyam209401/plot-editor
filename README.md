# 🗺️ React 2D CAD Plot & Township Map Studio

A modern, high-precision **2D CAD Real Estate Master Plan & Township Layout Studio** built with React and SVG. It provides an AutoCAD / Photoshop-style layout editor alongside a client-facing interactive master plan viewer.

Components are **100% modular and decoupled** with separate CSS styles, allowing you to drop either component directly into any external React application.

---

## 🌟 Key Features

### 1. 🖌️ Photoshop CAD Studio Editor (`PlotEditor.jsx`)
- **Drag & Drop Palette**: Drag plots, roads, tree stamps, compass roses, and text directly onto the SVG canvas.
- **Micro-Precision Grid (4px)**: Ultra-fine graph paper grid with automatic snap-to-grid alignment.
- **Smart Spline Roads**: Smooth Catmull-Rom spline curves where the road passes directly through every control node without drifting.
- **Segment-Aware Road Labels**: Intelligent text splitting across corner/L-turn road segments, keeping corner vertices completely free of text collisions.
- **Midpoint Node Addition**: Interactive `+` buttons on plot edges and road segments to insert new nodes and create custom polygon shapes.
- **Corner Reshaping**: Grab and drag any corner vertex to modify plot dimensions; double-click any node to delete it.
- **Right Inspector Panel**: Real-time property editor for Plot Numbers, SQ.YD Area, Dimensions, Fill Colors, and Status (Available, Booked, Sold).
- **History Stack**: Full Undo/Redo support (`Ctrl+Z` / `Ctrl+Y`).
- **Data Export**: Live JSON export and copy-to-clipboard functionality.

### 2. 👁️ Interactive Client Master Plan Viewer (`PlotViewer.jsx`)
- **Interactive SVG Map**: Real-time high-resolution vector layout rendering with support for underlying raster site maps.
- **Instant Search & Status Filter**: Search plots by Plot Number or Area; filter by Available, Booked, or Sold status with live count badges.
- **Plot Inspection Card**: Click any plot to view its exact area, dimensions, status, and pricing rate.
- **CAD Schedule Matrix Table**: Comprehensive tabular list of all plots and dimensions.
- **Clean Inside-Box Typography**: Centered, readable white plot numbers and square-yard sublabels.
- **Background Tap Deselection**: Tap or click any empty background area to instantly clear active plot selections.

---

## 📁 Visual Folder Structure

```
2D-Map/
├── .gitignore                   # Excludes node_modules, build outputs, and logs
├── index.html                   # HTML5 entry template
├── package.json                 # Project dependencies and script definitions
├── README.md                    # In-depth project documentation
├── vite.config.js               # Vite bundler configuration
└── src/
    ├── App.jsx                  # Main application shell with tab switcher
    ├── index.css                # Shell layout & global font tokens
    ├── main.jsx                 # React root DOM mount entry
    │
    ├── PlotViewer.jsx           # Standalone Interactive 2D Map Viewer component
    ├── PlotViewer.css           # Standalone CSS for PlotViewer (zero outside dependencies)
    │
    ├── PlotEditor.jsx           # Standalone CAD Studio Editor component
    ├── PlotEditor.css           # Standalone CSS for PlotEditor (zero outside dependencies)
    │
    ├── utils/
    │   └── mapUtils.js          # Shared Catmull-Rom splines, road paths & geometry helpers
    │
    └── data/
        └── samplePlots.json     # Sample master township dataset for quick start
```

---

## 📦 How to Use in External React Projects

### Installation Method 1: Direct NPM install from GitHub (Recommended)
```bash
npm install git+https://github.com/satyam209401/plot-editor.git
```
Then import directly:
```jsx
import { PlotViewer, PlotEditor } from 'react-2d-plot-map';
```

### Installation Method 2: Copy-Paste Components
Copy `PlotViewer.jsx`, `PlotViewer.css`, `PlotEditor.jsx`, `PlotEditor.css`, and `utils/mapUtils.js` into your project.

---

### 👁️ Using the Interactive Viewer (`PlotViewer`)

```jsx
import React from 'react';
import { PlotViewer } from 'react-2d-plot-map'; // or import PlotViewer from './PlotViewer';

export default function MasterPlanPage() {
  const handlePlotSelect = (plot) => {
    if (plot) {
      console.log("Selected Plot:", plot.plotNo, plot.areaSqYard, plot.price);
      // Trigger your custom modal, enquiry form, or booking drawer here!
    } else {
      console.log("Selection cleared");
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <PlotViewer 
        data={layoutData} 
        onPlotSelect={handlePlotSelect} 
        showSidebar={true} // Set to false to hide built-in sidebar and show only 2D map canvas
      />
    </div>
  );
}
```

#### Viewer Props:
| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `Object` | *Required* | Complete master plan layout JSON object |
| `onPlotSelect` | `Function` | `undefined` | Callback fired when a plot is selected or cleared: `(plot) => void` |
| `showSidebar` | `Boolean` | `true` | Show or hide the built-in property inspector sidebar |

### Option B: Using the CAD Studio Editor

Copy `src/PlotEditor.jsx`, `src/PlotEditor.css`, and `src/utils/mapUtils.js` into your project:

```jsx
import React, { useState } from 'react';
import PlotEditor from './PlotEditor';

export default function AdminEditorPage() {
  const [mapData, setMapData] = useState(null);

  const handleSave = (updatedLayout) => {
    console.log("Updated layout saved:", updatedLayout);
    // Send updatedLayout to your backend API or database
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <PlotEditor initialData={mapData} onSave={handleSave} />
    </div>
  );
}
```

---

## 📊 Data Schema Reference

The data object consumed by `PlotViewer` and produced by `PlotEditor` adheres to the following structure:

```json
{
  "projectTitle": "BINGWAN CITY KANPUR",
  "totalLandArea": "5000 SQ YARD",
  "totalPlotArea": "3711 SQ YARD",
  "totalRoadArea": "1614 SQ YARD",
  "canvasWidth": 1300,
  "canvasHeight": 900,
  "mapImageUrl": "",
  "compass": {
    "x": 880,
    "y": 250,
    "rotation": 15
  },
  "roads": [
    {
      "id": "road-1",
      "name": "30 FT MAIN ROAD",
      "width": 28,
      "color": "#475569",
      "isSmooth": false,
      "points": [[100, 100], [100, 400], [500, 400]]
    }
  ],
  "trees": [
    { "x": 120, "y": 60 }
  ],
  "plots": [
    {
      "id": "plot-1",
      "plotNo": "P.N.1",
      "areaSqYard": "100.00",
      "dimensions": "30' x 40'",
      "status": "available",
      "price": "₹6,500 / SQ.YD",
      "fillColor": "#fecaca",
      "points": [[380, 130], [450, 130], [450, 240], [380, 240]]
    }
  ]
}
```

---

## 🛠️ Local Development & Setup

### Prerequisites
- Node.js (version 18+ recommended)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/satyam209401/plot-editor.git

# Navigate into project directory
cd plot-editor

# Install dependencies
npm install
```

### Running Locally
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Production Build
```bash
# Compile and optimize production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 📄 License
MIT License. Free to use and integrate into personal and commercial projects.
