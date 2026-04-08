import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { formatCurrency } from '../../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../lib/auth';
import { DollarSign, ShoppingBag, Clock, CheckCircle } from 'lucide-react';

export function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [domainFilter, setDomainFilter] = useState<'expiring' | 'all'>('expiring');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats', error);
      }
    };
    fetchStats();
  }, [token]);

  if (!stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">Here's what's happening with your business today.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-md shadow-slate-200/50 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md shadow-slate-200/50 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Orders</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.totalOrders}</div>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
              +18.1% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md shadow-slate-200/50 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Orders</CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.pendingOrders}</div>
            <p className="text-xs text-amber-600 font-medium mt-1 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
              Needs attention
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md shadow-slate-200/50 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Completed Orders</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.completedOrders}</div>
            <p className="text-xs text-slate-500 font-medium mt-1 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-300 mr-1.5"></span>
              +2 since last hour
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="border-none shadow-md shadow-slate-200/50 lg:col-span-2">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pl-2">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `$${value}`} 
                    dx={-10}
                  />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md shadow-slate-200/50">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800">Domains</CardTitle>
            <select 
              className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value as any)}
            >
              <option value="expiring">Expiring Soon</option>
              <option value="all">All Domains</option>
            </select>
          </CardHeader>
          <CardContent className="pt-4">
            {stats.expiringDomains && stats.expiringDomains.length > 0 ? (
              <div className="space-y-4">
                {(domainFilter === 'expiring' ? stats.expiringDomains : stats.allDomains || []).map((domain: any) => (
                  <div key={domain.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="font-medium text-slate-900 text-sm truncate">{domain.domainName}</p>
                      <p className="text-xs text-slate-500 truncate">{domain.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        domain.daysRemaining <= 0 ? 'bg-red-100 text-red-700' :
                        domain.daysRemaining <= 7 ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10' : 
                        domain.daysRemaining <= 30 ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10' :
                        'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10'
                      }`}>
                        {domain.daysRemaining < 0 ? 'Expired' : `${domain.daysRemaining}d left`}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(domain.domainExpiryDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {domainFilter === 'all' && (!stats.allDomains || stats.allDomains.length === 0) && (
                   <div className="text-center py-8 text-slate-500">
                    <p>No domains found.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
                <p>No domains expiring soon.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
