import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BaselineBrowserPage } from './pages/BaselineBrowserPage';
import { DashboardPage } from './pages/DashboardPage';
import { DiffViewerPage } from './pages/DiffViewerPage';
import { DriftTimelinePage } from './pages/DriftTimelinePage';
import { IgnoreRulesPage } from './pages/IgnoreRulesPage';
import { LiveReplayViewerPage } from './pages/LiveReplayViewerPage';
import { LoginPage } from './pages/LoginPage';
import { PiiVaultPage } from './pages/PiiVaultPage';

function AppShell() {
  return (
    <ProtectedRoute>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/services/:serviceId/baselines" element={<BaselineBrowserPage />} />
          <Route path="/services/:serviceId/reports" element={<DriftTimelinePage />} />
          <Route path="/services/:serviceId/ignore-rules" element={<IgnoreRulesPage />} />
          <Route path="/services/:serviceId/pii-vault" element={<PiiVaultPage />} />
          <Route path="/replay" element={<LiveReplayViewerPage />} />
          <Route path="/replay/:sessionId" element={<LiveReplayViewerPage />} />
          <Route path="/replay/:sessionId/results/:resultId" element={<DiffViewerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </AuthProvider>
  );
}
