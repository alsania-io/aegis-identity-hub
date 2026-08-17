import React, { useState } from 'react';
import { RefreshCcw, Smartphone, Laptop, Tablet, Copy, Check, QrCode, ShieldCheck, Plus, Globe, Download } from 'lucide-react';
import { Device, SyncState, AppState } from '../../types/identity';

interface SyncTabProps {
  devices: Device[];
  syncState: SyncState;
  onSyncNow: () => void;
  appState?: AppState;
}

export const SyncTab: React.FC<SyncTabProps> = ({ devices, syncState, onSyncNow, appState }) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(syncState.syncKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleDownloadBackup = () => {
    if (!appState) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataStr);
    const dateStr = new Date().toISOString().split('T')[0];
    anchor.setAttribute('download', `aegis_backup_${syncState.syncKey.slice(0, 8)}_${dateStr}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const getDeviceIcon = (type: string) => {
    switch(type) {
      case 'mobile': return <Smartphone className="w-5 h-5 text-[#10b981]" />;
      case 'tablet': return <Tablet className="w-5 h-5 text-purple-400" />;
      default: return <Laptop className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#10b981] flex items-center gap-2">
            <RefreshCcw className="w-5 h-5" /> Cloud Sync
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Sync prompts, memory, and settings across devices</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={handleDownloadBackup}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition-all border border-slate-700 min-h-[48px] active:scale-95">
            <Download className="w-4 h-4 text-[#10b981]" /> Backup
          </button>
          <button onClick={onSyncNow} disabled={syncState.isSyncing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30 rounded-xl text-xs font-bold transition-all border border-[#10b981]/40 min-h-[48px] active:scale-95 disabled:opacity-50">
            <RefreshCcw className={`w-4 h-4 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
            <span>{syncState.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-[#10b981]" />
          <h3 className="font-bold text-sm text-slate-200">Local Backup</h3>
        </div>
        <p className="text-xs text-slate-400">Download a JSON backup of all prompts, memory, and settings.</p>
        <button onClick={handleDownloadBackup}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-[#10b981] border border-[#10b981]/40 hover:border-[#10b981] font-bold rounded-xl text-xs min-h-[48px] transition-all">
          <Download className="w-4 h-4" /> Download Backup
        </button>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#10b981]" />
              <h3 className="font-bold text-sm text-slate-200">Sync Key</h3>
            </div>
            <p className="text-xs text-slate-400">Use this key to pair devices</p>
          </div>
          <button onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-all min-h-[44px]">
            <QrCode className="w-4 h-4 text-cyan-400" /> Show QR
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
          <code className="text-emerald-400 font-mono text-xs font-bold tracking-wider select-all">
            {syncState.syncKey}
          </code>
          <button onClick={handleCopyKey}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] rounded-xl text-xs font-bold border border-[#10b981]/40 transition-all min-h-[40px]">
            {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <span>Status: <strong className="text-[#10b981]">Active</strong></span>
          <span>Last Sync: <strong className="text-slate-200">{syncState.lastSyncedAt ? new Date(syncState.lastSyncedAt).toLocaleTimeString() : 'Never'}</strong></span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" /> Devices ({devices.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500 col-span-full">
              No devices registered yet. Sync from another device to pair.
            </div>
          ) : (
            devices.map(device => (
              <div key={device.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-start gap-3.5 shadow-md hover:border-slate-700 transition-all">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
                  {getDeviceIcon(device.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h4 className="font-bold text-xs text-slate-100 truncate">{device.name}</h4>
                    <span className="text-[10px] bg-slate-800 text-[#10b981] px-2 py-0.5 rounded-full capitalize font-mono shrink-0">
                      {device.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Browser: <span className="text-slate-200">{device.browser}</span></p>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Active: {new Date(device.lastActive).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-[#10b981]/40 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-center">
            <h3 className="font-bold text-sm text-[#10b981] flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5" /> Pair Device
            </h3>
            <p className="text-xs text-slate-300">Enter this key on your other device:</p>
            <div className="bg-white p-4 rounded-xl inline-block shadow-inner mx-auto">
              <div className="w-36 h-36 bg-slate-950 rounded p-2 flex flex-col justify-between items-center text-center">
                <div className="text-[10px] text-[#10b981] font-mono font-bold mt-2">AEGIS PAIR</div>
                <div className="text-xs font-mono text-cyan-300 bg-slate-900 px-2 py-1 rounded border border-slate-700">
                  {syncState.syncKey.slice(0, 12)}...
                </div>
                <div className="text-[9px] text-slate-400">Scan or copy to pair</div>
              </div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400">
              {syncState.syncKey}
            </div>
            <button onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold min-h-[44px]">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};