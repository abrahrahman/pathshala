import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- DATABASE SETUP ---
const db = new Database('database.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    role TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    createdAt TEXT,
    services TEXT,
    softwareBill REAL,
    websiteBill REAL,
    domainName TEXT,
    domainExpiryDate TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    clientId TEXT,
    clientName TEXT,
    orderDate TEXT,
    deliveryDate TEXT,
    totalAmount REAL,
    paidAmount REAL,
    status TEXT,
    assignedToPrinting TEXT,
    assignedToFactory TEXT,
    items TEXT,
    statusLogs TEXT,
    payments TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS service_bills (
    id TEXT PRIMARY KEY,
    clientId TEXT,
    serviceType TEXT,
    amount REAL,
    year INTEGER,
    month INTEGER,
    paymentMonth INTEGER,
    status TEXT,
    notes TEXT,
    createdAt TEXT,
    accountId TEXT,
    FOREIGN KEY (clientId) REFERENCES clients(id),
    FOREIGN KEY (accountId) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT,
    balance REAL DEFAULT 0,
    createdAt TEXT
  );

  // Create default account if none exists
  const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as any;
  if (accountCount.count === 0) {
    db.prepare('INSERT INTO accounts (id, name, balance, createdAt) VALUES (?, ?, ?, ?)').run(
      'ACC-DEFAULT',
      'Main Cash Account',
      0,
      new Date().toISOString()
    );
  }

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    referenceId TEXT,
    type TEXT,
    clientId TEXT,
    amount REAL,
    createdAt TEXT
  );
`);

try { db.exec('ALTER TABLE service_bills ADD COLUMN accountId TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE service_bills ADD COLUMN paymentMonth INTEGER'); } catch (e) {}
try { db.exec('ALTER TABLE clients ADD COLUMN serviceStartMonth INTEGER'); } catch (e) {}
try { db.exec('ALTER TABLE service_bills ADD COLUMN paidAmount REAL DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN payments TEXT DEFAULT "[]"'); } catch (e) {}
try { db.exec('ALTER TABLE clients ADD COLUMN services TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE clients ADD COLUMN softwareBill REAL'); } catch (e) {}
try { db.exec('ALTER TABLE clients ADD COLUMN websiteBill REAL'); } catch (e) {}
try { db.exec('ALTER TABLE clients ADD COLUMN domainName TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE clients ADD COLUMN domainExpiryDate TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE clients ADD COLUMN institution TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE clients ADD COLUMN instituteId TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE clients ADD COLUMN contact TEXT'); } catch (e) {}
try { db.exec("ALTER TABLE clients ADD COLUMN serviceStatus TEXT DEFAULT 'Active'"); } catch (e) {}

try { db.exec('ALTER TABLE users ADD COLUMN password TEXT'); } catch (e) {}

// Seed default users if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const defaultPassword = bcrypt.hashSync('password123', 10);
  const insertUser = db.prepare('INSERT INTO users (id, name, email, role, createdAt, password) VALUES (?, ?, ?, ?, ?, ?)');
  insertUser.run('u1', 'Admin User', 'admin@idprint.com', 'Admin', '2023-01-01T00:00:00Z', defaultPassword);
  insertUser.run('u2', 'Print Staff 1', 'print@idprint.com', 'Printing', '2023-02-01T00:00:00Z', defaultPassword);
  insertUser.run('u3', 'Factory Staff 1', 'factory@idprint.com', 'Factory', '2023-03-01T00:00:00Z', defaultPassword);
  insertUser.run('u4', 'Client User 1', 'client@school.edu', 'Client', '2023-04-01T00:00:00Z', defaultPassword);
} else {
  // Update existing users with default password if they don't have one
  const defaultPassword = bcrypt.hashSync('password123', 10);
  db.prepare('UPDATE users SET password = ? WHERE password IS NULL').run(defaultPassword);
}

// Seed default settings if empty
const defaultSettings = {
  companyName: 'ID Print SaaS',
  email: 'admin@idprint.com',
  phone: '+880 1700-000000',
  address: 'Dhaka, Bangladesh',
  currency: 'BDT',
  invoicePrefix: 'INV-',
  invoiceTerms: 'Payment is due within 30 days of invoice date.',
  deliveryPrefix: 'DEL-',
  deliveryFooter: 'Received in good condition.',
  itemTypes: [
    { id: 1, name: 'ID Card', subTypes: [{name: 'PVC', price: 50}, {name: 'RF Slime', price: 80}, {name: 'RF', price: 70}, {name: 'Laminating', price: 40}] },
    { id: 2, name: 'Ribbon', subTypes: [{name: '1.5 cm', price: 10}, {name: '2 cm', price: 15}, {name: '2.5 cm', price: 20}] },
    { id: 3, name: 'Cover', subTypes: [{name: 'Vertical', price: 10}, {name: 'Horizontal', price: 10}, {name: 'Premium', price: 25}] }
  ]
};

const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
if (settingsCount.count === 0) {
  db.prepare('INSERT INTO settings (id, data) VALUES (1, ?)').run(JSON.stringify(defaultSettings));
}

// Helper functions
const getSettings = () => {
  const row = db.prepare('SELECT data FROM settings WHERE id = 1').get() as { data: string };
  return JSON.parse(row.data);
};

const updateSettings = (newSettings: any) => {
  db.prepare('UPDATE settings SET data = ? WHERE id = 1').run(JSON.stringify(newSettings));
};

const getUser = (id: string) => db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
const getUserByEmail = (email: string) => db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

// --- EMAIL NOTIFICATIONS SETUP ---
let transporter: nodemailer.Transporter;

nodemailer.createTestAccount().then(account => {
  transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass
    }
  });
  console.log('Ethereal Email account created for domain expiry notifications.');
}).catch(err => console.error('Failed to create Ethereal account', err));

const checkDomainExpirations = async () => {
  console.log('Running domain expiry check...');
  const clients = db.prepare("SELECT * FROM clients WHERE domainExpiryDate IS NOT NULL AND domainExpiryDate != ''").all() as any[];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let emailsSent = 0;

  for (const client of clients) {
    if (!client.email) continue;

    const expiryDate = new Date(client.domainExpiryDate);
    expiryDate.setHours(0, 0, 0, 0);
    
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 30 || diffDays === 7 || diffDays === 1) {
      const mailOptions = {
        from: '"ID Print SaaS" <admin@idprint.com>',
        to: client.email,
        subject: `Domain Expiry Notice: ${client.domainName}`,
        text: `Dear ${client.name},\n\nThis is a reminder that your domain ${client.domainName} is expiring in ${diffDays} day(s) on ${client.domainExpiryDate}.\n\nPlease arrange for renewal to avoid any service interruption.\n\nBest regards,\nID Print SaaS`,
      };

      if (transporter) {
        try {
          const info = await transporter.sendMail(mailOptions);
          console.log(`Expiry notification sent to ${client.email} for domain ${client.domainName}. Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
          emailsSent++;
        } catch (error) {
          console.error('Error sending email:', error);
        }
      }
    }
  }
  return emailsSent;
};

const generateAutomatedMonthlyBills = async () => {
  console.log('Running automated monthly billing...');
  const clients = db.prepare("SELECT * FROM clients WHERE serviceStatus = 'Active' AND services != 'None'").all() as any[];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  let billsGenerated = 0;

  for (const client of clients) {
    // Check if service has started
    if (client.serviceStartMonth && currentMonth < client.serviceStartMonth && currentYear <= new Date(client.createdAt).getFullYear()) {
      continue;
    }

    if (client.services === 'Software' || client.services === 'Both') {
      const existing = db.prepare('SELECT id FROM service_bills WHERE clientId = ? AND serviceType = ? AND year = ? AND month = ?').get(client.id, 'Software', currentYear, currentMonth);
      if (!existing && client.softwareBill) {
        db.prepare('INSERT INTO service_bills (id, clientId, serviceType, amount, year, month, status, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          `sb-auto-${Date.now()}-${client.id}-sw`, client.id, 'Software', client.softwareBill, currentYear, currentMonth, 'Unpaid', 'Automated monthly bill', new Date().toISOString()
        );
        billsGenerated++;
      }
    }
    if (client.services === 'Website' || client.services === 'Both') {
      const existing = db.prepare('SELECT id FROM service_bills WHERE clientId = ? AND serviceType = ? AND year = ? AND month = ?').get(client.id, 'Website', currentYear, currentMonth);
      if (!existing && client.websiteBill) {
        db.prepare('INSERT INTO service_bills (id, clientId, serviceType, amount, year, month, status, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          `sb-auto-${Date.now()}-${client.id}-web`, client.id, 'Website', client.websiteBill, currentYear, currentMonth, 'Unpaid', 'Automated monthly bill', new Date().toISOString()
        );
        billsGenerated++;
      }
    }
  }
  console.log(`Automated billing completed. ${billsGenerated} bills generated.`);
  return billsGenerated;
};

// Schedule task to run every day at midnight (0 0 * * *)
cron.schedule('0 0 * * *', () => {
  checkDomainExpirations();
  // On the 1st of every month, generate bills
  if (new Date().getDate() === 1) {
    generateAutomatedMonthlyBills();
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---
  
  // Trigger Domain Checks Manually
  app.post('/api/admin/trigger-domain-checks', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    try {
      const emailsSent = await checkDomainExpirations();
      res.json({ message: 'Domain checks completed', emailsSent });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to run domain checks' });
    }
  });

  // Auth
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Get user including password
    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (userRow) {
      // If password is provided and matches, or if no password is set (fallback for old users)
      const isMatch = userRow.password ? bcrypt.compareSync(password || '', userRow.password) : true;
      
      if (isMatch) {
        // Don't send password back to client
        const { password: _, ...user } = userRow;
        res.json({ user, token: user.id }); // Simple token for demo
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      res.status(401).json({ error: 'User not found' });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (user) {
      res.json({ user });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  });

  // Settings
  app.get('/api/settings', (req, res) => {
    res.json(getSettings());
  });

  app.put('/api/settings', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const currentSettings = getSettings();
    const newSettings = { ...currentSettings, ...req.body };
    updateSettings(newSettings);
    res.json(newSettings);
  });

  // Orders
  app.get('/api/orders', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    let query = 'SELECT * FROM orders';
    let params: any[] = [];

    if (user.role === 'Printing') {
      query += ' WHERE assignedToPrinting = ?';
      params.push(user.id);
    } else if (user.role === 'Factory') {
      query += ' WHERE assignedToFactory = ?';
      params.push(user.id);
    } else if (user.role === 'Client') {
      query += ' WHERE clientName = ?';
      params.push(user.name);
    }

    const orders = db.prepare(query).all(...params).map((o: any) => ({
      ...o,
      items: JSON.parse(o.items),
      statusLogs: JSON.parse(o.statusLogs),
      payments: o.payments ? JSON.parse(o.payments) : []
    }));

    res.json(orders);
  });

  app.post('/api/orders', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
    const nextOrderId = 1004 + orderCount.count;
    const orderId = `ORD-${nextOrderId}`;
    
    const newOrder = {
      ...req.body,
      id: orderId,
      orderDate: new Date().toISOString(),
      status: 'Pending',
      items: req.body.items || [],
      payments: req.body.payments || [],
      statusLogs: [
        {
          id: `sl-${Date.now()}`,
          orderId: orderId,
          status: 'Pending',
          updatedAt: new Date().toISOString(),
          updatedByUserId: user.id,
          updatedByUserName: user.name
        }
      ]
    };

    const insertOrder = db.prepare(`
      INSERT INTO orders (id, clientId, clientName, orderDate, deliveryDate, totalAmount, paidAmount, status, assignedToPrinting, assignedToFactory, items, statusLogs, payments)
      VALUES (@id, @clientId, @clientName, @orderDate, @deliveryDate, @totalAmount, @paidAmount, @status, @assignedToPrinting, @assignedToFactory, @items, @statusLogs, @payments)
    `);

    insertOrder.run({
      ...newOrder,
      items: JSON.stringify(newOrder.items),
      statusLogs: JSON.stringify(newOrder.statusLogs),
      payments: JSON.stringify(newOrder.payments)
    });

    res.status(201).json(newOrder);
  });

  app.patch('/api/orders/:id/status', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { status } = req.body;
    
    const orderRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    
    if (orderRow) {
      const statusLogs = JSON.parse(orderRow.statusLogs || '[]');
      statusLogs.push({
        id: `sl-${Date.now()}`,
        orderId: id,
        status: status,
        updatedAt: new Date().toISOString(),
        updatedByUserId: user.id,
        updatedByUserName: user.name
      });

      db.prepare('UPDATE orders SET status = ?, statusLogs = ? WHERE id = ?').run(status, JSON.stringify(statusLogs), id);
      
      const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
      res.json({
        ...updatedOrder,
        items: JSON.parse(updatedOrder.items),
        statusLogs: JSON.parse(updatedOrder.statusLogs)
      });
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  });

  app.put('/api/orders/:id', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    const orderRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    
    if (orderRow) {
      const updatedOrder = { ...orderRow, ...req.body, id };
      
      db.prepare(`
        UPDATE orders 
        SET clientId = @clientId, clientName = @clientName, deliveryDate = @deliveryDate, 
            totalAmount = @totalAmount, paidAmount = @paidAmount, status = @status, 
            assignedToPrinting = @assignedToPrinting, assignedToFactory = @assignedToFactory, 
            items = @items, statusLogs = @statusLogs, payments = @payments
        WHERE id = @id
      `).run({
        ...updatedOrder,
        items: JSON.stringify(updatedOrder.items || JSON.parse(orderRow.items)),
        statusLogs: JSON.stringify(updatedOrder.statusLogs || JSON.parse(orderRow.statusLogs)),
        payments: JSON.stringify(updatedOrder.payments || (orderRow.payments ? JSON.parse(orderRow.payments) : []))
      });

      res.json({
        ...updatedOrder,
        items: typeof updatedOrder.items === 'string' ? JSON.parse(updatedOrder.items) : updatedOrder.items,
        statusLogs: typeof updatedOrder.statusLogs === 'string' ? JSON.parse(updatedOrder.statusLogs) : updatedOrder.statusLogs,
        payments: typeof updatedOrder.payments === 'string' ? JSON.parse(updatedOrder.payments) : (updatedOrder.payments || [])
      });
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  });

  app.delete('/api/orders/:id', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    res.status(204).send();
  });

  // Users
  app.get('/api/users', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
    
    const users = db.prepare('SELECT * FROM users').all();
    res.json(users);
  });

  app.post('/api/users', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const { name, email, role, password } = req.body;
    const existingUser = getUserByEmail(email);
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const newUserId = `u${Date.now()}`;
    const hashedPassword = bcrypt.hashSync(password || 'password123', 10);

    const newUser = {
      id: newUserId,
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
      password: hashedPassword
    };

    db.prepare('INSERT INTO users (id, name, email, role, createdAt, password) VALUES (@id, @name, @email, @role, @createdAt, @password)').run(newUser);
    
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  });

  app.put('/api/users/:id', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    const { name, email, role, password } = req.body;

    const existingUser = getUserByEmail(email);
    if (existingUser && existingUser.id !== id) return res.status(400).json({ error: 'Email already exists' });

    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET name = @name, email = @email, role = @role, password = @password WHERE id = @id').run({ id, name, email, role, password: hashedPassword });
    } else {
      db.prepare('UPDATE users SET name = @name, email = @email, role = @role WHERE id = @id').run({ id, name, email, role });
    }
    
    res.json({ id, name, email, role });
  });

  app.delete('/api/users/:id', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    if (id === user.id) return res.status(400).json({ error: 'Cannot delete yourself' });

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.status(204).send();
  });

  // Clients
  app.get('/api/clients', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
    
    const clients = db.prepare('SELECT * FROM clients').all() as any[];
    const clientsWithOrderCount = clients.map(client => {
      const orderCount = (db.prepare('SELECT COUNT(*) as count FROM orders WHERE clientId = ?').get(client.id) as any).count;
      return { ...client, orderCount };
    });
    res.json(clientsWithOrderCount);
  });

  app.post('/api/clients', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number };
    const nextClientId = 1003 + clientCount.count;
    
    const newClient = {
      ...req.body,
      id: `CLI-${nextClientId}`,
      createdAt: new Date().toISOString(),
      serviceStatus: req.body.serviceStatus || 'Active'
    };
    
    const email = req.body.email || (req.body.contact && req.body.contact.includes('@') ? req.body.contact : null);
    const phone = req.body.phone || (!req.body.contact?.includes('@') ? req.body.contact : null);

    db.prepare('INSERT INTO clients (id, name, email, phone, address, createdAt, services, softwareBill, websiteBill, domainName, domainExpiryDate, institution, instituteId, contact, serviceStatus, serviceStartMonth) VALUES (@id, @name, @email, @phone, @address, @createdAt, @services, @softwareBill, @websiteBill, @domainName, @domainExpiryDate, @institution, @instituteId, @contact, @serviceStatus, @serviceStartMonth)').run({
      ...newClient,
      email,
      phone,
      institution: newClient.institution || null,
      instituteId: newClient.instituteId || null,
      contact: newClient.contact || null,
      services: newClient.services || 'None',
      softwareBill: newClient.softwareBill || null,
      websiteBill: newClient.websiteBill || null,
      domainName: newClient.domainName || null,
      domainExpiryDate: newClient.domainExpiryDate || null,
      serviceStartMonth: newClient.serviceStartMonth || null
    });

    // Automatically generate bills for new client if services are active
    if (newClient.serviceStatus !== 'Inactive') {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      if ((newClient.services === 'Software' || newClient.services === 'Both') && newClient.softwareBill) {
        db.prepare('INSERT INTO service_bills (id, clientId, serviceType, amount, year, month, status, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          `sb-${Date.now()}-sw`, newClient.id, 'Software', newClient.softwareBill, currentYear, currentMonth, 'Unpaid', 'Generated monthly bill', new Date().toISOString()
        );
      }
      if ((newClient.services === 'Website' || newClient.services === 'Both') && newClient.websiteBill) {
        db.prepare('INSERT INTO service_bills (id, clientId, serviceType, amount, year, month, status, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          `sb-${Date.now()}-web`, newClient.id, 'Website', newClient.websiteBill, currentYear, currentMonth, 'Unpaid', 'Generated monthly bill', new Date().toISOString()
        );
      }
    }

    res.status(201).json(newClient);
  });

  app.put('/api/clients/:id', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    const clientRow = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as any;
    
    if (clientRow) {
      const updatedClient = { ...clientRow, ...req.body, id };
      const email = req.body.email || (req.body.contact && req.body.contact.includes('@') ? req.body.contact : updatedClient.email);
      const phone = req.body.phone || (!req.body.contact?.includes('@') ? req.body.contact : updatedClient.phone);

      db.prepare('UPDATE clients SET name = @name, email = @email, phone = @phone, address = @address, services = @services, softwareBill = @softwareBill, websiteBill = @websiteBill, domainName = @domainName, domainExpiryDate = @domainExpiryDate, institution = @institution, instituteId = @instituteId, contact = @contact, serviceStatus = @serviceStatus, serviceStartMonth = @serviceStartMonth WHERE id = @id').run({
        ...updatedClient,
        email,
        phone,
        institution: updatedClient.institution || null,
        instituteId: updatedClient.instituteId || null,
        contact: updatedClient.contact || null,
        services: updatedClient.services || 'None',
        softwareBill: updatedClient.softwareBill || null,
        websiteBill: updatedClient.websiteBill || null,
        domainName: updatedClient.domainName || null,
        domainExpiryDate: updatedClient.domainExpiryDate || null,
        serviceStatus: updatedClient.serviceStatus || 'Active',
        serviceStartMonth: updatedClient.serviceStartMonth || null
      });

      // Automatically generate bills if services are active and bill doesn't exist for current month
      if (updatedClient.serviceStatus !== 'Inactive') {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        if ((updatedClient.services === 'Software' || updatedClient.services === 'Both') && updatedClient.softwareBill) {
          const existing = db.prepare('SELECT id FROM service_bills WHERE clientId = ? AND serviceType = ? AND year = ? AND month = ?').get(id, 'Software', currentYear, currentMonth);
          if (!existing) {
            db.prepare('INSERT INTO service_bills (id, clientId, serviceType, amount, year, month, status, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
              `sb-${Date.now()}-sw`, id, 'Software', updatedClient.softwareBill, currentYear, currentMonth, 'Unpaid', 'Generated monthly bill', new Date().toISOString()
            );
          }
        }
        if ((updatedClient.services === 'Website' || updatedClient.services === 'Both') && updatedClient.websiteBill) {
          const existing = db.prepare('SELECT id FROM service_bills WHERE clientId = ? AND serviceType = ? AND year = ? AND month = ?').get(id, 'Website', currentYear, currentMonth);
          if (!existing) {
            db.prepare('INSERT INTO service_bills (id, clientId, serviceType, amount, year, month, status, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
              `sb-${Date.now()}-web`, id, 'Website', updatedClient.websiteBill, currentYear, currentMonth, 'Unpaid', 'Generated monthly bill', new Date().toISOString()
            );
          }
        }
      }

      res.json(updatedClient);
    } else {
      res.status(404).json({ error: 'Client not found' });
    }
  });

  app.delete('/api/clients/:id', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    res.status(204).send();
  });

  // Accounts
  app.get('/api/accounts', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
    
    const accounts = db.prepare('SELECT * FROM accounts').all();
    res.json(accounts);
  });

  app.post('/api/accounts', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const newAccount = {
      ...req.body,
      id: `ACC-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    db.prepare('INSERT INTO accounts (id, name, balance, createdAt) VALUES (@id, @name, @balance, @createdAt)').run(newAccount);
    res.status(201).json(newAccount);
  });

  // Client History & Report
  app.get('/api/clients/:id/history', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    
    const bills = db.prepare('SELECT * FROM service_bills WHERE clientId = ? ORDER BY year DESC, month DESC').all(id);
    const orders = db.prepare('SELECT * FROM orders WHERE clientId = ? ORDER BY orderDate DESC').all(id);
    
    const totalBilled = bills.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
    const totalPaidBills = bills.filter((b: any) => b.status === 'Paid').reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
    
    const totalOrderAmount = orders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
    const totalOrderPaid = orders.reduce((sum: number, o: any) => sum + (o.paidAmount || 0), 0);
    
    const billDue = (totalBilled as number) - (totalPaidBills as number);
    const orderDue = (totalOrderAmount as number) - (totalOrderPaid as number);
    
    res.json({
      bills,
      orders,
      summary: {
        totalBilled,
        totalPaidBills,
        billDue,
        totalOrderAmount,
        totalOrderPaid,
        orderDue,
        totalDue: billDue + orderDue
      }
    });
  });

  // Service Bills
  app.get('/api/service_bills', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
    
    const bills = db.prepare('SELECT * FROM service_bills').all();
    res.json(bills);
  });

  app.post('/api/service_bills', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const newBill = {
      ...req.body,
      id: req.body.id || `SB-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    db.prepare('INSERT INTO service_bills (id, clientId, serviceType, amount, year, month, status, notes, createdAt) VALUES (@id, @clientId, @serviceType, @amount, @year, @month, @status, @notes, @createdAt)').run(newBill);
    res.status(201).json(newBill);
  });

  app.put('/api/service_bills/:id', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    const existingBill = db.prepare('SELECT * FROM service_bills WHERE id = ?').get(id) as any;
    if (!existingBill) return res.status(404).json({ error: 'Bill not found' });

    const updatedBill = { ...existingBill, ...req.body, id };
    
    // Set paidAmount to the bill amount if marking as Paid
    if (updatedBill.status === 'Paid' && existingBill.status !== 'Paid') {
      updatedBill.paidAmount = existingBill.amount;
    }

    db.prepare('UPDATE service_bills SET status = @status, notes = @notes, paidAmount = @paidAmount, paymentMonth = @paymentMonth, accountId = @accountId WHERE id = @id').run({
      ...updatedBill,
      paidAmount: updatedBill.paidAmount || 0,
      paymentMonth: updatedBill.paymentMonth || null,
      accountId: updatedBill.accountId || null
    });

    // Update account balance if status changed to Paid
    if (updatedBill.status === 'Paid' && existingBill.status !== 'Paid' && updatedBill.accountId) {
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(existingBill.amount, updatedBill.accountId);
    }

    res.json(updatedBill);
  });

  // Invoices
  app.get('/api/invoices', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    let query = 'SELECT * FROM invoices';
    let params: any[] = [];
    
    if (user.role === 'Client') {
      // Find client ID by user email
      const client = db.prepare('SELECT id FROM clients WHERE email = ?').get(user.email) as any;
      if (client) {
        query += ' WHERE clientId = ?';
        params.push(client.id);
      } else {
        return res.json([]);
      }
    }
    
    const invoices = db.prepare(query).all(...params);
    res.json(invoices);
  });

  app.post('/api/invoices', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = getUser(token);
    if (!user || user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const newInvoice = {
      ...req.body,
      id: `INV-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    db.prepare('INSERT INTO invoices (id, referenceId, type, clientId, amount, createdAt) VALUES (@id, @referenceId, @type, @clientId, @amount, @createdAt)').run(newInvoice);
    res.status(201).json(newInvoice);
  });

  // Dashboard Stats
  app.get('/api/dashboard-stats', (req, res) => {
    const totalOrders = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as any).count;
    const totalRevenueRow = db.prepare('SELECT SUM(totalAmount) as sum FROM orders').get() as any;
    const totalRevenue = totalRevenueRow.sum || 0;
    const pendingOrders = (db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = ?').get('Pending') as any).count;
    const completedOrders = (db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = ?').get('Dispatched') as any).count;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const clientsWithDomains = db.prepare("SELECT id, name, domainName, domainExpiryDate FROM clients WHERE domainExpiryDate IS NOT NULL AND domainExpiryDate != ''").all() as any[];
    
    const expiringDomains = clientsWithDomains.filter(client => {
      const expiryDate = new Date(client.domainExpiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
    }).map(client => {
      const expiryDate = new Date(client.domainExpiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...client,
        daysRemaining: diffDays
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);

    const allDomains = clientsWithDomains.map(client => {
      const expiryDate = new Date(client.domainExpiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...client,
        daysRemaining: diffDays
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);

    res.json({
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      expiringDomains,
      allDomains,
      revenueData: [
        { name: 'Jan', revenue: 4000 },
        { name: 'Feb', revenue: 3000 },
        { name: 'Mar', revenue: 2000 },
        { name: 'Apr', revenue: 2780 },
        { name: 'May', revenue: 1890 },
        { name: 'Jun', revenue: 2390 },
        { name: 'Jul', revenue: totalRevenue },
      ]
    });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
