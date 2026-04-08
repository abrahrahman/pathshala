import React, { useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatDate, formatCurrency } from '../../lib/utils';
import { OrderStatus, Order } from '../../types';
import { Edit, Trash2, Eye, Plus, X, Trash, FileText, Download, Truck, Search, Filter, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface Client {
  id: string;
  name: string;
  institution?: string;
  contact?: string;
  address?: string;
}

interface OrderItemForm {
  id: string;
  itemType: string;
  subType: string;
  quantity: string;
}

const DEFAULT_ITEM_TYPES: Record<string, { name: string; price: number }[]> = {
  'ID Card': [
    { name: 'PVC', price: 50 },
    { name: 'RF Slime', price: 80 },
    { name: 'RF', price: 70 },
    { name: 'Laminating', price: 40 }
  ],
  'Ribbon': [
    { name: '1.5 cm', price: 10 },
    { name: '2 cm', price: 15 },
    { name: '2.5 cm', price: 20 }
  ],
  'Cover': [
    { name: 'Vertical', price: 10 },
    { name: 'Horizontal', price: 10 },
    { name: 'Premium', price: 25 }
  ]
};

export function AdminOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [itemTypes, setItemTypes] = useState<Record<string, { name: string; price: number }[]>>(DEFAULT_ITEM_TYPES);
  
  // Form state
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [institution, setInstitution] = useState('');
  const [contactDetails, setContactDetails] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [items, setItems] = useState<OrderItemForm[]>([
    { id: Date.now().toString(), itemType: 'ID Card', subType: 'PVC', quantity: '1' }
  ]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (error) {
      console.error('Error fetching orders', error);
    } finally {
      setIsLoading(false);
    }
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
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.itemTypes && Array.isArray(data.itemTypes)) {
          const formattedItemTypes: Record<string, { name: string; price: number }[]> = {};
          data.itemTypes.forEach((it: any) => {
            formattedItemTypes[it.name] = it.subTypes;
          });
          setItemTypes(formattedItemTypes);
        }
      }
    } catch (error) {
      console.error('Error fetching settings', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchClients();
    fetchSettings();
  }, [token]);

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const typeConfig = itemTypes[item.itemType] || [];
      const subTypeConfig = typeConfig.find(t => t.name === item.subType);
      const price = subTypeConfig ? subTypeConfig.price : 0;
      return total + (price * (Number(item.quantity) || 0));
    }, 0);
  };

  const handleClientChange = (id: string) => {
    setClientId(id);
    const selectedClient = clients.find(c => c.id === id);
    if (selectedClient) {
      setClientName(selectedClient.name || '');
      setInstitution(selectedClient.institution || '');
      setContactDetails(selectedClient.contact || '');
      setAddress(selectedClient.address || '');
    } else {
      setClientName('');
      setInstitution('');
      setContactDetails('');
      setAddress('');
    }
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!clientId || !deliveryDate || items.length === 0) {
      setErrorMsg("Please fill in all required fields and add at least one item.");
      return;
    }

    const selectedClient = clients.find(c => c.id === clientId);
    if (!selectedClient) {
      setErrorMsg("Invalid client selected.");
      return;
    }

    // Update client data
    try {
      await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...selectedClient,
          name: clientName || selectedClient.name,
          institution: institution,
          contact: contactDetails,
          address: address
        })
      });
      fetchClients();
    } catch (e) {
      console.error('Failed to update client details', e);
    }

    const orderData = {
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      deliveryDate: new Date(deliveryDate).toISOString(),
      totalAmount: calculateTotal(),
      paidAmount: editingOrder ? editingOrder.paidAmount : 0,
      assignedToPrinting: 'u2',
      assignedToFactory: 'u3',
      items: items.map(item => ({
        id: item.id.startsWith('i') ? item.id : `i${Date.now()}-${Math.random()}`,
        itemType: item.itemType,
        category: item.subType, // Storing subtype in category
        quantity: Number(item.quantity)
      }))
    };

    try {
      const url = editingOrder ? `/api/orders/${editingOrder.id}` : '/api/orders';
      const method = editingOrder ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(orderData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingOrder(null);
        setClientId('');
        setClientName('');
        setInstitution('');
        setContactDetails('');
        setAddress('');
        setDeliveryDate('');
        setItems([{ id: Date.now().toString(), itemType: 'ID Card', subType: 'PVC', quantity: '1' }]);
        fetchOrders();
      } else {
        setErrorMsg(`Failed to ${editingOrder ? 'update' : 'create'} order.`);
      }
    } catch (error) {
      console.error(`Error ${editingOrder ? 'updating' : 'creating'} order`, error);
      setErrorMsg(`An error occurred while ${editingOrder ? 'updating' : 'creating'} the order.`);
    }
  };

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
        fetchOrders();
        
        // Generate and print invoice for this payment
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
              ${order.items.map(item => `
                <tr>
                  <td><strong>${item.itemType}</strong><br><span style="color: #64748b; font-size: 13px;">${item.subType || ''}</span></td>
                  <td>${item.category || '-'}</td>
                  <td>${item.quantity}</td>
                </tr>
              `).join('')}
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

  const printDeliverySlip = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const client = clients.find(c => c.id === order.clientId);

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Delivery Slip - ${order.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.5; }
          .container { max-width: 800px; margin: 0 auto; border: 2px dashed #cbd5e1; padding: 40px; border-radius: 16px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; }
          .logo-area h1 { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
          .slip-title { text-align: right; }
          .slip-title h2 { font-size: 32px; font-weight: 800; color: #3b82f6; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px; }
          .slip-title p { margin: 0; font-size: 14px; color: #475569; font-weight: 500; }
          
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .info-box { background: #f8fafc; padding: 20px; border-radius: 12px; }
          .info-box h3 { font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin: 0 0 12px 0; }
          .info-box p { margin: 0 0 4px 0; font-size: 15px; }
          .info-box .highlight { font-weight: 700; font-size: 18px; color: #0f172a; margin-bottom: 8px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th { background: #f1f5f9; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; padding: 16px; text-align: left; border-bottom: 2px solid #e2e8f0; }
          td { padding: 16px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 15px; }
          th:last-child, td:last-child { text-align: center; }
          
          .signatures { display: flex; justify-content: space-between; margin-top: 80px; }
          .sig-box { width: 250px; text-align: center; }
          .sig-line { border-bottom: 1px solid #cbd5e1; margin-bottom: 12px; height: 40px; }
          .sig-box p { margin: 0; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-area">
              <h1>ID Print Co.</h1>
              <p>Delivery Department</p>
            </div>
            <div class="slip-title">
              <h2>DELIVERY SLIP</h2>
              <p>Order # ${order.id}</p>
              <p>Date: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <h3>Deliver To</h3>
              <p class="highlight">${client?.name || order.clientName}</p>
              ${client?.institution ? `<p>${client.institution}</p>` : ''}
              ${client?.address ? `<p>${client.address}</p>` : ''}
              ${client?.contact ? `<p>Contact: ${client.contact}</p>` : ''}
            </div>
            <div class="info-box">
              <h3>Order Details</h3>
              <p><strong>Order Date:</strong> ${new Date(order.orderDate).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${order.status}</p>
              <p><strong>Total Items:</strong> ${order.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th>Category</th>
                <th>Quantity Delivered</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td><strong>${item.itemType}</strong><br><span style="color: #64748b; font-size: 13px;">${item.subType || ''}</span></td>
                  <td>${item.category || '-'}</td>
                  <td style="font-weight: 700; font-size: 18px;">${item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line"></div>
              <p>Authorized Signature (Sender)</p>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <p>Receiver's Signature & Date</p>
            </div>
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

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    handleClientChange(order.clientId);
    setDeliveryDate(order.deliveryDate.split('T')[0]);
    setItems(order.items.map(item => ({
      id: item.id,
      itemType: item.itemType,
      subType: item.category,
      quantity: item.quantity.toString()
    })));
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingOrder(null);
    setClientId('');
    setClientName('');
    setInstitution('');
    setContactDetails('');
    setAddress('');
    setDeliveryDate('');
    setItems([{ id: Date.now().toString(), itemType: 'ID Card', subType: 'PVC', quantity: '1' }]);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      const res = await fetch(`/api/orders/${orderToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Error deleting order', error);
    } finally {
      setOrderToDelete(null);
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), itemType: 'ID Card', subType: 'PVC', quantity: '1' }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof OrderItemForm, value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Reset subType if itemType changes
        if (field === 'itemType') {
          updatedItem.subType = itemTypes[value] && itemTypes[value].length > 0 ? itemTypes[value][0].name : '';
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Processing':
      case 'Printing':
      case 'Printed':
      case 'QC Checking':
      case 'Ready': return 'info';
      case 'Dispatched': return 'success';
      case 'Cancelled': return 'destructive';
      case 'Reprint Needed': return 'destructive';
      default: return 'default';
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Order Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and track all customer orders</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search orders..." 
              className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64 transition-all"
            />
          </div>
          <Button variant="outline" className="gap-2 flex-1 sm:flex-none justify-center">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button onClick={() => { setErrorMsg(''); openCreateModal(); }} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20">
            <Plus className="mr-2 h-4 w-4" /> Create Order
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600 min-w-[1000px]">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Order ID</th>
                <th className="px-6 py-4 font-semibold">Client</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Due</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Latest Update</th>
                <th className="px-6 py-4 font-semibold">Documents</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="bg-white hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 font-medium text-blue-600">
                    <button onClick={() => setViewingOrder(order)} className="hover:underline focus:outline-none">
                      {order.id}
                    </button>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{order.clientName}</td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(order.orderDate)}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-6 py-4 font-medium text-amber-600">{formatCurrency(order.totalAmount - (order.paidAmount || 0))}</td>
                  <td className="px-6 py-4">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="text-xs font-medium border-slate-200 rounded-lg bg-white py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all cursor-pointer"
                    >
                      {['Pending', 'Processing', 'Printing', 'Printed', 'Reprint Needed', 'QC Checking', 'Ready', 'Dispatched', 'Cancelled'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {order.statusLogs && order.statusLogs.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-900">{order.statusLogs[order.statusLogs.length - 1].status}</span>
                        <span className="text-slate-500">{new Date(order.statusLogs[order.statusLogs.length - 1].updatedAt).toLocaleString()}</span>
                        <span className="text-slate-400">by {order.statusLogs[order.statusLogs.length - 1].updatedByUserName}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No updates</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs px-3 rounded-lg border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors" onClick={() => printInvoice(order, 0)}>
                        <FileText className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Invoice
                      </Button>
                      {order.status === 'Dispatched' && (
                        <Button variant="outline" size="sm" className="h-8 text-xs px-3 rounded-lg border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors" onClick={() => printDeliverySlip(order)}>
                          <Truck className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Delivery Slip
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="text-emerald-600 hover:bg-emerald-50 mr-2" onClick={() => openPaymentModal(order)}>
                        Payment
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => setViewingOrder(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" onClick={() => openEditModal(order)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => setOrderToDelete(order.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <FileText className="h-12 w-12 text-slate-300 mb-4" />
                      <p className="text-lg font-medium text-slate-900">No orders found</p>
                      <p className="text-sm">Get started by creating a new order.</p>
                      <Button onClick={() => { setErrorMsg(''); openCreateModal(); }} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="mr-2 h-4 w-4" /> Create Order
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Order</h3>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete this order? This action cannot be undone.</p>
            <div className="flex justify-center space-x-3">
              <Button variant="outline" className="rounded-xl" onClick={() => setOrderToDelete(null)}>Cancel</Button>
              <Button variant="destructive" className="rounded-xl" onClick={confirmDelete}>Delete Order</Button>
            </div>
          </div>
        </div>
      )}

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
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-medium text-slate-900">{formatCurrency(paymentOrder.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Paid Amount:</span>
                <span className="font-medium text-emerald-600">{formatCurrency(paymentOrder.paidAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-slate-100 pt-2">
                <span className="text-slate-900">Due Amount:</span>
                <span className="text-amber-600">{formatCurrency(paymentOrder.totalAmount - (paymentOrder.paidAmount || 0))}</span>
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
                  Record & Print Invoice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{editingOrder ? 'Edit Order' : 'Create New Order'}</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1">
              <form id="create-order-form" onSubmit={handleSaveOrder} className="space-y-8">
                {errorMsg && (
                  <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-start gap-3">
                    <div className="mt-0.5"><X className="h-4 w-4" /></div>
                    <p>{errorMsg}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Client</label>
                    <select 
                      required
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-slate-50/50"
                      value={clientId}
                      onChange={(e) => handleClientChange(e.target.value)}
                    >
                      <option value="" disabled>Select a client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Date</label>
                    <input 
                      type="date" 
                      required
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-slate-50/50"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                    />
                  </div>
                </div>

                {clientId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Institute Name</label>
                      <input 
                        type="text" 
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="Institute Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Contact Name</label>
                      <input 
                        type="text" 
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Contact Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Contact Details</label>
                      <input 
                        type="text" 
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
                        value={contactDetails}
                        onChange={(e) => setContactDetails(e.target.value)}
                        placeholder="Phone or Email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                      <input 
                        type="text" 
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Address"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-base font-semibold text-slate-900">Order Items</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addItem} className="rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50">
                      <Plus className="mr-1.5 h-4 w-4" /> Add Item
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100 group relative">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Type</label>
                            <select 
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                              value={item.itemType}
                              onChange={(e) => updateItem(item.id, 'itemType', e.target.value)}
                            >
                              {Object.keys(itemTypes).map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Sub-Type</label>
                            <select 
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                              value={item.subType}
                              onChange={(e) => updateItem(item.id, 'subType', e.target.value)}
                            >
                              {itemTypes[item.itemType]?.map(sub => (
                                <option key={sub.name} value={sub.name}>{sub.name} (৳{sub.price})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Quantity</label>
                            <input 
                              type="number" 
                              required
                              min="1"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                              placeholder="Qty"
                            />
                          </div>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 sm:static sm:mt-6 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                  <span className="font-medium text-blue-900">Total Amount</span>
                  <span className="text-2xl font-bold text-blue-700">{formatCurrency(calculateTotal())}</span>
                </div>
              </form>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end space-x-3">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="create-order-form" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20">
                {editingOrder ? 'Save Changes' : 'Create Order'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Order Details</h2>
                <p className="text-sm text-slate-500 mt-0.5">ID: {viewingOrder.id}</p>
              </div>
              <button 
                onClick={() => setViewingOrder(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1 space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-5 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Client</p>
                  <p className="font-semibold text-slate-900">{viewingOrder.clientName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Status</p>
                  <Badge variant={getStatusColor(viewingOrder.status)} className="rounded-md px-2 py-0.5">{viewingOrder.status}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Order Date</p>
                  <p className="font-semibold text-slate-900">{formatDate(viewingOrder.orderDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Delivery Date</p>
                  <p className="font-semibold text-slate-900">{formatDate(viewingOrder.deliveryDate)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Order Items</h3>
                <div className="space-y-3">
                  {viewingOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{item.itemType}</p>
                          <p className="text-sm text-slate-500">{item.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-500">Qty</p>
                        <p className="text-lg font-bold text-slate-900">{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-blue-900">Total Amount</span>
                  <span className="text-xl font-bold text-blue-700">{formatCurrency(viewingOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-emerald-700">Paid Amount</span>
                  <span className="text-lg font-bold text-emerald-600">{formatCurrency(viewingOrder.paidAmount || 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-blue-200/50">
                  <span className="font-bold text-amber-900">Remaining Due</span>
                  <span className="text-2xl font-bold text-amber-600">{formatCurrency(viewingOrder.totalAmount - (viewingOrder.paidAmount || 0))}</span>
                </div>
              </div>

              {viewingOrder.payments && viewingOrder.payments.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-base font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Payment History</h3>
                  <div className="space-y-3">
                    {viewingOrder.payments.map((payment: any, index: number) => (
                      <div key={payment.id || index} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <span className="font-bold">৳</span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">Payment {index + 1}</p>
                            <p className="text-sm text-slate-500">{new Date(payment.date).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-600">{formatCurrency(payment.amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingOrder.statusLogs && viewingOrder.statusLogs.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-base font-semibold text-slate-900 mb-6 border-b border-slate-100 pb-2">Order Progress Timeline</h3>
                  <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
                    {viewingOrder.statusLogs.map((log, index) => (
                      <div key={log.id} className="relative pl-8">
                        <div className={`absolute -left-[11px] top-1 h-5 w-5 rounded-full border-4 border-white shadow-sm ${index === viewingOrder.statusLogs!.length - 1 ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{log.status}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Updated by <span className="font-medium text-slate-700">{log.updatedByUserName}</span></p>
                          </div>
                          <p className="text-xs font-medium text-slate-400 mt-2 sm:mt-0 bg-slate-50 px-2 py-1 rounded-md">
                            {new Date(log.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end">
              <Button type="button" className="rounded-xl" onClick={() => setViewingOrder(null)}>
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
