/**
 * Dynamic Pump & Product Setup Manager
 * PRD v3.1 Section 7: Add, edit, reorder, and deactivate pumps without source-code changes.
 */

import React, { useState } from 'react';
import {
  ConfiguredProduct,
  ConfiguredPump,
  StationWorkspace,
} from '../../types/report';
import {
  addPump,
  updatePump,
  togglePumpActive,
  deletePump,
  saveWorkspacePumps,
} from '../../services/dataService';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  X,
  Fuel,
  Sliders,
  AlertCircle,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface PumpConfigManagerProps {
  userId: string;
  workspace: StationWorkspace;
  products: ConfiguredProduct[];
  pumps: ConfiguredPump[];
  onConfigChanged: () => void;
}

export const PumpConfigManager: React.FC<PumpConfigManagerProps> = ({
  userId,
  workspace,
  products,
  pumps,
  onConfigChanged,
}) => {
  const [isAddPumpModalOpen, setIsAddPumpModalOpen] = useState(false);
  const [newPumpLabel, setNewPumpLabel] = useState('');
  const [newPumpProductCode, setNewPumpProductCode] = useState(products[0]?.code || 'PMS');

  const [editingPumpId, setEditingPumpId] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState('');

  // Handle Add Pump
  const handleAddPump = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPumpLabel.trim()) return;

    addPump(userId, newPumpProductCode, newPumpLabel.trim());
    setNewPumpLabel('');
    setIsAddPumpModalOpen(false);
    onConfigChanged();
  };

  // Handle Edit Label
  const handleStartEdit = (pump: ConfiguredPump) => {
    setEditingPumpId(pump.id);
    setEditLabelValue(pump.label);
  };

  const handleSaveEdit = (pumpId: string) => {
    if (!editLabelValue.trim()) return;
    updatePump(userId, pumpId, { label: editLabelValue.trim() });
    setEditingPumpId(null);
    onConfigChanged();
  };

  // Handle Toggle Active/Inactive (Deactivation preserves history!)
  const handleToggleActive = (pump: ConfiguredPump) => {
    togglePumpActive(userId, pump.id, !pump.isActive);
    onConfigChanged();
  };

  // Handle Remove / Delete Pump
  const handleDeletePump = (pump: ConfiguredPump) => {
    if (window.confirm(`Are you sure you want to remove nozzle "${pump.label}" from your station configuration?`)) {
      deletePump(userId, pump.id);
      onConfigChanged();
    }
  };

  // Handle Move Up / Down
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newPumps = [...pumps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPumps.length) return;

    const temp = newPumps[index];
    newPumps[index] = newPumps[targetIndex];
    newPumps[targetIndex] = temp;

    // Re-assign displayOrder
    newPumps.forEach((p, idx) => {
      p.displayOrder = idx + 1;
    });

    saveWorkspacePumps(userId, newPumps);
    onConfigChanged();
  };

  // Group pumps by product
  const activeProducts = products.filter((p) => p.isActive);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Dynamic Pump & Nozzle Setup</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Station: <span className="text-slate-200 font-semibold">{workspace.stationName}</span> • Total Pumps:{' '}
            <span className="text-amber-400 font-semibold">{pumps.length}</span> ({pumps.filter((p) => p.isActive).length} active)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddPumpModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/15 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Pump</span>
        </button>
      </div>

      {/* Preservation Rule Callout */}
      <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3.5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-200/90 leading-relaxed">
          <strong className="text-blue-300 font-semibold">Historical Snapshot Guarantee (PRD Rule 6 & 7):</strong> Deactivating
          a pump safely removes it from upcoming reports without altering or deleting historical reports. When adding a new
          pump, it will prompt for an authoritative opening reading on its first day.
        </div>
      </div>

      {/* Product Groups */}
      <div className="space-y-6">
        {activeProducts.map((prod) => {
          const productPumps = pumps.filter((p) => p.productCode === prod.code);

          return (
            <div
              key={prod.code}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Product Subheader */}
              <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: prod.color }}
                  />
                  <h3 className="font-bold text-white text-sm">{prod.fullName}</h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${prod.badgeBg} ${prod.badgeText}`}>
                    {prod.code}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {productPumps.filter((p) => p.isActive).length} active nozzles
                </span>
              </div>

              {/* Pump List */}
              <div className="divide-y divide-slate-800/70">
                {productPumps.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No pumps configured for {prod.code}. Click "Add New Pump" to configure.
                  </div>
                ) : (
                  productPumps.map((pump, idx) => {
                    const globalIdx = pumps.findIndex((p) => p.id === pump.id);
                    const isFirst = globalIdx === 0;
                    const isLast = globalIdx === pumps.length - 1;

                    return (
                      <div
                        key={pump.id}
                        className={`p-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-3 transition-colors ${
                          !pump.isActive ? 'bg-slate-950/50 opacity-60' : 'hover:bg-slate-800/30'
                        }`}
                      >
                        {/* Position & Label */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-xs font-mono text-slate-500 w-6 shrink-0">
                            #{pump.displayOrder}
                          </span>

                          {editingPumpId === pump.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editLabelValue}
                                onChange={(e) => setEditLabelValue(e.target.value)}
                                className="px-2.5 py-1 text-xs bg-slate-950 border border-amber-500/50 rounded-lg text-white font-mono focus:outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(pump.id)}
                                className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPumpId(null)}
                                className="p-1 text-slate-400 hover:bg-slate-800 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-bold text-white text-sm tracking-tight truncate">
                                {pump.label}
                              </span>
                              {!pump.isActive && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                  Deactivated
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Reorder Up/Down */}
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMove(globalIdx, 'up')}
                            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Move Up in sequence"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMove(globalIdx, 'down')}
                            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Move Down in sequence"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Label */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(pump)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                            title="Edit Pump Label"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Active / Inactive Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(pump)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              pump.isActive
                                ? 'text-emerald-400 hover:bg-slate-800'
                                : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-800'
                            }`}
                            title={pump.isActive ? 'Deactivate Pump' : 'Reactivate Pump'}
                          >
                            {pump.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>

                          {/* Delete Pump Button */}
                          <button
                            type="button"
                            onClick={() => handleDeletePump(pump)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Remove Pump from Station"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Pump Modal */}
      {isAddPumpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Add New Station Pump</h3>
              <button
                onClick={() => setIsAddPumpModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPump} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Fuel Product
                </label>
                <select
                  value={newPumpProductCode}
                  onChange={(e) => setNewPumpProductCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
                >
                  {activeProducts.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} — {p.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pump Label / Nozzle Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. PMS 5 or AGO Island 4"
                  value={newPumpLabel}
                  onChange={(e) => setNewPumpLabel(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  This identifier will be snapshot on future daily reports.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPumpModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow"
                >
                  Save Pump
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
