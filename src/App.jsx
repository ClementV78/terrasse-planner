import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import DrawingCanvas from './DrawingCanvas';
import useTiles from './useTiles.jsx';
import { Line, Text, Rect, Group, Circle } from 'react-konva';
import useDrawing from './useDrawing.jsx';

export default function App() {
  const containerRef = useRef(null);
  const stageRef = useRef();

  // Chargement initial depuis localStorage
  const getInitialPlan = () => {
    try {
      const saved = localStorage.getItem('terrasseplanner-plan');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  };
  const initialPlan = getInitialPlan();

  // États de base
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(typeof initialPlan.scale === 'number' ? initialPlan.scale : 80);
  const [area, setArea] = useState(0);
  const [gridVisible, setGridVisible] = useState(true);

  // États pour le calepinage
  const [tileW, setTileW] = useState(typeof initialPlan.tileW === 'number' ? initialPlan.tileW : 120); // largeur en cm
  const [tileH, setTileH] = useState(typeof initialPlan.tileH === 'number' ? initialPlan.tileH : 30);  // hauteur en cm
  const [spacing, setSpacing] = useState(typeof initialPlan.spacing === 'number' ? initialPlan.spacing : 3);
  const [pattern, setPattern] = useState(initialPlan.pattern || 'straight');
  const [orientation, setOrientation] = useState(typeof initialPlan.orientation === 'number' ? initialPlan.orientation : 0);
  const [tileCount, setTileCount] = useState({ full: 0, partial: 0 });

  const [useOffcuts, setUseOffcuts] = useState(true);

  // Fonction pour calculer l'aire (prend points et scale en argument)
  const calculateArea = (pts, scl) => {
    if (!pts || pts.length < 6) return 0;
    let area = 0;
    for (let i = 0; i < pts.length; i += 2) {
      const x1 = pts[i];
      const y1 = pts[i + 1];
      const x2 = pts[(i + 2) % pts.length];
      const y2 = pts[(i + 3) % pts.length];
      area += (x1 * y2 - x2 * y1);
    }
    return Math.abs(area / (2 * scl * scl));
  };

  // Utilisation du hook useDrawing pour toute la logique de dessin
  const drawingState = useDrawing(initialPlan, scale, calculateArea);
  const {
    points, setPoints,
    mousePos, setMousePos,
    drawing, setDrawing,
    calepinageMode, setCalepinageMode,
    startPoint, setStartPoint,
    selectedPoint, setSelectedPoint,
    isDragging, setIsDragging,
    isCorner,
    getStartCornerType,
    handleClick,
    resetDrawing
  } = drawingState;

  // Gestion du redimensionnement
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current.parentElement;
      const newWidth = Math.floor(container.offsetWidth * 0.9);
      const newHeight = Math.floor(window.innerHeight * 0.95);
      
      setStageSize({ width: newWidth, height: newHeight });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Sauvegarde automatique dans localStorage à chaque modification du plan
  useEffect(() => {
    const data = {
      points,
      tileW,
      tileH,
      spacing,
      pattern,
      orientation,
      startPoint,
      scale
    };
    localStorage.setItem('terrasseplanner-plan', JSON.stringify(data));
  }, [points, tileW, tileH, spacing, pattern, orientation, startPoint, scale]);

  // Recalcul automatique de la surface dès que les points changent et que le dessin est fermé
  useEffect(() => {
    if (!drawing && points.length >= 6) {
      setArea(calculateArea(points, scale));
    } else {
      setArea(0);
    }
  }, [points, drawing, scale]);

  // Fonction pour le quadrillage
  const renderGrid = useCallback(() => {
    if (!gridVisible) return null;
    const gridLines = [];
    const width = stageSize.width;
    const height = stageSize.height;
    const decimetreSize = scale / 10;
    
    // Lignes verticales
    for (let x = 0; x <= width; x += decimetreSize) {
      const isMetre = x % scale === 0;
      gridLines.push(
        <Line
          key={`v${x}`}
          points={[x, 0, x, height]}
          stroke="#ddd"
          strokeWidth={isMetre ? 0.5 : 0.1}
          dash={isMetre ? [2, 4] : [1, 3]}
        />
      );
      if (isMetre) {
        gridLines.push(
          <Text
            key={`vt${x}`}
            x={x + 5}
            y={5}
            text={`${(x/scale).toFixed(1)}m`}
            fontSize={10}
            fill="#999"
          />
        );
      }
    }
    
    // Lignes horizontales
    for (let y = 0; y <= height; y += decimetreSize) {
      const isMetre = y % scale === 0;
      gridLines.push(
        <Line
          key={`h${y}`}
          points={[0, y, width, y]}
          stroke="#ddd"
          strokeWidth={isMetre ? 0.5 : 0.1}
          dash={isMetre ? [2, 4] : [1, 3]}
        />
      );
      if (isMetre) {
        gridLines.push(
          <Text
            key={`ht${y}`}
            x={5}
            y={y + 5}
            text={`${(y/scale).toFixed(1)}m`}
            fontSize={10}
            fill="#999"
          />
        );
      }
    }
    
    return gridLines;
  }, [gridVisible, scale, stageSize]);

  // Fonction pour les dimensions
  const renderDimensions = useCallback(() => {
    if (points.length < 4) return null;
    const dims = [];
    // Calcul du barycentre pour déterminer l'extérieur
    let cx = 0, cy = 0, n = points.length / 2;
    for (let i = 0; i < points.length; i += 2) {
      cx += points[i];
      cy += points[i + 1];
    }
    cx /= n;
    cy /= n;
    for (let i = 0; i < points.length - 2; i += 2) {
      const x1 = points[i];
      const y1 = points[i + 1];
      const x2 = points[i + 2];
      const y2 = points[i + 3];
      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / scale;
      if (length < 0.01) continue; // Ignore les segments nuls
      const roundedLength = Math.round(length * 10) / 10;
      const isHorizontal = Math.abs(x2 - x1) > Math.abs(y2 - y1);
      // Décalage vers l'extérieur
      const OFFSET = 40;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      // Vecteur normal
      const nx = Math.cos(angle + Math.PI / 2);
      const ny = Math.sin(angle + Math.PI / 2);
      // Vérifier si le barycentre est du bon côté, sinon inverser
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const vx = mx + nx * OFFSET - cx;
      const vy = my + ny * OFFSET - cy;
      const vPoly = (mx - cx) * nx + (my - cy) * ny;
      const sign = vPoly > 0 ? 1 : -1;
      const offsetX = OFFSET * nx * sign;
      const offsetY = OFFSET * ny * sign;
      const coteLine1X1 = x1 + offsetX;
      const coteLine1Y1 = y1 + offsetY;
      const coteLine1X2 = x2 + offsetX;
      const coteLine1Y2 = y2 + offsetY;
      dims.push(
        <Group key={`dim-${i}`}>
          <Line
            points={[coteLine1X1, coteLine1Y1, coteLine1X2, coteLine1Y2]}
            stroke="#2563eb"
            strokeWidth={1}
            dash={[4, 4]}
          />
          <Line
            points={[x1, y1, coteLine1X1, coteLine1Y1]}
            stroke="#2563eb"
            strokeWidth={1}
          />
          <Line
            points={[x2, y2, coteLine1X2, coteLine1Y2]}
            stroke="#2563eb"
            strokeWidth={1}
          />
          <Group
            x={(coteLine1X1 + coteLine1X2) / 2}
            y={(coteLine1Y1 + coteLine1Y2) / 2}
            rotation={isHorizontal ? 0 : -90}
          >
            <Rect
              width={45}
              height={20}
              x={-22.5}
              y={-10}
              fill="white"
              cornerRadius={4}
            />
            <Text
              text={`${roundedLength.toFixed(1)}m`}
              fontSize={12}
              fontFamily="sans-serif"
              fill="#2563eb"
              align="center"
              verticalAlign="middle"
              width={45}
              height={20}
              x={-22.5}
              y={-10}
            />
          </Group>
        </Group>
      );
    }
    return dims;
  }, [points, scale]);

  // Utilisation du hook useTiles pour le calepinage
  const renderTiles = useTiles({
    points, startPoint, scale, tileW, tileH, spacing, pattern, orientation, getStartCornerType, useOffcuts, setTileCount
  });

  // Sauvegarde du plan
  const handleSave = () => {
    const data = {
      points,
      tileW,
      tileH,
      spacing,
      pattern,
      orientation,
      startPoint,
      scale
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plan-terrasse.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Chargement du plan
  const handleLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.points && Array.isArray(data.points)) setPoints(data.points);
        if (typeof data.tileW === 'number') setTileW(data.tileW);
        if (typeof data.tileH === 'number') setTileH(data.tileH);
        if (typeof data.spacing === 'number') setSpacing(data.spacing);
        if (typeof data.pattern === 'string') setPattern(data.pattern);
        if (typeof data.orientation === 'number') setOrientation(data.orientation);
        if (data.startPoint) setStartPoint(data.startPoint);
        if (typeof data.scale === 'number') setScale(data.scale);
        setDrawing(false);
        setCalepinageMode(false);
      } catch (err) {
        alert('Erreur lors du chargement du plan.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 grid grid-cols-4 gap-4">
      <div className="col-span-1 space-y-4">
        <Sidebar
          area={area}
          tileCount={tileCount}
          drawing={drawing}
          points={points}
          startPoint={startPoint}
          calepinageMode={calepinageMode}
          gridVisible={gridVisible}
          useOffcuts={useOffcuts}
          setDrawing={setDrawing}
          setCalepinageMode={setCalepinageMode}
          resetDrawing={resetDrawing}
          setGridVisible={setGridVisible}
          tileW={tileW}
          setTileW={setTileW}
          tileH={tileH}
          setTileH={setTileH}
          spacing={spacing}
          setSpacing={setSpacing}
          pattern={pattern}
          setPattern={setPattern}
          orientation={orientation}
          setOrientation={setOrientation}
          setUseOffcuts={setUseOffcuts}
          handleSave={handleSave}
          handleLoad={handleLoad}
        />
      </div>
      <div className="col-span-3" ref={containerRef}>
        <DrawingCanvas
          stageSize={stageSize}
          drawing={drawing}
          points={points}
          mousePos={mousePos}
          calepinageMode={calepinageMode}
          startPoint={startPoint}
          handleClick={handleClick}
          renderGrid={renderGrid}
          renderDimensions={renderDimensions}
          renderTiles={renderTiles}
          isCorner={isCorner}
          setMousePos={setMousePos}
          stageRef={stageRef}
          scale={scale}
        />
      </div>
    </div>
  );
}