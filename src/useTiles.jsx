import { useCallback } from 'react';
import { Group, Rect } from 'react-konva';

// Génère un motif rayé (diagonal stripes) pour carreaux partiels
function getStripesPattern(tileColor) {
  const size = 12;
  return document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
}

// Génère un motif croisé (crosshatch) pour chutes
function getCrossPattern(tileColor) {
  const size = 12;
  return document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
}

// Génère un canvas 2D pour motif rayé (diagonal stripes)
function createStripesPattern(tileColor) {
  const size = 12;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = tileColor;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size, 0);
  ctx.stroke();
  return ctx.createPattern(canvas, 'repeat');
}

// Génère un canvas 2D pour motif croisé (crosshatch)
function createCrossPattern(tileColor) {
  const size = 12;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = tileColor;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(size, size);
  ctx.stroke();
  return ctx.createPattern(canvas, 'repeat');
}

// Génère un dataURL pour motif rayé (diagonal stripes)
function createStripesPatternDataURL(tileColor) {
  const size = 12;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = tileColor;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size, 0);
  ctx.stroke();
  return canvas.toDataURL();
}

// Génère un dataURL pour motif croisé (crosshatch)
function createCrossPatternDataURL(tileColor) {
  const size = 12;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = tileColor;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(size, size);
  ctx.stroke();
  return canvas.toDataURL();
}

export default function useTiles({ points, startPoint, scale, tileW, tileH, spacing, pattern, orientation, getStartCornerType, useOffcuts, setTileCount, jointColor, tileColor }) {
  return useCallback(() => {
    if (!startPoint || points.length < 6) return null;
    const tw = tileW / 100 * scale;
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
    let offcutUsedCount = 0;
    let partialCountNoOffcut = 0;
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
    const cornerType = getStartCornerType();
    const goingRight = !(cornerType === 'top-right' || cornerType === 'bottom-right');
    const goingDown = !(cornerType === 'bottom-left' || cornerType === 'bottom-right');
    const xSign = goingRight ? 1 : -1;
    const ySign = goingDown ? 1 : -1;

    // Génère les images de pattern une seule fois par couleur
    const stripesPatternUrl = createStripesPatternDataURL(tileColor);
    const crossPatternUrl = createCrossPatternDataURL(tileColor);

    for (let row = 0; row < nY; row++) {
      const tileY = startPoint.y + ySign * row * (th + sp);
      let col = 0;
      let x;
      let startWithHalf = false;
      // Correction : offset appliqué du côté du point de départ
      if (pattern === 'offset' && row % 2 === 1) {
        startWithHalf = true;
        x = goingRight ? startPoint.x + (tw + sp) / 2 : startPoint.x - (tw + sp) / 2;
      } else {
        x = startPoint.x;
      }
      // Place le demi-carreau en début de ligne si besoin
      if (startWithHalf) {
        const partWidth = tw / 2;
        const partStartX = goingRight ? startPoint.x : startPoint.x - partWidth;
        const corners = [
          [partStartX, tileY],
          [partStartX + (goingRight ? 1 : -1) * partWidth, tileY],
          [partStartX + (goingRight ? 1 : -1) * partWidth, tileY + ySign * th],
          [partStartX, tileY + ySign * th]
        ];
        const cornersInside = corners.filter(([cx, cy]) => isPointInPolygon(cx, cy)).length;
        if (cornersInside > 0) {
          let color = '#e5e7eb';
          let usedOffcut = null;
          if (useOffcuts) {
            for (let i = 0; i < offcuts.length; i++) {
              if (offcuts[i] >= partWidth - 0.1) {
                usedOffcut = i;
                break;
              }
            }
          }
          if (usedOffcut !== null) {
            color = '#bae6fd';
            offcuts.splice(usedOffcut, 1);
            offcutCount++;
            offcutUsedCount++;
          } else {
            if (useOffcuts) offcuts.push(tw - partWidth);
          }
          const img = new window.Image();
          img.src = stripesPatternUrl;
          tiles.push(
            <Group key={`${row}-debut-partial`} x={partStartX} y={tileY} rotation={orientation}>
              <Rect
                width={partWidth}
                height={th}
                fillPatternImage={img}
                fillPatternRepeat="repeat"
                stroke={jointColor}
                strokeWidth={0.5}
              />
            </Group>
          );
          partialCount++;
          partialCountNoOffcut++;
        }
        x = goingRight ? partStartX + partWidth + sp : partStartX - sp;
        col++;
      }
      // Place les carreaux entiers
      if (goingRight) {
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
                  fill={tileColor}
                  stroke={jointColor}
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
                  fill={tileColor}
                  stroke={jointColor}
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
      // Place un carreau partiel si nécessaire (fin de ligne)
      let lastFullTileEnd;
      if (goingRight) {
        lastFullTileEnd = x;
        if (lastFullTileEnd < maxX - 0.01) {
          const partWidth = maxX - lastFullTileEnd;
          if (partWidth > 0.01 && partWidth < tw) {
            const partialX = lastFullTileEnd;
            const corners = [
              [partialX, tileY],
              [partialX + partWidth, tileY],
              [partialX + partWidth, tileY + ySign * th],
              [partialX, tileY + ySign * th]
            ];
            const cornersInside = corners.filter(([cx, cy]) => isPointInPolygon(cx, cy)).length;
            if (cornersInside > 0) {
              let color = '#e5e7eb';
              let usedOffcut = null;
              if (useOffcuts) {
                for (let i = 0; i < offcuts.length; i++) {
                  if (offcuts[i] >= partWidth - 0.1) {
                    usedOffcut = i;
                    break;
                  }
                }
              }
              if (usedOffcut !== null) {
                color = '#bae6fd';
                offcuts.splice(usedOffcut, 1);
                offcutCount++;
                offcutUsedCount++;
              } else {
                if (useOffcuts) offcuts.push(tw - partWidth);
              }
              const img = new window.Image();
              img.src = stripesPatternUrl;
              tiles.push(
                <Group key={`${row}-partial`} x={partialX} y={tileY} rotation={orientation}>
                  <Rect
                    width={partWidth}
                    height={th}
                    fillPatternImage={img}
                    fillPatternRepeat="repeat"
                    stroke={jointColor}
                    strokeWidth={0.5}
                  />
                </Group>
              );
              partialCount++;
              partialCountNoOffcut++;
            }
          }
        }
      } else {
        lastFullTileEnd = x;
        if (lastFullTileEnd > minX + 0.01) {
          const partWidth = lastFullTileEnd - minX;
          if (partWidth > 0.01 && partWidth < tw) {
            const partialX = lastFullTileEnd - partWidth;
            const corners = [
              [partialX, tileY],
              [partialX + partWidth, tileY],
              [partialX + partWidth, tileY + ySign * th],
              [partialX, tileY + ySign * th]
            ];
            const cornersInside = corners.filter(([cx, cy]) => isPointInPolygon(cx, cy)).length;
            if (cornersInside > 0) {
              let color = '#e5e7eb';
              let usedOffcut = null;
              if (useOffcuts) {
                for (let i = 0; i < offcuts.length; i++) {
                  if (offcuts[i] >= partWidth - 0.1) {
                    usedOffcut = i;
                    break;
                  }
                }
              }
              if (usedOffcut !== null) {
                color = '#bae6fd';
                offcuts.splice(usedOffcut, 1);
                offcutCount++;
                offcutUsedCount++;
              } else {
                if (useOffcuts) offcuts.push(tw - partWidth);
              }
              const img = new window.Image();
              img.src = stripesPatternUrl;
              tiles.push(
                <Group key={`${row}-partial`} x={partialX} y={tileY} rotation={orientation}>
                  <Rect
                    width={partWidth}
                    height={th}
                    fillPatternImage={img}
                    fillPatternRepeat="repeat"
                    stroke={jointColor}
                    strokeWidth={0.5}
                  />
                </Group>
              );
              partialCount++;
              partialCountNoOffcut++;
            }
          }
        }
      }
    }
    let totalTiles;
    if (useOffcuts) {
      totalTiles = fullCount + Math.ceil(partialCount - offcutUsedCount);
    } else {
      totalTiles = fullCount + partialCount;
    }
    let totalTilesNoOffcut = fullCount + partialCount;
    let gain = 0;
    if (useOffcuts && totalTilesNoOffcut > 0) {
      gain = 100 * (totalTilesNoOffcut - totalTiles) / totalTilesNoOffcut;
    }
    setTimeout(() => {
      setTileCount({
        full: fullCount,
        partial: partialCount,
        offcutUsed: offcutUsedCount,
        total: totalTiles,
        totalNoOffcut: totalTilesNoOffcut,
        gain: gain
      });
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
  }, [points, startPoint, scale, tileW, tileH, spacing, pattern, orientation, getStartCornerType, useOffcuts, setTileCount, jointColor, tileColor]);
}
