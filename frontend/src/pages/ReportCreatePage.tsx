import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import * as reportsApi from '../api/reports';
import { getErrorMessage } from '../utils/api';

export default function ReportCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const report = await reportsApi.createReport({
        title,
        description: description || undefined,
      });
      navigate(`/reports/${report.id}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to create report'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-on-surface-variant text-xs font-medium tracking-wide uppercase mb-4">
          <button onClick={() => navigate('/reports')} className="hover:text-primary transition-colors">
            Reports
          </button>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
          <span className="text-on-surface">New Report</span>
        </nav>
        <h1 className="text-3xl font-black text-on-surface tracking-tight">Create New Report</h1>
        <p className="text-on-surface-variant mt-1">Start a new expense report draft.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-container rounded-md text-on-error-container text-sm font-medium">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="title">
            Report Title
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q4 Marketing Workshop"
            className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:bg-surface-container-lowest focus:ring-0 transition-all px-0 py-2 text-on-surface font-semibold placeholder:opacity-50"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="description">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe the purpose of this expense..."
            rows={3}
            className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:bg-surface-container-lowest focus:ring-0 transition-all px-0 py-2 text-on-surface font-medium placeholder:opacity-50 resize-none"
          />
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="flex-1 py-3 bg-surface-container-high text-on-surface font-bold rounded-lg hover:bg-surface-variant transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-60"
          >
            {loading ? 'Creating...' : 'Create Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
