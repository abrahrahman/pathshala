import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Wallet, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface Order {
  id: string;
  clientId: string;
  clientName: string;
  orderDate: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  payments?: any[];
  items?: any[];
}

interface ServiceBill {
  id: string;
  clientId: string;
  serviceType: string;
  amount: number;
  year: number;
  month: number;
  status: 'Paid' | 'Unpaid' | 'Overdue';
}

interface Client {
  id: string;
  name: string;
  institution?: string;
  address?: string;
  contact?: string;
}

export function AdminAccounts() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [bills, setBills] = useState<ServiceBill[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'services'>('orders');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = async () => {
    try {
      const [ordersRes, billsRes, clientsRes] = await Promise.all([
        fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/service_bills', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/clients', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (ordersRes.ok && billsRes.ok && clientsRes.ok) {
        setOrders(await ordersRes.json());
        setBills(await billsRes.json());
        setClients(await clientsRes.json());
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

  const openPaymentModal = (order: Order) => {
    setPaymentOrder(order);
    setPaymentAmount('');
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentOrder || !paymentAmount) return;

    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }

    try {
      const newPaidAmount = (paymentOrder.paidAmount || 0) + amount;
      const newPayment = {
        id: `pay-${Date.now()}`,
        amount: amount,
        date: new Date().toISOString()
      };
      const updatedPayments = [...(paymentOrder.payments || []), newPayment];

      const res = await fetch(`/api/orders/${paymentOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...paymentOrder,
          paidAmount: newPaidAmount,
          payments: updatedPayments
        })
      });

      if (res.ok) {
        setIsPaymentModalOpen(false);
        setPaymentOrder(null);
        setPaymentAmount('');
        fetchData();
        printInvoice(paymentOrder, amount);
      } else {
        setErrorMsg('Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment', error);
      setErrorMsg('An error occurred while recording payment');
    }
  };

  const printInvoice = (order: Order, paymentAmount: number) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const client = clients.find(c => c.id === order.clientId);
    const dueAmount = order.totalAmount - ((order.paidAmount || 0) + paymentAmount);

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${order.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.5; }
          .container { max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
          .logo-area h1 { font-size: 32px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.5px; }
          .logo-area p { color: #64748b; margin: 0; font-size: 14px; }
          .invoice-title { text-align: right; }
          .invoice-title h2 { font-size: 40px; font-weight: 800; color: #e2e8f0; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 2px; }
          .invoice-title p { margin: 0; font-size: 14px; color: #475569; font-weight: 500; }
          
          .info-section { display: flex; justify-content: space-between; margin-bottom: 40px; background: #f8fafc; padding: 24px; border-radius: 12px; }
          .bill-to h3 { font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin: 0 0 12px 0; }
          .bill-to p { margin: 0 0 4px 0; font-size: 15px; }
          .bill-to .client-name { font-weight: 700; font-size: 18px; color: #0f172a; margin-bottom: 8px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th { background: #f1f5f9; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; padding: 16px; text-align: left; border-bottom: 2px solid #e2e8f0; }
          td { padding: 16px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 15px; }
          th:last-child, td:last-child { text-align: right; }
          
          .summary-container { display: flex; justify-content: flex-end; }
          .summary { width: 320px; }
          .summary-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 15px; color: #475569; }
          .summary-row.total { font-weight: 700; color: #0f172a; font-size: 18px; border-bottom: none; padding-top: 16px; }
          .summary-row.due { font-weight: 700; color: #b45309; font-size: 18px; background: #fef3c7; padding: 12px 16px; border-radius: 8px; margin-top: 12px; }
          
          .payment-receipt { margin-top: 40px; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 12px; }
          .payment-receipt h4 { margin: 0 0 8px 0; color: #065f46; font-size: 16px; }
          .payment-receipt p { margin: 0; color: #047857; font-size: 14px; }
          
          .footer { margin-top: 60px; text-align: center; color: #94a3b8; font-size: 14px; border-top: 1px solid #f1f5f9; padding-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-area">
              <h1>ID Print Co.</h1>
              <p>123 Business Avenue, Tech District</p>
              <p>contact@idprintco.com | +880 1234-567890</p>
            </div>
            <div class="invoice-title">
              <h2>INVOICE</h2>
              <p># ${order.id}</p>
              <p>Date: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div class="info-section">
            <div class="bill-to">
              <h3>Billed To</h3>
              <p class="client-name">${client?.name || order.clientName}</p>
              ${client?.institution ? `<p>${client.institution}</p>` : ''}
              ${client?.address ? `<p>${client.address}</p>` : ''}
              ${client?.contact ? `<p>${client.contact}</p>` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${order.items ? order.items.map(item => `
                <tr>
                  <td><strong>${item.itemType}</strong><br><span style="color: #64748b; font-size: 13px;">${item.subType || ''}</span></td>
                  <td>${item.category || '-'}</td>
                  <td>${item.quantity}</td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="3">Order items not available</td>
                </tr>
              `}
            </tbody>
          </table>

          <div class="summary-container">
            <div class="summary">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>৳${order.totalAmount}</span>
              </div>
              <div class="summary-row">
                <span>Previous Payments</span>
                <span>৳${order.paidAmount || 0}</span>
              </div>
              ${paymentAmount > 0 ? `
              <div class="summary-row" style="color: #059669; font-weight: 600;">
                <span>Payment Made Now</span>
                <span>৳${paymentAmount}</span>
              </div>
              ` : ''}
              <div class="summary-row total">
                <span>Total Amount</span>
                <span>৳${order.totalAmount}</span>
              </div>
              <div class="summary-row due">
                <span>Amount Due</span>
                <span>৳${dueAmount}</span>
              </div>
            </div>
          </div>

          ${paymentAmount > 0 ? `
          <div class="payment-receipt">
            <h4>Payment Receipt</h4>
            <p>We acknowledge with thanks the receipt of <strong>৳${paymentAmount}</strong> on ${new Date().toLocaleDateString()}.</p>
          </div>
          ` : ''}

          <div class="footer">
            <p>Thank you for your business. For any queries regarding this invoice, please contact us.</p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const acceptOrderPayment = async (orderId: string, totalAmount: number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ paidAmount: totalAmount })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating order payment', error);
    }
  };

  const markBillAsPaid = async (billId: string) => {
    try {
      const res = await fetch(`/api/service_bills/${billId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'Paid', notes: 'Paid on ' + new Date().toLocaleDateString() })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating bill', error);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-slate-500">Loading accounts...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Accounts & Billing</h1>
          <p className="text-sm text-slate-500 mt-1">Manage payments for orders and services.</p>
        </div>
      </div>

      <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'orders' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Order Bills
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'services' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Service Bills
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'orders' ? (
            <table className="w-full text-sm text-left text-slate-600 min-w-[800px]">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Client Name</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Total Amount</th>
                  <th className="px-6 py-4 font-semibold">Paid Amount</th>
                  <th className="px-6 py-4 font-semibold">Due</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const due = order.totalAmount - order.paidAmount;
                  return (
                    <tr key={order.id} className="bg-white hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-900">{order.id}</td>
                      <td className="px-6 py-4 text-slate-500">{order.clientName}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(order.orderDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-medium">৳{order.totalAmount}</td>
                      <td className="px-6 py-4 font-medium text-emerald-600">৳{order.paidAmount}</td>
                      <td className="px-6 py-4 font-medium text-red-600">৳{due}</td>
                      <td className="px-6 py-4 text-right">
                        {due > 0 ? (
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => openPaymentModal(order)}>
                              Record Payment
                            </Button>
                            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => acceptOrderPayment(order.id, order.totalAmount)}>
                              Full Payment
                            </Button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1" /> Fully Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Wallet className="h-12 w-12 text-slate-300 mb-4" />
                        <p className="text-lg font-medium text-slate-900">No orders found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm text-left text-slate-600 min-w-[800px]">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Client Name</th>
                  <th className="px-6 py-4 font-semibold">Service</th>
                  <th className="px-6 py-4 font-semibold">Year</th>
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
                      <td className="px-6 py-4 text-slate-500">{bill.month ? `${new Date(bill.year, bill.month - 1).toLocaleString('default', { month: 'short' })} ${bill.year}` : bill.year}</td>
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
                        {bill.status !== 'Paid' ? (
                          <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => markBillAsPaid(bill.id)}>
                            Accept Payment
                          </Button>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1" /> Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {bills.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Wallet className="h-12 w-12 text-slate-300 mb-4" />
                        <p className="text-lg font-medium text-slate-900">No service bills found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && paymentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Record Payment</h3>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-medium text-slate-900">৳{paymentOrder.totalAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Paid Amount:</span>
                <span className="font-medium text-emerald-600">৳{paymentOrder.paidAmount || 0}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-slate-100 pt-2">
                <span className="text-slate-900">Due Amount:</span>
                <span className="text-amber-600">৳{paymentOrder.totalAmount - (paymentOrder.paidAmount || 0)}</span>
              </div>
            </div>

            <form onSubmit={handleSavePayment}>
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {errorMsg}
                </div>
              )}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Amount (৳)</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  max={paymentOrder.totalAmount - (paymentOrder.paidAmount || 0)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20">
                  Record Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
