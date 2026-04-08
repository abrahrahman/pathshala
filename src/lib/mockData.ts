import { User, Client, Order, PrintType, StatusLog } from '../types';

export const mockUsers: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@idprint.com', role: 'Admin', createdAt: '2023-01-01T00:00:00Z' },
  { id: 'u2', name: 'Print Staff 1', email: 'print@idprint.com', role: 'Printing', createdAt: '2023-02-01T00:00:00Z' },
  { id: 'u3', name: 'Factory Staff 1', email: 'factory@idprint.com', role: 'Factory', createdAt: '2023-03-01T00:00:00Z' },
  { id: 'u4', name: 'Client User 1', email: 'client@school.edu', role: 'Client', createdAt: '2023-04-01T00:00:00Z' },
];

export const mockClients: Client[] = [
  { id: 'c1', name: 'Client User 1', institution: 'Springfield High', contact: '555-0101', address: '123 Main St' },
  { id: 'c2', name: 'Jane Smith', institution: 'Tech Corp', contact: '555-0202', address: '456 Tech Blvd' },
];

export const mockPrintTypes: PrintType[] = [
  { id: 'pt1', name: 'PVC Standard' },
  { id: 'pt2', name: 'RF Slim' },
  { id: 'pt3', name: 'RF Mota' },
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-1001',
    clientId: 'c1',
    clientName: 'Client User 1',
    orderDate: '2023-10-01T10:00:00Z',
    deliveryDate: '2023-10-10T10:00:00Z',
    totalAmount: 1500,
    paidAmount: 500,
    status: 'Pending',
    assignedToPrinting: 'u2',
    assignedToFactory: 'u3',
    items: [
      { id: 'i1', orderId: 'ORD-1001', itemType: 'ID Card', category: 'Student', quantity: 500, fileUrl: '/files/ord-1001-data.xlsx' }
    ]
  },
  {
    id: 'ORD-1002',
    clientId: 'c2',
    clientName: 'Jane Smith',
    orderDate: '2023-10-02T11:00:00Z',
    deliveryDate: '2023-10-12T10:00:00Z',
    totalAmount: 300,
    paidAmount: 300,
    status: 'Printing',
    assignedToPrinting: 'u2',
    items: [
      { id: 'i2', orderId: 'ORD-1002', itemType: 'ID Card', category: 'Employee', quantity: 100 }
    ]
  },
  {
    id: 'ORD-1003',
    clientId: 'c1',
    clientName: 'Client User 1',
    orderDate: '2023-09-15T09:00:00Z',
    deliveryDate: '2023-09-25T10:00:00Z',
    totalAmount: 2000,
    paidAmount: 2000,
    status: 'Dispatched',
    assignedToFactory: 'u3',
    items: [
      { id: 'i3', orderId: 'ORD-1003', itemType: 'ID Card', category: 'Student', quantity: 800 }
    ]
  }
];

export const mockStatusLogs: StatusLog[] = [
  { id: 'sl1', orderId: 'ORD-1001', status: 'Pending', updatedAt: '2023-10-01T10:00:00Z', updatedByUserId: 'u1', updatedByUserName: 'Admin User' },
  { id: 'sl2', orderId: 'ORD-1002', status: 'Pending', updatedAt: '2023-10-02T11:00:00Z', updatedByUserId: 'u1', updatedByUserName: 'Admin User' },
  { id: 'sl3', orderId: 'ORD-1002', status: 'Printing', updatedAt: '2023-10-03T09:00:00Z', updatedByUserId: 'u2', updatedByUserName: 'Print Staff 1' },
];
