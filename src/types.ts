export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  estimatedMinutes?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO String or YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  category: 'student' | 'professional' | 'entrepreneur' | 'personal' | 'billing' | 'other';
  status: 'pending' | 'in_progress' | 'completed';
  subtasks: SubTask[];
  riskLevel?: 'low' | 'medium' | 'high';
  riskAnalysis?: string;
  deadlineRisk?: 'Safe' | 'Medium Risk' | 'High Risk' | 'Critical Risk';
  deadlineRiskExplanation?: string;
  deadlineRiskActions?: string[];
  suggestedSchedule?: {
    date: string;
    time: string;
    durationMinutes: number;
    actionablePlan: string;
  }[];
  createdAt: string;
  updatedAt: string;
  estimatedTime?: number; // Estimated Time in minutes
  progress?: number; // Progress Percentage (0-100)
  aiPriorityScore?: number; // AI Priority Score (0-100)
  aiPriorityLevel?: 'Critical' | 'High' | 'Medium' | 'Low'; // Calculated AI Priority Level
  aiPriorityReasoning?: string; // AI Priority Reasoning explanation
  postponementsCount?: number; // Track deadline postponement count
}

export interface Goal {
  id: string;
  title: string;
  targetDate: string;
  progress: number; // 0 to 100
  linkedTasks: string[]; // Task IDs
  createdAt: string;
  timeframe?: 'daily' | 'weekly' | 'monthly';
  completedAt?: string; // ISO string
}

export interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  lastCompleted?: string; // YYYY-MM-DD
  history: string[]; // List of YYYY-MM-DD completion dates
  createdAt: string;
}

export interface AIRecommendation {
  id: string;
  type: 'risk' | 'schedule' | 'procrastination' | 'action';
  title: string;
  description: string;
  taskId?: string;
  status: 'active' | 'dismissed' | 'applied';
  createdAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface UserPreferences {
  name: string;
  role: 'student' | 'professional' | 'entrepreneur';
  preferredFocusHours: 'morning' | 'afternoon' | 'evening' | 'flexible';
  productivityScore: number; // 0 to 100
  email?: string;
}

export interface ScheduleItem {
  id: string;
  type: 'study' | 'break';
  taskId?: string;
  taskTitle?: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes: number;
  actionablePlan?: string;
}

export interface AISchedule {
  id: string;
  generatedAt: string;
  startDate: string;
  endDate: string;
  items: ScheduleItem[];
  overloadScore: number; // 0-100 (stress/load index)
  analysis: string; // AI text description on how overload was avoided and how workload was distributed
}

export interface AgentLog {
  id: string;
  timestamp: string;
  actionType: 'task_created' | 'task_analyzed' | 'priority_assigned' | 'subtasks_generated' | 'schedule_updated' | 'progress_monitored' | 'risk_predicted' | 'procrastination_detected' | 'auto_rescheduled' | 'coaching';
  title: string;
  description: string;
  taskId?: string;
  severity: 'info' | 'success' | 'warning' | 'alert';
}


