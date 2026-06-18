import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { AppShell } from './components/AppShell.jsx';
import { Spinner } from './components/ui/States.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { TransactionsPage } from './pages/TransactionsPage.jsx';
import { AccountsPage } from './pages/AccountsPage.jsx';
import { CategoriesPage } from './pages/CategoriesPage.jsx';
import { BudgetsPage } from './pages/BudgetsPage.jsx';
import { ReportsPage } from './pages/ReportsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

/** Sends signed-out visitors to the login screen, remembering where they meant to go. */
function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Checking your session" />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

/** Keeps a signed-in user off the login and register screens. */
function RequireGuest({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spinner label="Checking your session" />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <RequireGuest>
                      <LoginPage />
                    </RequireGuest>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <RequireGuest>
                      <RegisterPage />
                    </RequireGuest>
                  }
                />

                <Route
                  element={
                    <RequireAuth>
                      <AppShell />
                    </RequireAuth>
                  }
                >
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/accounts" element={<AccountsPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/budgets" element={<BudgetsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
