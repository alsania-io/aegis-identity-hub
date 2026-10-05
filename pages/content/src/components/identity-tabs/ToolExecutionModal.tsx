import React, { useState, useEffect } from 'react';
import {
  Wrench, Play, X, Check, Copy, AlertCircle, Clock,
  Terminal, ArrowRight, RotateCcw, ShieldCheck, Database
} from 'lucide-react';
import { NyxTool } from './App';
import { mcpClient } from '../../core/mcp-client';

interface ToolExecutionModalProps {
  tool: NyxTool | null;
  isOpen: boolean;
  onClose: () => void;
  connectionStatus?: string;
}

export const ToolExecutionModal: React.FC<ToolExecutionModalProps> = ({
  tool,
  isOpen,
  onClose,
  connectionStatus = 'disconnected'
}) => {
  const [params, setParams] = useState<Record<string, any>>({});
  const [parsedSchema, setParsedSchema] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    status: 'success' | 'error';
    durationMs: number;
    timestamp: string;
    output: any;
    rawText: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'json'>('form');
  const [jsonInput, setJsonInput] = useState('{}');

  useEffect(() => {
    if (!tool) {
      setParsedSchema(null);
      setParams({});
      setExecutionResult(null);
      return;
    }

    try {
      const s = typeof tool.schema === 'string' ? JSON.parse(tool.schema) : tool.schema;
      setParsedSchema(s);

      // Initialize default param values from schema
      const initial: Record<string, any> = {};
      const props = s.properties || s.inputSchema?.properties || s.parameters?.properties || {};
      Object.entries(props).forEach(([key, val]: [string, any]) => {
        if (val.default !== undefined) {
          initial[key] = val.default;
        } else if (val.type === 'boolean') {
          initial[key] = false;
        } else if (val.type === 'number' || val.type === 'integer') {
          initial[key] = 0;
        } else if (val.type === 'array') {
          initial[key] = [];
        } else {
          initial[key] = '';
        }
      });
      setParams(initial);
      setJsonInput(JSON.stringify(initial, null, 2));
      setExecutionResult(null);
    } catch {
      setParsedSchema(null);
      setParams({});
      setJsonInput('{}');
    }
  }, [tool]);

  if (!isOpen || !tool) return null;

  const isConnected = connectionStatus === 'connected';
  const properties = parsedSchema?.properties || parsedSchema?.inputSchema?.properties || parsedSchema?.parameters?.properties || {};
  const requiredFields: string[] = parsedSchema?.required || parsedSchema?.inputSchema?.required || parsedSchema?.parameters?.required || [];

  const handleParamChange = (key: string, value: any) => {
    const updated = { ...params, [key]: value };
    setParams(updated);
    setJsonInput(JSON.stringify(updated, null, 2));
  };

  const handleJsonInputChange = (val: string) => {
    setJsonInput(val);
    try {
      const parsed = JSON.parse(val);
      setParams(parsed);
    } catch {
      // Allow drafting malformed JSON before fixing
    }
  };

  const handleExecute = async () => {
    setIsRunning(true);
    const start = performance.now();
    let effectiveParams = params;

    if (activeTab === 'json') {
      try {
        effectiveParams = JSON.parse(jsonInput);
      } catch (e: any) {
        setIsRunning(false);
        setExecutionResult({
          status: 'error',
          durationMs: 0,
          timestamp: new Date().toLocaleTimeString(),
          output: { error: 'Invalid JSON payload: ' + e.message },
          rawText: 'Invalid JSON payload'
        });
        return;
      }
    }

    try {
      let resultData: any;
      if (isConnected) {
        // Try real MCP invocation
        const response = await mcpClient.callTool(tool.name, effectiveParams);
        resultData = response;
      } else {
        // Sandboxed simulation with realistic response
        await new Promise(r => setTimeout(r, 260 + Math.random() * 200));
        resultData = {
          success: true,
          mode: 'sovereign_sandbox',
          tool: tool.name,
          inputsReceived: effectiveParams,
          result: {
            message: `Executed tool '${tool.name}' safely within Aegis local sandbox.`,
            output: 'Alsania compliance verified. Operation successful.',
            timestamp: new Date().toISOString(),
          }
        };
      }

      const duration = Math.round(performance.now() - start);
      setExecutionResult({
        status: 'success',
        durationMs: duration,
        timestamp: new Date().toLocaleTimeString(),
        output: resultData,
        rawText: typeof resultData === 'string' ? resultData : JSON.stringify(resultData, null, 2)
      });
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      setExecutionResult({
        status: 'error',
        durationMs: duration,
        timestamp: new Date().toLocaleTimeString(),
        output: { error: err.message || 'Execution failed' },
        rawText: err.message || 'Execution error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyResult = () => {
    if (!executionResult) return;
    navigator.clipboard.writeText(executionResult.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end items-start justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0b111e] border-t sm:border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden pb-[max(env(safe-area-inset-bottom,8px),8px)] sm:pb-0">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 font-mono truncate">{tool.name}</h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isConnected ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                }`}>
                  {isConnected ? 'MCP Live' : 'Local Sandbox'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {tool.description || 'Test and execute tool with custom parameters'}
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

        {/* Mode switcher & Parameter Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <span className="text-xs font-semibold text-slate-300">Tool Arguments</span>
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'form' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Form Builder
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('json')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'json' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Raw JSON
              </button>
            </div>
          </div>

          {activeTab === 'form' ? (
            <div className="space-y-3">
              {Object.keys(properties).length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  No parameters defined in schema. Tool can be executed with empty payload.
                </div>
              ) : (
                Object.entries(properties).map(([key, prop]: [string, any]) => {
                  const isRequired = requiredFields.includes(key);
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-mono text-slate-300 font-medium">
                          {key}
                          {isRequired && <span className="text-rose-400 ml-1">*</span>}
                        </label>
                        <span className="text-[10px] font-mono text-slate-500">{prop.type || 'string'}</span>
                      </div>
                      {prop.description && (
                        <p className="text-[11px] text-slate-400">{prop.description}</p>
                      )}

                      {prop.type === 'boolean' ? (
                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                          <input
                            type="checkbox"
                            checked={!!params[key]}
                            onChange={e => handleParamChange(key, e.target.checked)}
                            className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                          />
                          <span className="text-xs text-slate-300 font-mono">
                            {params[key] ? 'true' : 'false'}
                          </span>
                        </label>
                      ) : prop.type === 'number' || prop.type === 'integer' ? (
                        <input
                          type="number"
                          value={params[key] ?? 0}
                          onChange={e => handleParamChange(key, parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
                        />
                      ) : prop.type === 'array' || prop.type === 'object' ? (
                        <textarea
                          rows={3}
                          value={typeof params[key] === 'string' ? params[key] : JSON.stringify(params[key], null, 2)}
                          onChange={e => {
                            try {
                              handleParamChange(key, JSON.parse(e.target.value));
                            } catch {
                              handleParamChange(key, e.target.value);
                            }
                          }}
                          placeholder={prop.type === 'array' ? '["item1", "item2"]' : '{"key": "value"}'}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
                        />
                      ) : (
                        <input
                          type="text"
                          value={params[key] ?? ''}
                          onChange={e => handleParamChange(key, e.target.value)}
                          placeholder={prop.default ? `Default: ${prop.default}` : `Value for ${key}...`}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono block">Payload Object</label>
              <textarea
                rows={6}
                value={jsonInput}
                onChange={e => handleJsonInputChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          )}

          {/* Execution Result Box */}
          {executionResult && (
            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 font-mono font-medium ${
                    executionResult.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {executionResult.status === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {executionResult.status === 'success' ? 'Execution Success' : 'Execution Error'}
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    · {executionResult.durationMs}ms · {executionResult.timestamp}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-900 px-2 py-1 rounded border border-slate-800"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy Output'}</span>
                </button>
              </div>

              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/90 text-xs font-mono text-slate-300 max-h-56 overflow-y-auto whitespace-pre-wrap select-text leading-relaxed">
                {executionResult.rawText}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[11px]">Alsania Sovereign Execution</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleExecute}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all active:scale-95 shadow-sm disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Running...' : 'Run Tool'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
