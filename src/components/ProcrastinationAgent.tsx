import { useState, useEffect } from "react";
import { 
  ShieldAlert, Sparkles, AlertTriangle, Play, Pause, RotateCcw, 
  CheckCircle2, Flame, HelpCircle, ArrowRight, BookOpen, Clock,
  ChevronDown, ChevronUp, Zap, HelpCircle as HelpIcon, Smile,
  Hourglass, Brain, Compass
} from "lucide-react";
import { Task, SubTask, Habit } from "../types";

interface ProcrastinationAgentProps {
  tasks: Task[];
  habits: Habit[];
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  requestAISubtasks: (taskId: string) => Promise<void>;
  aiAnalyzing: boolean;
  triggerAIAnalysis: () => Promise<void>;
  preferences: any;
}

export default function ProcrastinationAgent({
  tasks,
  habits,
  updateTask,
  requestAISubtasks,
  aiAnalyzing,
  triggerAIAnalysis,
  preferences
}: ProcrastinationAgentProps) {
  // Procrastination evaluation states
  const [selectedTaskForRescue, setSelectedTaskForRescue] = useState<Task | null>(null);
  const [rescuePlan, setRescuePlan] = useState<string | null>(null);
  const [loadingRescue, setLoadingRescue] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

  // Custom Inline Markdown Parser for bold, italics, and code markers
  const parseInlineMarkdown = (text: string) => {
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-slate-300">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-400 font-mono text-[11px] border border-slate-800">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  // High-fidelity markdown block renderer
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("###")) {
        return <h4 key={idx} className="text-white font-extrabold text-sm mt-4 mb-2 first:mt-0 flex items-center gap-1.5 border-b border-slate-800 pb-1 uppercase tracking-wide">{parseInlineMarkdown(trimmed.replace("###", "").trim())}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={idx} className="text-white font-extrabold text-base mt-5 mb-2.5 first:mt-0 border-l-2 border-indigo-500 pl-2">{parseInlineMarkdown(trimmed.replace("##", "").trim())}</h3>;
      }
      if (trimmed.startsWith("#")) {
        return <h2 key={idx} className="text-white font-black text-lg mt-6 mb-3">{parseInlineMarkdown(trimmed.replace("#", "").trim())}</h2>;
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const content = trimmed.substring(2).trim();
        return (
          <li key={idx} className="text-slate-300 text-xs sm:text-sm ml-5 list-disc mb-1.5 leading-relaxed">
            {parseInlineMarkdown(content)}
          </li>
        );
      }
      if (/^\d+\./.test(trimmed)) {
        const content = trimmed.replace(/^\d+\./, "").trim();
        return (
          <li key={idx} className="text-slate-300 text-xs sm:text-sm ml-5 list-decimal mb-2 leading-relaxed">
            {parseInlineMarkdown(content)}
          </li>
        );
      }
      if (trimmed === "") return <div key={idx} className="h-3" />;
      return <p key={idx} className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-2">{parseInlineMarkdown(trimmed)}</p>;
    });
  };

  // 5-Min Breaker Timer States
  const [timerTask, setTimerTask] = useState<Task | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [timerActive, setTimerActive] = useState(false);
  const [timerDone, setTimerDone] = useState(false);

  // Environment prep checklist
  const [prepChecklist, setPrepChecklist] = useState({
    notifsOff: false,
    waterReady: false,
    deskClean: false,
    timerSet: false
  });

  // Countdown timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      setTimerDone(true);
      // Play a visual or log completion
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLeft]);

  // Filter tasks with procrastination traits
  const now = new Date();
  
  const procrastinationTasks = tasks.filter(t => {
    if (t.status === "completed") return false;
    
    const deadlineDate = new Date(t.deadline);
    const isPastDeadline = deadlineDate.getTime() < now.getTime();
    
    // Trait 1: Repeated postponements (postponed at least once)
    const hasPostponed = (t.postponementsCount || 0) > 0;
    
    // Trait 2: Delayed progress (due in less than 3 days but progress is low)
    const daysRemaining = (deadlineDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    const isDelayedProgress = daysRemaining > 0 && daysRemaining <= 3 && (t.progress || 0) <= 25;
    
    // Trait 3: Missed schedule or overdue
    const isOverdue = isPastDeadline;
    
    // Trait 4: High volume of incomplete subtasks
    const incompleteSubtasksCount = t.subtasks?.filter(s => !s.completed).length || 0;
    const hasBlockedSubtasks = incompleteSubtasksCount >= 3;

    return hasPostponed || isDelayedProgress || isOverdue || hasBlockedSubtasks;
  }).sort((a, b) => {
    // Sort critical warnings first (overdue or postponed multiple times)
    const scoreA = (a.postponementsCount || 0) * 3 + (new Date(a.deadline).getTime() < now.getTime() ? 10 : 0);
    const scoreB = (b.postponementsCount || 0) * 3 + (new Date(b.deadline).getTime() < now.getTime() ? 10 : 0);
    return scoreB - scoreA;
  });

  const handleStartTimer = (task: Task) => {
    setTimerTask(task);
    setTimeLeft(300); // 5 mins
    setTimerActive(true);
    setTimerDone(false);
  };

  const handleStopTimer = () => {
    setTimerActive(false);
  };

  const handleResetTimer = () => {
    setTimeLeft(300);
    setTimerActive(false);
    setTimerDone(false);
  };

  const handleCloseTimerModal = () => {
    setTimerTask(null);
    setTimerActive(false);
  };

  // Complete the 5-Min Breaker with some progress bonus!
  const handleFinishBreaker = async () => {
    if (!timerTask) return;
    const currentProgress = timerTask.progress || 0;
    const updatedProgress = Math.min(currentProgress + 15, 95); // Give a 15% motivation boost
    
    await updateTask(timerTask.id, {
      progress: updatedProgress,
      status: "in_progress",
      riskLevel: "medium" // Reduce risk slightly due to starting action!
    });
    
    setTimerTask(null);
    setTimerDone(false);
  };

  // AI Rescue Plan Generation
  const handleRequestRescue = async (task: Task) => {
    setSelectedTaskForRescue(task);
    setRescuePlan(null);
    setLoadingRescue(true);

    try {
      const response = await fetch("/api/procrastination-rescue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          preferences,
          habits: habits.map(h => ({ name: h.name, streak: h.streak }))
        })
      });

      if (!response.ok) throw new Error("Rescue failed");
      const data = await response.json();
      setRescuePlan(data.rescuePlan);
    } catch (err) {
      console.error(err);
      setRescuePlan(
        `### 🚨 Off-the-Grid Quick Intervention
It looks like our high-level advisor is busy, but your Deadline Guardian sentinel is here! Here is your emergency rescue plan:
1. **The 2-Minute Rule**: Open the work file right now. You are permitted to close it in 2 minutes if you still feel overwhelmed.
2. **Remove Decisional Fatigue**: Do not try to write or build the entire thing. Write exactly one outline bullet point.
3. **Environment Isolation**: Set your phone in another room or turn on "Do Not Disturb" for just 15 minutes.`
      );
    } finally {
      setLoadingRescue(false);
    }
  };

  const handleLockInFocus = async (task: Task) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newBlock = {
      date: todayStr,
      time: "14:00",
      durationMinutes: 30,
      actionablePlan: `Quick action session: Unblock the first subtask for "${task.title}".`
    };

    const currentSchedules = task.suggestedSchedule || [];
    await updateTask(task.id, {
      suggestedSchedule: [...currentSchedules, newBlock]
    });
    alert(`Focus block scheduled for today at 2:00 PM! You will see this on your Calendar & Dashboard.`);
  };

  return (
    <div className="space-y-8 pb-12 font-sans selection:bg-indigo-500 selection:text-white" id="procrastination-agent-container">
      
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-850 p-6 sm:p-8 rounded-2xl shadow-xl">
        <div className="absolute top-0 right-0 w-[240px] h-[240px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[180px] h-[180px] bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <Hourglass className="w-3.5 h-3.5" />
              Procrastination Detection Agent
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              AI Procrastination Sentinel
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Equipped with a real-time behavioral diagnostics loop. We scan your agenda for repeated postponements, delayed progress trends, and stalled checklists, then intervene with tactical cognitive rescue scripts.
            </p>
          </div>

          <div className="bg-slate-950 px-4 py-3 rounded-xl border border-slate-850 text-right">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-0.5">Stalled Tasks Detected</span>
            <span className="text-xl font-black text-amber-400">{procrastinationTasks.length}</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Environment Preparation Corner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Environment Preparation Panel */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
            <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Frictionless Prep Shield</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Coaching wisdom shows procrastination is often caused by start-up friction. Complete this 10-second workspace checklist before launching your task:
          </p>

          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/50 border border-slate-850/60 hover:border-slate-800 transition-all cursor-pointer group">
              <input 
                type="checkbox" 
                checked={prepChecklist.notifsOff} 
                onChange={() => setPrepChecklist(p => ({ ...p, notifsOff: !p.notifsOff }))}
                className="w-4 h-4 rounded border-slate-800 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-slate-900 mt-0.5"
              />
              <div className="text-xs">
                <span className={`font-bold block ${prepChecklist.notifsOff ? 'line-through text-slate-500' : 'text-slate-200'}`}>Phone on Do Not Disturb</span>
                <span className="text-[10px] text-slate-500">Put notifications out of direct eyesight</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/50 border border-slate-850/60 hover:border-slate-800 transition-all cursor-pointer group">
              <input 
                type="checkbox" 
                checked={prepChecklist.waterReady} 
                onChange={() => setPrepChecklist(p => ({ ...p, waterReady: !p.waterReady }))}
                className="w-4 h-4 rounded border-slate-800 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-slate-900 mt-0.5"
              />
              <div className="text-xs">
                <span className={`font-bold block ${prepChecklist.waterReady ? 'line-through text-slate-500' : 'text-slate-200'}`}>Hydration Ready</span>
                <span className="text-[10px] text-slate-500">Keep a full glass of water nearby</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/50 border border-slate-850/60 hover:border-slate-800 transition-all cursor-pointer group">
              <input 
                type="checkbox" 
                checked={prepChecklist.deskClean} 
                onChange={() => setPrepChecklist(p => ({ ...p, deskClean: !p.deskClean }))}
                className="w-4 h-4 rounded border-slate-800 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-slate-900 mt-0.5"
              />
              <div className="text-xs">
                <span className={`font-bold block ${prepChecklist.deskClean ? 'line-through text-slate-500' : 'text-slate-200'}`}>Clear Single Workspace</span>
                <span className="text-[10px] text-slate-500">Close irrelevant browser tabs and clutter</span>
              </div>
            </label>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850/60 flex items-center justify-between text-xs">
            <span className="text-slate-450 font-medium">Ready Level:</span>
            <span className="font-extrabold text-indigo-400">
              {Object.values(prepChecklist).filter(Boolean).length === 3 ? "🔥 Fully Optimized Workspace" : "🔋 Preparing Area..."}
            </span>
          </div>
        </div>

        {/* Right Side: Primary Diagnostics Feed */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="font-extrabold text-white text-base flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Active Behavioral Warnings & Rescue
          </h3>

          {procrastinationTasks.length === 0 ? (
            <div className="bg-slate-900 border border-slate-850 p-10 text-center rounded-2xl shadow-md">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 animate-pulse" />
              <h3 className="font-bold text-white text-sm">Perfect Alignment Detected</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed max-w-md mx-auto">
                No procrastination alerts or delayed progress markers triggered. You are maintaining excellent accountability loops and sticking to deadlines!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {procrastinationTasks.map(task => {
                const isOverdue = new Date(task.deadline).getTime() < now.getTime();
                const postponements = task.postponementsCount || 0;
                const progress = task.progress || 0;
                const incompleteSubtasks = task.subtasks?.filter(s => !s.completed) || [];
                const totalSubtasks = task.subtasks?.length || 0;

                // Build specific diagnostic bullet points for user clarity
                const diagnostics: string[] = [];
                if (postponements > 0) {
                  diagnostics.push(`Pushed back / postponed ${postponements} time(s). This indicates a strong deadline avoidance loop.`);
                }
                if (isOverdue) {
                  diagnostics.push("Task deadline is in the PAST. Direct attention is required to clean up your scheduling dashboard.");
                } else {
                  const daysRemaining = (new Date(task.deadline).getTime() - now.getTime()) / (1000 * 3600 * 24);
                  if (daysRemaining <= 3 && progress <= 25) {
                    diagnostics.push(`Due in only ${daysRemaining.toFixed(1)} days, but progress is critically low at ${progress}%. High risk of rushed delivery.`);
                  }
                }
                if (incompleteSubtasks.length > 0) {
                  diagnostics.push(`${incompleteSubtasks.length} out of ${totalSubtasks} subtask milestones remain incomplete. decisonal blockages may be stall triggers.`);
                }

                return (
                  <div key={task.id} className="bg-slate-900 border border-slate-850 rounded-2xl p-5 hover:border-slate-800 transition-all space-y-4">
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-850/60">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white text-sm">{task.title}</h4>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                            postponements >= 3 || isOverdue 
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25 animate-pulse'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                          }`}>
                            {isOverdue ? "⚠️ Overdue" : postponements >= 3 ? "⏳ Critical Avoidance Loop" : "⚡ High Procrastination Avoidance"}
                          </span>
                        </div>
                        <p className="text-slate-450 text-xs mt-0.5 font-mono">
                          Due: {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {postponements > 0 && (
                          <div className="bg-rose-500/5 text-rose-400 border border-rose-500/10 px-2.5 py-1 rounded text-[10px] font-mono font-bold">
                            Postponed {postponements}x
                          </div>
                        )}
                        <div className="bg-slate-950 text-slate-300 border border-slate-800 px-2.5 py-1 rounded text-[10px] font-mono font-bold">
                          Progress {progress}%
                        </div>
                      </div>
                    </div>

                    {/* Procrastination Warning Messages */}
                    <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-850/50 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        AI Diagnostics:
                      </span>
                      <ul className="space-y-1.5 pl-1">
                        {diagnostics.map((diag, index) => (
                          <li key={index} className="text-xs text-slate-300 flex items-start gap-1.5 leading-relaxed">
                            <span className="text-rose-500 font-bold shrink-0">•</span>
                            <span>{diag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* AI Productivity Coaching block */}
                    <div className="bg-indigo-950/10 p-3.5 rounded-xl border border-indigo-500/10 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5" />
                        Focus Coach Strategy:
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed italic">
                        {postponements >= 3 
                          ? `"You have postponed this task ${postponements} times. The goal is no longer about writing a flawless product; it is about writing a draft so bad that you can edit it. Open the document and make a mess. Perfect is the enemy of done."`
                          : isOverdue
                          ? `"Overdue status creates cognitive load and background stress. Change the deadline right now, or block out exactly 15 minutes today to resolve the most urgent blocker."`
                          : `"The friction to start is always highest in the first 120 seconds. Use our 5-Min Breaker tool below to reduce decisional overload. Just study or work for 5 minutes."`
                        }
                      </p>
                    </div>

                    {/* Suggested Actions Interactive Buttons */}
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      <button 
                        onClick={() => handleStartTimer(task)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Run 5-Min Breaker Timer
                      </button>

                      {task.subtasks && task.subtasks.length === 0 && (
                        <button 
                          onClick={() => requestAISubtasks(task.id)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          AI Milestone Breakdown
                        </button>
                      )}

                      <button 
                        onClick={() => handleLockInFocus(task)}
                        className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        Lock in focus block
                      </button>

                      <button 
                        onClick={() => handleRequestRescue(task)}
                        className="bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        <Brain className="w-3.5 h-3.5" />
                        Request AI Rescue Plan
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Real-time AI Rescue Panel (Triggered by requesting rescue) */}
      {selectedTaskForRescue && (
        <div className="bg-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-xl space-y-4 relative animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-tr from-indigo-500 to-rose-500 p-1.5 rounded-lg text-white">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Emergency Rescue: {selectedTaskForRescue.title}</h4>
                <p className="text-[10px] text-slate-400">Tailor-made intervention for procrastination avoidance loops</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedTaskForRescue(null)}
              className="text-slate-500 hover:text-white font-bold text-xs bg-slate-950 border border-slate-800 px-2.5 py-1 rounded"
            >
              Close Plan
            </button>
          </div>

          {loadingRescue ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Hourglass className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-slate-400 text-xs font-mono">Formulating cognitive breakthrough loops...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-950 rounded-xl border border-slate-850 overflow-hidden">
                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed p-5 max-h-[350px] overflow-y-auto font-sans">
                  {renderMarkdown(rescuePlan || "")}
                </div>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <span className="font-bold text-white text-xs block">Accept AI Micro-Commitment:</span>
                  <span className="text-[10px] text-slate-400">Are you ready to commit to starting this right now?</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      handleStartTimer(selectedTaskForRescue);
                      setSelectedTaskForRescue(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-lg cursor-pointer"
                  >
                    Yes! Run 5-Min Breaker Now
                  </button>
                  <button 
                    onClick={async () => {
                      await updateTask(selectedTaskForRescue.id, {
                        status: 'in_progress',
                        progress: Math.max(selectedTaskForRescue.progress || 0, 10)
                      });
                      setSelectedTaskForRescue(null);
                      alert("Excellent commitment! Task status updated to 'In Progress'. Let's do this!");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-lg cursor-pointer"
                  >
                    Commit & Set "In Progress"
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Interactive 5-Min Breaker Timer Modal Overlay */}
      {timerTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-6">
            
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 animate-pulse" />
                Anti-Procrastination Sprint
              </div>
              <h3 className="font-extrabold text-white text-lg">{timerTask.title}</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                The hardest part is just starting. Commit to doing any action on this task for exactly 5 minutes.
              </p>
            </div>

            {/* Large Timer Interface */}
            <div className="flex flex-col items-center justify-center py-6">
              <div className="text-5xl font-black text-white tracking-widest font-mono">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
              
              {/* Circular track visual */}
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-6 border border-slate-850">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-1000"
                  style={{ width: `${(timeLeft / 300) * 100}%` }}
                />
              </div>
            </div>

            {/* Interactive controls */}
            <div className="flex items-center justify-center gap-3">
              {timerActive ? (
                <button 
                  onClick={handleStopTimer}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              ) : (
                <button 
                  onClick={() => setTimerActive(true)}
                  disabled={timerDone}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Start Timer
                </button>
              )}

              <button 
                onClick={handleResetTimer}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            {/* Success state */}
            {timerDone && (
              <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl text-center space-y-3 animate-fadeIn">
                <Smile className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">Friction Defeated!</h4>
                  <p className="text-xs text-slate-300">You successfully spent 5 minutes on this task. Momentum is now on your side.</p>
                </div>
                <button 
                  onClick={handleFinishBreaker}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-lg transition-all cursor-pointer"
                >
                  Claim +15% Progress Boost & Close
                </button>
              </div>
            )}

            <button 
              onClick={handleCloseTimerModal}
              className="absolute top-2 right-4 text-slate-500 hover:text-white font-bold text-xs bg-slate-950/40 p-1 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
