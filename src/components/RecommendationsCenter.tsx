import { 
  Sparkles, CheckSquare, Clock, AlertTriangle, ShieldAlert,
  Calendar, Check, UserCheck, Flame, Zap, ArrowRight, Lightbulb
} from "lucide-react";
import { AIRecommendation, Task } from "../types";

interface RecommendationsCenterProps {
  preferences: any;
  recommendations: AIRecommendation[];
  tasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  dismissRecommendation: (recId: string) => Promise<void>;
}

export default function RecommendationsCenter({
  preferences,
  recommendations,
  tasks,
  updateTask,
  dismissRecommendation
}: RecommendationsCenterProps) {
  
  const activeRecs = recommendations.filter(r => r.status === "active");
  const role = preferences?.role || "professional";

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

  const getRoleTitle = () => {
    if (role === 'student') return "Academic Accountability Center";
    if (role === 'entrepreneur') return "Venture Milestones & Velocity";
    return "Professional Flow & Delivery";
  };

  const getRoleCoachTip = () => {
    if (role === 'student') {
      return "Procrastination often kicks in when studying starts. Split long reading chapters into 5-minute intervals. Completing 1 milestone triggers motivation momentum!";
    }
    if (role === 'entrepreneur') {
      return "Founders are constantly context-switching. Protect your mornings for deep product execution blocks before your attention is hijacked by messages and emails.";
    }
    return "Professionals often fall into the meeting trap. Always set aside 'maker time' focus blocks immediately before major deliveries to protect your execution focus.";
  };

  const handleApplyFocus = async (rec: AIRecommendation) => {
    if (!rec.taskId) return;
    const task = tasks.find(t => t.id === rec.taskId);
    if (!task) return;

    // Apply the suggested schedule block
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultBlock = {
      date: todayStr,
      time: "10:00",
      durationMinutes: 45,
      actionablePlan: "Lock in focused sprint. Shut down communication channels."
    };

    const currentSchedules = task.suggestedSchedule || [];
    const exists = currentSchedules.some(s => s.date === todayStr);
    
    if (!exists) {
      await updateTask(rec.taskId, {
        suggestedSchedule: [...currentSchedules, defaultBlock]
      });
    }
    
    // Dismiss this recommendation since it was successfully applied
    await dismissRecommendation(rec.id);
  };

  return (
    <div className="space-y-8 pb-12 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Page Header */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-850 p-6 sm:p-8 rounded-2xl shadow-lg">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              AI Recommendations & Coaching
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {getRoleTitle()}
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
              Proactive scheduling, procrastination blockades, and corrective focus blocks curated by your Deadline Guardian companion.
            </p>
          </div>
          <div className="bg-slate-950 px-4 py-3 rounded-xl border border-slate-850 shrink-0">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Active Guidelines</span>
            <span className="text-sm font-extrabold text-white capitalize">{preferences?.role || "professional"} Mode</span>
          </div>
        </div>
      </div>

      {/* Grid: Coaching Tips & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Main Recommendations Feed */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Active Coaching Directives
          </h3>

          {activeRecs.length === 0 ? (
            <div className="bg-slate-900 border border-slate-850 p-12 text-center rounded-2xl shadow-md">
              <UserCheck className="w-12 h-12 text-indigo-500/10 mx-auto mb-3 animate-pulse" />
              <h3 className="font-bold text-white text-base">You are completely aligned!</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed max-w-sm mx-auto">
                No procrastination triggers or scheduling gaps detected. Add new deadlines or update your dashboard workload to generate diagnostic guidance.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeRecs.map(rec => {
                const isLinkedTask = !!rec.taskId;
                const task = isLinkedTask ? tasks.find(t => t.id === rec.taskId) : null;

                return (
                  <div key={rec.id} className="bg-slate-900 border border-slate-850 rounded-2xl p-5 hover:border-slate-800 transition-colors flex flex-col md:flex-row gap-5 items-start justify-between shadow-lg">
                    <div className="space-y-3 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                          rec.type === 'risk' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25' :
                          rec.type === 'procrastination' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                          'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25'
                        }`}>
                          {rec.type === 'risk' ? '🚨 Extreme Risk' : rec.type === 'procrastination' ? '⏳ Procrastination Trigger' : '⚡ Focus Action'}
                        </span>
                        {task && (
                          <span className="text-[10px] text-slate-400 font-bold truncate">
                            Related task: <strong className="text-slate-200">{task.title}</strong>
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-extrabold text-white text-base leading-snug">{parseInlineMarkdown(rec.title)}</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">{parseInlineMarkdown(rec.description)}</p>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-center gap-2 shrink-0 w-full md:w-auto">
                      {isLinkedTask && task && task.status !== 'completed' && (
                        <button
                          onClick={() => handleApplyFocus(rec)}
                          className="flex-1 md:w-32 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer text-center"
                        >
                          Lock in Focus Slot
                        </button>
                      )}
                      <button
                        onClick={() => dismissRecommendation(rec.id)}
                        className="flex-1 md:w-32 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white font-bold text-xs py-2 px-3 rounded-lg transition-all cursor-pointer text-center"
                      >
                        Dismiss Advice
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coach Insights (Right Column) */}
        <div className="space-y-6">
          <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            Coach Corner
          </h3>

          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
              <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg shrink-0">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-white">Focus Optimization Strategy</h4>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed italic">
              "{getRoleCoachTip()}"
            </p>

            <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-3">
              <h5 className="font-bold text-white text-xs uppercase tracking-wider font-mono">Anti-Friction Checklist</h5>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs text-slate-450">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Log 1 habit check-off early every day to spark focus.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-450">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Isolate tasks into 5-minute procrastination breaker slots.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-450">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Lock in AI proposed schedule blocks to stay on top.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
