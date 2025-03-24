// src/App.js
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './styles/App.css';

// Composant de chargement
const LoadingFallback = () => (
  <div className="loading-container">
    <div className="spinner"></div>
    <div className="loading-text">Chargement...</div>
  </div>
);

// Chargement paresseux des pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TimeLog = lazy(() => import('./pages/TimeLog'));
const Profile = lazy(() => import('./pages/Profile'));
const MovementHistory = lazy(() => import('./pages/MovementHistory'));
const MovementDetail = lazy(() => import('./pages/MovementDetail'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const AdminMovementCreate = lazy(() => import('./pages/AdminMovementCreate'));
const PreparationList = lazy(() => import('./pages/PreparationList'));
const PreparationDetail = lazy(() => import('./pages/PreparationDetail'));
const PreparationCreate = lazy(() => import('./pages/PreparationCreate'));
const Reports = lazy(() => import('./pages/Reports'));
const ScheduleManager = lazy(() => import('./pages/ScheduleManager'));
const ScheduleComparison = lazy(() => import('./pages/ScheduleComparison'));
const WhatsAppSetup = lazy(() => import('./pages/WhatsAppSetup'));
const PreparatorPerformance = lazy(() => import('./pages/PreparatorPerformance'));
const DriverPerformance = lazy(() => import('./pages/DriverPerformance'));

// Composant de route protégée
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { isAuthenticated, loading, currentUser } = useAuth();
  
  if (loading) return <LoadingFallback />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  // Vérification des rôles requis
  if (requiredRoles.length > 0 && !requiredRoles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

// Routes de l'application
const routes = [
  // Route par défaut
  { path: '/', element: <Navigate to="/dashboard" />, protected: true },
  
  // Routes publiques
  { path: '/login', element: <Login /> },
  
  // Routes communes
  { path: '/dashboard', element: <Dashboard />, protected: true },
  { path: '/timelog', element: <TimeLog />, protected: true },
  { path: '/profile', element: <Profile />, protected: true },
  
  // Routes Chauffeur
  { path: '/movement/history', element: <MovementHistory />, protected: true, roles: ['admin', 'driver', 'team-leader'] },
  { path: '/movement/:id', element: <MovementDetail />, protected: true, roles: ['admin', 'driver', 'team-leader'] },
  
  // Routes Préparateur
  { path: '/preparations', element: <PreparationList />, protected: true, roles: ['admin', 'preparator', 'driver', 'team-leader'] },
  { path: '/preparations/:id', element: <PreparationDetail />, protected: true, roles: ['admin', 'preparator', 'driver', 'team-leader'] },
  { path: '/preparations/create', element: <PreparationCreate />, protected: true, roles: ['admin', 'preparator', 'driver', 'team-leader'] },
  
  // Routes Admin
  { path: '/schedule-comparison', element: <ScheduleComparison />, protected: true, roles: ['admin', 'direction'] },
  { path: '/admin', element: <AdminPanel />, protected: true, roles: ['admin'] },
  { path: '/performance/preparators', element: <PreparatorPerformance />, protected: true, roles: ['admin', 'direction'] },
  { path: '/performance/drivers', element: <DriverPerformance />, protected: true, roles: ['admin', 'direction'] },
  { path: '/admin/whatsapp-setup', element: <WhatsAppSetup />, protected: true, roles: ['admin'] },
  { path: '/admin/movements/create', element: <AdminMovementCreate />, protected: true, roles: ['admin', 'team-leader'] },
  
  // Routes Rapports (Admin et Direction)
  { path: '/reports', element: <Reports />, protected: true, roles: ['admin', 'direction'] },
  { path: '/schedules', element: <ScheduleManager />, protected: true, roles: ['admin', 'direction'] }
];

// Composant principal avec les routes
const AppContent = () => (
  <Router>
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {routes.map((route, index) => (
          <Route key={index} path={route.path} element={route.protected ? (
            <ProtectedRoute requiredRoles={route.roles || []}>
              {route.element}
            </ProtectedRoute>
          ) : route.element} />
        ))}
      </Routes>
    </Suspense>
  </Router>
);

// Application avec Provider d'authentification
const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;