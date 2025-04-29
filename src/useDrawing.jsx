import { useState, useCallback, useRef } from 'react';

export default function useDrawing(initialPlan, scale, calculateArea) {
  const [points, setPoints] = useState(initialPlan.points || []);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [drawing, setDrawing] = useState(false);
  const [calepinageMode, setCalepinageMode] = useState(false);
  const [startPoint, setStartPoint] = useState(initialPlan.startPoint || null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Vérifie si un point est un coin
  const isCorner = useCallback((x, y) => {
    return points.some((point, i) => {
      if (i % 2 === 0) {
        return Math.abs(points[i] - x) < 5 && Math.abs(points[i + 1] - y) < 5;
      }
      return false;
    });
  }, [points]);

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

  // Gestion du clic
  const handleClick = useCallback((e) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
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
    if (!drawing && points.length === 0) {
      setPoints([pos.x, pos.y]);
      setDrawing(true);
      return;
    }
    if (drawing) {
      const newPoints = [...points];
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
        let length = (pos.x - lastX) / scale;
        let roundedLength = Math.round(Math.abs(length) * 10) / 10 * Math.sign(length);
        nx = lastX + roundedLength * scale;
        ny = lastY;
      } else {
        let length = (pos.y - lastY) / scale;
        let roundedLength = Math.round(Math.abs(length) * 10) / 10 * Math.sign(length);
        nx = lastX;
        ny = lastY + roundedLength * scale;
      }
      newPoints.push(nx, ny);
      setPoints(newPoints);
    }
  }, [drawing, points, calepinageMode, isCorner, scale]);

  // Reset du dessin
  const resetDrawing = useCallback(() => {
    setPoints([]);
    setDrawing(false);
    setStartPoint(null);
    setCalepinageMode(false);
  }, []);

  return {
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
  };
}
