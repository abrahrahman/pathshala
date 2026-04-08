import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { Login } from './pages/Login';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminOrders } from './pages/admin/Orders';
import { AdminClients } from './pages/admin/Clients';
import { AdminDomains } from './pages/admin/Domains';
import { AdminServices } from './pages/admin/Services';
import { AdminAccounts } from './pages/admin/Accounts';
import { AdminUsers } from './pages/admin/Users';
import { AdminSettings } from './pages/admin/Settings';
import { PrintingDashboard } from './pages/printing/PrintingDashboard';
import { FactoryDashboard } from './pages/factory/FactoryDashboard';
import { ClientDashboard } from './pages/client/ClientDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/login" replace />} />
            
            {/* Admin Routes */}
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/orders" element={<AdminOrders />} />
            <Route path="admin/clients" element={<AdminClients />} />
            <Route path="admin/domains" element={<AdminDomains />} />
            <Route path="admin/services" element={<AdminServices />} />
            <Route path="admin/accounts" element={<AdminAccounts />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/settings" element={<AdminSettings />} />
            
            {/* Printing Routes */}
            <Route path="printing" element={<PrintingDashboard />} />
            <Route path="printing/orders" element={<PrintingDashboard />} />
            
            {/* Factory Routes */}
            <Route path="factory" element={<FactoryDashboard />} />
            <Route path="factory/orders" element={<FactoryDashboard />} />
            
            {/* Client Routes */}
            <Route path="client" element={<ClientDashboard />} />
            <Route path="client/orders" element={<ClientDashboard />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
