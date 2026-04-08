import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Briefcase, Plus, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface Client {
  id: string;
  name: string;
  services?: string;
  softwareBill?: number;
  websiteBill?: number;
  serviceStatus?: 'Active' | 'Inactive';
  serviceStartMonth?: number;
}

interface ServiceBill {
  id: string;
  clientId: string;
  serviceType: string;
  amount: number;
  year: number;
  month: number;
  paymentMonth?: number;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  notes: string;
  createdAt: string;
}

interface Account {
  id: string;
  name: string;
  balance: number;
}

export function AdminServices() {
  const { token } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [bills, setBills] = useState<ServiceBill[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bills' | 'clients'>('bills');
  const [isManualBillModalOpen, setIsManualBillModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<ServiceBill | null>(null);
  const [manualBillData, setManualBillData] = useState({
    clientId: '',
    serviceType: 'Software',
    amount: 0,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    status: 'Unpaid' as const,
    notes: ''
  });
  const [paymentData, setPaymentData] = useState({
    accountId: '',
    paymentMonth: 0,
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [clientsRes, billsRes, accountsRes] = await Promise.all([
        fetch('/api/clients', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/service_bills', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/accounts', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (clientsRes.ok && billsRes.ok && accountsRes.ok) {
        setClients(await clientsRes.json());
        setBills(await billsRes.json());
        setAccounts(await accountsRes.json());
      }
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const generateMonthlyBills = async (clientId?: string) => {
    if (!clientId && !window.confirm('Are you sure you want to generate monthly bills for all active clients? This will create unpaid invoices for the current month.')) {
      return;
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const newBills: any[] = [];
    
    const clientsToProcess = clientId ? clients.filter(c => c.id === clientId) : clients;

    clientsToProcess.forEach(client => {
      if (client.serviceStatus === 'Inactive') return;

      // Check if service has started
      if (client.serviceStartMonth && currentMonth < client.serviceStartMonth && currentYear <= new Date().getFullYear()) {
        return;
      }

      if (client.services === 'Software' || client.services === 'Both') {
        const existingBill = bills.find(b => b.clientId === client.id && b.serviceType === 'Software' && b.year === currentYear && b.month === currentMonth);
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
        const existingBill = bills.find(b => b.clientId === client.id && b.serviceType === 'Website' && b.year === currentYear && b.month === currentMonth);
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
    });

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
      fetchData();
      if (clientId) alert('Bills generated successfully for this client.');
    } else {
      if (clientId) alert('All bills for the current month are already generated for this client, or their service is inactive.');
      else alert('All bills for the current month are already generated.');
    }
  };

  const handleCreateManualBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/service_bills', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(manualBillData)
      });
      if (res.ok) {
        setIsManualBillModalOpen(false);
        fetchData();
        alert('Bill created successfully.');
      }
    } catch (error) {
      console.error('Error creating manual bill', error);
    }
  };

  const updateBillStatus = async (billId: string, newStatus: 'Paid' | 'Unpaid' | 'Overdue', paymentMonth?: number, accountId?: string) => {
    try {
      const res = await fetch(`/api/service_bills/${billId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          status: newStatus, 
          paymentMonth: paymentMonth,
          accountId: accountId,
          notes: newStatus === 'Paid' ? `Paid for ${paymentMonth ? getMonthName(paymentMonth) : ''} on ` + new Date().toLocaleDateString() : `Marked as ${newStatus}` 
        })
      });
      if (res.ok) {
        fetchData();
        setIsPaymentModalOpen(false);
      }
    } catch (error) {
      console.error('Error updating bill', error);
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
        fetchData();
      }
    } catch (error) {
      console.error('Error updating service status', error);
    }
  };

  const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('default', { month: 'short' });
  };

  if (isLoading) {
    return <div className="p-6 text-center text-slate-500">Loading services...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Services & Billing</h1>
          <p className="text-sm text-slate-500 mt-1">Manage client services and collect monthly bills.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsManualBillModalOpen(true)} variant="outline" className="border-slate-200">
            <Plus className="mr-2 h-4 w-4" /> Create Manual Bill
          </Button>
          <Button onClick={() => generateMonthlyBills()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20">
            <Plus className="mr-2 h-4 w-4" /> Generate Current Month Bills
          </Button>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('bills')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'bills' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Billing History
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'clients' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Client Services
        </button>
      </div>

      {activeTab === 'bills' ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600 min-w-[800px]">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Client Name</th>
                  <th className="px-6 py-4 font-semibold">Service</th>
                  <th className="px-6 py-4 font-semibold">Service Status</th>
                  <th className="px-6 py-4 font-semibold">Period</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((bill) => {
                  const client = clients.find(c => c.id === bill.clientId);
                  return (
                    <tr key={bill.id} className="bg-white hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-900">{client?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-slate-500">{bill.serviceType}</td>
                      <td className="px-6 py-4">
                        {client && (
                          <div className="flex items-center gap-2">
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
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <div>{bill.month ? `${getMonthName(bill.month)} ${bill.year}` : bill.year}</div>
                        {bill.paymentMonth && <div className="text-[10px] text-emerald-600 font-medium">Paid for: {getMonthName(bill.paymentMonth)}</div>}
                      </td>
                      <td className="px-6 py-4 font-medium">৳{bill.amount}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                          bill.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          bill.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {bill.status === 'Paid' ? <CheckCircle className="w-3 h-3 mr-1" /> : 
                           bill.status === 'Overdue' ? <AlertCircle className="w-3 h-3 mr-1" /> :
                           <Clock className="w-3 h-3 mr-1" />}
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col gap-2 items-end">
                          {bill.status !== 'Paid' ? (
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => {
                                setSelectedBill(bill);
                                setPaymentData({
                                  accountId: accounts[0]?.id || '',
                                  paymentMonth: bill.month,
                                  notes: ''
                                });
                                setIsPaymentModalOpen(true);
                              }}
                            >
                              Pay Bill
                            </Button>
                          ) : (
                            <span className="text-xs text-emerald-600 font-medium">Completed</span>
                          )}
                          
                          <select
                            value={bill.status}
                            onChange={(e) => {
                              const newStatus = e.target.value as any;
                              if (newStatus === 'Paid') {
                                setSelectedBill(bill);
                                setPaymentData({
                                  accountId: accounts[0]?.id || '',
                                  paymentMonth: bill.month,
                                  notes: ''
                                });
                                setIsPaymentModalOpen(true);
                              } else {
                                updateBillStatus(bill.id, newStatus);
                              }
                            }}
                            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="Unpaid">Unpaid</option>
                            <option value="Paid">Paid</option>
                            <option value="Overdue">Overdue</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {bills.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Briefcase className="h-12 w-12 text-slate-300 mb-4" />
                        <p className="text-lg font-medium text-slate-900">No bills found</p>
                        <p className="text-sm">Generate monthly bills to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600 min-w-[800px]">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Client Name</th>
                  <th className="px-6 py-4 font-semibold">Services</th>
                  <th className="px-6 py-4 font-semibold">Start Month</th>
                  <th className="px-6 py-4 font-semibold">Monthly Bill</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => (
                  <tr key={client.id} className="bg-white hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900">{client.name}</td>
                    <td className="px-6 py-4 text-slate-500">{client.services || 'None'}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {client.serviceStartMonth ? getMonthName(client.serviceStartMonth) : 'Not set'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        {client.softwareBill ? <div>Software: ৳{client.softwareBill}</div> : null}
                        {client.websiteBill ? <div>Website: ৳{client.websiteBill}</div> : null}
                        {!client.softwareBill && !client.websiteBill ? '-' : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
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
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-blue-600 hover:bg-blue-50"
                        onClick={() => generateMonthlyBills(client.id)}
                      >
                        Generate Current Bill
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pay Service Bill</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-blue-600">Client:</span>
                  <span className="font-semibold text-blue-900">{clients.find(c => c.id === selectedBill.clientId)?.name}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-blue-600">Service:</span>
                  <span className="font-semibold text-blue-900">{selectedBill.serviceType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">Amount Due:</span>
                  <span className="font-bold text-blue-900">৳{selectedBill.amount}</span>
                </div>
              </div>

              {/* Outstanding Bills */}
              {bills.filter(b => b.clientId === selectedBill.clientId && b.status !== 'Paid' && b.id !== selectedBill.id).length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-red-500 uppercase tracking-wider">Outstanding Bills</label>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-2">
                    {bills.filter(b => b.clientId === selectedBill.clientId && b.status !== 'Paid' && b.id !== selectedBill.id).map(b => (
                      <div key={b.id} className="flex justify-between text-xs p-2 bg-red-50 rounded border border-red-100">
                        <span>{getMonthName(b.month)} {b.year} ({b.serviceType})</span>
                        <span className="font-medium">৳{b.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Account</label>
                <select 
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={paymentData.accountId}
                  onChange={(e) => setPaymentData({...paymentData, accountId: e.target.value})}
                >
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (৳{acc.balance})</option>)}
                  {accounts.length === 0 && <option value="">No accounts found</option>}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment for Month</label>
                <select 
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={paymentData.paymentMonth}
                  onChange={(e) => setPaymentData({...paymentData, paymentMonth: parseInt(e.target.value)})}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => updateBillStatus(selectedBill.id, 'Paid', paymentData.paymentMonth, paymentData.accountId)}
                  disabled={!paymentData.accountId}
                >
                  Confirm Payment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Bill Modal */}
      {isManualBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create Manual Bill</h2>
              <button onClick={() => setIsManualBillModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateManualBill} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Client</label>
                <select 
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={manualBillData.clientId}
                  onChange={(e) => {
                    const client = clients.find(c => c.id === e.target.value);
                    setManualBillData({
                      ...manualBillData, 
                      clientId: e.target.value,
                      amount: manualBillData.serviceType === 'Software' ? (client?.softwareBill || 0) : (client?.websiteBill || 0)
                    });
                  }}
                >
                  <option value="">Choose a client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Service Type</label>
                  <select 
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={manualBillData.serviceType}
                    onChange={(e) => {
                      const client = clients.find(c => c.id === manualBillData.clientId);
                      setManualBillData({
                        ...manualBillData, 
                        serviceType: e.target.value,
                        amount: e.target.value === 'Software' ? (client?.softwareBill || 0) : (client?.websiteBill || 0)
                      });
                    }}
                  >
                    <option value="Software">Software</option>
                    <option value="Website">Website</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input 
                    type="number"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={manualBillData.amount}
                    onChange={(e) => setManualBillData({...manualBillData, amount: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                  <input 
                    type="number"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={manualBillData.year}
                    onChange={(e) => setManualBillData({...manualBillData, year: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                  <select 
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={manualBillData.month}
                    onChange={(e) => setManualBillData({...manualBillData, month: parseInt(e.target.value)})}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea 
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  value={manualBillData.notes}
                  onChange={(e) => setManualBillData({...manualBillData, notes: e.target.value})}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsManualBillModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Create Bill</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
