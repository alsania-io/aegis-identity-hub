import React, { useState, useEffect } from 'react';
import { FileCode, Save, Sparkles, RefreshCw } from 'lucide-react';
import { generateInstructions } from '../sidebar/Instructions/instructionGenerator';

interface InstructionsTabProps {
  customInstructions: string;
  enabled: boolean;
  onUpdate: (instructions: string, enabled: boolean) => void;
  appState: any;
  availableTools?: Array<{ name: string; schema: string; description: string }>;
}

export const InstructionsTab: React.FC<InstructionsTabProps> = ({
  customInstructions,
  enabled,
  onUpdate,
  appState,
  availableTools = []
}) => {
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate the actual system prompt using Nyx's instruction generator
  const generateSystemPrompt = () => {
    setIsGenerating(true);
    try {
      // Get tools from app state or use passed tools
      const tools = availableTools.length > 0 ? availableTools : (appState._tools || []);
      
      // Use Nyx's real instruction generator
      const prompt = generateInstructions(
        tools,
        enabled ? customInstructions : undefined,
        enabled
      );
      setGeneratedPrompt(prompt);
    } catch (error) {
      console.error('Failed to generate system prompt:', error);
      setGeneratedPrompt('Error generating system prompt. Please check the console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate on load and when dependencies change
  useEffect(() => {
    generateSystemPrompt();
  }, [customInstructions, enabled, availableTools.length]);

  const activeProfile = appState.profiles?.find((p: any) => p.id === appState.activeProfileId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#10b981] flex items-center gap-2">
          <FileCode className="w-5 h-5" /> System Prompt Configuration
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={generateSystemPrompt}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs font-medium border border-slate-700 transition-all min-h-[40px]"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onUpdate(customInstructions, e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-[#10b981] focus:ring-[#10b981]"
            />
            Auto-Inject
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Custom Message Input */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-slate-200 uppercase tracking-wider">
              Custom Instructions
            </label>
            <button
              onClick={() => onUpdate(customInstructions, enabled)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#10b981]/15 text-[#10b981] hover:bg-[#10b981]/25 rounded-lg text-[10px] font-bold uppercase transition-all border border-[#10b981]/30"
            >
              <Save className="w-3 h-3" /> Save
            </button>
          </div>
          <p className="text-xs text-slate-400">
            These instructions are appended to the system prompt. Use them for session-specific rules, preferences, or constraints.
          </p>
          <textarea
            value={customInstructions}
            onChange={(e) => onUpdate(e.target.value, enabled)}
            rows={10}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-300 focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 focus:outline-none transition-all placeholder:text-slate-700"
            placeholder={`e.g. 'Always output in JSON format for this session...'

You can also add:
- Specific tool usage preferences
- Output format requirements
- Domain-specific context
- Security constraints`}
          />
          <div className="text-xs text-slate-500 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <span className="font-mono text-[#10b981]">ℹ️</span> These instructions are injected at the end of the system prompt, after all tool definitions.
          </div>
        </div>

        {/* Right: Live System Prompt (using Nyx's generator) */}
        <div className="bg-[#050a1a] border border-[#10b981]/20 rounded-2xl p-5 space-y-4 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles className="w-24 h-24 text-[#10b981]" />
          </div>

          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-[#10b981] uppercase tracking-wider flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              Live System Prompt
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-[#10b981]/10 text-[#10b981] px-2 py-1 rounded-full border border-[#10b981]/20 font-mono">
                READ-ONLY
              </span>
              {activeProfile && (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full font-mono">
                  {activeProfile.name}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400">
            This is the complete system prompt generated by Nyx. It includes the function call system, all available tools, website-specific instructions, and your custom instructions.
          </p>
          <div className="w-full h-[400px] bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Generating...
              </div>
            ) : generatedPrompt ? (
              <div dangerouslySetInnerHTML={{ __html: generatedPrompt.replace(/\n/g, '<br />') }} />
            ) : (
              <div className="text-slate-500">
                No system prompt generated. Make sure tools are loaded.
              </div>
            )}
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#10b981]/50"></span>
            {generatedPrompt ? `${generatedPrompt.split('\n').length} lines` : '0 lines'}
            <span className="text-slate-700">|</span>
            {availableTools.length} tools available
            {enabled && customInstructions && ' | + custom instructions'}
          </div>
        </div>
      </div>
    </div>
  );
};