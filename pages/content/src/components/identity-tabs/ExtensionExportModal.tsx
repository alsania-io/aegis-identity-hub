import React, { useState } from 'react';
import { X, Download, Smartphone, Laptop, Check } from 'lucide-react';

interface ExtensionExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncKey: string;
}

export const ExtensionExportModal: React.FC<ExtensionExportModalProps> = ({
  isOpen, onClose, syncKey
}) => {
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(syncKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0a0f1d] border border-[#10b981]/30 rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.2)] max-w-lg w-full mx-4 p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg">
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center">
              <Download className="w-6 h-6 text-[#10b981]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Export Extension</h2>
              <p className="text-xs text-slate-400">Download your extension package for mobile or desktop</p>
            </div>
          </div>

          {/* Sync Key */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">Sync Key</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 bg-slate-950 px-3 py-2 rounded-lg text-xs font-mono text-[#10b981] truncate border border-slate-700">
                {syncKey || 'No sync key set'}
              </code>
              <button onClick={handleCopyKey}
                className="px-3 py-2 bg-[#10b981]/20 text-[#10b981] rounded-lg text-xs font-medium border border-[#10b981]/30 hover:bg-[#10b981]/30 transition-all min-h-[38px]">
                {copiedKey ? <Check className="w-4 h-4" /> : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">Use this key to sync data across devices.</p>
          </div>

          {/* Download Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Download Package</h3>
            <div className="grid grid-cols-1 gap-3">
              <button className="flex flex-col items-center gap-2 p-4 bg-slate-900/80 border border-slate-800 hover:border-[#10b981]/50 rounded-2xl transition-all group">
                <Smartphone className="w-8 h-8 text-[#10b981] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-slate-300">Mobile (.xpi)</span>
                <span className="text-[10px] text-slate-500">Firefox Mobile</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 bg-slate-900/80 border border-slate-800 hover:border-[#10b981]/50 rounded-2xl transition-all group">
                <Laptop className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-slate-300">Desktop (.zip)</span>
                <span className="text-[10px] text-slate-500">Chrome / Edge</span>
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">How to Install</h4>
            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
              <li>Download the package for your browser</li>
              <li>Open your browser's extensions page</li>
              <li>Enable Developer Mode</li>
              <li>Load the unpacked extension or install the .xpi file</li>
            </ol>
          </div>

          <button onClick={onClose} className="w-full py-3 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 rounded-xl text-sm font-bold hover:bg-[#10b981]/25 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};