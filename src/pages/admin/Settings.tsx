import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { Button } from '../../components/ui/Button';
import { Save, Building, Tags, User, FileText, Truck, Plus, X, CheckCircle2, ChevronRight, Trash2, Edit } from 'lucide-react';

interface SubType {
  name: string;
  price: number;
}

interface ItemType {
  id: number;
  name: string;
  subTypes: SubType[];
}

export function AdminSettings() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  // General State
  const [companyName, setCompanyName] = useState('ID Print SaaS');
  const [email, setEmail] = useState('admin@idprint.com');
  const [phone, setPhone] = useState('+880 1700-000000');
  const [address, setAddress] = useState('Dhaka, Bangladesh');
  const [currency, setCurrency] = useState('BDT');

  // Profile State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');

  // Invoice State
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [invoiceTerms, setInvoiceTerms] = useState('Payment is due within 30 days of invoice date.');

  // Delivery Slip State
  const [deliveryPrefix, setDeliveryPrefix] = useState('DEL-');
  const [deliveryFooter, setDeliveryFooter] = useState('Received in good condition.');

  // Item Types State
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [newItemTypeName, setNewItemTypeName] = useState('');
  const [isAddingItemType, setIsAddingItemType] = useState(false);
  const [addingSubTypeTo, setAddingSubTypeTo] = useState<number | null>(null);
  const [newSubTypeName, setNewSubTypeName] = useState('');
  const [newSubTypePrice, setNewSubTypePrice] = useState('');
  
  const [editingSubType, setEditingSubType] = useState<{ typeId: number, oldName: string } | null>(null);
  const [editSubTypeName, setEditSubTypeName] = useState('');
  const [editSubTypePrice, setEditSubTypePrice] = useState('');

  const [editingItemType, setEditingItemType] = useState<number | null>(null);
  const [editItemTypeName, setEditItemTypeName] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setCompanyName(data.companyName || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
          setAddress(data.address || '');
          setCurrency(data.currency || 'BDT');
          setInvoicePrefix(data.invoicePrefix || '');
          setInvoiceTerms(data.invoiceTerms || '');
          setDeliveryPrefix(data.deliveryPrefix || '');
          setDeliveryFooter(data.deliveryFooter || '');
          setItemTypes(data.itemTypes || []);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyName,
          email,
          phone,
          address,
          currency,
          invoicePrefix,
          invoiceTerms,
          deliveryPrefix,
          deliveryFooter,
          itemTypes
        })
      });

      if (response.ok) {
        setSaveMessage('Settings saved successfully.');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Failed to save settings.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const startAddSubType = (typeId: number) => {
    setAddingSubTypeTo(typeId);
    setNewSubTypeName('');
    setNewSubTypePrice('');
  };

  const confirmAddSubType = () => {
    if (!addingSubTypeTo || !newSubTypeName) return;
    const price = parseFloat(newSubTypePrice || '0');
    setItemTypes(itemTypes.map(it => 
      it.id === addingSubTypeTo ? { ...it, subTypes: [...it.subTypes, { name: newSubTypeName, price: isNaN(price) ? 0 : price }] } : it
    ));
    setAddingSubTypeTo(null);
    setNewSubTypeName('');
    setNewSubTypePrice('');
  };

  const cancelAddSubType = () => {
    setAddingSubTypeTo(null);
    setNewSubTypeName('');
    setNewSubTypePrice('');
  };

  const startEditSubType = (typeId: number, sub: SubType) => {
    setEditingSubType({ typeId, oldName: sub.name });
    setEditSubTypeName(sub.name);
    setEditSubTypePrice(sub.price.toString());
  };

  const confirmEditSubType = () => {
    if (!editingSubType || !editSubTypeName) return;
    const price = parseFloat(editSubTypePrice || '0');
    setItemTypes(itemTypes.map(it => 
      it.id === editingSubType.typeId ? {
        ...it,
        subTypes: it.subTypes.map(st => 
          st.name === editingSubType.oldName ? { name: editSubTypeName, price: isNaN(price) ? 0 : price } : st
        )
      } : it
    ));
    setEditingSubType(null);
    setEditSubTypeName('');
    setEditSubTypePrice('');
  };

  const cancelEditSubType = () => {
    setEditingSubType(null);
    setEditSubTypeName('');
    setEditSubTypePrice('');
  };

  const startEditItemType = (item: ItemType) => {
    setEditingItemType(item.id);
    setEditItemTypeName(item.name);
  };

  const confirmEditItemType = () => {
    if (!editingItemType || !editItemTypeName) return;
    setItemTypes(itemTypes.map(it => 
      it.id === editingItemType ? { ...it, name: editItemTypeName } : it
    ));
    setEditingItemType(null);
    setEditItemTypeName('');
  };

  const cancelEditItemType = () => {
    setEditingItemType(null);
    setEditItemTypeName('');
  };

  const confirmAddItemType = () => {
    if (!newItemTypeName) return;
    setItemTypes([...itemTypes, { id: Date.now(), name: newItemTypeName, subTypes: [] }]);
    setNewItemTypeName('');
    setIsAddingItemType(false);
  };

  const handleRemoveSubType = (typeId: number, subTypeToRemove: string) => {
    setItemTypes(itemTypes.map(it => 
      it.id === typeId ? { ...it, subTypes: it.subTypes.filter(st => st.name !== subTypeToRemove) } : it
    ));
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-100 font-medium">
          Access Denied. Admins only.
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Building, description: 'Company details and localization' },
    { id: 'items', label: 'Item Types', icon: Tags, description: 'Manage products and pricing' },
    { id: 'profile', label: 'Profile Settings', icon: User, description: 'Your personal account info' },
    { id: 'invoice', label: 'Invoice', icon: FileText, description: 'Invoice prefixes and terms' },
    { id: 'delivery', label: 'Delivery Slip', icon: Truck, description: 'Delivery slip configuration' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your application preferences and configurations</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="w-full md:w-72 flex-shrink-0 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white shadow-sm border border-blue-100 ring-1 ring-blue-500/20'
                  : 'hover:bg-white/60 border border-transparent hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 text-left">
                <div className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  <tab.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className={`font-medium ${activeTab === tab.id ? 'text-blue-900' : 'text-slate-700'}`}>
                    {tab.label}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{tab.description}</div>
                </div>
              </div>
              {activeTab === tab.id && <ChevronRight className="h-4 w-4 text-blue-500" />}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <form onSubmit={handleSave} className="flex flex-col h-full">
            <div className="p-8 flex-1">
              {activeTab === 'general' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">General Information</h2>
                    <p className="text-sm text-slate-500 mt-1">Update your company details and basic settings.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Company Name</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Contact Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Phone Number</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none bg-white"
                      >
                        <option value="BDT">BDT (৳)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Business Address</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                      required
                    />
                  </div>
                </div>
              )}

              {activeTab === 'items' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Item Types & Sub-types</h2>
                      <p className="text-sm text-slate-500 mt-1">Configure the products and services you offer.</p>
                    </div>
                  </div>

                  <div className="space-y-6 pt-2">
                    {itemTypes.map(item => (
                      <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
                          {editingItemType === item.id ? (
                            <div className="flex items-center gap-3 flex-1 mr-4">
                              <input
                                type="text"
                                value={editItemTypeName}
                                onChange={(e) => setEditItemTypeName(e.target.value)}
                                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button type="button" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1 h-auto" onClick={confirmEditItemType}>Save</Button>
                                <Button type="button" size="sm" variant="ghost" className="text-slate-500 rounded-lg px-3 py-1 h-auto" onClick={cancelEditItemType}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                              <Tags className="h-4 w-4 text-blue-500" />
                              {item.name}
                            </h3>
                          )}
                          
                          {editingItemType !== item.id && (
                            <div className="flex items-center gap-1">
                              <button 
                                type="button" 
                                onClick={() => startEditItemType(item)}
                                className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                                title="Edit Item Type"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button 
                                type="button" 
                                onClick={() => {
                                  const newTypes = itemTypes.filter(it => it.id !== item.id);
                                  setItemTypes(newTypes);
                                }}
                                className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                title="Delete Item Type"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-0 overflow-x-auto">
                          <table className="w-full text-sm text-left text-slate-600 min-w-[400px]">
                            <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100">
                              <tr>
                                <th className="px-4 py-3 font-medium">Sub-type Name</th>
                                <th className="px-4 py-3 font-medium">Price (৳)</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {item.subTypes.map(sub => (
                                editingSubType?.typeId === item.id && editingSubType?.oldName === sub.name ? (
                                  <tr key={sub.name} className="bg-blue-50/50">
                                    <td className="px-4 py-3">
                                      <input
                                        type="text"
                                        value={editSubTypeName}
                                        onChange={(e) => setEditSubTypeName(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                        autoFocus
                                      />
                                    </td>
                                    <td className="px-4 py-3">
                                      <input
                                        type="number"
                                        value={editSubTypePrice}
                                        onChange={(e) => setEditSubTypePrice(e.target.value)}
                                        className="w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <Button type="button" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1 h-auto" onClick={confirmEditSubType}>Save</Button>
                                        <Button type="button" size="sm" variant="ghost" className="text-slate-500 rounded-lg px-3 py-1 h-auto" onClick={cancelEditSubType}>Cancel</Button>
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  <tr key={sub.name} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-4 py-3 font-medium text-slate-900">{sub.name}</td>
                                    <td className="px-4 py-3 text-slate-600">{sub.price}</td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          type="button" 
                                          onClick={() => startEditSubType(item.id, sub)}
                                          className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                                          title="Edit Sub-type"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </button>
                                        <button 
                                          type="button" 
                                          onClick={() => handleRemoveSubType(item.id, sub.name)}
                                          className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                          title="Remove Sub-type"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              ))}
                              {item.subTypes.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500 text-sm">
                                    No sub-types added yet.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                          {addingSubTypeTo === item.id ? (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                              <input
                                type="text"
                                placeholder="Sub-type name"
                                value={newSubTypeName}
                                onChange={(e) => setNewSubTypeName(e.target.value)}
                                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                autoFocus
                              />
                              <input
                                type="number"
                                placeholder="Price"
                                value={newSubTypePrice}
                                onChange={(e) => setNewSubTypePrice(e.target.value)}
                                className="w-full sm:w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                              <div className="flex gap-2">
                                <Button type="button" size="sm" className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4" onClick={confirmAddSubType}>Add</Button>
                                <Button type="button" size="sm" variant="ghost" className="flex-1 sm:flex-none text-slate-500 rounded-lg" onClick={cancelAddSubType}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              type="button" 
                              onClick={() => startAddSubType(item.id)}
                              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors focus:outline-none"
                            >
                              <Plus className="h-4 w-4 mr-1.5" /> Add Sub-type
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {isAddingItemType ? (
                      <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
                        <h3 className="font-semibold text-blue-900">New Item Type</h3>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <input
                            type="text"
                            placeholder="e.g. ID Card, Lanyard, Mug"
                            value={newItemTypeName}
                            onChange={(e) => setNewItemTypeName(e.target.value)}
                            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button type="button" className="flex-1 sm:flex-none rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={confirmAddItemType}>Save Type</Button>
                            <Button type="button" variant="ghost" className="flex-1 sm:flex-none rounded-xl text-slate-500" onClick={() => setIsAddingItemType(false)}>Cancel</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" className="w-full border-dashed border-2 border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 py-6 rounded-xl transition-all" onClick={() => setIsAddingItemType(true)}>
                        <Plus className="mr-2 h-5 w-5" /> Add New Item Category
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Profile Settings</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage your personal account information.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Full Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Email Address</label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-slate-700">New Password</label>
                      <input
                        type="password"
                        placeholder="Leave blank to keep current password"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'invoice' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Invoice Settings</h2>
                    <p className="text-sm text-slate-500 mt-1">Configure how your invoices are generated.</p>
                  </div>
                  <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Invoice Prefix</label>
                      <input
                        type="text"
                        value={invoicePrefix}
                        onChange={(e) => setInvoicePrefix(e.target.value)}
                        className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                      <p className="text-xs text-slate-500 mt-1">Example: INV-0001</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Terms & Conditions</label>
                      <textarea
                        value={invoiceTerms}
                        onChange={(e) => setInvoiceTerms(e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'delivery' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Delivery Slip Settings</h2>
                    <p className="text-sm text-slate-500 mt-1">Configure your delivery documentation.</p>
                  </div>
                  <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Delivery Slip Prefix</label>
                      <input
                        type="text"
                        value={deliveryPrefix}
                        onChange={(e) => setDeliveryPrefix(e.target.value)}
                        className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                      <p className="text-xs text-slate-500 mt-1">Example: DEL-0001</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Footer Note</label>
                      <textarea
                        value={deliveryFooter}
                        onChange={(e) => setDeliveryFooter(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="h-6">
                {saveMessage && (
                  <span className="text-sm font-medium text-green-600 flex items-center bg-green-50 px-3 py-1 rounded-full border border-green-100 animate-in fade-in duration-300">
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> {saveMessage}
                  </span>
                )}
              </div>
              <Button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 px-6">
                {isSaving ? 'Saving...' : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </>
                )}
              </Button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
