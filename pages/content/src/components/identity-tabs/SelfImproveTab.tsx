import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  FileCode,
  Copy,
  Check,
  Plus,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
  X,
  Bot,
  Terminal,
  Activity,
  Award,
  Layers,
  HelpCircle,
  Archive,
  ArrowRight,
} from 'lucide-react';
import {
  selfImprovementService,
  SelfImprovementState,
} from '../../lib/self-improvement-service';
import {
  Lesson,
  LessonState,
  StartPacket,
  ProofLine,
  EditManifest,
  RejectedEntry,
  FailureCategory,
  LESSON_STATES,
} from '@alsania-io/self-improve';
import { useToast } from './Toast';

export interface SelfImproveTabProps {
  onSelectAgent?: (agentId: string) => void;
}

export const SelfImproveTab: React.FC<SelfImproveTabProps> = () => {
  const toast = useToast();
  const [data, setData] = useState<SelfImprovementState>(() => selfImprovementService.getState());
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isClassifierOpen, setIsClassifierOpen] = useState(false);
  const [failureLogInput, setFailureLogInput] = useState('');
  const [classifiedCategory, setClassifiedCategory] = useState<FailureCategory | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State for New Lesson
  const [futureBehavior, setFutureBehavior] = useState('');
  const [representativeTask, setRepresentativeTask] = useState('');
  const [evidence, setEvidence] = useState('');
  const [owner, setOwner] = useState('aegis-core-agent');
  const [writeBoundary, setWriteBoundary] = useState('skills/alsanian-enhanced/SKILL.md');
  const [proofKind, setProofKind] = useState<'command' | 're-read'>('re-read');
  const [proofValue, setProofValue] = useState('re-read of SKILL.md');
  const [repeats, setRepeats] = useState<number>(3);
  const [hasFocusedTest, setHasFocusedTest] = useState<boolean>(true);
  const [editType, setEditType] = useState('modify_skill');
  const [intendedEffect, setIntendedEffect] = useState('enforce verifiable agent memory precedence');
  const [predictedImpact, setPredictedImpact] = useState('eliminate silent resets and data loss');
  const [rejectionReason, setRejectionReason] = useState('');

  // Reload data helper
  const reloadData = () => {
    setData(selfImprovementService.getState());
  };

  // Metrics computation
  const metrics = useMemo(() => {
    return selfImprovementService.getMetrics();
  }, [data]);

  // Filtered lessons
  const filteredLessons = useMemo(() => {
    return data.lessons.filter((lesson) => {
      const matchesState = selectedStateFilter === 'all' || lesson.state === selectedStateFilter;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesState;

      const matchesSearch =
        lesson.packet.futureBehavior?.toLowerCase().includes(query) ||
        lesson.packet.owner?.toLowerCase().includes(query) ||
        lesson.packet.representativeTask?.toLowerCase().includes(query) ||
        lesson.packet.evidence?.toLowerCase().includes(query) ||
        lesson.manifest?.intendedEffect?.toLowerCase().includes(query) ||
        lesson.id.toLowerCase().includes(query);

      return matchesState && matchesSearch;
    });
  }, [data.lessons, selectedStateFilter, searchQuery]);

  // State Counts
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = { all: data.lessons.length };
    LESSON_STATES.forEach((s) => {
      counts[s] = 0;
    });
    data.lessons.forEach((l) => {
      counts[l.state] = (counts[l.state] || 0) + 1;
    });
    return counts;
  }, [data.lessons]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Form Submission
  const handleEvaluateAndSave = () => {
    if (!futureBehavior.trim()) {
      toast.error('Future behavior is required.');
      return;
    }

    const packet: StartPacket = {
      futureBehavior: futureBehavior.trim(),
      representativeTask: representativeTask.trim() || undefined,
      evidence: evidence.trim() || undefined,
      owner: owner.trim() || undefined,
      writeBoundary: writeBoundary.trim() || undefined,
      proof: proofValue.trim() || undefined,
    };

    const proof: ProofLine = {
      kind: proofKind,
      value: proofValue.trim(),
    };

    const manifest: EditManifest = {
      editType: editType.trim() || 'modify_guidance',
      target: owner.trim() || 'general',
      intendedEffect: intendedEffect.trim() || 'improve reliability',
      predictedImpact: predictedImpact.trim() || 'verifiable behavior shift',
    };

    const result = selfImprovementService.evaluateAndSaveLesson({
      packet,
      repeats,
      hasFocusedTest,
      proof: proofValue.trim() ? proof : undefined,
      manifest: editType.trim() ? manifest : undefined,
      rejectionReason: rejectionReason.trim() || undefined,
    });

    reloadData();
    setIsCreateModalOpen(false);

    if (result.state === 'applied') {
      toast.success(`Lesson successfully APPLIED with confidence ${(result.lesson.confidence * 100).toFixed(0)}%!`);
    } else if (result.state === 'rejected') {
      toast.error(`Lesson REJECTED and archived in Negative-Feedback Buffer.`);
    } else {
      toast.info(`Lesson classified as ${result.state.toUpperCase()}`);
    }

    // Reset Form
    setFutureBehavior('');
    setRepresentativeTask('');
    setEvidence('');
    setProofValue('');
    setRejectionReason('');
  };

  // Handle Log Classification
  const handleClassifyLog = () => {
    if (!failureLogInput.trim()) return;
    const res = selfImprovementService.classifyFailureOutput(failureLogInput);
    setClassifiedCategory(res.category);
    if (res.suggestedPacket.futureBehavior) {
      setFutureBehavior(res.suggestedPacket.futureBehavior);
    }
    if (res.suggestedPacket.representativeTask) {
      setRepresentativeTask(res.suggestedPacket.representativeTask);
    }
    if (res.suggestedPacket.evidence) {
      setEvidence(res.suggestedPacket.evidence);
    }
    toast.success(res.category ? `Classified as ${res.category.toUpperCase()}` : 'Sample analyzed');
  };

  // Delete Lesson
  const handleDeleteLesson = (id: string) => {
    if (selfImprovementService.deleteLesson(id)) {
      reloadData();
      toast.success('Lesson record removed');
    }
  };

  // Supersede Lesson
  const handleSupersede = (id: string) => {
    const reason = prompt('State why this lesson is superseded by a newer rule:');
    if (reason && reason.trim()) {
      selfImprovementService.supersedeLesson(id, reason.trim());
      reloadData();
      toast.success('Lesson marked as superseded');
    }
  };

  // Render State Badge
  const renderStateBadge = (state: LessonState) => {
    switch (state) {
      case 'applied':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Applied
          </span>
        );
      case 'validated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            Validated
          </span>
        );
      case 'candidate':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400" />
            Candidate
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <X className="w-3 h-3 text-rose-400" />
            Rejected
          </span>
        );
      case 'superseded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Archive className="w-3 h-3 text-purple-400" />
            Superseded
          </span>
        );
      case 'no-delta':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            No Delta
          </span>
        );
      case 'open-question':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
            <AlertCircle className="w-3 h-3 text-orange-400" />
            Open Question
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#07121b] to-emerald-950/30 border border-emerald-500/20 p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col flex-col items-start justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Alsania Code v3.0 Protocol
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                @alsania-io/self-improve v0.1.0
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              Agent Self-Improvement & Evolution Gate
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Turns evidence into durable behavior change through a 6-item Start Packet, 7-state validation machine,
              falsifiable proof enforcement, and negative-feedback buffering.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsClassifierOpen(!isClassifierOpen)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Failure Classifier
            </button>
            <button
              onClick={() => {
                const markers = selfImprovementService.renderAllEvolutionMarkers();
                if (markers) {
                  handleCopy(markers, 'all-markers');
                } else {
                  toast.info('No applied lessons to export yet');
                }
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
            >
              {copiedId === 'all-markers' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
              Export Markers
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Propose Lesson
            </button>
          </div>
        </div>

        {/* Telemetry / Metrics Strip — single column, stacked */}
        <div className="grid grid-cols-1 gap-3 mt-5 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Evolution Epoch</div>
            <div className="text-base font-bold text-white mt-0.5 flex items-center gap-1.5">
              <span className="capitalize">{metrics.epoch}</span>
              {metrics.epoch === 'improving' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
              {metrics.epoch === 'stable-success' && <Award className="w-4 h-4 text-cyan-400" />}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Slope: {metrics.slope > 0 ? `+${metrics.slope}` : metrics.slope}</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Reliability Score</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">
              {(metrics.averageScore * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{data.scoreHistory.length} recorded epochs</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Applied Rules</div>
            <div className="text-base font-bold text-white mt-0.5">
              {stateCounts['applied'] || 0} / {data.lessons.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{stateCounts['candidate'] || 0} pending review</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Negative Buffer</div>
            <div className="text-base font-bold text-rose-400 mt-0.5">
              {data.rejectedEntries.length} Anti-Patterns
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Zero recurrence guard</div>
          </div>
        </div>
      </div>

      {/* Failure Output Classifier Tool (Expandable) */}
      {isClassifierOpen && (
        <div className="bg-[#0b1320] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Failure Category Classifier (epic-harness regex gate)</h3>
            </div>
            <button
              onClick={() => setIsClassifierOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300">
            Paste error stack traces, test results, or compiler output. The engine runs count-guarded regex matching
            to detect failure categories and auto-formulate a Start Packet candidate.
          </p>

          <textarea
            value={failureLogInput}
            onChange={(e) => setFailureLogInput(e.target.value)}
            placeholder="Paste raw error log, e.g. TypeError, SyntaxError, 2 failed tests, EACCES, build failed..."
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {classifiedCategory && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  CATEGORY: {classifiedCategory.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClassifyLog}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-sm"
              >
                Classify & Draft Packet
              </button>
              {classifiedCategory && (
                <button
                  onClick={() => {
                    setIsCreateModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1"
                >
                  Open in Gate <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7-State Pipeline Filter Bar */}
      <div className="flex flex-col flex-col items-start justify-between gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 flex-wrap pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Lessons' },
            { id: 'applied', label: 'Applied' },
            { id: 'validated', label: 'Validated' },
            { id: 'candidate', label: 'Candidate' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'superseded', label: 'Superseded' },
            { id: 'open-question', label: 'Open Question' },
            { id: 'no-delta', label: 'No Delta' },
          ].map((tab) => {
            const count = stateCounts[tab.id] ?? 0;
            const isSelected = selectedStateFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedStateFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lessons, tasks, proofs..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Lessons List Grid */}
      <div className="grid grid-cols-1 gap-3.5">
        {filteredLessons.map((lesson) => {
          const isCrit = lesson.repeats >= 3;
          return (
            <div
              key={lesson.id}
              className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                lesson.state === 'applied'
                  ? 'bg-slate-900/60 border-emerald-500/30 shadow-md hover:border-emerald-500/50'
                  : lesson.state === 'rejected'
                  ? 'bg-slate-900/40 border-rose-500/20 opacity-90'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header row */}
              <div className="flex flex-col flex-col sm:items-start justify-between gap-2.5">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {renderStateBadge(lesson.state)}

                    {isCrit && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" />
                        CRITICAL PATTERN (≥3)
                      </span>
                    )}

                    <span className="text-[11px] font-mono text-slate-400">
                      Confidence: {(lesson.confidence * 100).toFixed(0)}%
                    </span>

                    <span className="text-[10px] text-slate-400">
                      • Repeats: {lesson.repeats}x {lesson.hasFocusedTest ? '(focused test)' : ''}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                    {lesson.packet.futureBehavior || 'Unspecified behavior change'}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-start">
                  <button
                    onClick={() => {
                      const text = JSON.stringify(lesson, null, 2);
                      handleCopy(text, lesson.id);
                    }}
                    title="Copy full lesson JSON"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    {copiedId === lesson.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {lesson.state === 'applied' && (
                    <button
                      onClick={() => handleSupersede(lesson.id)}
                      title="Mark as superseded by a newer lesson"
                      className="p-1.5 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteLesson(lesson.id)}
                    title="Delete record"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Start Packet Details Grid */}
              <div className="grid grid-cols-1 grid-cols-1 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                {lesson.packet.representativeTask && (
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                      Representative Task
                    </span>
                    <span className="text-slate-200 font-medium">{lesson.packet.representativeTask}</span>
                  </div>
                )}

                {lesson.packet.owner && (
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                      Target Owner
                    </span>
                    <span className="text-emerald-300 font-mono font-medium flex items-center gap-1">
                      <Bot className="w-3 h-3 text-emerald-400" />
                      {lesson.packet.owner}
                    </span>
                  </div>
                )}

                {lesson.packet.writeBoundary && (
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                      Write Boundary
                    </span>
                    <span className="text-slate-300 font-mono text-[11px] truncate block">
                      {lesson.packet.writeBoundary}
                    </span>
                  </div>
                )}

                {lesson.proof && (
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                      Falsifiable Proof ({lesson.proof.kind})
                    </span>
                    <span className="text-cyan-300 font-mono text-[11px] truncate block">
                      {lesson.proof.value}
                    </span>
                  </div>
                )}
              </div>

              {/* Evidence box */}
              {lesson.packet.evidence && (
                <div className="mt-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
                    Evidence / Observed Trigger
                  </span>
                  <p className="text-slate-300 font-mono text-[11px] leading-relaxed break-words">
                    {lesson.packet.evidence}
                  </p>
                </div>
              )}

              {/* Rejection / Superseded Notice */}
              {lesson.rejectionReason && (
                <div className="mt-2.5 bg-rose-950/20 border border-rose-500/30 p-2 rounded-xl text-xs text-rose-300">
                  <span className="font-bold">Reason:</span> {lesson.rejectionReason}
                </div>
              )}

              {/* Evolution Marker Preview (if applied) */}
              {lesson.state === 'applied' && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[10px]">
                    Marker: &lt;!-- Evolution: {lesson.createdAt.split('T')[0]} | {lesson.packet.owner} --&gt;
                  </span>
                  <button
                    onClick={() => {
                      const m = selfImprovementService.renderAllEvolutionMarkers(lesson.packet.owner);
                      handleCopy(m, `marker-${lesson.id}`);
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Directive
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredLessons.length === 0 && (
          <div className="p-10 text-center rounded-2xl border border-slate-800 bg-slate-900/30">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-300">No lessons found</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Propose a new behavior lesson through the Start Packet gate or adjust your state filter.
            </p>
          </div>
        )}
      </div>

      {/* Negative-Feedback Buffer (Anti-Patterns Archive) */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Negative-Feedback Buffer (Rejected Proposals)
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {data.rejectedEntries.length} entries preserved
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Ported from epic-harness `RejectedEntry`. Every rejected self-improvement candidate is cataloged here so
          the agent memory never repeats disproved or sovereign-violating patterns.
        </p>

        <div className="grid grid-cols-1 grid-cols-1 gap-3 mt-2">
          {data.rejectedEntries.map((rej, idx) => (
            <div
              key={idx}
              className="bg-slate-950/60 p-3 rounded-xl border border-rose-500/20 text-xs space-y-1.5"
            >
              <div className="font-semibold text-rose-300 flex items-center justify-between">
                <span>{rej.name}</span>
                <span className="text-[10px] font-mono text-slate-400">{rej.origin}</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">{rej.reason}</p>
              <div className="text-[10px] font-mono text-slate-400">
                Logged: {rej.timestamp.split('T')[0]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Proposal & Start Packet Gate Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b121e] border border-emerald-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Evaluate Self-Improvement Start Packet
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  The 6-item gate guarantees evidence-based behavior modification with falsifiable proof.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Item 1 */}
              <div>
                <label className="block font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-1">
                  1. Future Behavior (What the agent does differently next time) *
                </label>
                <input
                  type="text"
                  value={futureBehavior}
                  onChange={(e) => setFutureBehavior(e.target.value)}
                  placeholder="e.g. Always execute read-before-write before altering state"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Item 2 */}
              <div>
                <label className="block font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-1">
                  2. Representative Task (Concrete scenario that should now succeed)
                </label>
                <input
                  type="text"
                  value={representativeTask}
                  onChange={(e) => setRepresentativeTask(e.target.value)}
                  placeholder="e.g. Handle cross-device storage migration without key collision"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Item 3 */}
              <div>
                <label className="block font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-1">
                  3. Evidence (Observed failure output, error stack, or test log)
                </label>
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  rows={2}
                  placeholder="e.g. Data loss observed when move_file executed concurrently"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Item 4 & 5 */}
              <div className="grid grid-cols-1 grid-cols-1 gap-3">
                <div>
                  <label className="block font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-1">
                    4. Owner (ONE responsible agent or skill)
                  </label>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="e.g. aegis-core-agent"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-1">
                    5. Write Boundary (Files allowed to change)
                  </label>
                  <input
                    type="text"
                    value={writeBoundary}
                    onChange={(e) => setWriteBoundary(e.target.value)}
                    placeholder="e.g. skills/alsanian-enhanced/SKILL.md"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Item 6: Falsifiable Proof */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-cyan-300 uppercase tracking-wider text-[11px]">
                    6. Falsifiable Proof Rule (Command or Re-read) *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setProofKind('re-read')}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        proofKind === 're-read' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Re-read
                    </button>
                    <button
                      type="button"
                      onClick={() => setProofKind('command')}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        proofKind === 'command' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Command
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={proofValue}
                  onChange={(e) => setProofValue(e.target.value)}
                  placeholder={
                    proofKind === 'command'
                      ? 'e.g. npm test -- --run (runnable command)'
                      : 'e.g. re-read of SKILL.md (exact file path)'
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
                />
                <p className="text-[10px] text-slate-500">
                  ⚠️ "Verified", "looks good", or "works" are rejected. Must be a concrete runnable command or file re-read.
                </p>
              </div>

              {/* Repeats & Focused Test */}
              <div className="grid grid-cols-1 grid-cols-1 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 text-[10px] uppercase mb-1">
                    Pattern Repeats (≥3 triggers Critical)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={repeats}
                    onChange={(e) => setRepeats(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl">
                    <input
                      type="checkbox"
                      checked={hasFocusedTest}
                      onChange={(e) => setHasFocusedTest(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-200 font-medium">Has Focused Test</span>
                  </label>
                </div>
              </div>

              {/* Optional Rejection Reason */}
              <div>
                <label className="block font-bold text-slate-400 text-[10px] uppercase mb-1">
                  Rejection Reason (Fill ONLY if proposing to reject into negative buffer)
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Disproved by chaos testing or violates Alsania Code"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-rose-300 placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEvaluateAndSave}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20"
              >
                Execute 7-State Gate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
