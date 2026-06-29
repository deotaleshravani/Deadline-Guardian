import { useState } from "react";
import { 
  Sparkles, CheckSquare, Flame, Calendar, Clock, AlertTriangle, 
  ArrowRight, CheckCircle2, UserCheck, Zap, TrendingUp, ChevronDown, ChevronUp, Bot, Trash2
} from "lucide-react";
import { Task, Goal, Habit, AIRecommendation, AgentLog } from "../types";

interface DashboardProps {
  preferences: any;
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  recommendations: AIRecommendation[];
  agentLogs?: AgentLog[];
  aiAnalyzing: boolean;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  completeHabitToday: (habitId: string) => Promise<void>;
  dismissRecommendation: (recId: string) => Promise<void>;
  setActiveTab: (tab: string) => void;
  triggerAIAnalysis: () => Promise<void>;
  openCoachChat: () => void;
}

export default function Dashboard({
  preferences,
  tasks,
  goals,
  habits,
  recommendations,
  agentLogs = [],
  aiAnalyzing,
  updateTask,
  completeHabitToday,
  dismissRecommendation,
  setActiveTab,
  triggerAIAnalysis,
  openCoachChat
}: DashboardProps) {
  
  const [showLogs, setShowLogs] = useState(false);

  // Statistics & Filtering
  const pendingTasks = tasks.filter(t => t.status !== "completed");
  const completedTasks = tasks.filter(t => t.status === "completed");
  
  // Find highest priority task
  const highestPriorityTask = [...pendingTasks].sort((a, b) => {
    const scoreA = a.aiPriorityScore ?? 0;
    const scoreB = b.aiPriorityScore ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    
    const prioWeight = { high: 3, medium: 2, low: 1 };
    return prioWeight[b.priority] - prioWeight[a.priority];
  })[0];

  // Find next deadline
  const nextDeadlineTask = [...pendingTasks].sort((a, b) => 
    new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  )[0];

  // AI Suggestions
  const activeSuggestions = recommendations.filter(r => r.status === "active").slice(0, 2);

  // Productivity/Progress Score
  const score = preferences?.productivityScore ?? 75;

  // Calendar Schedule Blocks
  const todayScheduleBlocks = tasks
    .filter(t => t.status !== "completed" && t.suggestedSchedule && t.suggestedSchedule.length > 0)
    .flatMap(t => t.suggestedSchedule!.map(s => ({
      taskTitle: t.title,
      taskId: t.id,
      date: s.date,
      time: s.time,
      duration: s.durationMinutes,
      plan: s.actionablePlan
    })))
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 3);

  // Formatted Greeting message using everyday language
  const getGreetingMessage = () => {
    const name = preferences?.name || "User";
    if (pendingTasks.length === 0) {
      return `Welcome, ${name}. Your slate is clear! No active deadlines. Perfect time to map out new goals.`;
    }
    const criticalTasksCount = pendingTasks.filter(t => t.deadlineRisk === "Critical Risk" || t.deadlineRisk === "High Risk").length;
    if (criticalTasksCount > 0) {
      return `Hello, ${name}. Focus needed! You have ${criticalTasksCount} task(s) nearing critical limits. Let's make progress on them first.`;
    }
    return `Welcome back, ${name}. You have ${pendingTasks.length} pending tasks. Stick to your scheduled focus blocks to have a stress-free day!`;
  };

  const formatDeadlineDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-10 font-sans pb-12">
      
      {/* 1. Header & Greeting Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border-custom">
        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-main tracking-tight">
            Your Focus Space
          </h1>
          <p className="text-base text-text-sub max-w-2xl">
            {getGreetingMessage()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={openCoachChat}
            className="px-5 py-3 bg-card-bg hover:bg-sidebar-bg text-text-main border border-border-custom hover:border-text-sub/30 rounded-2xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer btn-hover-effect"
          >
            <Bot className="w-4 h-4 text-emerald-500" />
            Chat with Coach
          </button>
          <button
            onClick={triggerAIAnalysis}
            disabled={aiAnalyzing}
            className="px-5 py-3 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white rounded-2xl text-sm font-bold transition-all shadow-md hover:shadow-brand/20 flex items-center gap-2 cursor-pointer btn-hover-effect"
          >
            <Zap className={`w-4 h-4 text-amber-300 ${aiAnalyzing ? "animate-pulse" : ""}`} />
            {aiAnalyzing ? "Analyzing..." : "Optimize Schedule"}
          </button>
        </div>
      </div>

      {/* 2. Today's Focus Overview - Prominent Metrics Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Progress Score (Productivity Score) Card */}
        <div className="bg-card-bg border border-border-custom rounded-3xl p-7 shadow-sm relative flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-text-sub uppercase tracking-wider">Your Progress Score</h3>
            <span className="text-[10px] bg-brand/15 text-brand px-2.5 py-1 rounded-full font-bold uppercase font-mono">Live Gauge</span>
          </div>

          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Radial Progress SVG */}
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="72" 
                  cy="72" 
                  r="62" 
                  className="stroke-border-custom dark:stroke-slate-800" 
                  strokeWidth="8" 
                  fill="transparent" 
                />
                <circle 
                  cx="72" 
                  cy="72" 
                  r="62" 
                  className="stroke-brand" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 62}
                  strokeDashoffset={2 * Math.PI * 62 * (1 - score / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-text-main tracking-tight">{score}%</span>
                <span className="text-[10px] text-text-sub font-bold uppercase tracking-widest mt-0.5">Efficiency</span>
              </div>
            </div>
            
            <div className="mt-5 text-center">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-page-bg border border-border-custom text-text-main">
                {score >= 85 ? "🔥 Excellent Rhythm" : score >= 70 ? "⚡ Safe Pace" : "⚠️ Attention Required"}
              </span>
            </div>
          </div>
        </div>

        {/* Highest Priority Task */}
        <div className="bg-card-bg border border-border-custom rounded-3xl p-7 shadow-sm relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-text-sub uppercase tracking-wider">Today's Highest Priority</h3>
              <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full font-bold uppercase font-mono">Top Goal</span>
            </div>

            {highestPriorityTask ? (
              <div className="space-y-3">
                <h4 className="text-lg font-extrabold text-text-main tracking-tight leading-snug">
                  {highestPriorityTask.title}
                </h4>
                <p className="text-sm text-text-sub line-clamp-3">
                  {highestPriorityTask.description || "No description provided."}
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`px-2.5 py-1 rounded-lg font-semibold border ${
                    highestPriorityTask.deadlineRisk === "Critical Risk" || highestPriorityTask.deadlineRisk === "High Risk"
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  }`}>
                    Deadline Health: {highestPriorityTask.deadlineRisk || "Stable"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-text-sub space-y-2">
                <p className="text-sm">All set! No pending priorities.</p>
                <button 
                  onClick={() => setActiveTab("Tasks")} 
                  className="text-xs text-brand font-bold hover:underline"
                >
                  Create a task →
                </button>
              </div>
            )}
          </div>

          {highestPriorityTask && (
            <div className="pt-4 border-t border-border-custom mt-4 flex justify-between items-center">
              <div className="w-2/3 bg-page-bg rounded-full h-2">
                <div 
                  className="bg-brand h-2 rounded-full transition-all duration-300"
                  style={{ width: `${highestPriorityTask.progress || 0}%` }}
                />
              </div>
              <button 
                onClick={() => updateTask(highestPriorityTask.id, { status: "completed", progress: 100 })}
                className="text-xs font-bold text-brand hover:text-brand-hover cursor-pointer"
              >
                Mark Complete
              </button>
            </div>
          )}
        </div>

        {/* Next Deadline */}
        <div className="bg-card-bg border border-border-custom rounded-3xl p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-text-sub uppercase tracking-wider">Next Deadline</h3>
              <span className="text-[10px] bg-rose-500/15 text-rose-500 px-2.5 py-1 rounded-full font-bold uppercase font-mono">Due Soon</span>
            </div>

            {nextDeadlineTask ? (
              <div className="space-y-3">
                <h4 className="text-lg font-extrabold text-text-main tracking-tight leading-snug">
                  {nextDeadlineTask.title}
                </h4>
                <div className="flex items-center gap-2 text-text-sub text-sm">
                  <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formatDeadlineDate(nextDeadlineTask.deadline)}</span>
                </div>
                <p className="text-xs text-text-sub leading-normal">
                  Suggested focus: Prepare environment & clear alerts to secure completion.
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-text-sub">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm">No upcoming deadlines.</p>
              </div>
            )}
          </div>

          {nextDeadlineTask && (
            <div className="pt-4 border-t border-border-custom mt-4">
              <button 
                onClick={() => setActiveTab("Tasks")}
                className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1 cursor-pointer"
              >
                <span>Manage all tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* 3. Today's Suggestions & Today's Schedule Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Today's Suggestions (AI Recommendations) */}
        <div className="bg-card-bg border border-border-custom rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border-custom">
            <h2 className="text-xl font-extrabold text-text-main tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand" />
              Today's Suggestions
            </h2>
            <span className="text-xs text-text-sub font-semibold">AI Assistant</span>
          </div>

          {activeSuggestions.length === 0 ? (
            <div className="text-center py-12 text-text-sub space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-75" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-text-main">Your focus rhythm is fully protected</p>
                <p className="text-xs max-w-sm mx-auto">No outstanding alerts or schedule blocks require intervention. Outstanding job!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSuggestions.map((rec) => (
                <div 
                  key={rec.id} 
                  className="bg-page-bg border border-border-custom p-5 rounded-2xl flex flex-col sm:flex-row items-start justify-between gap-4 transition-all hover:border-brand/40 group"
                >
                  <div className="space-y-1.5 flex-1">
                    <span className="text-[10px] font-bold text-brand tracking-wider uppercase font-mono block">
                      {rec.type === 'risk' ? '🚨 Deadline Alert' : '⚡ Action Block'}
                    </span>
                    <h4 className="font-bold text-base text-text-main leading-tight group-hover:text-brand transition-colors">
                      {rec.title}
                    </h4>
                    <p className="text-xs text-text-sub leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    <button
                      onClick={() => dismissRecommendation(rec.id)}
                      className="px-3 py-1.5 bg-card-bg hover:bg-rose-500/10 hover:text-rose-500 border border-border-custom rounded-lg text-xs font-bold text-text-sub transition-all cursor-pointer"
                    >
                      Dismiss
                    </button>
                    {rec.taskId && (
                      <button
                        onClick={async () => {
                          await updateTask(rec.taskId!, { status: 'in_progress', progress: 10 });
                          await dismissRecommendation(rec.id);
                        }}
                        className="px-3 py-1.5 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm shadow-brand/10"
                      >
                        Start Focus
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Schedule (Calendar Preview) */}
        <div className="bg-card-bg border border-border-custom rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border-custom">
            <h2 className="text-xl font-extrabold text-text-main tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand" />
              Today's Schedule
            </h2>
            <button 
              onClick={() => setActiveTab("Calendar")}
              className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todayScheduleBlocks.length === 0 ? (
            <div className="text-center py-12 text-text-sub space-y-3 bg-page-bg border border-dashed border-border-custom rounded-2xl">
              <Clock className="w-10 h-10 text-text-sub mx-auto opacity-50" />
              <div className="space-y-1 px-4">
                <p className="font-bold text-sm text-text-main">No study or focus blocks locked in for today</p>
                <p className="text-xs max-w-sm mx-auto mb-3">Optimize your schedule now using artificial intelligence to auto-balance your workload.</p>
                <button 
                  onClick={() => setActiveTab("Calendar")}
                  className="px-4 py-2 bg-brand text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer hover:bg-brand-hover transition-all"
                >
                  Generate Focus Plan
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {todayScheduleBlocks.map((block, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-16 shrink-0 text-right pt-0.5">
                    <span className="font-mono text-xs font-extrabold text-text-main block">{block.time}</span>
                    <span className="text-[10px] text-text-sub font-semibold">{block.duration} mins</span>
                  </div>
                  <div className="relative pb-4 flex-1">
                    {/* Vertical timeline line */}
                    {idx < todayScheduleBlocks.length - 1 && (
                      <span className="absolute left-0 top-6 bottom-0 w-[2px] bg-border-custom -ml-[25px]" />
                    )}
                    <div className="bg-page-bg border border-border-custom p-4 rounded-2xl">
                      <h4 className="font-bold text-sm text-text-main">{block.taskTitle}</h4>
                      {block.plan && (
                        <p className="text-xs text-text-sub mt-1 leading-normal italic">
                          💡 Action: {block.plan}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 4. Progress Overview & Expandable Logs */}
      <div className="bg-card-bg border border-border-custom rounded-3xl p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border-custom">
          <div>
            <h2 className="text-xl font-extrabold text-text-main tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand" />
              Progress Overview
            </h2>
            <p className="text-xs text-text-sub mt-1">Summary of task velocity and completion streaks</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center sm:text-right">
              <p className="text-2xl font-black text-brand">{completedTasks.length}</p>
              <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider">Completed Tasks</p>
            </div>
            <div className="border-r border-border-custom my-1" />
            <div className="text-center sm:text-right">
              <p className="text-2xl font-black text-amber-500">{pendingTasks.length}</p>
              <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider">Pending Tasks</p>
            </div>
          </div>
        </div>

        {/* Expandable Autonomous Actions Section */}
        <div className="border border-border-custom rounded-2xl overflow-hidden bg-page-bg">
          <button 
            onClick={() => setShowLogs(!showLogs)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-sidebar-bg/60 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-brand" />
              <span className="font-bold text-xs text-text-main tracking-wider uppercase">Inspect AI Planning Traces</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-mono font-bold">
                {agentLogs.length} Traces Available
              </span>
              {showLogs ? <ChevronUp className="w-4 h-4 text-text-sub" /> : <ChevronDown className="w-4 h-4 text-text-sub" />}
            </div>
          </button>

          {showLogs && (
            <div className="p-5 border-t border-border-custom space-y-3 max-h-[300px] overflow-y-auto bg-card-bg">
              {agentLogs.length === 0 ? (
                <p className="text-center py-6 text-xs text-text-sub italic">No analytical planning traces logged yet.</p>
              ) : (
                agentLogs.map((log) => {
                  let badgeColor = "bg-brand/10 text-brand border-brand/20";
                  if (log.severity === 'success') badgeColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                  if (log.severity === 'warning') badgeColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                  if (log.severity === 'alert') badgeColor = "bg-rose-500/10 text-rose-500 border-rose-500/20";

                  const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={log.id} className="p-3.5 bg-page-bg border border-border-custom rounded-xl flex items-start justify-between gap-4 text-xs">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${badgeColor}`}>
                            {log.actionType.replace('_', ' ')}
                          </span>
                          <h4 className="font-extrabold text-text-main">{log.title}</h4>
                        </div>
                        <p className="text-text-sub text-xs leading-relaxed">{log.description}</p>
                      </div>
                      <span className="text-[10px] font-mono text-text-sub bg-card-bg border border-border-custom px-2 py-0.5 rounded-lg shrink-0">
                        {time}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
