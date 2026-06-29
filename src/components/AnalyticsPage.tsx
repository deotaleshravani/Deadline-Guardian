import React, { useState, useEffect } from "react";
import { 
  TrendingUp, CheckCircle2, ShieldAlert, Award, 
  Clock, Zap, Activity, Flame, ChevronRight, BarChart2, 
  Sparkles, Brain, Bell, Play, Pause, RotateCcw, Plus,
  ShieldCheck, ArrowUpRight, Check, Timer, Coffee, Target, Loader2, X
} from "lucide-react";
import { Task, Goal, Habit } from "../types";

interface AnalyticsPageProps {
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  preferences: any;
}

interface ActionableReminder {
  id: string;
  taskId: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionStep: string;
}

export default function AnalyticsPage({ tasks, goals, habits, preferences }: AnalyticsPageProps) {
  
  // Local Focus state
  const [loggedFocusMinutes, setLoggedFocusMinutes] = useState<number>(() => {
    const saved = localStorage.getItem("deadline_guardian_focus_minutes");
    return saved ? parseInt(saved, 10) : 120;
  });

  // Pomodoro timer states
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');
  const [timerSessionDuration, setTimerSessionDuration] = useState(25);
  const [selectedTaskForTimer, setSelectedTaskForTimer] = useState<string>("");

  // In-app Notification (Replaces window.alert for iframe support)
  const [inAppToast, setInAppToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // AI Reminders state
  const [reminders, setReminders] = useState<ActionableReminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    localStorage.setItem("deadline_guardian_focus_minutes", loggedFocusMinutes.toString());
  }, [loggedFocusMinutes]);

  // Timer Ticking Hook
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (timerActive && timerSecondsLeft === 0) {
      setTimerActive(false);
      if (timerMode === 'focus') {
        const addedMins = timerSessionDuration;
        setLoggedFocusMinutes(prev => prev + addedMins);
        setInAppToast({
          message: `🔥 Focus block finished! Credited ${addedMins} minutes to your Focus Time tracking.`,
          type: 'success'
        });
        setTimerSecondsLeft(5 * 60); // Break default
        setTimerMode('break');
      } else {
        setInAppToast({
          message: "☕ Break completed! Let's lock in for another focus session.",
          type: 'info'
        });
        setTimerSecondsLeft(25 * 60);
        setTimerMode('focus');
        setTimerSessionDuration(25);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timerSecondsLeft, timerMode, timerSessionDuration]);

  // Fetch Actionable Reminders
  const isFetchingReminders = React.useRef(false);

  const fetchAIReminders = async (force: boolean = false) => {
    if (isFetchingReminders.current) return;
    isFetchingReminders.current = true;
    setLoadingReminders(true);
    setHasScanned(true);

    const activeTasks = tasks.filter(t => t.status !== "completed");
    const tasksChecksum = activeTasks.map(t => `${t.id}:${t.status}:${t.deadline}:${t.estimatedTime}`).join("|");
    const cachedChecksum = localStorage.getItem("deadline_guardian_reminders_checksum");
    const cachedData = localStorage.getItem("deadline_guardian_reminders_data");

    if (!force && cachedChecksum === tasksChecksum && cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed)) {
          setReminders(parsed);
          setLoadingReminders(false);
          isFetchingReminders.current = false;
          return;
        }
      } catch (e) {
        console.warn("Failed to parse cached reminders, refetching...", e);
      }
    }

    try {
      const response = await fetch("/api/generate-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, preferences })
      });
      if (!response.ok) throw new Error("Failed to load actionable reminders");
      const data = await response.json();
      const list = data.reminders || [];
      setReminders(list);
      localStorage.setItem("deadline_guardian_reminders_checksum", tasksChecksum);
      localStorage.setItem("deadline_guardian_reminders_data", JSON.stringify(list));
    } catch (err) {
      console.error("AI Reminders API failed, running high-fidelity fallback parser:", err);
      if (activeTasks.length === 0) {
        const fallback = [
          {
            id: "all-clear",
            taskId: "",
            message: "Your active queue is completely clear. Maintain your momentum by scheduling your next high-impact goal today.",
            priority: "low" as const,
            actionStep: "Schedule next goal"
          }
        ];
        setReminders(fallback);
        localStorage.setItem("deadline_guardian_reminders_checksum", tasksChecksum);
        localStorage.setItem("deadline_guardian_reminders_data", JSON.stringify(fallback));
      } else {
        const sorted = [...activeTasks].sort((a, b) => {
          if (a.priority === "high" && b.priority !== "high") return -1;
          if (a.priority !== "high" && b.priority === "high") return 1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });

        const fallbackList: ActionableReminder[] = sorted.slice(0, 3).map(task => {
          const hoursNeeded = Math.ceil((task.estimatedTime || 120) / 60);
          const deadlineDate = new Date(task.deadline);
          const today = new Date();
          const diffTime = deadlineDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let deadlineStr = `due in ${diffDays} days`;
          if (diffDays === 0) deadlineStr = "due today";
          else if (diffDays === 1) deadlineStr = "due tomorrow";
          else if (diffDays < 0) deadlineStr = "past due";

          const pendingSubtask = task.subtasks?.find(s => !s.completed);
          const firstStep = pendingSubtask?.title || "initial drafting and framework";

          return {
            id: task.id,
            taskId: task.id,
            message: `Your "${task.title}" needs ${hoursNeeded} hours of work and is ${deadlineStr}. Start by completing the "${firstStep}" today.`,
            priority: task.priority || "medium",
            actionStep: `Tackle ${firstStep}`
          };
        });
        setReminders(fallbackList);
        localStorage.setItem("deadline_guardian_reminders_checksum", tasksChecksum);
        localStorage.setItem("deadline_guardian_reminders_data", JSON.stringify(fallbackList));
      }
    } finally {
      setLoadingReminders(false);
      isFetchingReminders.current = false;
    }
  };

  // Run initial scan on mount automatically
  useEffect(() => {
    if (tasks.length > 0 && !hasScanned) {
      fetchAIReminders(false);
    }
  }, [tasks]);

  const addManualFocusMinutes = (minutes: number) => {
    setLoggedFocusMinutes(prev => prev + minutes);
  };

  const applyTimerPreset = (minutes: number, mode: 'focus' | 'break') => {
    setTimerActive(false);
    setTimerMode(mode);
    setTimerSessionDuration(minutes);
    setTimerSecondsLeft(minutes * 60);
  };

  const formatTimeText = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Analytics Real-Time Computations
  const completedTasks = tasks.filter(t => t.status === "completed");
  const pendingTasks = tasks.filter(t => t.status !== "completed");
  const totalTasks = tasks.length;

  const missedTasks = tasks.filter(t => {
    if (t.status === "completed") return false;
    const deadlineDate = new Date(t.deadline);
    return deadlineDate.getTime() < new Date().getTime();
  });

  const completedGoals = goals.filter(g => g.progress === 100);
  const totalGoals = goals.length;
  const goalCompletionRate = totalGoals > 0 ? Math.round((completedGoals.length / totalGoals) * 100) : 0;

  const habitConsistencyPercent = habits.length > 0
    ? Math.round((habits.reduce((acc, h) => {
        const last7Completions = h.history?.filter(dateStr => {
          const date = new Date(dateStr);
          const diff = new Date().getTime() - date.getTime();
          return diff <= 7 * 24 * 3600 * 1000;
        }).length || 0;
        return acc + (last7Completions / 7);
      }, 0) / habits.length) * 100)
    : 0;

  const peakAtomicStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak || 0)) : 0;

  const taskFocusTimeMinutes = tasks.reduce((acc, t) => {
    if (t.status === "completed") {
      return acc + (t.estimatedTime || 45);
    } else if (t.status === "in_progress") {
      return acc + Math.round((t.estimatedTime || 45) * 0.4);
    }
    return acc;
  }, 0);

  const totalFocusTimeMinutes = loggedFocusMinutes + taskFocusTimeMinutes;
  const focusTimeHours = (totalFocusTimeMinutes / 60).toFixed(1);

  // Productivity scoring algorithm
  const getProductivityScore = () => {
    let taskScore = totalTasks > 0 ? (completedTasks.length / totalTasks) * 45 : 30;
    let habitScore = habitConsistencyPercent * 0.30;
    let goalScore = totalGoals > 0 ? (goals.reduce((acc, g) => acc + (g.progress || 0), 0) / (totalGoals * 100)) * 25 : 15;
    const missedDeduction = missedTasks.length * 4;
    
    let total = Math.round(taskScore + habitScore + goalScore - missedDeduction);
    total = Math.max(10, Math.min(100, total));
    
    if (totalTasks === 0 && totalGoals === 0 && habits.length === 0) {
      return 75;
    }
    return total;
  };

  const productivityScore = getProductivityScore();

  const getScoreAssessment = (score: number) => {
    if (score >= 90) return { title: "Elite Focus Rhythm", desc: "Superb alignment across study blocks, milestone checklist completion, and routine habits. Pacing risks are minimal." };
    if (score >= 75) return { title: "Steady Focus Rhythm", desc: "Safe pacing with adequate task velocity. Lock in continuous daily habits to secure a top-tier score." };
    if (score >= 50) return { title: "Moderate Pacing", desc: "Pacing variables are sub-optimal. Complete critical tasks and prevent backlog accumulation to avoid risk warnings." };
    return { title: "Action Required", desc: "Critical backlog bottlenecking detected. Break large deliverables down and run a 5-minute Pomodoro focus block." };
  };

  const assessment = getScoreAssessment(productivityScore);

  return (
    <div className="space-y-8 pb-12 font-sans">
      
      {/* 1. Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-border-custom relative">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-main tracking-tight">
            Your Focus Progress
          </h1>
          <p className="text-base text-text-sub max-w-2xl">
            Evaluate task velocity, log custom focus blocks, and scan AI suggestions to optimize study pacing variables.
          </p>
        </div>

        {/* Dynamic score summary badge */}
        <div className="flex items-center gap-2.5 bg-card-bg border border-border-custom p-4 rounded-2xl shadow-xs self-start sm:self-center">
          <div className="text-right">
            <span className="text-[10px] text-text-sub font-bold uppercase tracking-wider block">DISCIPLINE RATING</span>
            <span className="text-sm font-extrabold text-text-main">{assessment.title}</span>
          </div>
          <span className="text-3xl font-black text-brand bg-brand/10 w-12 h-12 flex items-center justify-center rounded-xl font-mono shrink-0">
            {productivityScore}
          </span>
        </div>
      </div>

      {/* Inline Notifications / Micro Toasts (Safe for iFrame Sandbox) */}
      {inAppToast && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-2xl flex items-center justify-between gap-4 animate-scale-up">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{inAppToast.message}</span>
          </div>
          <button 
            onClick={() => setInAppToast(null)}
            className="p-1 hover:bg-emerald-500/10 text-emerald-500 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Primary Metrics Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Completed tasks velocity */}
        <div className="bg-card-bg border border-border-custom p-6 rounded-3xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-sub mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Completion Velocity</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-3xl font-black text-text-main font-mono">{completedTasks.length}</h3>
            <p className="text-xs text-text-sub font-medium">Out of {totalTasks} total deliverables</p>
          </div>
        </div>

        {/* Routine consistency */}
        <div className="bg-card-bg border border-border-custom p-6 rounded-3xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-sub mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Routine Consistency</span>
            <Flame className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-3xl font-black text-text-main font-mono">{habitConsistencyPercent}%</h3>
            <p className="text-xs text-text-sub font-medium">Peak Streak: {peakAtomicStreak} days</p>
          </div>
        </div>

        {/* Milestone milestones */}
        <div className="bg-card-bg border border-border-custom p-6 rounded-3xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-sub mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Milestones Achieved</span>
            <Target className="w-5 h-5 text-brand" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-3xl font-black text-text-main font-mono">{goalCompletionRate}%</h3>
            <p className="text-xs text-text-sub font-medium">{completedGoals.length} completed out of {totalGoals}</p>
          </div>
        </div>

        {/* Focused hours */}
        <div className="bg-card-bg border border-border-custom p-6 rounded-3xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-sub mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Focused Time</span>
            <Clock className="w-5 h-5 text-teal-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-3xl font-black text-text-main font-mono">{focusTimeHours}h</h3>
            <p className="text-xs text-text-sub font-medium">Including {loggedFocusMinutes} logged mins</p>
          </div>
        </div>

      </div>

      {/* 3. Pomodoro Focus Clock & AI Actionable Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Pomodoro Focus Clock */}
        <div className="bg-card-bg border border-border-custom p-6 sm:p-8 rounded-3xl shadow-sm space-y-6 flex flex-col items-center">
          <div className="w-full pb-3 border-b border-border-custom flex items-center justify-between">
            <h3 className="text-base font-extrabold text-text-main flex items-center gap-2">
              <Timer className="w-5 h-5 text-brand" />
              Focus Clock
            </h3>
            <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-mono font-bold capitalize">
              {timerMode} block
            </span>
          </div>

          {/* Clock Timer Display */}
          <div className="relative w-44 h-44 flex flex-col items-center justify-center border-4 border-dashed border-border-custom rounded-full my-4">
            <span className="text-4xl font-black text-text-main tracking-tight font-mono">
              {formatTimeText(timerSecondsLeft)}
            </span>
            <span className="text-[10px] text-text-sub font-bold uppercase tracking-wider mt-1">
              {timerMode === 'focus' ? 'DEDICATED STUDY' : 'RECHARGE'}
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex justify-center gap-1.5 w-full bg-page-bg border border-border-custom rounded-2xl p-1">
            <button
              onClick={() => applyTimerPreset(25, 'focus')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timerSessionDuration === 25 && timerMode === 'focus' ? 'bg-card-bg text-brand' : 'text-text-sub'
              }`}
            >
              25m Focus
            </button>
            <button
              onClick={() => applyTimerPreset(50, 'focus')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timerSessionDuration === 50 && timerMode === 'focus' ? 'bg-card-bg text-brand' : 'text-text-sub'
              }`}
            >
              50m Focus
            </button>
            <button
              onClick={() => applyTimerPreset(5, 'break')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timerMode === 'break' ? 'bg-card-bg text-teal-500' : 'text-text-sub'
              }`}
            >
              5m Break
            </button>
          </div>

          {/* Clock Control Buttons */}
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setTimerActive(!timerActive)}
              className={`flex-1 py-3.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                timerActive 
                  ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                  : 'bg-brand hover:bg-brand-hover text-white'
              }`}
            >
              {timerActive ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause Session</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Session</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                setTimerActive(false);
                setTimerSecondsLeft(timerSessionDuration * 60);
              }}
              className="px-4 py-3.5 bg-page-bg hover:bg-sidebar-bg border border-border-custom rounded-2xl text-text-sub hover:text-text-main cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Manual Logger adjustment */}
          <div className="w-full pt-4 border-t border-border-custom text-center space-y-2">
            <p className="text-xs text-text-sub font-semibold">Tackled offline study sessions? Log minutes manually:</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => addManualFocusMinutes(15)}
                className="px-3 py-1.5 bg-page-bg hover:bg-sidebar-bg border border-border-custom text-xs font-bold text-text-main rounded-lg cursor-pointer"
              >
                +15 Min
              </button>
              <button
                onClick={() => addManualFocusMinutes(30)}
                className="px-3 py-1.5 bg-page-bg hover:bg-sidebar-bg border border-border-custom text-xs font-bold text-text-main rounded-lg cursor-pointer"
              >
                +30 Min
              </button>
              <button
                onClick={() => addManualFocusMinutes(60)}
                className="px-3 py-1.5 bg-page-bg hover:bg-sidebar-bg border border-border-custom text-xs font-bold text-text-main rounded-lg cursor-pointer"
              >
                +60 Min
              </button>
            </div>
          </div>
        </div>

        {/* AI Actionable Reminders */}
        <div className="lg:col-span-2 bg-card-bg border border-border-custom p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
          <div className="pb-3 border-b border-border-custom flex items-center justify-between">
            <h3 className="text-base font-extrabold text-text-main flex items-center gap-2">
              <Brain className="w-5 h-5 text-brand animate-spin-slow" />
              AI Actionable Reminders
            </h3>
            <button
              onClick={() => fetchAIReminders(true)}
              disabled={loadingReminders}
              className="text-xs text-brand font-extrabold hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Scan Now
            </button>
          </div>

          {loadingReminders ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-brand animate-spin" />
              <p className="text-xs text-text-sub font-semibold">Generating focus tasks...</p>
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-16 text-text-sub space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-text-main">Pacing protected</h4>
              <p className="text-xs max-w-sm mx-auto">No outstanding reminders found. Complete tasks and habits to keep alignment secure.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reminders.map((reminder, idx) => (
                <div 
                  key={reminder.id || idx}
                  className="bg-page-bg border border-border-custom p-5 rounded-2xl flex flex-col sm:flex-row items-start justify-between gap-4 group hover:border-brand/30 transition-all"
                >
                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                      reminder.priority === 'high' 
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/15'
                        : 'bg-slate-500/10 text-text-sub border border-border-custom'
                    }`}>
                      {reminder.priority} Priority
                    </span>
                    <p className="text-sm text-text-main leading-relaxed pt-1 font-semibold group-hover:text-brand transition-colors">
                      {reminder.message}
                    </p>
                  </div>
                  
                  <div className="shrink-0 pt-1">
                    <button
                      onClick={() => setReminders(prev => prev.filter(r => r.id !== reminder.id))}
                      className="px-3.5 py-2 bg-card-bg hover:bg-brand hover:text-white border border-border-custom hover:border-brand text-xs font-bold text-text-sub rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      {reminder.actionStep}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
