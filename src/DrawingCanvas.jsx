import React from 'react';
import { Stage, Layer, Line, Rect, Group, Circle, Text } from 'react-konva';

export default function DrawingCanvas({
  stageSize, drawing, points, mousePos, calepinageMode, startPoint,
  handleClick, renderGrid, renderDimensions, renderTiles, isCorner, setMousePos, stageRef, scale
}) {
  return (
    <Stage
      width={stageSize.width}
      height={stageSize.height}
      onClick={handleClick}
      onMouseMove={(e) => {
        if (!drawing) return;
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
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
                // Correction : conversion px -> m avec scale
                const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / scale;
                const roundedLength = Math.round(length * 10) / 10; // arrondi au décimètre
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                let angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
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
                fill={calepinageMode ? "#9333ea" : i === 0 ? "#047857" : "#2563eb"}
                stroke={calepinageMode ? "#a855f7" : i === 0 ? "#059669" : "#3b82f6"}
                strokeWidth={2}
              />
            );
          }
          return null;
        })}
        {renderDimensions()}
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
  );
}