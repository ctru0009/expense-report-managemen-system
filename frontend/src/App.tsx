import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ReportListPage from './pages/ReportListPage';
import ReportCreatePage from './pages/ReportCreatePage';
import ReportDetailPage from './pages/ReportDetailPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminReportDetailPage from './pages/AdminReportDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/reports" replace />} />
            <Route path="reports" element={<ReportListPage />} />
            <Route path="reports/new" element={<ReportCreatePage />} />
            <Route path="reports/:id" element={<ReportDetailPage />} />
            <Route
              path="admin"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/reports/:id"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminReportDetailPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/reports" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
