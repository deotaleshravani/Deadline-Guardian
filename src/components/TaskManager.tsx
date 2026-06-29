import React, { useState } from "react";
import { 
  Plus, Calendar, Clock, AlertCircle, ChevronRight, ChevronUp, ChevronDown,
  Trash2, Filter, Search, CheckSquare, Sparkles, Loader2,
  ListTodo, CheckSquare2, FileText, CheckCircle2, MoreVertical,
  Edit2, ArrowUpDown, SlidersHorizontal, Eye, X, Check, Hourglass, BarChart3, Bot
} from "lucide-react";
import { Task, SubTask, Habit } from "../types";
import ProcrastinationAgent from "./ProcrastinationAgent";

interface TaskManagerProps {
  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => Promise<string | undefined>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  requestAISubtasks: (taskId: string) => Promise<void>;
  addSubtask: (taskId: string, title: string, estimatedMinutes: number) => Promise<void>;
  removeSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  moveSubtask: (taskId: string, index: number, direction: 'up' | 'down') => Promise<void>;
  aiAnalyzing: boolean;
  habits: Habit[];
  triggerAIAnalysis: () => Promise<void>;
  preferences: any;
}

type SortOption = 
  | "deadline-asc" 
  | "deadline-desc" 
  | "priority-desc" 
  | "priority-asc" 
  | "progress-desc" 
  | "progress-asc" 
  | "estimated-desc" 
  | "estimated-asc" 
  | "title-asc"
  | "ai-priority-desc";

export default function TaskManager({
  tasks,
  addTask,
  updateTask,
  deleteTask,
  toggleSubtask,
  requestAISubtasks,
  addSubtask,
  removeSubtask,
  moveSubtask,
  aiAnalyzing,
  habits,
  triggerAIAnalysis,
  preferences
}: TaskManagerProps) {
  
  // Page Tab state
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'procrastination'>('list');

  // Search, Filter, Sort States
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>("deadline-asc");
  
  // Modals & Interactivity States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Form States (Used for both Add and Edit modals)
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [formCategory, setFormCategory] = useState<'student' | 'professional' | 'entrepreneur' | 'personal' | 'billing' | 'other'>('professional');
  const [formDeadline, setFormDeadline] = useState("");
  const [formEstimatedHours, setFormEstimatedHours] = useState<string>("");
  const [formProgress, setFormProgress] = useState<number>(0);
  const [autoGenerateSubtasks, setAutoGenerateSubtasks] = useState(true);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskMinutes, setNewSubtaskMinutes] = useState<string>("30");

  // Reset helper
  const resetFormState = () => {
    setFormTitle("");
    setFormDescription("");
    setFormPriority('medium');
    setFormCategory('professional');
    setFormDeadline("");
    setFormEstimatedHours("");
    setFormProgress(0);
    setAutoGenerateSubtasks(true);
  };

  // Handle Add Task Submission
  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDeadline) return;

    const estimatedMinutes = formEstimatedHours ? Math.round(parseFloat(formEstimatedHours) * 60) : 0;

    const newTaskId = await addTask({
      title: formTitle,
      description: formDescription,
      priority: formPriority,
      category: formCategory,
      deadline: new Date(formDeadline).toISOString(),
      status: formProgress === 100 ? 'completed' : formProgress > 0 ? 'in_progress' : 'pending',
      subtasks: [],
      estimatedTime: estimatedMinutes,
      progress: formProgress
    });

    if (newTaskId && autoGenerateSubtasks) {
      requestAISubtasks(newTaskId);
    }

    resetFormState();
    setShowAddModal(false);
  };

  // Pre-fill fields for Editing Task
  const openEditModal = (task: Task) => {
    setFormTitle(task.title);
    setFormDescription(task.description || "");
    setFormPriority(task.priority);
    setFormCategory(task.category);
    
    let formattedDeadline = "";
    if (task.deadline) {
      const dateObj = new Date(task.deadline);
      const tzOffset = dateObj.getTimezoneOffset() * 60000;
      formattedDeadline = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);
    }
    setFormDeadline(formattedDeadline);
    setFormEstimatedHours(task.estimatedTime ? (task.estimatedTime / 60).toString() : "");
    setFormProgress(task.progress || 0);
    
    setShowEditModal(true);
  };

  // Handle Edit Task Submission
  const handleEditTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !formTitle.trim() || !formDeadline) return;

    const estimatedMinutes = formEstimatedHours ? Math.round(parseFloat(formEstimatedHours) * 60) : 0;
    
    let computedStatus: 'pending' | 'in_progress' | 'completed' = 'pending';
    if (formProgress === 100) {
      computedStatus = 'completed';
    } else if (formProgress > 0) {
      computedStatus = 'in_progress';
    }

    const oldDeadlineTime = selectedTask.deadline ? new Date(selectedTask.deadline).getTime() : 0;
    const newDeadlineTime = new Date(formDeadline).getTime();
    let postponementsCount = selectedTask.postponementsCount || 0;
    if (oldDeadlineTime > 0 && newDeadlineTime > oldDeadlineTime) {
      postponementsCount += 1;
    }

    const updates: Partial<Task> = {
      title: formTitle,
      description: formDescription,
      priority: formPriority,
      category: formCategory,
      deadline: new Date(formDeadline).toISOString(),
      estimatedTime: estimatedMinutes,
      progress: formProgress,
      status: computedStatus,
      postponementsCount
    };

    await updateTask(selectedTask.id, updates);
    
    setSelectedTask({
      ...selectedTask,
      ...updates
    } as Task);

    resetFormState();
    setShowEditModal(false);
  };

  // Direct Toggle Complete from Task Card
  const handleToggleComplete = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();

    const wasCompleted = task.status === 'completed';
    const newStatus: 'pending' | 'completed' = wasCompleted ? 'pending' : 'completed';
    const newProgress = wasCompleted ? 0 : 100;

    await updateTask(task.id, {
      status: newStatus,
      progress: newProgress
    });

    if (selectedTask?.id === task.id) {
      setSelectedTask({
        ...selectedTask,
        status: newStatus,
        progress: newProgress
      } as Task);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    let newProgress = selectedTask?.progress || 0;
    if (newStatus === 'completed') {
      newProgress = 100;
    } else if (newStatus === 'pending') {
      newProgress = 0;
    } else if (newStatus === 'in_progress' && newProgress === 0) {
      newProgress = 25;
    }

    const updates = { status: newStatus, progress: newProgress };
    await updateTask(taskId, updates);

    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleProgressSliderChange = async (value: number) => {
    if (!selectedTask) return;

    let computedStatus: 'pending' | 'in_progress' | 'completed' = 'in_progress';
    if (value === 0) {
      computedStatus = 'pending';
    } else if (value === 100) {
      computedStatus = 'completed';
    }

    const updates = { progress: value, status: computedStatus };
    await updateTask(selectedTask.id, updates);
    setSelectedTask({ ...selectedTask, ...updates } as Task);
  };

  const handleAutoCalcProgressFromSubtasks = async () => {
    if (!selectedTask || !selectedTask.subtasks || selectedTask.subtasks.length === 0) return;

    const completedCount = selectedTask.subtasks.filter(s => s.completed).length;
    const computedPercent = Math.round((completedCount / selectedTask.subtasks.length) * 100);

    let computedStatus: 'pending' | 'in_progress' | 'completed' = 'in_progress';
    if (computedPercent === 0) {
      computedStatus = 'pending';
    } else if (computedPercent === 100) {
      computedStatus = 'completed';
    }

    const updates = { progress: computedPercent, status: computedStatus };
    await updateTask(selectedTask.id, updates);
    setSelectedTask({ ...selectedTask, ...updates } as Task);
  };

  const handleAddSubtaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newSubtaskTitle.trim()) return;

    const mins = newSubtaskMinutes ? parseInt(newSubtaskMinutes) : 30;
    await addSubtask(selectedTask.id, newSubtaskTitle, mins);
    setNewSubtaskTitle("");
    
    // Refresh task details from main list
    const updatedTask = tasks.find(t => t.id === selectedTask.id);
    if (updatedTask) {
      setSelectedTask(updatedTask);
    }
  };

  // Filter and Sort implementation
  const filteredAndSortedTasks = tasks
    .filter(t => {
      const matchesSearch = 
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
      const matchesCategory = filterCategory === 'all' || t.category === filterCategory;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "deadline-asc":
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case "deadline-desc":
          return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
        case "priority-desc": {
          const priorityWeight = { high: 3, medium: 2, low: 1 };
          return priorityWeight[b.priority] - priorityWeight[a.priority];
        }
        case "priority-asc": {
          const priorityWeight = { high: 3, medium: 2, low: 1 };
          return priorityWeight[a.priority] - priorityWeight[b.priority];
        }
        case "progress-desc":
          return (b.progress || 0) - (a.progress || 0);
        case "progress-asc":
          return (a.progress || 0) - (b.progress || 0);
        case "estimated-desc":
          return (b.estimatedTime || 0) - (a.estimatedTime || 0);
        case "estimated-asc":
          return (a.estimatedTime || 0) - (b.estimatedTime || 0);
        case "ai-priority-desc":
          return (b.aiPriorityScore ?? 0) - (a.aiPriorityScore ?? 0);
        case "title-asc":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const formatMinutes = (minutes: number | undefined): string => {
    if (!minutes || minutes <= 0) return "0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-8 pb-12 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-border-custom">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-main tracking-tight">
            Your Task Workspace
          </h1>
          <p className="text-base text-text-sub max-w-2xl">
            List, prioritize, structure focus subtasks, and defeat procrastination with active AI pacing assistance.
          </p>
        </div>
        <button
          onClick={() => {
            resetFormState();
            setShowAddModal(true);
          }}
          className="bg-brand hover:bg-brand-hover text-white font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-md hover:shadow-brand/20 transition-all flex items-center justify-center gap-2 cursor-pointer btn-hover-effect shrink-0"
        >
          <Plus className="w-5 h-5" />
          Create Priority Task
        </button>
      </div>

      {/* Sub tabs inside Tasks Page */}
      <div className="flex border-b border-border-custom gap-2">
        <button
          onClick={() => setActiveSubTab('list')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'list'
              ? 'border-brand text-brand'
              : 'border-transparent text-text-sub hover:text-text-main'
          }`}
        >
          Task List & Priorities
        </button>
        <button
          onClick={() => setActiveSubTab('procrastination')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'procrastination'
              ? 'border-brand text-brand'
              : 'border-transparent text-text-sub hover:text-text-main'
          }`}
        >
          <Hourglass className="w-4 h-4" />
          Procrastination Buster
        </button>
      </div>

      {activeSubTab === 'procrastination' ? (
        <div className="bg-card-bg border border-border-custom rounded-3xl p-6 shadow-sm">
          <ProcrastinationAgent 
            tasks={tasks}
            habits={habits}
            updateTask={updateTask}
            requestAISubtasks={requestAISubtasks}
            aiAnalyzing={aiAnalyzing}
            triggerAIAnalysis={triggerAIAnalysis}
            preferences={preferences}
          />
        </div>
      ) : (
        <>
          {/* Control Panel: Search, Sort & Filters */}
          <div className="bg-card-bg border border-border-custom p-6 rounded-3xl gap-5 flex flex-col xl:flex-row xl:items-center justify-between shadow-sm">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-sub w-4.5 h-4.5" />
              <input
                type="text"
                placeholder="Search tasks, descriptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-page-bg border border-border-custom rounded-2xl text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-brand placeholder-text-sub"
              />
            </div>

            {/* Filters and Sorters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-page-bg border border-border-custom rounded-2xl px-4 py-2.5 text-xs text-text-sub">
                <Filter className="w-3.5 h-3.5 text-brand" />
                <span className="font-bold text-[10px] uppercase tracking-wider">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="bg-transparent text-text-main outline-none cursor-pointer font-bold"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1.5 bg-page-bg border border-border-custom rounded-2xl px-4 py-2.5 text-xs text-text-sub">
                <SlidersHorizontal className="w-3.5 h-3.5 text-brand" />
                <span className="font-bold text-[10px] uppercase tracking-wider">Priority:</span>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as any)}
                  className="bg-transparent text-text-main outline-none cursor-pointer font-bold"
                >
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Advanced Sorting */}
              <div className="flex items-center gap-1.5 bg-page-bg border border-border-custom rounded-2xl px-4 py-2.5 text-xs text-text-sub">
                <ArrowUpDown className="w-3.5 h-3.5 text-brand" />
                <span className="font-bold text-[10px] uppercase tracking-wider">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-text-main outline-none cursor-pointer font-bold"
                >
                  <option value="deadline-asc">Deadline (Asc)</option>
                  <option value="deadline-desc">Deadline (Desc)</option>
                  <option value="priority-desc">Priority (High First)</option>
                  <option value="progress-desc">Progress (Highest First)</option>
                  <option value="ai-priority-desc">AI Priority Score</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dual Panel Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left Column: Tasks stream */}
            <div className="lg:col-span-2 space-y-4">
              {filteredAndSortedTasks.length === 0 ? (
                <div className="text-center py-16 bg-card-bg border border-border-custom rounded-3xl space-y-3">
                  <ListTodo className="w-12 h-12 text-text-sub mx-auto opacity-40 animate-pulse" />
                  <h3 className="font-extrabold text-text-main text-lg">No tasks found</h3>
                  <p className="text-text-sub text-xs max-w-md mx-auto">
                    Try adjusting your filters or search criteria, or add a brand-new target deliverable to lock in your day.
                  </p>
                </div>
              ) : (
                filteredAndSortedTasks.map((task) => {
                  const isSelected = selectedTask?.id === task.id;
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`p-6 bg-card-bg border rounded-3xl shadow-xs transition-all cursor-pointer flex items-start gap-5 hover:translate-y-[-1px] hover:shadow-md ${
                        isSelected 
                          ? 'border-brand ring-2 ring-brand/10' 
                          : 'border-border-custom hover:border-text-sub/30'
                      }`}
                    >
                      {/* Completion checkcircle */}
                      <button
                        onClick={(e) => handleToggleComplete(e, task)}
                        className="p-1 text-text-sub hover:text-brand transition-colors rounded-lg cursor-pointer"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-500/10" />
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-border-custom hover:border-brand transition-colors" />
                        )}
                      </button>

                      {/* Main Task Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className={`font-extrabold text-base text-text-main truncate ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                            {task.title}
                          </h3>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0 font-mono ${
                            task.priority === 'high' 
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/15' 
                              : task.priority === 'medium'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/15'
                              : 'bg-slate-500/10 text-text-sub border border-border-custom'
                          }`}>
                            {task.priority}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-xs text-text-sub line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-text-sub pt-1">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-brand" />
                            {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          
                          {task.estimatedTime ? (
                            <span className="flex items-center gap-1.5 font-semibold">
                              <Clock className="w-3.5 h-3.5 text-brand" />
                              {formatMinutes(task.estimatedTime)}
                            </span>
                          ) : null}

                          <span className="font-bold text-[10px] bg-brand/10 text-brand px-2.5 py-0.5 rounded-full uppercase">
                            {task.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Detailed Context Drawer */}
            <div className="bg-card-bg border border-border-custom rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              {selectedTask ? (
                <div className="space-y-6">
                  {/* Detailed Title */}
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-border-custom">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-brand uppercase tracking-wider font-mono">SELECTED FOCUS TARGET</span>
                      <h2 className="text-xl font-extrabold text-text-main tracking-tight leading-snug">{selectedTask.title}</h2>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(selectedTask)}
                        className="p-2 bg-page-bg hover:bg-sidebar-bg border border-border-custom rounded-xl text-text-sub hover:text-text-main transition-all cursor-pointer"
                        title="Edit Task Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          deleteTask(selectedTask.id);
                          setSelectedTask(null);
                        }}
                        className="p-2 bg-page-bg hover:bg-rose-500/10 border border-border-custom hover:border-rose-500/25 rounded-xl text-text-sub hover:text-rose-500 transition-all cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Status update box */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Work Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['pending', 'in_progress', 'completed'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(selectedTask.id, status)}
                          className={`py-2 px-1.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer uppercase font-mono ${
                            selectedTask.status === status
                              ? 'bg-brand/15 border-brand text-brand shadow-sm'
                              : 'bg-page-bg border-border-custom text-text-sub hover:border-text-sub/20'
                          }`}
                        >
                          {status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Progress Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-text-sub uppercase tracking-wider">Completion Volume</label>
                      <span className="font-extrabold text-brand font-mono">{selectedTask.progress || 0}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedTask.progress || 0}
                      onChange={(e) => handleProgressSliderChange(parseInt(e.target.value))}
                      className="w-full accent-brand bg-page-bg rounded-lg h-2 appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Deadline Health Panel (Replaced Technical Deadline Risk Prediction) */}
                  <div className="p-4 bg-page-bg border border-border-custom rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-text-sub uppercase tracking-wider">Deadline Health</h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        selectedTask.deadlineRisk === "Critical Risk" || selectedTask.deadlineRisk === "High Risk"
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                      }`}>
                        Status: {selectedTask.deadlineRisk || "Safe & On Track"}
                      </span>
                    </div>
                    {selectedTask.deadlineRiskExplanation && (
                      <p className="text-xs text-text-sub leading-relaxed mt-1">
                        {selectedTask.deadlineRiskExplanation}
                      </p>
                    )}
                  </div>

                  {/* AI Subtasks Generation Engine */}
                  <div className="space-y-4 pt-4 border-t border-border-custom">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-text-sub uppercase tracking-wider">Subtask Breakdown</h4>
                      <button
                        onClick={() => requestAISubtasks(selectedTask.id)}
                        disabled={aiAnalyzing}
                        className="text-xs font-extrabold text-brand hover:text-brand-hover flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        <span>Autogenerate Subtasks</span>
                      </button>
                    </div>

                    {/* Subtask list */}
                    <div className="space-y-2.5">
                      {selectedTask.subtasks && selectedTask.subtasks.length > 0 ? (
                        selectedTask.subtasks.map((sub, idx) => (
                          <div 
                            key={sub.id} 
                            className="flex items-center gap-3 p-3 bg-page-bg border border-border-custom rounded-xl"
                          >
                            <input
                              type="checkbox"
                              checked={sub.completed}
                              onChange={() => toggleSubtask(selectedTask.id, sub.id)}
                              className="w-4 h-4 text-brand rounded border-border-custom focus:ring-brand focus:ring-2 cursor-pointer"
                            />
                            <span className={`text-xs text-text-main flex-1 ${sub.completed ? 'line-through text-text-sub opacity-50' : 'font-semibold'}`}>
                              {sub.title}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => moveSubtask(selectedTask.id, idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 hover:bg-card-bg text-text-sub disabled:opacity-30 rounded cursor-pointer"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => moveSubtask(selectedTask.id, idx, 'down')}
                                disabled={idx === selectedTask.subtasks.length - 1}
                                className="p-1 hover:bg-card-bg text-text-sub disabled:opacity-30 rounded cursor-pointer"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => removeSubtask(selectedTask.id, sub.id)}
                                className="p-1 hover:bg-rose-500/10 text-text-sub hover:text-rose-500 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-text-sub italic text-center py-4">No subtasks created. Let AI generate blocks for you!</p>
                      )}
                    </div>

                    {/* Manual add subtask */}
                    <form onSubmit={handleAddSubtaskSubmit} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add subtask title..."
                        required
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 bg-page-bg border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand placeholder-text-sub"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand-hover cursor-pointer shadow-sm shadow-brand/10"
                      >
                        Add
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-text-sub space-y-3">
                  <Eye className="w-10 h-10 text-text-sub mx-auto opacity-30" />
                  <p className="text-sm font-semibold">Select a task on the left</p>
                  <p className="text-xs max-w-xs mx-auto">Inspect and check breakdown blocks, update completion health, and analyze deadline paths.</p>
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* 1. Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-lg bg-card-bg rounded-3xl overflow-hidden shadow-2xl border border-border-custom p-6 sm:p-8 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-6">
              <h3 className="font-extrabold text-xl text-text-main">Create Focus Target</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-page-bg text-text-sub rounded-xl"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleAddTaskSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Deliver growth matrices"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main focus:ring-2 focus:ring-brand outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Summarize context or deliverables..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main focus:ring-2 focus:ring-brand outline-none h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Priority Level</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main font-bold outline-none cursor-pointer"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Target Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main font-bold outline-none cursor-pointer"
                  >
                    <option value="student">Student</option>
                    <option value="professional">Professional</option>
                    <option value="entrepreneur">Entrepreneur</option>
                    <option value="personal">Personal</option>
                    <option value="billing">Billing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Deadline Boundary</label>
                  <input
                    type="datetime-local"
                    required
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main outline-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 2.5"
                    value={formEstimatedHours}
                    onChange={(e) => setFormEstimatedHours(e.target.value)}
                    className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="auto-generate"
                  checked={autoGenerateSubtasks}
                  onChange={(e) => setAutoGenerateSubtasks(e.target.checked)}
                  className="w-4 h-4 text-brand rounded border-border-custom cursor-pointer"
                />
                <label htmlFor="auto-generate" className="text-xs font-bold text-text-sub uppercase tracking-wider cursor-pointer">
                  Autogenerate subtasks via AI Coach
                </label>
              </div>

              <div className="pt-4 border-t border-border-custom flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-3 bg-page-bg hover:bg-sidebar-bg border border-border-custom text-text-sub rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-3 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm shadow-brand/10"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Task Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-lg bg-card-bg rounded-3xl overflow-hidden shadow-2xl border border-border-custom p-6 sm:p-8 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-6">
              <h3 className="font-extrabold text-xl text-text-main">Edit Focus Target</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-page-bg text-text-sub rounded-xl"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleEditTaskSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main focus:ring-2 focus:ring-brand outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main focus:ring-2 focus:ring-brand outline-none h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Priority Level</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main font-bold outline-none cursor-pointer"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Target Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main font-bold outline-none cursor-pointer"
                  >
                    <option value="student">Student</option>
                    <option value="professional">Professional</option>
                    <option value="entrepreneur">Entrepreneur</option>
                    <option value="personal">Personal</option>
                    <option value="billing">Billing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Deadline Boundary</label>
                  <input
                    type="datetime-local"
                    required
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main outline-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formEstimatedHours}
                    onChange={(e) => setFormEstimatedHours(e.target.value)}
                    className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="font-bold text-text-sub uppercase tracking-wider">Override Progress Percentage</label>
                  <span className="font-extrabold text-brand font-mono">{formProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formProgress}
                  onChange={(e) => setFormProgress(parseInt(e.target.value))}
                  className="w-full accent-brand bg-page-bg rounded-lg h-2 appearance-none cursor-pointer"
                />
              </div>

              <div className="pt-4 border-t border-border-custom flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-3 bg-page-bg hover:bg-sidebar-bg border border-border-custom text-text-sub rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-3 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm shadow-brand/10"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
