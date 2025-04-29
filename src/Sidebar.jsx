import React from 'react';

const COLORS = [
  { code: '#b0b0b0', label: 'Béton' },
  { code: '#e2c290', label: 'Bois clair' },
  { code: '#8b5c2a', label: 'Bois foncé' },
  { code: '#f5f5f5', label: 'Blanc' },
  { code: '#222222', label: 'Noir' },
];

export default function Sidebar({
  area, tileCount, drawing, points, startPoint, calepinageMode, gridVisible, useOffcuts,
  setDrawing, setCalepinageMode, resetDrawing, setGridVisible, tileW, setTileW, tileH, setTileH, spacing, setSpacing, pattern, setPattern, orientation, setOrientation, setUseOffcuts, handleSave, handleLoad,
  jointColor, setJointColor, tileColor, setTileColor
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow text-gray-900 font-sans text-[15px]">
      <h2 className="text-lg font-bold mb-2 tracking-tight">Plan de Terrasse</h2>
      <div className="mb-3 flex flex-col gap-2">
        {!drawing && points.length === 0 && (
          <div className="p-2 bg-blue-50 text-blue-800 rounded text-sm">Cliquez sur "Nouveau dessin" pour commencer.</div>
        )}
        {drawing && (
          <div className="p-2 bg-yellow-50 text-yellow-800 rounded text-sm">Cliquez pour placer les points (angles droits uniquement).</div>
        )}
        {calepinageMode && (
          <div className="p-2 bg-purple-50 text-purple-800 rounded text-sm">Cliquez sur un coin pour définir le point de départ du carrelage.</div>
        )}
      </div>
      {!drawing && points.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 text-green-900 rounded-lg">
          <div className="text-base font-bold mb-1 flex items-center gap-2">
            <span className="bg-green-200 text-green-900 px-2 py-1 rounded text-lg">{area.toFixed(2)} m²</span>
            <span className="text-xs font-normal">Surface</span>
          </div>
          {startPoint && (
            <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-base">
              <div>Carreaux entiers :</div><div className="text-right font-bold text-gray-800">{tileCount.full}</div>
              <div>Carreaux à couper :</div><div className="text-right font-bold text-yellow-700">{tileCount.partial}</div>
              <div>Chutes utilisées :</div><div className="text-right font-bold text-blue-700">{tileCount.offcutUsed}</div>
              <div>Total :</div><div className="text-right font-bold text-gray-900 bg-gray-100 rounded px-1">{tileCount.total}</div>
              <div>Total sans chutes :</div><div className="text-right font-bold text-gray-500">{tileCount.totalNoOffcut}</div>
              <div>Gain :</div><div className="text-right font-bold text-green-700">{typeof tileCount.gain === 'number' && !isNaN(tileCount.gain) ? tileCount.gain.toFixed(2) : '0.00'}%</div>
            </div>
          )}
        </div>
      )}
      <div className="mb-4 flex flex-col gap-2">
        {!drawing && points.length === 0 ? (
          <button className="w-full px-4 py-2 bg-blue-500 text-white rounded font-medium" onClick={() => setDrawing(true)}>Nouveau dessin</button>
        ) : drawing ? (
          <>
            <button className="w-full px-4 py-2 bg-green-500 text-white rounded font-medium" onClick={() => { if (points.length >= 6) setDrawing(false); }}>Terminer le dessin</button>
            <button className="w-full px-4 py-2 bg-red-500 text-white rounded font-medium" onClick={resetDrawing}>Annuler</button>
          </>
        ) : (
          <>
            <button className="w-full px-4 py-2 bg-purple-500 text-white rounded font-medium" onClick={() => setCalepinageMode(true)} disabled={calepinageMode}>Définir le point de départ du carrelage</button>
            <button className="w-full px-4 py-2 bg-red-500 text-white rounded font-medium" onClick={resetDrawing}>Nouveau dessin</button>
          </>
        )}
      </div>
      <div className="mb-4 flex flex-col gap-2">
        <button className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm" onClick={handleSave}>Sauvegarder le plan</button>
        <label className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm cursor-pointer">
          Charger un plan
          <input type="file" accept="application/json" style={{ display: 'none' }} onChange={handleLoad} />
        </label>
      </div>
      <div className="mb-4 flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={gridVisible} onChange={e => setGridVisible(e.target.checked)} />
          Afficher le quadrillage (graduation tous les 10cm)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useOffcuts} onChange={e => setUseOffcuts(e.target.checked)} />
          Utiliser les chutes pour optimiser
        </label>
      </div>
      <div className="mb-2 border-t pt-3">
        <h4 className="font-semibold text-base mb-2">Carrelage</h4>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="text-sm flex flex-col">Largeur (cm)
            <input type="number" className="px-2 py-1 border rounded" min="1" step="1" value={tileW} onChange={e => setTileW(Number(e.target.value))} />
          </label>
          <label className="text-sm flex flex-col">Hauteur (cm)
            <input type="number" className="px-2 py-1 border rounded" min="1" step="1" value={tileH} onChange={e => setTileH(Number(e.target.value))} />
          </label>
          <label className="text-sm flex flex-col col-span-2">Joint (mm)
            <input type="number" className="px-2 py-1 border rounded" min="0" step="0.5" value={spacing} onChange={e => setSpacing(Number(e.target.value))} />
          </label>
        </div>
        <div className="mb-2 flex flex-col gap-2">
          <label className="text-sm">Type de pose
            <select className="w-full px-2 py-1 border rounded mt-1" value={pattern} onChange={e => setPattern(e.target.value)}>
              <option value="straight">Aligné</option>
              <option value="offset">Décalé</option>
            </select>
          </label>
          <label className="text-sm">Rotation (°)
            <input type="number" className="w-full px-2 py-1 border rounded mt-1" step="1" value={orientation} onChange={e => setOrientation(Number(e.target.value))} />
          </label>
        </div>
        <div className="mb-2 flex flex-col gap-2">
          <label className="text-sm font-medium mb-1">Couleur des joints</label>
          <div className="flex gap-2">
            <button type="button" className={`w-7 h-7 rounded border-2 ${jointColor==='#ffffff' ? 'border-blue-500' : 'border-gray-300'}`} style={{background:'#fff'}} onClick={()=>setJointColor('#ffffff')} title="Blanc" />
            <button type="button" className={`w-7 h-7 rounded border-2 ${jointColor==='#ff0000' ? 'border-blue-500' : 'border-gray-300'}`} style={{background:'#ff0000'}} onClick={()=>setJointColor('#ff0000')} title="Rouge" />
          </div>
        </div>
        <div className="mb-2 flex flex-col gap-2">
          <label className="text-sm font-medium mb-1">Couleur des carreaux</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c.code} type="button" className={`w-8 h-8 rounded-full border-2 flex items-center justify-center relative ${tileColor===c.code ? 'border-blue-500' : 'border-gray-300'}`} style={{background:c.code}} onClick={()=>setTileColor(c.code)} title={c.label}>
                {tileColor===c.code && <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs text-blue-700 font-semibold">{c.label}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 border-t pt-3">
        <h4 className="font-semibold text-base mb-2">Légende</h4>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-7 h-7 rounded border border-gray-400" style={{background: tileColor}}></span>
            <span>Carreau entier</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-7 h-7 rounded border border-gray-400" style={{background: `url('data:image/svg+xml;utf8,<svg width=\'12\' height=\'12\' xmlns=\'http://www.w3.org/2000/svg\'><rect width=\'12\' height=\'12\' fill=\'${encodeURIComponent(tileColor)}\'/><path d=\'M0,12 L12,0\' stroke=\'%23888\' stroke-width=\'2\'/></svg>') repeat`}}></span>
            <span>Carreau coupé</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-7 h-7 rounded border border-gray-400" style={{background: `url('data:image/svg+xml;utf8,<svg width=\'12\' height=\'12\' xmlns=\'http://www.w3.org/2000/svg\'><rect width=\'12\' height=\'12\' fill=\'${encodeURIComponent(tileColor)}\'/><path d=\'M0,12 L12,0 M0,0 L12,12\' stroke=\'%23444\' stroke-width=\'2\'/></svg>') repeat`}}></span>
            <span>Chute réutilisée</span>
          </div>
        </div>
      </div>
    </div>
  );
}