import { useState } from "react";
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Clock, Sparkles, CheckCircle2, ChevronDown, RefreshCw, 
  Layers, Zap, Flame, Info, BookOpen, Bot, Check, CheckSquare
} from "lucide-react";
import { Task, AISchedule, ScheduleItem } from "../types";

interface CalendarViewProps {
  tasks: Task[];
  setActiveTab: (tab: string) => void;
  aiSchedule: AISchedule | null;
  generateAISchedule: (startDateStr?: string) => Promise<void>;
  aiAnalyzing: boolean;
}

export default function CalendarView({ 
  tasks, 
  setActiveTab,
  aiSchedule,
  generateAISchedule,
  aiAnalyzing
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week_schedule'>('month');
  const [rightTab, setRightTab] = useState<'agenda' | 'assistant'>('agenda');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Monthly dates calculation
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

  const daysArray: { day: number; isCurrentMonth: boolean; dateString: string }[] = [];

  // Padding from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = totalDaysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, d);
    daysArray.push({
      day: d,
      isCurrentMonth: false,
      dateString: prevMonthDate.toISOString().split('T')[0]
    });
  }

  // Days of current month
  for (let i = 1; i <= totalDaysInMonth; i++) {
    const currentMonthDate = new Date(year, month, i);
    daysArray.push({
      day: i,
      isCurrentMonth: true,
      dateString: currentMonthDate.toISOString().split('T')[0]
    });
  }

  // Padding for next month
  const totalCellCount = 42; // standard 6 rows
  const remainingCells = totalCellCount - daysArray.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonthDate = new Date(year, month + 1, i);
    daysArray.push({
      day: i,
      isCurrentMonth: false,
      dateString: nextMonthDate.toISOString().split('T')[0]
    });
  }

  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const selectedDateStr = selectedDay.toISOString().split('T')[0];

  // Get tasks due on the selected day
  const tasksDueOnSelectedDay = tasks.filter(t => t.deadline.startsWith(selectedDateStr));

  // Get suggested schedules scheduled for the selected day
  const focusBlocksOnSelectedDay = tasks
    .filter(t => t.status !== "completed" && t.suggestedSchedule)
    .flatMap(t => t.suggestedSchedule!.map(s => ({
      taskTitle: t.title,
      ...s
    })))
    .filter(s => s.date === selectedDateStr);

  // Get AI global schedule items for the selected day
  const scheduleItemsOnSelectedDay = aiSchedule?.items?.filter(item => item.date === selectedDateStr) || [];

  // Helper to resolve 7 days of the scheduled week
  const getScheduleDays = () => {
    if (!aiSchedule) {
      const list = [];
      const now = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getTime() + i * 24 * 3600 * 1000);
        list.push(d.toISOString().split('T')[0]);
      }
      return list;
    }
    
    const list = [];
    const start = new Date(aiSchedule.startDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getTime() + i * 24 * 3600 * 1000);
      list.push(d.toISOString().split('T')[0]);
    }
    return list;
  };

  const scheduleDays = getScheduleDays();
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleTriggerScheduleGeneration = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    await generateAISchedule(todayStr);
  };

  return (
    <div className="space-y-8 pb-12 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-border-custom">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-main tracking-tight flex items-center gap-2">
            AI Focus Calendar
          </h1>
          <p className="text-base text-text-sub max-w-2xl">
            Intersperse active study blocks with strategic breaks to fight cognitive fatigue and secure deadlines.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-card-bg p-1.5 rounded-2xl border border-border-custom shrink-0 self-start sm:self-center shadow-xs">
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === 'month' 
                ? 'bg-brand text-white shadow-md' 
                : 'text-text-sub hover:text-text-main'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Monthly Grid
          </button>
          <button
            onClick={() => setViewMode('week_schedule')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === 'week_schedule' 
                ? 'bg-brand text-white shadow-md' 
                : 'text-text-sub hover:text-text-main'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            AI Focus Blocks
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Main Calendar Panel */}
        <div className="lg:col-span-2 space-y-4">
          {viewMode === 'month' ? (
            <div className="bg-card-bg border border-border-custom rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-border-custom">
                <h2 className="text-xl font-extrabold text-text-main flex items-center gap-2 tracking-tight">
                  <CalendarIcon className="w-5 h-5 text-brand" />
                  {monthNames[month]} {year}
                </h2>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2.5 bg-page-bg hover:bg-sidebar-bg text-text-sub hover:text-text-main border border-border-custom rounded-xl transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-2.5 bg-page-bg hover:bg-sidebar-bg text-text-sub hover:text-text-main border border-border-custom rounded-xl transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-text-sub uppercase tracking-wider pb-2">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Days Grid Cells */}
              <div className="grid grid-cols-7 gap-2">
                {daysArray.map((cell, idx) => {
                  const isSelected = selectedDateStr === cell.dateString;
                  const isToday = new Date().toISOString().split('T')[0] === cell.dateString;
                  
                  const dayTasks = tasks.filter(t => t.deadline.startsWith(cell.dateString));
                  const hasHighPriority = dayTasks.some(t => t.priority === 'high' && t.status !== 'completed');

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDay(new Date(cell.dateString))}
                      className={`min-h-[85px] p-2.5 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all relative overflow-hidden ${
                        !cell.isCurrentMonth ? 'text-text-sub/40 border-transparent bg-page-bg/10 opacity-30' :
                        isSelected ? 'bg-brand/15 border-brand text-text-main shadow-sm' :
                        isToday ? 'bg-sidebar-bg border-text-sub/30 text-brand' :
                        'bg-page-bg/60 border-border-custom text-text-main hover:border-text-sub/20 hover:bg-page-bg'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-xs font-bold ${
                          isSelected ? 'text-brand' : isToday ? 'text-brand' : 'text-text-sub'
                        }`}>
                          {cell.day}
                        </span>
                        
                        {/* Dot markers */}
                        {cell.isCurrentMonth && dayTasks.length > 0 && (
                          <span className={`w-2 h-2 rounded-full ${hasHighPriority ? 'bg-rose-500 animate-pulse' : 'bg-brand'}`} />
                        )}
                      </div>

                      {/* Display task count preview inside cells on desktop */}
                      {cell.isCurrentMonth && dayTasks.length > 0 && (
                        <div className="hidden sm:block text-[9px] font-extrabold uppercase bg-brand/10 text-brand py-0.5 px-1.5 rounded-md mt-auto w-max">
                          {dayTasks.length} {dayTasks.length === 1 ? 'Task' : 'Tasks'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-card-bg border border-border-custom rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-custom">
                <div>
                  <h2 className="text-xl font-extrabold text-text-main flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand animate-spin-slow" />
                    AI Focus Schedule
                  </h2>
                  <p className="text-xs text-text-sub mt-0.5">Optimized workload balancing powered by priority weighting</p>
                </div>
                
                <button
                  onClick={handleTriggerScheduleGeneration}
                  disabled={aiAnalyzing}
                  className="px-5 py-3 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-brand/10"
                >
                  <RefreshCw className={`w-4.5 h-4.5 ${aiAnalyzing ? 'animate-spin' : ''}`} />
                  {aiSchedule ? 'Regenerate Schedule' : 'Initialize Schedule'}
                </button>
              </div>

              {/* Weekly blocks stream */}
              <div className="space-y-6">
                {scheduleDays.map((dayStr, dIdx) => {
                  const dayObj = new Date(dayStr);
                  const isDayToday = new Date().toISOString().split('T')[0] === dayStr;
                  const dayItems = aiSchedule?.items?.filter(it => it.date === dayStr) || [];

                  return (
                    <div 
                      key={dayStr}
                      className={`p-5 rounded-2xl border transition-all ${
                        isDayToday 
                          ? 'bg-brand/5 border-brand/20' 
                          : 'bg-page-bg/40 border-border-custom'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-custom/40">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-text-main">
                            {weekdayNames[dayObj.getDay()]}
                          </span>
                          <span className="text-xs text-text-sub font-semibold">
                            {dayObj.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {isDayToday && (
                          <span className="text-[9px] bg-brand text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Today
                          </span>
                        )}
                      </div>

                      {dayItems.length === 0 ? (
                        <p className="text-xs text-text-sub italic">No focus blocks scheduled for today.</p>
                      ) : (
                        <div className="space-y-3">
                          {dayItems.map((item, idx) => {
                            const isBreak = item.type === 'break';
                            return (
                              <div 
                                key={idx}
                                className={`p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs ${
                                  isBreak 
                                    ? 'bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400' 
                                    : 'bg-card-bg border border-border-custom text-text-main'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-xs">{item.time}</span>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                      isBreak ? 'bg-teal-500/15' : 'bg-brand/15 text-brand'
                                    }`}>
                                      {item.type}
                                    </span>
                                  </div>
                                  <h4 className="font-extrabold text-sm leading-snug">{item.title}</h4>
                                  {item.actionablePlan && (
                                    <p className="text-xs text-text-sub italic">Action: {item.actionablePlan}</p>
                                  )}
                                </div>
                                <span className="text-[10px] bg-page-bg px-2.5 py-1 rounded-lg border border-border-custom font-semibold shrink-0">
                                  {item.durationMinutes} mins
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Agenda Details */}
        <div className="space-y-6">
          <div className="bg-card-bg border border-border-custom rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border-custom">
              <h3 className="font-extrabold text-lg text-text-main">
                Agenda Details
              </h3>
              <span className="text-xs text-text-sub font-semibold font-mono">
                {selectedDay.toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* Tasks Due Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-text-sub uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand" />
                Deadlines Today
              </h4>

              {tasksDueOnSelectedDay.length === 0 ? (
                <p className="text-xs text-text-sub italic py-2">No study boundaries or deadlines due.</p>
              ) : (
                <div className="space-y-3">
                  {tasksDueOnSelectedDay.map((task) => (
                    <div 
                      key={task.id} 
                      className="p-4 bg-page-bg border border-border-custom rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <h5 className="font-bold text-sm text-text-main truncate">{task.title}</h5>
                        <p className="text-xs text-text-sub">Due: {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        task.priority === 'high' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-text-sub'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Focus Blocks Section */}
            <div className="space-y-4 pt-4 border-t border-border-custom">
              <h4 className="text-xs font-bold text-text-sub uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                Scheduled Focus Blocks
              </h4>

              {focusBlocksOnSelectedDay.length === 0 && scheduleItemsOnSelectedDay.length === 0 ? (
                <p className="text-xs text-text-sub italic py-2">No focus sessions or breaks mapped today.</p>
              ) : (
                <div className="space-y-3">
                  {/* Focus blocks from suggested schedule */}
                  {focusBlocksOnSelectedDay.map((block, idx) => (
                    <div 
                      key={idx} 
                      className="p-4 bg-page-bg border border-border-custom rounded-2xl space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold">{block.time}</span>
                        <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded font-bold uppercase">Focus</span>
                      </div>
                      <h5 className="font-bold text-text-main">{block.taskTitle}</h5>
                      {block.actionablePlan && (
                        <p className="text-xs text-text-sub italic">Plan: {block.actionablePlan}</p>
                      )}
                    </div>
                  ))}

                  {/* Focus blocks from global AI schedule */}
                  {scheduleItemsOnSelectedDay.map((item, idx) => {
                    const isBreak = item.type === 'break';
                    return (
                      <div 
                        key={`global-${idx}`} 
                        className={`p-4 rounded-2xl border text-xs space-y-2 ${
                          isBreak 
                            ? 'bg-teal-500/5 border-teal-500/15 text-teal-600 dark:text-teal-400' 
                            : 'bg-page-bg border-border-custom text-text-main'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold">{item.time}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                            isBreak ? 'bg-teal-500/10' : 'bg-brand/10 text-brand'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                        <h5 className="font-extrabold">{item.title}</h5>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
