import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password);
      navigate('/reports');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex w-full max-w-6xl min-h-[800px] overflow-hidden rounded-xl bg-surface-container-low shadow-xl m-4">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-primary">
          <div className="absolute inset-0 bg-primary-container opacity-20" />
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 19h20v3H2v-3zm14-9v7h3v-7h-3zm-4-7L2 6v2h20V6L12 3z" />
              </svg>
              <h1 className="text-2xl font-black tracking-tighter text-white">Precision Ledger</h1>
            </div>
          </div>
          <div className="relative z-10 max-w-sm">
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-6">
              Master Your Institutional Expenses.
            </h2>
            <p className="text-white font-medium text-lg opacity-90">
              An architectural approach to fiscal responsibility and expense reporting for the modern enterprise.
            </p>
          </div>
          <div className="relative z-10 flex gap-8">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-white tracking-tight">100%</span>
              <span className="text-xs uppercase tracking-widest text-white mt-1 opacity-70">Audit Transparency</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-white tracking-tight">0.1s</span>
              <span className="text-xs uppercase tracking-widest text-white mt-1 opacity-70">Latency Processing</span>
            </div>
          </div>
        </div>

        {/* Signup Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-16 md:p-24 bg-surface-container-lowest relative">
          <div className="w-full max-w-md">
            <header className="mb-10 text-left">
              <h2 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">Create Account</h2>
              <p className="text-on-surface-variant font-medium">Configure your enterprise workspace credentials.</p>
            </header>

            {error && (
              <div className="mb-6 p-4 bg-error-container rounded-md text-on-error-container text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 focus:bg-surface-container-lowest py-3 px-4 transition-all placeholder:text-outline text-on-surface"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 focus:bg-surface-container-lowest py-3 px-4 transition-all placeholder:text-outline text-on-surface"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1" htmlFor="confirm-password">
                    Confirm
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 focus:bg-surface-container-lowest py-3 px-4 transition-all placeholder:text-outline text-on-surface"
                  />
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-lg text-white font-bold tracking-tight shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #00429d 0%, #0a58ca 100%)' }}
                >
                  <span>{loading ? 'Creating account...' : 'Initialize Account'}</span>
                  {!loading && (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                    </svg>
                  )}
                </button>
              </div>
            </form>

            <footer className="mt-12 text-center">
              <p className="text-on-surface-variant font-medium">
                Already part of the network?{' '}
                <Link to="/login" className="text-primary font-bold hover:underline ml-1">
                  Login to Workspace
                </Link>
              </p>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
