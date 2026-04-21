import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/reports');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      {/* Branding Sidebar */}
      <section className="hidden md:flex md:w-1/2 lg:w-3/5 bg-surface-container-high relative flex-col justify-between p-16 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary opacity-5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg shadow-sm">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 19h20v3H2v-3zm14-9v7h3v-7h-3zm-4-7L2 6v2h20V6L12 3z" />
              </svg>
            </div>
            <span className="text-xl font-black tracking-tighter text-primary">The Precision Ledger</span>
          </div>
        </div>
        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight mb-6 leading-tight">
            Institutional clarity for <span className="text-primary">enterprise expenses.</span>
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed font-medium">
            Experience the architectural anchor of modern financial management. Secure, precise, and built for high-stakes ledger control.
          </p>
        </div>
        <div className="relative z-10 flex gap-12">
          <div>
            <div className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">Platform Stability</div>
            <div className="text-2xl font-bold tabular-nums text-on-surface">99.99%</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">Processed Monthly</div>
            <div className="text-2xl font-bold tabular-nums text-on-surface">$2.4B+</div>
          </div>
        </div>
      </section>

      {/* Login Form */}
      <section className="flex-1 bg-surface flex items-center justify-center p-6 md:p-12 lg:p-24 relative">
        <div className="absolute top-8 left-8 md:hidden">
          <span className="text-lg font-black tracking-tighter text-primary">The Precision Ledger</span>
        </div>
        <div className="w-full max-w-md">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-2">Welcome Back</h2>
            <p className="text-on-surface-variant font-medium">Access your expense management terminal.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-container rounded-md text-on-error-container text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
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
                className="w-full bg-surface-container-low border-0 border-b border-outline-variant px-4 py-4 text-on-surface font-medium transition-all duration-200 focus:outline-none focus:border-primary focus:bg-surface-container-lowest"
              />
            </div>
            <div className="space-y-2">
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
                className="w-full bg-surface-container-low border-0 border-b border-outline-variant px-4 py-4 text-on-surface font-medium transition-all duration-200 focus:outline-none focus:border-primary focus:bg-surface-container-lowest"
              />
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-md shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span>{loading ? 'Signing in...' : 'Login to Dashboard'}</span>
                {!loading && (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                  </svg>
                )}
              </button>
            </div>
          </form>

          <div className="mt-12 text-center">
            <p className="text-on-surface-variant font-medium">
              New to the ledger?{' '}
              <Link to="/signup" className="text-primary font-bold hover:underline underline-offset-4 decoration-2">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
