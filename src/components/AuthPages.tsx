import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ShieldAlert, Sparkles, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface AuthPagesProps {
  initialMode?: 'login' | 'signup';
}

type AuthViewMode = 'login' | 'signup' | 'forgot-password';

export default function AuthPages({ initialMode = 'login' }: AuthPagesProps) {
  const [viewMode, setViewMode] = useState<AuthViewMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<'student' | 'professional' | 'entrepreneur'>('professional');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, register, loginGuest, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (viewMode === 'login') {
        await login(email, password);
      } else {
        if (!name.trim()) {
          throw new Error("Please enter your name.");
        }
        await register(email, password, name, role);
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      let errMsg = "An unexpected error occurred. Please try again.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        errMsg = "Invalid email or password.";
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = "This email is already in use.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "Password must be at least 6 characters.";
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setSuccessMessage("Account password recovery link dispatched! Check your email inbox to proceed.");
    } catch (err: any) {
      console.error("Password reset error:", err);
      let errMsg = "Could not send password reset link. Please try again.";
      if (err.code === "auth/user-not-found") {
        errMsg = "No account exists under this email address.";
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      await loginGuest();
    } catch (err: any) {
      console.error("Guest access error:", err);
      setError("Failed to initialize Guest Mode: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="bg-gradient-to-tr from-rose-500 to-amber-500 p-2 rounded-xl shadow-lg">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <span className="font-sans font-bold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Deadline Guardian
          </span>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          {viewMode === 'login' && "Sign in to your dashboard"}
          {viewMode === 'signup' && "Create your accountability account"}
          {viewMode === 'forgot-password' && "Recover your account password"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {viewMode === 'login' && (
            <>
              Or{" "}
              <button
                onClick={() => {
                  setViewMode('signup');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer underline"
              >
                create a new account
              </button>
            </>
          )}
          {viewMode === 'signup' && (
            <>
              Or{" "}
              <button
                onClick={() => {
                  setViewMode('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer underline"
              >
                sign in to existing account
              </button>
            </>
          )}
          {viewMode === 'forgot-password' && (
            <button
              onClick={() => {
                setViewMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer underline"
            >
              Back to sign-in page
            </button>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900 border border-slate-850 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10">
          
          {error && (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-xl text-sm flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3.5 rounded-xl text-sm flex items-start gap-3 animate-fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {viewMode !== 'forgot-password' ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {viewMode === 'signup' && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-slate-300">
                      Full Name
                    </label>
                    <div className="mt-1">
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Doe"
                        className="appearance-none block w-full px-3 py-2.5 border border-slate-800 rounded-xl shadow-sm placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-950 text-white text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-semibold text-slate-300">
                      Personalization Profile (Your Focus Area)
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('student')}
                        className={`py-2 px-3 border rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                          role === 'student'
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('professional')}
                        className={`py-2 px-3 border rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                          role === 'professional'
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        Professional
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('entrepreneur')}
                        className={`py-2 px-3 border rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                          role === 'entrepreneur'
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        Entrepreneur
                      </button>
                    </div>
                    <p className="mt-1.5 text-slate-500 text-[11px] leading-snug">
                      This optimizes the AI procrastination diagnostics and schedule recommendations for your exact work structure.
                    </p>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-300">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="appearance-none block w-full px-3 py-2.5 border border-slate-800 rounded-xl shadow-sm placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-950 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-300">
                    Password
                  </label>
                  {viewMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('forgot-password');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="appearance-none block w-full px-3 py-2.5 border border-slate-800 rounded-xl shadow-sm placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-950 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : viewMode === 'login' ? (
                    "Sign In"
                  ) : (
                    "Sign Up & Setup Coach"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleResetPasswordSubmit}>
              <div>
                <label htmlFor="reset-email" className="block text-sm font-semibold text-slate-300">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="appearance-none block w-full px-3 py-2.5 border border-slate-800 rounded-xl shadow-sm placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-950 text-white text-sm"
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500 leading-normal">
                  We will send you a secure Firebase Authentication link to reset your account password instantly.
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    "Send Password Recovery Link"
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500 font-bold">Or evaluate instantly</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleGuestAccess}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Quick Guest Companion Access
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
