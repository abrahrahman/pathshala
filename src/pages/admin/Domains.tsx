import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Globe, Bell, Edit } from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface Client {
  id: string;
  name: string;
  institution: string;
  domainName?: string;
  domainExpiryDate?: string;
  services?: string;
}

export function AdminDomains() {
  const { token } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationMsg, setNotificationMsg] = useState('');
  const [clientToRenew, setClientToRenew] = useState<Client | null>(null);

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

  const calculateDaysRemaining = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const domainClients = clients.filter(client => client.domainName && client.domainExpiryDate);

  const triggerNotifications = async () => {
    try {
      const res = await fetch('/api/admin/trigger-domain-checks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotificationMsg(`Sent ${data.emailsSent} notifications.`);
        setTimeout(() => setNotificationMsg(''), 5000);
      }
    } catch (error) {
      console.error('Error triggering notifications', error);
    }
  };

  const confirmRenew = async () => {
    if (!clientToRenew || !clientToRenew.domainExpiryDate) return;
    
    const currentExpiry = new Date(clientToRenew.domainExpiryDate);
    currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);
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
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-slate-500">Loading domains...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Domains Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage client domains and expirations.</p>
        </div>
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
                      <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => setClientToRenew(client)}>
                        Renew
                      </Button>
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
                      <p className="text-sm">Clients with website services and domains will appear here.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renew Confirmation Modal */}
      {clientToRenew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mb-4">
              <Globe className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Renew Domain</h3>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to renew the domain <strong>{clientToRenew.domainName}</strong> for 1 year?</p>
            <div className="flex justify-center space-x-3">
              <Button variant="outline" className="rounded-xl" onClick={() => setClientToRenew(null)}>Cancel</Button>
              <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmRenew}>Renew Domain</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
