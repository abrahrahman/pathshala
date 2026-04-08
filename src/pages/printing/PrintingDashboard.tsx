import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../lib/utils';
import { OrderStatus, Order } from '../../types';
import { Printer, Upload } from 'lucide-react';

export function PrintingDashboard() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
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
      console.error('Error updating status', error);
    }
  };

  if (isLoading) return <div className="p-6">Loading orders...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Printing Panel</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <Printer className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Assigned Orders</p>
              <h3 className="text-2xl font-bold text-slate-900">{orders.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 min-w-[800px]">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3">Delivery Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="bg-white border-b hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{order.id}</td>
                  <td className="px-6 py-4">
                    {order.items.map(i => (
                      <div key={i.id} className="text-xs">
                        {i.quantity}x {i.itemType} ({i.category})
                      </div>
                    ))}
                  </td>
                  <td className="px-6 py-4">{formatDate(order.deliveryDate)}</td>
                  <td className="px-6 py-4">
                    <Badge variant={order.status === 'Printed' ? 'success' : 'info'}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      {order.status === 'Pending' && (
                        <Button size="sm" onClick={() => updateStatus(order.id, 'Printing')}>Start Printing</Button>
                      )}
                      {order.status === 'Printing' && (
                        <Button size="sm" variant="success" onClick={() => updateStatus(order.id, 'Printed')}>Mark Printed</Button>
                      )}
                      <Button variant="outline" size="sm" className="text-slate-600">
                        <Upload className="mr-2 h-4 w-4" /> Sample
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No assigned orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
