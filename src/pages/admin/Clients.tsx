import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Edit, Trash2, Plus, X, Filter, Search, Users, Building, Globe, Laptop, Bell, History, FileText, CheckCircle, Clock, AlertCircle, Briefcase } from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface Client {
  id: string;
  name: string;
  institution: string;
  instituteId?: string;
  contact: string;
  address: string;
  orderCount?: number;
  services?: 'None' | 'Software' | 'Website' | 'Both';
  serviceStatus?: 'Active' | 'Inactive';
  softwareBill?: number;
  websiteBill?: number;
  serviceStartMonth?: number;
  domainName?: string;
  domainExpiryDate?: string;
}

export function AdminClients() {
  const { token } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [clientToRenew, setClientToRenew] = useState<Client | null>(null);
  const [renewYears, setRenewYears] = useState(1);
  const [clientOrders, setClientOrders] = useState<any[] | null>(null);
  const [clientBills, setClientBills] = useState<any[] | null>(null);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'orders' | 'services'>('orders');
  const [orderFilter, setOrderFilter] = useState<'all' | 'has_orders' | 'no_orders'>('all');
  const [activeTab, setActiveTab] = useState<'clients' | 'domains'>('clients');
  const [notificationMsg, setNotificationMsg] = useState('');
  
  // Form state
  const [formData, setFormData] = useState<Client>({
    id: '',
    name: '',
    institution: '',
    instituteId: '',
    contact: '',
    address: '',
    services: 'None',
    softwareBill: undefined,
    websiteBill: undefined,
    serviceStartMonth: undefined,
    domainName: '',
    domainExpiryDate: ''
  });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedClientHistory, setSelectedClientHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchClientHistory = async (client: Client) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedClientHistory({ ...data, clientName: client.name, clientId: client.id });
        setIsHistoryModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching client history', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const generateReport = (client: Client) => {
    window.open(`/api/clients/${client.id}/history?token=${token}`, '_blank');
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setClients(await res.json());
      }
    } catch (error) {
      console.error('Error fetching clients', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [token]);

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!formData.name || !formData.institution || !formData.contact) {
      setErrorMsg("Please fill in required fields.");
      return;
    }

    try {
      const isEditing = !!formData.id;
      const url = isEditing ? `/api/clients/${formData.id}` : '/api/clients';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ id: '', name: '', institution: '', instituteId: '', contact: '', address: '', services: 'None', softwareBill: undefined, websiteBill: undefined, serviceStartMonth: undefined, domainName: '', domainExpiryDate: '' });
        fetchClients();
      } else {
        setErrorMsg(`Failed to ${isEditing ? 'update' : 'create'} client.`);
      }
    } catch (error) {
      console.error('Error saving client', error);
      setErrorMsg('An error occurred while saving.');
    }
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    try {
      const res = await fetch(`/api/clients/${clientToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchClients();
      }
    } catch (error) {
      console.error('Error deleting client', error);
    } finally {
      setClientToDelete(null);
    }
  };

  const confirmRenew = async () => {
    if (!clientToRenew || !clientToRenew.domainExpiryDate) return;
    
    const currentExpiry = new Date(clientToRenew.domainExpiryDate);
    currentExpiry.setFullYear(currentExpiry.getFullYear() + renewYears);
    const newExpiryDate = currentExpiry.toISOString().split('T')[0];

    try {
      const res = await fetch(`/api/clients/${clientToRenew.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...clientToRenew,
          domainExpiryDate: newExpiryDate
        })
      });

      if (res.ok) {
        fetchClients();
      }
    } catch (error) {
      console.error('Error renewing domain', error);
    } finally {
      setClientToRenew(null);
      setRenewYears(1);
    }
  };

  const viewOrders = async (client: Client) => {
    try {
      const [ordersRes, billsRes] = await Promise.all([
        fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/service_bills', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (ordersRes.ok && billsRes.ok) {
        const allOrders = await ordersRes.json();
        const allBills = await billsRes.json();
        
        const cOrders = allOrders.filter((o: any) => o.clientId === client.id || o.clientName === client.name);
        const cBills = allBills.filter((b: any) => b.clientId === client.id);
        
        setClientOrders(cOrders);
        setClientBills(cBills);
        setActiveHistoryTab('orders');
        setIsOrdersModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching client history', error);
    }
  };

  const toggleServiceStatus = async (client: Client) => {
    const newStatus = client.serviceStatus === 'Inactive' ? 'Active' : 'Inactive';
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...client, serviceStatus: newStatus })
      });
      if (res.ok) {
        fetchClients();
      }
    } catch (error) {
      console.error('Error updating service status', error);
    }
  };

  const openEditModal = (client: Client) => {
    setErrorMsg('');
    setFormData({
      id: client.id,
      name: client.name,
      institution: client.institution,
      instituteId: client.instituteId || '',
      contact: client.contact,
      address: client.address,
      services: client.services || 'None',
      serviceStatus: client.serviceStatus || 'Active',
      softwareBill: client.softwareBill,
      websiteBill: client.websiteBill,
      serviceStartMonth: client.serviceStartMonth,
      domainName: client.domainName || '',
      domainExpiryDate: client.domainExpiryDate || ''
    });
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setErrorMsg('');
    setFormData({ id: '', name: '', institution: '', instituteId: '', contact: '', address: '', serviceStatus: 'Active' });
    setIsModalOpen(true);
  };

  const filteredClients = clients.filter(client => {
    if (orderFilter === 'has_orders') return (client.orderCount || 0) > 0;
    if (orderFilter === 'no_orders') return (client.orderCount || 0) === 0;
    return true;
  });

  const domainClients = clients.filter(client => client.domainName && client.domainExpiryDate);

  const calculateDaysRemaining = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const triggerNotifications = async () => {
    try {
      setNotificationMsg('Sending notifications...');
      const res = await fetch('/api/admin/trigger-domain-checks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotificationMsg(`Success! Sent ${data.emailsSent} notification(s). Check server console for Ethereal email links.`);
        setTimeout(() => setNotificationMsg(''), 5000);
      } else {
        setNotificationMsg('Failed to trigger notifications.');
        setTimeout(() => setNotificationMsg(''), 5000);
      }
    } catch (error) {
      console.error(error);
      setNotificationMsg('An error occurred.');
      setTimeout(() => setNotificationMsg(''), 5000);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clients Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your customer database and their details</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'clients' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Clients
          </button>
          <button
            onClick={() => setActiveTab('domains')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'domains' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Domains
          </button>
        </div>
      </div>

      {activeTab === 'clients' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search clients..." 
                className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64 transition-all"
              />
            </div>
            <div className="relative flex items-center flex-1 sm:flex-none">
              <Filter className="absolute left-3 h-4 w-4 text-slate-400" />
              <select
                className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer w-full"
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value as any)}
              >
                <option value="all">All Clients</option>
                <option value="has_orders">Has Orders</option>
                <option value="no_orders">No Orders</option>
              </select>
            </div>
            <Button onClick={openCreateModal} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20">
              <Plus className="mr-2 h-4 w-4" /> Add Client
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600 min-w-[1000px]">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Client ID</th>
                    <th className="px-6 py-4 font-semibold">Name</th>
                    <th className="px-6 py-4 font-semibold">Institution/Company</th>
                    <th className="px-6 py-4 font-semibold">Contact</th>
                    <th className="px-6 py-4 font-semibold">Services</th>
                    <th className="px-6 py-4 font-semibold">Orders</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="bg-white hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-900">{client.id}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                            {client.name.charAt(0)}
                          </div>
                          {client.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Building className="h-4 w-4 text-slate-400" />
                          {client.institution}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{client.contact}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            {(client.services === 'Software' || client.services === 'Both') && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200" title={`Bill: ${client.softwareBill || 0}`}>
                                <Laptop className="h-3 w-3 mr-1" /> Software
                              </span>
                            )}
                            {(client.services === 'Website' || client.services === 'Both') && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200" title={`Bill: ${client.websiteBill || 0}`}>
                                <Globe className="h-3 w-3 mr-1" /> Website
                              </span>
                            )}
                            {(!client.services || client.services === 'None') && (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </div>
                          {client.services && client.services !== 'None' && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${client.serviceStatus === 'Inactive' ? 'text-red-500' : 'text-emerald-600'}`}>
                                {client.serviceStatus || 'Active'}
                              </span>
                              <button 
                                onClick={() => toggleServiceStatus(client)}
                                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${client.serviceStatus === 'Inactive' ? 'bg-slate-300' : 'bg-emerald-500'}`}
                              >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${client.serviceStatus === 'Inactive' ? 'translate-x-1' : 'translate-x-4'}`} />
                              </button>
                            </div>
                          )}
                          {(client.services === 'Website' || client.services === 'Both') && client.domainName && client.domainExpiryDate && (
                            <div className="flex flex-col gap-1 mt-1">
                              <div className="text-xs font-medium text-slate-700 flex items-center gap-1">
                                <span>{client.domainName}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                  calculateDaysRemaining(client.domainExpiryDate) < 0 ? 'bg-red-100 text-red-700' :
                                  calculateDaysRemaining(client.domainExpiryDate) <= 30 ? 'bg-amber-100 text-amber-700' :
                                  'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {calculateDaysRemaining(client.domainExpiryDate) < 0 
                                    ? `Expired ${Math.abs(calculateDaysRemaining(client.domainExpiryDate))}d ago` 
                                    : `${calculateDaysRemaining(client.domainExpiryDate)}d left`}
                                </span>
                              </div>
                              <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 py-0 w-fit" onClick={() => setClientToRenew(client)}>
                                Renew Domain
                              </Button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                          (client.orderCount || 0) > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {client.orderCount || 0} Orders
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {client.services && client.services !== 'None' && client.serviceStatus !== 'Inactive' && (
                            <Button variant="ghost" size="sm" className="text-emerald-600 hover:bg-emerald-50 mr-1" onClick={async () => {
                              try {
                                const currentYear = new Date().getFullYear();
                                const currentMonth = new Date().getMonth() + 1;
                                
                                // Check if service has started
                                if (client.serviceStartMonth && currentMonth < client.serviceStartMonth && currentYear <= new Date().getFullYear()) {
                                  alert(`Service is scheduled to start in ${new Date(0, client.serviceStartMonth - 1).toLocaleString('default', { month: 'long' })}.`);
                                  return;
                                }

                                const newBills: any[] = [];
                                
                                const billsRes = await fetch('/api/service_bills', { headers: { Authorization: `Bearer ${token}` } });
                                const bills = await billsRes.json();

                                if (client.services === 'Software' || client.services === 'Both') {
                                  const existingBill = bills.find((b: any) => b.clientId === client.id && b.serviceType === 'Software' && b.year === currentYear && b.month === currentMonth);
                                  if (!existingBill && client.softwareBill) {
                                    newBills.push({
                                      clientId: client.id,
                                      serviceType: 'Software',
                                      amount: client.softwareBill,
                                      year: currentYear,
                                      month: currentMonth,
                                      status: 'Unpaid',
                                      notes: 'Generated monthly bill'
                                    });
                                  }
                                }
                                if (client.services === 'Website' || client.services === 'Both') {
                                  const existingBill = bills.find((b: any) => b.clientId === client.id && b.serviceType === 'Website' && b.year === currentYear && b.month === currentMonth);
                                  if (!existingBill && client.websiteBill) {
                                    newBills.push({
                                      clientId: client.id,
                                      serviceType: 'Website',
                                      amount: client.websiteBill,
                                      year: currentYear,
                                      month: currentMonth,
                                      status: 'Unpaid',
                                      notes: 'Generated monthly bill'
                                    });
                                  }
                                }

                                for (const bill of newBills) {
                                  await fetch('/api/service_bills', {
                                    method: 'POST',
                                    headers: { 
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}` 
                                    },
                                    body: JSON.stringify(bill)
                                  });
                                }

                                if (newBills.length > 0) {
                                  alert('Bills generated successfully for this client.');
                                } else {
                                  alert('All bills for the current year are already generated for this client.');
                                }
                              } catch (error) {
                                console.error('Error generating bills', error);
                                alert('Failed to generate bills.');
                              }
                            }}>
                              Generate Bill
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 mr-2" onClick={() => fetchClientHistory(client)}>
                            <History className="h-4 w-4 mr-1" /> History
                          </Button>
                          <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-slate-50 mr-2" onClick={() => generateReport(client)}>
                            <FileText className="h-4 w-4 mr-1" /> Report
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" onClick={() => openEditModal(client)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => setClientToDelete(client.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <Users className="h-12 w-12 text-slate-300 mb-4" />
                          <p className="text-lg font-medium text-slate-900">No clients found</p>
                          <p className="text-sm">Try adjusting your filters or add a new client.</p>
                          <Button onClick={openCreateModal} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="mr-2 h-4 w-4" /> Add Client
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'domains' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900">Domain Expirations</h2>
            <div className="flex items-center gap-3">
              {notificationMsg && (
                <span className="text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-1 rounded-lg">
                  {notificationMsg}
                </span>
              )}
              <Button onClick={triggerNotifications} variant="outline" className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm">
                <Bell className="h-4 w-4 mr-2 text-blue-500" /> Test Notifications
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600 min-w-[800px]">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Client Name</th>
                  <th className="px-6 py-4 font-semibold">Institution</th>
                  <th className="px-6 py-4 font-semibold">Domain Name</th>
                  <th className="px-6 py-4 font-semibold">Expiry Date</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {domainClients.map((client) => {
                  const daysRemaining = calculateDaysRemaining(client.domainExpiryDate!);
                  let statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  let statusText = `${daysRemaining} days left`;
                  
                  if (daysRemaining < 0) {
                    statusColor = 'bg-red-50 text-red-700 border-red-200';
                    statusText = `Expired ${Math.abs(daysRemaining)} days ago`;
                  } else if (daysRemaining <= 30) {
                    statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  }

                  return (
                    <tr key={client.id} className="bg-white hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-900">{client.name}</td>
                      <td className="px-6 py-4 text-slate-500">{client.institution}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-medium text-blue-600">
                          <Globe className="h-4 w-4" />
                          {client.domainName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{new Date(client.domainExpiryDate!).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => setClientToRenew(client)}>
                            Renew
                          </Button>
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50" onClick={() => openEditModal(client)}>
                            Update
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {domainClients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Globe className="h-12 w-12 text-slate-300 mb-4" />
                        <p className="text-lg font-medium text-slate-900">No domains found</p>
                        <p className="text-sm">Add a client with Website services to track domains.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Client</h3>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete this client? This action cannot be undone.</p>
            <div className="flex justify-center space-x-3">
              <Button variant="outline" className="rounded-xl" onClick={() => setClientToDelete(null)}>Cancel</Button>
              <Button variant="destructive" className="rounded-xl" onClick={confirmDelete}>Delete Client</Button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Confirmation Modal */}
      {clientToRenew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mb-4">
              <Globe className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Renew Domain</h3>
            <p className="text-sm text-slate-500 mb-4">Renew the domain <strong>{clientToRenew.domainName}</strong>.</p>
            
            <div className="mb-6 text-left">
              <label className="block text-sm font-medium text-slate-700 mb-1">Years to Renew</label>
              <input 
                type="number" 
                min="1" 
                max="10" 
                value={renewYears} 
                onChange={(e) => setRenewYears(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-sm text-emerald-600 mt-2 font-medium">
                Estimated Cost: ৳{renewYears * 1200}
              </p>
            </div>

            <div className="flex justify-center space-x-3">
              <Button variant="outline" className="rounded-xl" onClick={() => { setClientToRenew(null); setRenewYears(1); }}>Cancel</Button>
              <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmRenew}>Renew Domain</Button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && selectedClientHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Client Payment History</h2>
                <p className="text-sm text-slate-500">Financial overview for {selectedClientHistory.clientName}</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Total Billed</p>
                  <p className="text-2xl font-bold text-blue-900">৳{selectedClientHistory.summary.totalBilled + selectedClientHistory.summary.totalOrderAmount}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Total Paid</p>
                  <p className="text-2xl font-bold text-emerald-900">৳{selectedClientHistory.summary.totalPaidBills + selectedClientHistory.summary.totalOrderPaid}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Total Outstanding</p>
                  <p className="text-2xl font-bold text-red-900">৳{selectedClientHistory.summary.totalDue}</p>
                </div>
              </div>

              {/* Service Bills */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <Briefcase className="mr-2 h-5 w-5 text-blue-500" /> Service Bills
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-4 py-3">Period</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Payment Month</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedClientHistory.bills.map((bill: any) => (
                        <tr key={bill.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">{bill.month ? `${new Date(0, bill.month - 1).toLocaleString('default', { month: 'short' })} ${bill.year}` : bill.year}</td>
                          <td className="px-4 py-3">{bill.serviceType}</td>
                          <td className="px-4 py-3 font-medium">৳{bill.amount}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 
                              bill.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {bill.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {bill.paymentMonth ? new Date(0, bill.paymentMonth - 1).toLocaleString('default', { month: 'short' }) : '-'}
                          </td>
                        </tr>
                      ))}
                      {selectedClientHistory.bills.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No service bills found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Orders */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-purple-500" /> Order History
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Order ID</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Paid</th>
                        <th className="px-4 py-3">Due</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedClientHistory.orders.map((order: any) => (
                        <tr key={order.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">{new Date(order.orderDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-mono text-xs">{order.id}</td>
                          <td className="px-4 py-3 font-medium">৳{order.totalAmount}</td>
                          <td className="px-4 py-3 text-emerald-600 font-medium">৳{order.paidAmount || 0}</td>
                          <td className="px-4 py-3 text-red-600 font-medium">৳{order.totalAmount - (order.paidAmount || 0)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 
                              order.status === 'Cancelled' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {selectedClientHistory.orders.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No orders found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <Button onClick={() => setIsHistoryModalOpen(false)} className="bg-slate-900 text-white hover:bg-slate-800">
                Close History
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {formData.id ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleSaveClient} className="space-y-5">
                {errorMsg && (
                  <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-start gap-3">
                    <div className="mt-0.5"><X className="h-4 w-4" /></div>
                    <p>{errorMsg}</p>
                  </div>
                )}
                
                {/* Auto-generated ID display */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Client ID</label>
                  <input 
                    type="text" 
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                    value={formData.id || 'Auto-generated upon creation'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Contact Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. John Doe"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Institution / Company</label>
                    <input 
                      type="text" 
                      required
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={formData.institution}
                      onChange={(e) => setFormData({...formData, institution: e.target.value})}
                      placeholder="e.g. Springfield High"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Institute ID (Optional)</label>
                    <input 
                      type="text" 
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={formData.instituteId}
                      onChange={(e) => setFormData({...formData, instituteId: e.target.value})}
                      placeholder="e.g. SHS-001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Contact Details</label>
                  <input 
                    type="text" 
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    placeholder="Phone or Email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                  <textarea 
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Full address"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Other Services</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
                    value={formData.services}
                    onChange={(e) => setFormData({...formData, services: e.target.value as any})}
                  >
                    <option value="None">None</option>
                    <option value="Software">Software</option>
                    <option value="Website">Website</option>
                    <option value="Both">Both</option>
                  </select>
                </div>

                {formData.services !== 'None' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Service Start Month</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
                      value={formData.serviceStartMonth || ''}
                      onChange={(e) => setFormData({...formData, serviceStartMonth: parseInt(e.target.value)})}
                    >
                      <option value="">Select Month</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(0, i).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(formData.services === 'Software' || formData.services === 'Both') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Software Bill</label>
                    <input 
                      type="number" 
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={formData.softwareBill || ''}
                      onChange={(e) => setFormData({...formData, softwareBill: parseFloat(e.target.value)})}
                      placeholder="Enter amount"
                    />
                  </div>
                )}

                {(formData.services === 'Website' || formData.services === 'Both') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Website Bill</label>
                      <input 
                        type="number" 
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={formData.websiteBill || ''}
                        onChange={(e) => setFormData({...formData, websiteBill: parseFloat(e.target.value)})}
                        placeholder="Enter amount"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Domain Name</label>
                      <input 
                        type="text" 
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={formData.domainName || ''}
                        onChange={(e) => setFormData({...formData, domainName: e.target.value})}
                        placeholder="e.g. example.com"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Domain Expiry Date</label>
                      <input 
                        type="date" 
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={formData.domainExpiryDate || ''}
                        onChange={(e) => setFormData({...formData, domainExpiryDate: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100 mt-6">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20">
                    {formData.id ? 'Save Changes' : 'Add Client'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
