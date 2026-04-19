import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QADashboard from './pages/QADashboard';
import OperationsDashboard from './pages/OperationsDashboard';
import AllComplaints from './pages/AllComplaints';
import SubmitComplaint from './pages/SubmitComplaint';
import ComplaintDetail from './pages/ComplaintDetail';
import Analytics from './pages/Analytics';
import SLAMonitoring from './pages/SLAMonitoring';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { getRole, isAuthenticated } from './utils/auth';

const ProtectedRoute = ({ children, roles }) => {
  if (!isAuthenticated()) return <Navigate to="/" />;
  if (roles && !roles.includes(getRole())) return <Navigate to="/home" />;
  return <Layout>{children}</Layout>;
};

const RoleBasedHome = () => {
  const role = getRole();
  if (role === 'QA') return <QADashboard />;
  if (role === 'MANAGER' || role === 'ADMIN') return <OperationsDashboard />;
  return <Dashboard />;
};

// Unauthenticated users on "/" see the landing page. Authenticated users get their dashboard.
const Root = () => {
  if (isAuthenticated()) return <Layout><RoleBasedHome /></Layout>;
  return <Landing />;
};

const STAFF = ['CSE', 'QA', 'MANAGER', 'ADMIN'];

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<ProtectedRoute><RoleBasedHome /></ProtectedRoute>} />

        <Route path="/complaints" element={<ProtectedRoute roles={STAFF}><AllComplaints /></ProtectedRoute>} />
        <Route path="/submit" element={<ProtectedRoute roles={['CUSTOMER', 'CSE']}><SubmitComplaint /></ProtectedRoute>} />
        <Route path="/complaints/:id" element={<ProtectedRoute><ComplaintDetail /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/sla" element={<ProtectedRoute roles={STAFF}><SLAMonitoring /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['CSE', 'MANAGER', 'ADMIN']}><Reports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><Settings /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
