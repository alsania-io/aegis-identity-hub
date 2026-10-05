import React, { useState, useEffect } from 'react';
import {
  History, X, Check, Download, Upload, Trash2, RotateCcw,
  Sparkles, ShieldCheck, Clock, FileJson, AlertCircle
} from 'lucide-react';
import { AppState } from '../../types/identity';
import {
  StateSnapshot, loadSnapshots, createSnapshot,
  deleteSnapshot, exportAlsaniaArchive, parseAlsaniaArchive
} from '../../lib/snapshot-storage';

interface SnapshotManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: AppState;
  onRestoreState: (restoredState: AppState) => void;
}

export const SnapshotManagerModal: React.FC<SnapshotManagerModalProps> = ({
  isOpen,
  onClose,
  currentState,
  onRestoreState
}) => {
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [restoredId, setRestoredId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSnapshots(loadSnapshots());
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateSnapshot = () => {
    const label = newLabel.trim() || `Manual Snapshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const created = createSnapshot(currentState, label, 'manual');
    setSnapshots(loadSnapshots());
    setNewLabel('');
    setFeedbackMsg(`Created snapshot "${created.label}"`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleRestore = (snap: StateSnapshot) => {
    onRestoreState(snap.state);
    setRestoredId(snap.id);
    setFeedbackMsg(`Rolled back to snapshot from ${new Date(snap.timestamp).toLocaleString()}`);
    setTimeout(() => {
      setRestoredId(null);
      setFeedbackMsg(null);
    }, 3500);
  };

  const handleDelete = (id: string) => {
    deleteSnapshot(id);
    setSnapshots(loadSnapshots());
  };

  const handleExportArchive = () => {
    exportAlsaniaArchive(currentState);
    setFeedbackMsg('Exported .alsania.json archive to downloads');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const restored = parseAlsaniaArchive(text);
        if (restored && restored.prompts) {
          // Create snapshot of pre-import state first for safety
          createSnapshot(currentState, 'Pre-Import Auto Backup', 'auto');
          onRestoreState(restored);
          createSnapshot(restored, `Imported: ${file.name}`, 'import');
          setSnapshots(loadSnapshots());
          setFeedbackMsg(`Successfully restored identity bundle from "${file.name}"`);
        } else {
          setFeedbackMsg('Error: Invalid archive format (missing identity structure)');
        }
      } catch (err: any) {
        setFeedbackMsg(`Error importing archive: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end items-start justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#090e1a] border-t sm:border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden pb-[max(env(safe-area-inset-bottom,8px),8px)] sm:pb-0">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Snapshot & Rollback History</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {snapshots.length} saved
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Point-in-time backups, version rollbacks, and portable .alsania archives
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedbackMsg && (
          <div className="px-4 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Create & Export / Import Bar */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
            <div className="text-xs font-semibold text-slate-300">Create Point-in-Time Snapshot</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Snapshot label (e.g., Pre-refactor clean state)..."
                className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateSnapshot();
                }}
              />
              <button
                type="button"
                onClick={handleCreateSnapshot}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all active:scale-95 shrink-0"
              >
                <History className="w-3.5 h-3.5" />
                <span>Save Snapshot</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400">Portable Alsania Archive:</span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg cursor-pointer transition-colors text-xs">
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span>Import .alsania</span>
                  <input
                    type="file"
                    accept=".json,.alsania"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleExportArchive}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition-colors text-xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export .alsania</span>
                </button>
              </div>
            </div>
          </div>

          {/* Snapshots List */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300">Saved Snapshots Timeline</span>

            {snapshots.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                No snapshots saved yet. Create a snapshot above to enable instant rollback.
              </div>
            ) : (
              <div className="space-y-2">
                {snapshots.map(snap => {
                  const dateStr = new Date(snap.timestamp).toLocaleString();
                  const isCurrentRestored = restoredId === snap.id;

                  return (
                    <div
                      key={snap.id}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-200 truncate">{snap.label}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            snap.source === 'auto'
                              ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                              : snap.source === 'import'
                              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          }`}>
                            {snap.source}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {dateStr}
                          </span>
                          <span>·</span>
                          <span>{snap.summary.promptsCount} prompts</span>
                          <span>·</span>
                          <span>{snap.summary.agentsCount} agents</span>
                          <span>·</span>
                          <span>{snap.summary.skillsCount} skills</span>
                          <span>·</span>
                          <span>{snap.summary.memoryCount} memory</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestore(snap)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            isCurrentRestored
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                          }`}
                          title="Rollback applet state to this snapshot"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${isCurrentRestored ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <span>{isCurrentRestored ? 'Restored' : 'Rollback'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(snap.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">Sovereign Rollback & State Isolation</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
