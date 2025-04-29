import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Group, Circle, Text } from 'react-konva';

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
  const [points, setPoints] = useState(initialPlan.points || []);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [drawing, setDrawing] = useState(false);
  const [scale, setScale] = useState(typeof initialPlan.scale === 'number' ? initialPlan.scale : 80);
  const [area, setArea] = useState(0);
  const [gridVisible, setGridVisible] = useState(true);

  // États pour le calepinage
  const [tileW, setTileW] = useState(typeof initialPlan.tileW === 'number' ? initialPlan.tileW : 120); // largeur en cm
  const [tileH, setTileH] = useState(typeof initialPlan.tileH === 'number' ? initialPlan.tileH : 30);  // hauteur en cm
  const [spacing, setSpacing] = useState(typeof initialPlan.spacing === 'number' ? initialPlan.spacing : 3);
  const [pattern, setPattern] = useState(initialPlan.pattern || 'straight');
  const [orientation, setOrientation] = useState(typeof initialPlan.orientation === 'number' ? initialPlan.orientation : 0);
  const [calepinageMode, setCalepinageMode] = useState(false);
  const [startPoint, setStartPoint] = useState(initialPlan.startPoint || null);
  const [tileCount, setTileCount] = useState({ full: 0, partial: 0 });

  // États pour le drag & drop
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Fonction pour calculer l'aire
  const calculateArea = useCallback(() => {
    if (points.length < 6) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i += 2) {
      const x1 = points[i];
      const y1 = points[i + 1];
      const x2 = points[(i + 2) % points.length];
      const y2 = points[(i + 3) % points.length];
      area += (x1 * y2 - x2 * y1);
    }
    return Math.abs(area / (2 * scale * scale));
  }, [points, scale]);

  // Recalcul automatique de la surface dès que les points changent et que le dessin est fermé
  useEffect(() => {
    if (!drawing && points.length >= 6) {
      setArea(calculateArea());
    } else {
      setArea(0);
    }
  }, [points, drawing, calculateArea]);

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

  // Fonction pour vérifier si un point est un coin
  const isCorner = useCallback((x, y) => {
    return points.some((point, i) => {
      if (i % 2 === 0) {
        return Math.abs(points[i] - x) < 5 && Math.abs(points[i + 1] - y) < 5;
      }
      return false;
    });
  }, [points]);

  // Gestion du clic
  const handleClick = useCallback((e) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (!pos) return; // Protection contre les positions undefined

    // Mode calepinage
    if (calepinageMode) {
      if (isCorner(pos.x, pos.y)) {
        const snappedCorner = points.reduce((closest, point, i) => {
          if (i % 2 === 0) {
            const distance = Math.sqrt(
              Math.pow(pos.x - point, 2) + 
              Math.pow(pos.y - points[i + 1], 2)
            );
            if (distance < closest.distance) {
              return {
                distance,
                point: { x: point, y: points[i + 1] }
              };
            }
          }
          return closest;
        }, { distance: Infinity, point: null });

        if (snappedCorner.point) {
          setStartPoint(snappedCorner.point);
          setCalepinageMode(false);
        }
      }
      return;
    }

    // Mode dessin normal
    if (!drawing && points.length === 0) {
      setPoints([pos.x, pos.y]);
      setDrawing(true);
      return;
    }

    if (drawing) {
      const newPoints = [...points];
      
      // Vérifier si on ferme la forme
      if (points.length >= 6) {
        const startX = points[0];
        const startY = points[1];
        const distance = Math.sqrt(
          Math.pow(pos.x - startX, 2) + 
          Math.pow(pos.y - startY, 2)
        );

        if (distance < 20) {
          // Forcer le dernier point à 90°
          const lastX = points[points.length - 2];
          const lastY = points[points.length - 1];
          let forcedX = startX;
          let forcedY = startY;
          if (Math.abs(lastX - startX) > Math.abs(lastY - startY)) {
            forcedY = lastY;
          } else {
            forcedX = lastX;
          }
          setPoints([...points, forcedX, forcedY, startX, startY]);
          setDrawing(false);
          setArea(calculateArea());
          return;
        }
      }

      // Snap à 90°
      const lastX = points[points.length - 2];
      const lastY = points[points.length - 1];
      if (lastX === undefined || lastY === undefined) return;
      let dx = pos.x - lastX;
      let dy = pos.y - lastY;
      let nx = lastX, ny = lastY;
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal
        let length = (pos.x - lastX) / scale;
        let roundedLength = Math.round(Math.abs(length) * 10) / 10 * Math.sign(length);
        nx = lastX + roundedLength * scale;
        ny = lastY;
      } else {
        // Vertical
        let length = (pos.y - lastY) / scale;
        let roundedLength = Math.round(Math.abs(length) * 10) / 10 * Math.sign(length);
        nx = lastX;
        ny = lastY + roundedLength * scale;
      }
      newPoints.push(nx, ny);
      setPoints(newPoints);
    }
  }, [drawing, points, calepinageMode, isCorner, calculateArea]);

  // Reset du dessin
  const resetDrawing = useCallback(() => {
    setPoints([]);
    setDrawing(false);
    setStartPoint(null);
    setArea(0);
    setCalepinageMode(false);
  }, []);

  // Détermine le coin sélectionné (haut-gauche, haut-droit, bas-gauche, bas-droit)
  const getStartCornerType = useCallback(() => {
    if (!startPoint || points.length < 6) return 'top-left';
    const xs = points.filter((_, i) => i % 2 === 0);
    const ys = points.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    if (Math.abs(startPoint.x - minX) < 2 && Math.abs(startPoint.y - minY) < 2) return 'top-left';
    if (Math.abs(startPoint.x - maxX) < 2 && Math.abs(startPoint.y - minY) < 2) return 'top-right';
    if (Math.abs(startPoint.x - minX) < 2 && Math.abs(startPoint.y - maxY) < 2) return 'bottom-left';
    if (Math.abs(startPoint.x - maxX) < 2 && Math.abs(startPoint.y - maxY) < 2) return 'bottom-right';
    return 'top-left';
  }, [startPoint, points]);

  // Fonction pour le comptage et l'affichage des carreaux
  const renderTiles = useCallback(() => {
    if (!startPoint || points.length < 6) return null;

    const tw = tileW / 100 * scale; // conversion cm -> m -> px
    const th = tileH / 100 * scale;
    const sp = (spacing / 1000) * scale;

    const xs = points.filter((_, i) => i % 2 === 0);
    const ys = points.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    let fullCount = 0;
    let partialCount = 0;
    let offcutCount = 0;
    let offcuts = [];

    const isPointInPolygon = (x, y) => {
      let inside = false;
      for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
        const xi = points[i], yi = points[i + 1];
        const xj = points[j], yj = points[j + 1];
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const tiles = [];
    const heightPoly = maxY - minY;
    const nY = Math.ceil((heightPoly + th * 2) / (th + sp));

    // Détermine le sens de pose selon le coin de départ
    const cornerType = getStartCornerType();
    const goingRight = !(cornerType === 'top-right' || cornerType === 'bottom-right');
    const goingDown = !(cornerType === 'bottom-left' || cornerType === 'bottom-right');

    const xSign = goingRight ? 1 : -1;
    const ySign = goingDown ? 1 : -1;

    for (let row = 0; row < nY; row++) {
      const tileY = startPoint.y + ySign * row * (th + sp);
      let x = startPoint.x;
      let col = 0;
      const isLeftToRight = xSign > 0;
      let offset = 0;
      let startWithHalf = false;
      if (pattern === 'offset' && row % 2 === 1) {
        offset = (tw + sp) / 2;
        x = isLeftToRight ? x + offset : x - offset;
        startWithHalf = true;
      }
      // Place le demi-carreau en début de ligne si besoin
      if (startWithHalf) {
        const partWidth = tw / 2;
        const partStartX = isLeftToRight ? startPoint.x : startPoint.x - partWidth;
        const corners = [
          [partStartX, tileY],
          [partStartX + (isLeftToRight ? 1 : -1) * partWidth, tileY],
          [partStartX + (isLeftToRight ? 1 : -1) * partWidth, tileY + ySign * th],
          [partStartX, tileY + ySign * th]
        ];
        const cornersInside = corners.filter(([cx, cy]) => isPointInPolygon(cx, cy)).length;
        if (cornersInside > 0) {
          // Gestion des chutes pour le demi-carreau
          let usedOffcut = null;
          for (let i = 0; i < offcuts.length; i++) {
            if (offcuts[i] >= partWidth - 0.1) { // tolérance
              usedOffcut = i;
              break;
            }
          }
          let color = '#e5e7eb';
          if (usedOffcut !== null) {
            color = '#bae6fd';
            offcuts.splice(usedOffcut, 1);
            offcutCount++;
          } else {
            // Ajoute la chute restante
            offcuts.push(tw - partWidth);
          }
          tiles.push(
            <Group key={`${row}-debut-partial`} x={partStartX} y={tileY} rotation={orientation}>
              <Rect
                width={partWidth}
                height={th}
                fill={color}
                stroke="gray"
                strokeWidth={0.5}
              />
            </Group>
          );
          partialCount++;
        }
        x = isLeftToRight ? partStartX + partWidth + sp : partStartX - sp;
        col++;
      }
      // Place les carreaux entiers
      if (isLeftToRight) {
        while (x + tw <= maxX + 0.01) {
          const corners = [
            [x, tileY],
            [x + tw, tileY],
            [x + tw, tileY + ySign * th],
            [x, tileY + ySign * th]
          ];
          const cornersInside = corners.filter(([cx, cy]) => isPointInPolygon(cx, cy)).length;
          if (cornersInside > 0) {
            tiles.push(
              <Group key={`${row}-${col}`} x={x} y={tileY} rotation={orientation}>
                <Rect
                  width={tw}
                  height={th}
                  fill="white"
                  stroke="gray"
                  strokeWidth={0.5}
                />
              </Group>
            );
            fullCount++;
          }
          x += tw + sp;
          col++;
        }
      } else {
        while (x - tw >= minX - 0.01) {
          const corners = [
            [x, tileY],
            [x - tw, tileY],
            [x - tw, tileY + ySign * th],
            [x, tileY + ySign * th]
          ];
          const cornersInside = corners.filter(([cx, cy]) => isPointInPolygon(cx, cy)).length;
          if (cornersInside > 0) {
            tiles.push(
              <Group key={`${row}-${col}`} x={x - tw} y={tileY} rotation={orientation}>
                <Rect
                  width={tw}
                  height={th}
                  fill="white"
                  stroke="gray"
                  strokeWidth={0.5}
                />
              </Group>
            );
            fullCount++;
          }
          x -= tw + sp;
          col++;
        }
      }
      // Place un carreau partiel si nécessaire
      let remainingSpace = isLeftToRight ? (maxX - x + 0.01) : (x - minX + 0.01);
      if (remainingSpace > 0.01 && remainingSpace < tw) {
        const partWidth = remainingSpace;
        const partialX = isLeftToRight ? maxX - partWidth : minX;
        const corners = [
          [partialX, tileY],
          [partialX + (isLeftToRight ? 1 : -1) * partWidth, tileY],
          [partialX + (isLeftToRight ? 1 : -1) * partWidth, tileY + ySign * th],
          [partialX, tileY + ySign * th]
        ];
        const cornersInside = corners.filter(([cx, cy]) => isPointInPolygon(cx, cy)).length;
        if (cornersInside > 0) {
          // Gestion des chutes pour le carreau partiel
          let usedOffcut = null;
          for (let i = 0; i < offcuts.length; i++) {
            if (offcuts[i] >= partWidth - 0.1) {
              usedOffcut = i;
              break;
            }
          }
          let color = '#e5e7eb';
          if (usedOffcut !== null) {
            color = '#bae6fd';
            offcuts.splice(usedOffcut, 1);
            offcutCount++;
          } else {
            // Ajoute la chute restante
            offcuts.push(tw - partWidth);
          }
          tiles.push(
            <Group key={`${row}-partial`} x={partialX} y={tileY} rotation={orientation}>
              <Rect
                width={partWidth}
                height={th}
                fill={color}
                stroke="gray"
                strokeWidth={0.5}
              />
            </Group>
          );
          partialCount++;
        }
      }
    }

    setTimeout(() => {
      setTileCount({ full: fullCount, partial: partialCount });
    }, 0);

    return (
      <Group
        clipFunc={(ctx) => {
          ctx.beginPath();
          ctx.moveTo(points[0], points[1]);
          for (let i = 2; i < points.length; i += 2) {
            ctx.lineTo(points[i], points[i + 1]);
          }
          ctx.closePath();
        }}
      >
        {tiles}
      </Group>
    );
  }, [points, startPoint, scale, tileW, tileH, spacing, pattern, orientation, getStartCornerType]);

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
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Plan de Terrasse</h2>
          
          {!drawing && points.length === 0 && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded">
              <p>Cliquez sur "Nouveau dessin" pour commencer.</p>
            </div>
          )}

          {drawing && (
            <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded">
              <p>Cliquez pour placer les points (angles droits uniquement).</p>
            </div>
          )}

          {calepinageMode && (
            <div className="mb-4 p-3 bg-purple-50 text-purple-800 rounded">
              <p>Cliquez sur un coin pour définir le point de départ du carrelage.</p>
            </div>
          )}

          {!drawing && points.length > 0 && (
            <div className="space-y-2">
              <div className="p-3 bg-green-50 text-green-800 rounded">
                <p>Surface : {area.toFixed(2)} m²</p>
                {startPoint && (
                  <>
                    <p className="mt-2">Carreaux entiers : {tileCount.full}</p>
                    <p>Carreaux à couper : {tileCount.partial}</p>
                    <p className="mt-1 text-xs">Total : {tileCount.full + tileCount.partial} carreaux</p>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2 mt-4">
            {!drawing && points.length === 0 ? (
              <button 
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
                onClick={() => setDrawing(true)}
              >
                Nouveau dessin
              </button>
            ) : drawing ? (
              <>
                <button 
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                  onClick={() => {
                    if (points.length >= 6) {
                      const closedPoints = [...points, points[0], points[1]];
                      setPoints(closedPoints);
                      setDrawing(false);
                      setArea(calculateArea());
                    }
                  }}
                >
                  Terminer le dessin
                </button>
                <button 
                  className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-medium"
                  onClick={resetDrawing}
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button 
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 font-medium"
                  onClick={() => setCalepinageMode(true)}
                  disabled={calepinageMode}
                >
                  Définir le point de départ du carrelage
                </button>
                <button 
                  className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-medium"
                  onClick={resetDrawing}
                >
                  Nouveau dessin
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow space-y-4">
          <h3 className="font-medium">Configuration</h3>

          {/* Boutons sauvegarder/charger */}
          <div className="flex gap-2 mb-2">
            <button
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              onClick={handleSave}
            >
              Sauvegarder le plan
            </button>
            <label className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm cursor-pointer">
              Charger un plan
              <input
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={handleLoad}
              />
            </label>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">Affichage</label>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="gridVisible"
                className="mr-2"
                checked={gridVisible}
                onChange={(e) => setGridVisible(e.target.checked)}
              />
              <label htmlFor="gridVisible" className="text-sm">
                Afficher le quadrillage (graduation tous les 10cm)
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Carrelage</h4>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium">Largeur du carreau (cm)</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 border rounded" 
                min="1"
                step="1" 
                value={tileW} 
                onChange={e => setTileW(Number(e.target.value))} 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Hauteur du carreau (cm)</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 border rounded" 
                min="1"
                step="1" 
                value={tileH} 
                onChange={e => setTileH(Number(e.target.value))} 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Joint (mm)</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 border rounded" 
                min="0"
                step="0.5" 
                value={spacing} 
                onChange={e => setSpacing(Number(e.target.value))} 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Type de pose</label>
              <select 
                className="w-full px-3 py-2 border rounded"
                value={pattern} 
                onChange={e => setPattern(e.target.value)}
              >
                <option value="straight">Aligné</option>
                <option value="offset">Décalé</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Rotation (°)</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 border rounded" 
                step="1" 
                value={orientation} 
                onChange={e => setOrientation(Number(e.target.value))} 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-3" ref={containerRef}>
        <div className="bg-white p-4 rounded-lg shadow">
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            onClick={handleClick}
            onMouseMove={(e) => {
              if (!drawing) return;
              const pos = e.target.getStage().getPointerPosition();
              if (points.length > 0) {
                const lastX = points[points.length - 2];
                const lastY = points[points.length - 1];
                const dx = pos.x - lastX;
                const dy = pos.y - lastY;
                if (Math.abs(dx) > Math.abs(dy)) {
                  setMousePos({ x: pos.x, y: lastY });
                } else {
                  setMousePos({ x: lastX, y: pos.y });
                }
              } else {
                setMousePos(pos);
              }
            }}
            ref={stageRef}
            className="border rounded"
          >
            <Layer>
              {renderGrid()}
              
              {points.length > 0 && (
                <Line
                  points={points}
                  stroke="#2563eb"
                  strokeWidth={2}
                  closed={!drawing}
                />
              )}
              {drawing && points.length > 0 && (
                <>
                  <Line
                    points={[
                      points[points.length - 2],
                      points[points.length - 1],
                      mousePos.x,
                      mousePos.y
                    ]}
                    stroke="#93c5fd"
                    strokeWidth={2}
                    dash={[5, 5]}
                  />
                  {/* Affichage dynamique de la dimension du segment courant */}
                  <Group>
                    {/* Calcul de la position du texte au milieu du segment */}
                    {(() => {
                      const x1 = points[points.length - 2];
                      const y1 = points[points.length - 1];
                      const x2 = mousePos.x;
                      const y2 = mousePos.y;
                      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / scale;
                      const roundedLength = Math.round(length * 10) / 10; // arrondi au décimètre
                      const midX = (x1 + x2) / 2;
                      const midY = (y1 + y2) / 2;
                      let angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
                      // Correction : toujours lisible (jamais à l'envers)
                      if (angle > 90 || angle < -90) {
                        angle += 180;
                      }
                      return (
                        <Group x={midX} y={midY} rotation={angle}>
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
                      );
                    })()}
                  </Group>
                </>
              )}
              
              {points.map((point, i) => {
                if (i % 2 === 0) {
                  return (
                    <Circle
                      key={i}
                      x={point}
                      y={points[i + 1]}
                      radius={4}
                      fill={calepinageMode && isCorner(point, points[i + 1]) ? "#9333ea" : 
                            i === 0 ? "#047857" : "#2563eb"}
                      stroke={calepinageMode && isCorner(point, points[i + 1]) ? "#a855f7" : 
                             i === 0 ? "#059669" : "#3b82f6"}
                      strokeWidth={2}
                      draggable={!drawing && !calepinageMode}
                      onDragStart={(e) => {
                        setSelectedPoint(i);
                        setIsDragging(true);
                      }}
                      onDragMove={(e) => {
                        if (!isDragging) return;
                        const newPoints = [...points];
                        const pos = e.target.getStage().getPointerPosition();
                        
                        // Snap to 90 degrees
                        const prevIndex = (i - 2 + points.length) % points.length;
                        const nextIndex = (i + 2) % points.length;
                        
                        const prevX = points[prevIndex];
                        const prevY = points[prevIndex + 1];
                        
                        // Determine which point to align with
                        if (Math.abs(pos.x - prevX) < Math.abs(pos.y - prevY)) {
                          newPoints[i] = prevX;
                          newPoints[i + 1] = pos.y;
                        } else {
                          newPoints[i] = pos.x;
                          newPoints[i + 1] = prevY;
                        }
                        
                        setPoints(newPoints);
                      }}
                      onDragEnd={() => {
                        setSelectedPoint(null);
                        setIsDragging(false);
                        setArea(calculateArea());
                      }}
                    />
                  );
                }
                return null;
              })}

              {!drawing && renderDimensions()}
              {drawing && renderDimensions()}
              {startPoint && renderTiles()}
              
              {startPoint && (
                <Circle
                  x={startPoint.x}
                  y={startPoint.y}
                  radius={6}
                  fill="#9333ea"
                  stroke="#a855f7"
                  strokeWidth={2}
                />
              )}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}