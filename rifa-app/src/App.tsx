import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { AuthProvider, useAuth } from './context/AuthContext';
import PublicRaffle from './pages/PublicRaffle';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import './App.css';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  
  if (!user) return <Navigate to="/login" />;
  
  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso Denegado</h2>
        <p className="text-slate-500 mb-6">No tienes permisos para acceder al Panel de Administración.</p>
        <button 
          onClick={() => signOut(auth)}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas Públicas - Sin AuthProvider para evitar peticiones innecesarias */}
        <Route path="/" element={<PublicRaffle />} />
        <Route path="/r/:raffleId" element={<PublicRaffle />} />
        <Route path="/login" element={<Login />} />

        {/* Rutas Administrativas - Con AuthProvider */}
        <Route 
          path="/admin" 
          element={
            <AuthProvider>
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            </AuthProvider>
          } 
        />
        <Route 
          path="/admin/:raffleId" 
          element={
            <AuthProvider>
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            </AuthProvider>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
