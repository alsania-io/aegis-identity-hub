import React from 'react';
import { Settings, Moon, Sun, Laptop, RefreshCw, Info } from 'lucide-react';

interface SettingsTabProps {
  settings: {
    theme: 'system' | 'dark' | 'light' | 'glass';
    syncIntervalSeconds: number;
    autoInject: boolean;
    defaultModel?: string;
    temperature?: number;
  };
  onUpdate: (settings: any) => void;
  availableTools?: Array<{ name: string }>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ 
  settings, 
  onUpdate,
  availableTools = [] 
}) => {
  const themes: Array<{ value: 'system' | 'dark' | 'light' | 'glass'; icon: React.ReactNode; label: string }> = [
    { value: 'system', icon: <Laptop className="w-4 h-4" />, label: 'System' },
    { value: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
    { value: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
    { value: 'glass', icon: <Settings className="w-4 h-4" />, label: 'Glass' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#10b981] flex items-center gap-2">
          <Settings className="w-5 h-5" /> Settings
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Appearance and behavior settings</p>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Theme</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {themes.map(t => (
              <button key={t.value} onClick={() => onUpdate({ ...settings, theme: t.value })}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${
                  settings.theme === t.value
                    ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Sync Interval (seconds)</label>
            <input type="number" value={settings.syncIntervalSeconds}
              onChange={e => onUpdate({ ...settings, syncIntervalSeconds: Number(e.target.value) })}
              min={5} max={300}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-200 focus:border-[#10b981] focus:outline-none" />
            <p className="text-[10px] text-slate-500 mt-1">How often to sync with the backend server</p>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-3 text-sm text-slate-300 py-2">
              <input type="checkbox" checked={settings.autoInject}
                onChange={e => onUpdate({ ...settings, autoInject: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-[#10b981] focus:ring-[#10b981]" />
              Auto-inject system prompt
            </label>
          </div>
        </div>

        {/* API Configuration Section */}
        <div className="border-t border-slate-800 pt-4 space-y-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-[#10b981] mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-400">
              <span className="font-bold text-slate-300">API Model Settings</span>
              <p className="mt-0.5">
                These settings apply to <span className="text-[#10b981] font-mono">OpenRouter API</span> calls and 
                other configurable AI services. <span className="text-amber-400">Note:</span> Browser-based AI 
                (Claude, ChatGPT, Gemini, etc.) use their own settings and are not affected by these values.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Default Model (OpenRouter)</label>
              <input type="text" value={settings.defaultModel || ''}
                onChange={e => onUpdate({ ...settings, defaultModel: e.target.value })}
                placeholder="openai/gpt-4o-mini"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-200 font-mono focus:border-[#10b981] focus:outline-none" />
              <p className="text-[10px] text-slate-500 mt-1">e.g. openai/gpt-4o, anthropic/claude-3.5-sonnet</p>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Temperature ({settings.temperature || 0.7})</label>
              <input type="range" min={0} max={2} step={0.1} value={settings.temperature || 0.7}
                onChange={e => onUpdate({ ...settings, temperature: Number(e.target.value) })}
                className="w-full bg-slate-800 rounded-lg h-2 appearance-none cursor-pointer accent-[#10b981]" />
              <p className="text-[10px] text-slate-500 mt-1">0 = deterministic, 1 = balanced, 2 = creative</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
          <RefreshCw className="w-4 h-4 text-[#10b981]" /> Status
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
          <div><span className="text-slate-500">Version:</span> Aegis Identity Hub v2.0.0</div>
          <div><span className="text-slate-500">Tools:</span> {availableTools.length} available</div>
          <div><span className="text-slate-500">Theme:</span> {settings.theme}</div>
          <div><span className="text-slate-500">Auto-inject:</span> {settings.autoInject ? '✅ On' : '❌ Off'}</div>
        </div>
      </div>
    </div>
  );
};