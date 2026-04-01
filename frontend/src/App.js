import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Loading from './components/Loading';

import LoginPage from './pages/LoginPage';
import RepLayout from './pages/rep/RepLayout';
import RepHome from './pages/rep/RepHome';
import RepProducts from './pages/rep/RepProducts';
import RepCustomers from './pages/rep/RepCustomers';
import RepCart from './pages/rep/RepCart';
import RepOrders from './pages/rep/RepOrders';
import RepOrderDetail from './pages/rep/RepOrderDetail';
import RepCommissions from './pages/rep/RepCommissions';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminRepresentatives from './pages/admin/AdminRepresentatives';
import AdminCommissions from './pages/admin/AdminCommissions';

function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/rep'} />;
  }
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/rep'} /> : <LoginPage />} />

      <Route path="/rep" element={<PrivateRoute role="representative"><CartProvider><RepLayout /></CartProvider></PrivateRoute>}>
        <Route index element={<RepHome />} />
        <Route path="products" element={<RepProducts />} />
        <Route path="customers" element={<RepCustomers />} />
        <Route path="cart" element={<RepCart />} />
        <Route path="orders" element={<RepOrders />} />
        <Route path="orders/:id" element={<RepOrderDetail />} />
        <Route path="commissions" element={<RepCommissions />} />
      </Route>

      <Route path="/admin" element={<PrivateRoute role="admin"><AdminLayout /></PrivateRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="representatives" element={<AdminRepresentatives />} />
        <Route path="commissions" element={<AdminCommissions />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
