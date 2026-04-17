const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'erp-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'erp'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
});

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role_name)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
};

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(400).json({ error: '用户名或密码错误' });

    const user = results[0];
    bcrypt.compare(password, user.password, (err, match) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!match) return res.status(400).json({ error: '用户名或密码错误' });

      const token = jwt.sign(
        { id: user.id, username: user.username, role_name: user.role_name, role_level: user.role_level },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role_name: user.role_name,
          role_level: user.role_level
        }
      });
    });
  });
});

// Change own password
app.post('/api/change-password', authenticateToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  const query = 'SELECT password FROM users WHERE id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    bcrypt.compare(oldPassword, results[0].password, (err, match) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!match) return res.status(400).json({ error: '原密码错误' });

      bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: err.message });

        const updateQuery = 'UPDATE users SET password = ? WHERE id = ?';
        db.query(updateQuery, [hash, userId], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: '密码修改成功' });
        });
      });
    });
  });
});

// ==================== USER MANAGEMENT (ADMIN ONLY) ====================

// Get all users
app.get('/api/users', authenticateToken, authorize('管理员'), (req, res) => {
  const query = 'SELECT id, username, role_name, role_level FROM users';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Create new user/role
app.post('/api/users', authenticateToken, authorize('管理员'), (req, res) => {
  const { username, password, role_name, role_level } = req.body;

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: err.message });

    const query = 'INSERT INTO users (username, password, role_name, role_level) VALUES (?, ?, ?, ?)';
    db.query(query, [username, hash, role_name, role_level], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, message: '用户创建成功' });
    });
  });
});

// Update user
app.put('/api/users/:id', authenticateToken, authorize('管理员'), (req, res) => {
  const { role_name, role_level } = req.body;
  const { id } = req.params;

  const query = 'UPDATE users SET role_name = ?, role_level = ? WHERE id = ?';
  db.query(query, [role_name, role_level, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '用户更新成功' });
  });
});

// Delete user
app.delete('/api/users/:id', authenticateToken, authorize('管理员'), (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM users WHERE id = ?';
  db.query(query, [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '用户删除成功' });
  });
});

// ==================== ORDERS MANAGEMENT ====================

// Get all orders (with filters)
app.get('/api/orders', authenticateToken, (req, res) => {
  const { salesperson, serial_number, software_sn, start_date, end_date } = req.query;
  let query = 'SELECT o.*, u.username as created_by_name FROM orders o LEFT JOIN users u ON o.created_by = u.id WHERE 1=1';
  const params = [];

  if (salesperson) {
    query += ' AND o.salesperson LIKE ?';
    params.push(`%${salesperson}%`);
  }
  if (serial_number) {
    query += ' AND o.serial_number LIKE ?';
    params.push(`%${serial_number}%`);
  }
  if (software_sn) {
    query += ' AND o.software_sn LIKE ?';
    params.push(`%${software_sn}%`);
  }
  if (start_date) {
    query += ' AND DATE(o.created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND DATE(o.created_at) <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY o.created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get single order
app.get('/api/orders/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM orders WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: '订单不存在' });
    res.json(results[0]);
  });
});

// Create new order (Sales can create)
app.post('/api/orders', authenticateToken, authorize('销售', '管理员'), (req, res) => {
  const {
    salesperson,
    installer,
    expected_delivery,
    device_name,
    model,
    quantity,
    notes,
    cpu,
    motherboard,
    memory,
    gpu,
    cooler,
    system_disk,
    storage_disk,
    input_card,
    output_card,
    power_supply,
    software,
    software_sn,
    case_,
    other
  } = req.body;

  // Validate required fields
  if (!salesperson || !device_name || !model) {
    return res.status(400).json({ error: '销售人员、设备名称和型号为必填项' });
  }

  // Generate serial number: YYYYMMDD + model + 3-digit sequence
  const datePrefix = moment().format('YYYYMMDD');
  const modelClean = model.replace(/\s+/g, '').toUpperCase();

  // Get next sequence number for today
  const seqQuery = 'SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()';
  db.query(seqQuery, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    const sequence = String(result[0].count + 1).padStart(3, '0');
    const serial_number = `${datePrefix}-${modelClean}-${sequence}`;

    const query = `INSERT INTO orders (
      salesperson, installer, expected_delivery, device_name, model, quantity, notes,
      cpu, motherboard, memory, gpu, cooler, system_disk, storage_disk,
      input_card, output_card, power_supply, software, software_sn, case_, other,
      serial_number, created_by, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      salesperson, installer, expected_delivery, device_name, model, quantity, notes,
      cpu, motherboard, memory, gpu, cooler, system_disk, storage_disk,
      input_card, output_card, power_supply, software, software_sn, case_, other,
      serial_number, req.user.id, 'pending'
    ];

    db.query(query, params, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, serial_number, message: '订单创建成功' });
    });
  });
});

// Update order (Tech/Admin can update, Sales can update pending)
app.put('/api/orders/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role_name;
  const {
    salesperson,
    installer,
    expected_delivery,
    device_name,
    model,
    quantity,
    notes,
    cpu,
    motherboard,
    memory,
    gpu,
    cooler,
    system_disk,
    storage_disk,
    input_card,
    output_card,
    power_supply,
    software,
    software_sn,
    case_,
    other,
    system_name,
    serial_number,
    status
  } = req.body;

  // Check permission
  const checkQuery = 'SELECT * FROM orders WHERE id = ?';
  db.query(checkQuery, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: '订单不存在' });

    const order = results[0];

    // Sales can only edit their own pending orders
    if (userRole === '销售') {
      if (order.created_by !== req.user.id || order.status !== 'pending') {
        return res.status(403).json({ error: '无权限修改此订单' });
      }
      // Sales cannot change system_name and serial_number
      if (salesperson && device_name && model) {
        const updateQuery = `UPDATE orders SET
          salesperson = ?, installer = ?, expected_delivery = ?, device_name = ?, model = ?,
          quantity = ?, notes = ?, cpu = ?, motherboard = ?, memory = ?, gpu = ?, cooler = ?,
          system_disk = ?, storage_disk = ?, input_card = ?, output_card = ?, power_supply = ?,
          software = ?, software_sn = ?, case_ = ?, other = ?
          WHERE id = ?`;

        const params = [
          salesperson, installer, expected_delivery, device_name, model,
          quantity, notes, cpu, motherboard, memory, gpu, cooler,
          system_disk, storage_disk, input_card, output_card, power_supply,
          software, software_sn, case_, other, id
        ];

        db.query(updateQuery, params, (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: '订单更新成功' });
        });
      } else {
        return res.status(400).json({ error: '销售人员、设备名称和型号为必填项' });
      }
    } else if (userRole === '技术' || userRole === '管理员') {
      // Tech/Admin can update everything including system_name and serial_number
      const updateQuery = `UPDATE orders SET
        salesperson = ?, installer = ?, expected_delivery = ?, device_name = ?, model = ?,
        quantity = ?, notes = ?, cpu = ?, motherboard = ?, memory = ?, gpu = ?, cooler = ?,
        system_disk = ?, storage_disk = ?, input_card = ?, output_card = ?, power_supply = ?,
        software = ?, software_sn = ?, case_ = ?, other = ?, system_name = ?, serial_number = ?, status = ?
        WHERE id = ?`;

      const params = [
        salesperson, installer, expected_delivery, device_name, model,
        quantity, notes, cpu, motherboard, memory, gpu, cooler,
        system_disk, storage_disk, input_card, output_card, power_supply,
        software, software_sn, case_, other, system_name, serial_number, status || order.status, id
      ];

      db.query(updateQuery, params, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '订单更新成功' });
      });
    }
  });
});

// Delete order (Admin only)
app.delete('/api/orders/:id', authenticateToken, authorize('管理员'), (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM orders WHERE id = ?';
  db.query(query, [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '订单删除成功' });
  });
});

// ==================== BACKUP/IMPORT ====================

// Export backup (Admin only)
app.get('/api/backup', authenticateToken, authorize('管理员'), (req, res) => {
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = moment().format('YYYYMMDD_HHmmss');
  const filename = `erp_backup_${timestamp}.json`;
  const filepath = path.join(backupDir, filename);

  // Get all data
  const userQuery = 'SELECT id, username, role_name, role_level FROM users';
  db.query(userQuery, (err, users) => {
    if (err) return res.status(500).json({ error: err.message });

    const orderQuery = 'SELECT * FROM orders';
    db.query(orderQuery, (err, orders) => {
      if (err) return res.status(500).json({ error: err.message });

      // Convert Date objects to MySQL datetime string format
      const processedOrders = orders.map(order => {
        const processed = {...order};
        // Convert any Date objects to MySQL datetime format
        ['created_at', 'updated_at', 'expected_delivery'].forEach(field => {
          if (processed[field] && processed[field] instanceof Date) {
            processed[field] = processed[field].toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
          }
        });
        return processed;
      });

      const backup = {
        version: '1.0',
        timestamp: timestamp,
        users: users,
        orders: processedOrders
      };

      fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(500).json({ error: err.message });
        }
      });
    });
  });
});

// Import backup (Admin only)
app.post('/api/import', authenticateToken, authorize('管理员'), (req, res) => {
  const backupData = req.body;

  if (!backupData || !backupData.orders) {
    return res.status(400).json({ error: '无效的备份文件' });
  }

  // Start transaction
  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    try {
      // Clear existing data
      db.query('DELETE FROM orders', (err) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ error: err.message });
          });
        }

        // Insert orders
        if (backupData.orders.length > 0) {
          let completed = 0;
          backupData.orders.forEach(order => {
            const fields = Object.keys(order).filter(k => k !== 'id');
            const placeholders = fields.map(() => '?').join(', ');
            const values = fields.map(f => {
              // Convert ISO date format to MySQL datetime format
              if ((f === 'created_at' || f === 'updated_at' || f === 'expected_delivery') && order[f]) {
                if (typeof order[f] === 'string' && order[f].includes('T')) {
                  return order[f].replace('T', ' ').replace(/\.\d+Z$/, '');
                }
              }
              return order[f];
            });

            db.query(`INSERT INTO orders (${fields.join(', ')}) VALUES (${placeholders})`, values, (err) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ error: err.message });
                });
              }
              completed++;
              if (completed === backupData.orders.length) {
                db.commit((err) => {
                  if (err) {
                    return db.rollback(() => {
                      res.status(500).json({ error: err.message });
                    });
                  }
                  res.json({ message: `导入成功，共导入 ${completed} 条订单数据` });
                });
              }
            });
          });
        } else {
          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ error: err.message });
              });
            }
            res.json({ message: '导入完成' });
          });
        }
      });
    } catch (error) {
      db.rollback();
      res.status(500).json({ error: error.message });
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ERP Server running on http://0.0.0.0:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://<your-ip>:${PORT}`);
});

module.exports = app;
