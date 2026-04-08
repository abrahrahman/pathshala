import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatDate, formatCurrency } from '../../lib/utils';
import { Order } from '../../types';
import { Download, FileText, CheckCircle2, Clock, Package, ChevronDown, ChevronUp } from 'lucide-react';

export function ClientDashboard() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  useEffect(() => {
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
    fetchOrders();
  }, [token]);

  const getStatusIcon = (status: string) => {
    if (status === 'Pending') return <Clock className="h-5 w-5 text-yellow-500" />;
    if (status === 'Dispatched') return <Package className="h-5 w-5 text-green-500" />;
    return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  if (isLoading) return <div className="p-6">Loading orders...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Orders</p>
              <h3 className="text-2xl font-bold text-slate-900">{orders.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl border bg-white p-6 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-slate-900">{order.id}</h3>
                  <Badge variant={order.status === 'Dispatched' ? 'success' : 'info'}>
                    {order.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">
                  Ordered: {formatDate(order.orderDate)} • Expected: {formatDate(order.deliveryDate)}
                </p>
                <div className="text-sm font-medium text-slate-700">
                  Amount: {formatCurrency(order.totalAmount)} (Paid: {formatCurrency(order.paidAmount)})
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-lg border">
                  {getStatusIcon(order.status)}
                  <span className="text-sm font-medium text-slate-700">{order.status}</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" /> Invoice
                  </Button>
                  {order.status === 'Dispatched' && (
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" /> Delivery Slip
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => toggleOrderExpansion(order.id)}>
                    {expandedOrders[order.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {expandedOrders[order.id] && order.statusLogs && order.statusLogs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-900 mb-4">Order Progress</h4>
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                  {order.statusLogs.map((log, index) => (
                    <div key={log.id} className="relative pl-6">
                      <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white ${index === order.statusLogs!.length - 1 ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{log.status}</p>
                          <p className="text-xs text-slate-500">Updated by {log.updatedByUserName}</p>
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-1 sm:mt-0">
                          {new Date(log.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {orders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-2 text-sm font-semibold text-slate-900">No orders</h3>
            <p className="mt-1 text-sm text-slate-500">You haven't placed any orders yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
