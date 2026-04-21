import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-surface flex items-center justify-center">
                  <p className="text-on-surface-variant font-medium text-lg">Reports — coming in Phase 3</p>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <div className="min-h-screen bg-surface flex items-center justify-center">
                  <p className="text-on-surface-variant font-medium text-lg">Admin Dashboard — coming in Phase 5</p>
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/reports" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
