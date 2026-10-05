import React, { useState } from 'react';
import { Sparkles, Undo2, Check } from 'lucide-react';
import { enhanceContent, EnhancementTargetType } from '../../lib/ai-enhancer';
import { toast } from './Toast';

interface EnhanceWithAiButtonProps {
  type: EnhancementTargetType;
  currentText: string;
  onEnhanced: (newText: string) => void;
  contextTitle?: string;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  disabled?: boolean;
}

export const EnhanceWithAiButton: React.FC<EnhanceWithAiButtonProps> = ({
  type,
  currentText,
  onEnhanced,
  contextTitle,
  label = 'Enhance with AI',
  size = 'xs',
  className = '',
  disabled = false,
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [previousText, setPreviousText] = useState<string | null>(null);
  const [justEnhanced, setJustEnhanced] = useState(false);

  const handleEnhance = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!currentText || !currentText.trim()) {
      toast.info('Input Required', 'Please enter some text first before enhancing with AI.');
      return;
    }

    setIsEnhancing(true);
    const originalText = currentText;

    try {
      const result = await enhanceContent({
        type,
        content: currentText,
        contextTitle,
      });

      if (result.success && result.content && result.content !== originalText) {
        setPreviousText(originalText);
        onEnhanced(result.content);
        setJustEnhanced(true);

        const typeLabels: Record<EnhancementTargetType, string> = {
          prompt: 'Prompt',
          skill: 'Skill instructions',
          agent: 'Agent persona directives',
          instructions: 'Custom instructions',
        };

        toast.success(
          'AI Enhancement Applied',
          `${typeLabels[type]} enhanced with structured directives.`
        );

        setTimeout(() => setJustEnhanced(false), 3000);
      } else {
        toast.info('Already Optimal', 'The content is already well-structured.');
      }
    } catch (err: any) {
      toast.error('Enhancement Error', err?.message || 'Could not complete AI enhancement.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleUndo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (previousText !== null) {
      onEnhanced(previousText);
      setPreviousText(null);
      setJustEnhanced(false);
      toast.info('Reverted', 'Restored previous draft.');
    }
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-[11px] min-h-[28px]',
    sm: 'px-2.5 py-1.5 text-xs min-h-[34px]',
    md: 'px-3.5 py-2 text-xs min-h-[40px]',
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleEnhance}
        disabled={disabled || isEnhancing || !currentText?.trim()}
        title={`Enhance this ${type} using AI structured formatting`}
        className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all select-none border active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
          justEnhanced
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
            : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-indigo-200 border-indigo-500/35 hover:border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.15)]'
        } ${sizeClasses[size]} ${className}`}
      >
        {justEnhanced ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Sparkles
            className={`w-3.5 h-3.5 text-indigo-400 ${
              isEnhancing ? 'animate-spin text-indigo-300' : ''
            }`}
          />
        )}
        <span>{isEnhancing ? 'Enhancing...' : justEnhanced ? 'Enhanced' : label}</span>
      </button>

      {previousText !== null && (
        <button
          type="button"
          onClick={handleUndo}
          title="Undo AI enhancement and revert to original"
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-all"
        >
          <Undo2 className="w-3 h-3 text-slate-400" />
          <span>Undo</span>
        </button>
      )}
    </div>
  );
};
