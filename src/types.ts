export type Role = 'Admin' | 'Printing' | 'Factory' | 'Client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  institution: string;
  contact: string;
  address: string;
}

export type OrderStatus = 
  | 'Pending' 
  | 'Processing' 
  | 'Printing' 
  | 'Printed' 
  | 'Reprint Needed'
  | 'QC Checking' 
  | 'Ready' 
  | 'Dispatched' 
  | 'Cancelled';

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount: number;
  paidAmount: number;
  status: OrderStatus;
  assignedToPrinting?: string;
  assignedToFactory?: string;
  items: OrderItem[];
  statusLogs?: StatusLog[];
  payments?: any[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  itemType: string;
  subType?: string;
  category: string;
  quantity: number;
  fileUrl?: string;
}

export interface PrintType {
  id: string;
  name: string;
}

export interface StatusLog {
  id: string;
  orderId: string;
  status: OrderStatus;
  updatedAt: string;
  updatedByUserId: string;
  updatedByUserName: string;
}
