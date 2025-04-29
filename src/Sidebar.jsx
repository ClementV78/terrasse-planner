import React from 'react';

export default function Sidebar({
  area, tileCount, drawing, points, startPoint, calepinageMode, gridVisible, useOffcuts,
  setDrawing, setCalepinageMode, resetDrawing, setGridVisible, tileW, setTileW, tileH, setTileH, spacing, setSpacing, pattern, setPattern, orientation, setOrientation, setUseOffcuts, handleSave, handleLoad
}) {
  return (
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
                <p>Chutes utilisées : {tileCount.offcutUsed}</p>
                <p className="mt-1 text-xs">Total : {tileCount.total} carreaux</p>
                <p className="mt-1 text-xs">Total sans chutes : {tileCount.totalNoOffcut} carreaux</p>
                <p className="mt-1 text-xs">Gain : {typeof tileCount.gain === 'number' && !isNaN(tileCount.gain) ? tileCount.gain.toFixed(2) : '0.00'}%</p>
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
                  setDrawing(false);
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
      <div className="bg-white p-4 rounded-lg shadow space-y-4 mt-4">
        <h3 className="font-medium">Configuration</h3>
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
          <div className="space-y-2">
            <label className="block text-sm font-medium">Utiliser les chutes</label>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="useOffcuts"
                className="mr-2"
                checked={useOffcuts}
                onChange={(e) => setUseOffcuts(e.target.checked)}
              />
              <label htmlFor="useOffcuts" className="text-sm">
                Activer l'utilisation des chutes
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}