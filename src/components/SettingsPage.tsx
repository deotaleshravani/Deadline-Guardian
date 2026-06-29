import React, { useState } from "react";
import { 
  User, Key, Sparkles, Check, 
  Trash2, Bell, Clock, Briefcase, ChevronRight
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface SettingsPageProps {
  preferences: any;
  updatePreferences: (newPrefs: any) => Promise<void>;
}

export default function SettingsPage({ preferences, updatePreferences }: SettingsPageProps) {
  const { logout, user } = useAuth();
  
  const [name, setName] = useState(preferences?.name || "");
  const [role, setRole] = useState<'student' | 'professional' | 'entrepreneur'>(preferences?.role || "professional");
  const [preferredFocusHours, setPreferredFocusHours] = useState<'morning' | 'afternoon' | 'evening' | 'flexible'>(preferences?.preferredFocusHours || "flexible");
  
  // Simulated Toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smartCoachingAlerts, setSmartCoachingAlerts] = useState(true);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setSuccess(false);
    try {
      await updatePreferences({
        name,
        role,
        preferredFocusHours
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 font-sans">
      
      {/* Page Header */}
      <div className="pb-6 border-b border-border-custom">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-main tracking-tight">System Settings</h1>
        <p className="text-base text-text-sub mt-1">
          Customize your coaching parameters, configure routines, and adapt notification preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Profile Modification Form */}
        <div className="lg:col-span-2 bg-card-bg border border-border-custom rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="pb-3 border-b border-border-custom">
            <h3 className="font-extrabold text-text-main text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-brand" />
              Coaching Profile Settings
            </h3>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-6">
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-scale-up">
                <Check className="w-4.5 h-4.5 shrink-0" />
                <span>Profile updated and synchronized successfully! AI models adapted.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-text-sub uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-text-sub uppercase tracking-wider">Email Address</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={user?.email || "Guest User (Offline)"}
                  className="w-full px-4 py-3 bg-page-bg border border-border-custom text-text-sub/50 rounded-xl text-sm cursor-not-allowed outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-text-sub uppercase tracking-wider mb-2">Focus Target Profile</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'student', label: 'Student', desc: 'Focus on coursework & boundaries' },
                  { key: 'professional', label: 'Professional', desc: 'Focus on quarterly deliverables' },
                  { key: 'entrepreneur', label: 'Entrepreneur', desc: 'Focus on launch milestones' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setRole(opt.key as any)}
                    className={`p-4 border rounded-2xl flex flex-col text-left transition-all cursor-pointer ${
                      role === opt.key
                        ? 'bg-brand/15 border-brand text-text-main shadow-sm'
                        : 'bg-page-bg border-border-custom text-text-sub hover:border-text-sub/20'
                    }`}
                  >
                    <span className="text-sm font-extrabold">{opt.label}</span>
                    <span className="text-[10px] text-text-sub leading-relaxed mt-1.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-text-sub uppercase tracking-wider mb-2">Preferred Focus Hours</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'morning', label: '☀️ Morning', val: '08:00 - 12:00' },
                  { key: 'afternoon', label: '⛅ Afternoon', val: '12:00 - 17:00' },
                  { key: 'evening', label: '🌙 Evening', val: '17:00 - 22:00' },
                  { key: 'flexible', label: '🔄 Flexible', val: 'Varies daily' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setPreferredFocusHours(opt.key as any)}
                    className={`p-4 border rounded-2xl flex flex-col text-left transition-all cursor-pointer ${
                      preferredFocusHours === opt.key
                        ? 'bg-brand/15 border-brand text-text-main shadow-sm'
                        : 'bg-page-bg border-border-custom text-text-sub hover:border-text-sub/20'
                    }`}
                  >
                    <span className="text-xs font-bold leading-none">{opt.label}</span>
                    <span className="text-[9px] text-text-sub leading-none mt-2.5 font-mono">{opt.val}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-text-sub leading-normal pt-1.5 font-medium">
                Your AI Coach will adapt focus block suggestions to fit your preferred daily slots.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-border-custom">
              <button
                type="submit"
                disabled={saving}
                className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-sm shadow-brand/10"
              >
                {saving ? "Saving Changes..." : "Save Preferences"}
              </button>
            </div>
          </form>
        </div>

        {/* System Settings & Notifications Sidebar */}
        <div className="space-y-6">
          <div className="bg-card-bg border border-border-custom rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="pb-3 border-b border-border-custom">
              <h3 className="font-extrabold text-text-main text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-brand" />
                Alert Settings
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-text-main uppercase tracking-wider">Email Alerts</label>
                  <p className="text-[10px] text-text-sub leading-relaxed">Weekly digest summaries</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 text-brand rounded border-border-custom cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border-custom/40">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-text-main uppercase tracking-wider">Smart Coaching</label>
                  <p className="text-[10px] text-text-sub leading-relaxed">Proactive accountability reminders</p>
                </div>
                <input
                  type="checkbox"
                  checked={smartCoachingAlerts}
                  onChange={(e) => setSmartCoachingAlerts(e.target.checked)}
                  className="w-4 h-4 text-brand rounded border-border-custom cursor-pointer"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-card-bg border border-border-custom rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <h4 className="font-extrabold text-sm text-text-main">Discharge Diagnostics</h4>
            <p className="text-xs text-text-sub leading-relaxed">
              If you wish to log out or refresh your offline workspace memory, click below. Your persistent cloud profiles remain secure.
            </p>
            <button
              onClick={logout}
              className="w-full py-3 bg-page-bg hover:bg-rose-500/10 border border-border-custom hover:border-rose-500/25 text-xs font-bold text-text-sub hover:text-rose-500 rounded-xl transition-all cursor-pointer"
            >
              Sign Out Account
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
