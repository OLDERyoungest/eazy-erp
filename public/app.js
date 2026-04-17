// ERP System Frontend
class ERPSystem {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    this.currentOrderId = null;
    this.init();
  }

  init() {
    this.bindEvents();
    if (this.token && this.user) {
      this.showMainScreen();
      if (this.user.role_name === '管理员') {
        const adminMenu = document.getElementById('admin-menu-item');
        const adminBackup = document.getElementById('admin-backup-item');
        if (adminMenu) adminMenu.style.display = 'block';
        if (adminBackup) adminBackup.style.display = 'block';
      }
      this.loadOrders();
    } else {
      this.showLoginScreen();
    }
  }

  bindEvents() {
    // Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.login();
      });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        this.switchView(view);
      });
    });

    // Search
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        this.loadOrders();
      });
    }

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }

    // New order form
    const newOrderForm = document.getElementById('new-order-form');
    if (newOrderForm) {
      newOrderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createOrder();
      });
    }

    // Modal close
    document.querySelectorAll('.close, .close-modal').forEach(el => {
      el.addEventListener('click', () => {
        this.closeModal();
      });
    });

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    });

    // Change password
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', () => {
        this.openChangePasswordModal();
      });
    }

    const savePassword = document.getElementById('save-password');
    if (savePassword) {
      savePassword.addEventListener('click', () => {
        this.changePassword();
      });
    }

    // Save order edit
    const saveOrderEdit = document.getElementById('save-order-edit');
    if (saveOrderEdit) {
      saveOrderEdit.addEventListener('click', () => {
        this.saveOrderEdit();
      });
    }

    // Add user
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
      addUserBtn.addEventListener('click', () => {
        this.openAddUserModal();
      });
    }

    const saveUser = document.getElementById('save-user');
    if (saveUser) {
      saveUser.addEventListener('click', () => {
        this.saveUser();
      });
    }

    // Backup/Import
    const exportBackupBtn = document.getElementById('export-backup-btn');
    if (exportBackupBtn) {
      exportBackupBtn.addEventListener('click', () => {
        this.exportBackup();
      });
    }

    const importBackupBtn = document.getElementById('import-backup-btn');
    if (importBackupBtn) {
      importBackupBtn.addEventListener('click', () => {
        this.importBackup();
      });
    }

    // Table import
    const importTableBtn = document.getElementById('import-table-btn');
    if (importTableBtn) {
      importTableBtn.addEventListener('click', () => {
        this.openImportTableModal();
      });
    }

    const pasteFillBtn = document.getElementById('paste-fill-btn');
    if (pasteFillBtn) {
      pasteFillBtn.addEventListener('click', () => {
        this.pasteFillForm();
      });
    }

    const btnPasteParse = document.getElementById('btn-paste-parse');
    if (btnPasteParse) {
      btnPasteParse.addEventListener('click', () => {
        this.parsePasteData();
      });
    }

    const btnFileParse = document.getElementById('btn-file-parse');
    if (btnFileParse) {
      btnFileParse.addEventListener('click', () => {
        this.parseFileData();
      });
    }

    const confirmImport = document.getElementById('confirm-import');
    if (confirmImport) {
      confirmImport.addEventListener('click', () => {
        this.confirmImport();
      });
    }

    const cancelImport = document.getElementById('cancel-import');
    if (cancelImport) {
      cancelImport.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // QR code button delegation
    document.body.addEventListener('click', (e) => {
      if (e.target.classList.contains('qr-btn')) {
        const sn = e.target.getAttribute('data-sn');
        if (sn) {
          this.copyAndGenerateQr(sn);
        }
      }
    });
  }

  // API request helper
  async apiRequest(url, method = 'GET', body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (this.token) {
      options.headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok) {
        // If token is invalid/expired, auto logout
        if (response.status === 401 || response.status === 403) {
          this.logout();
          return;
        }
        throw new Error(data.error || '请求失败');
      }
      return data;
    } catch (error) {
      if (error.message.includes('Failed to fetch')) {
        alert('网络连接失败，请检查服务器是否启动');
      } else {
        alert(error.message);
      }
      throw error;
    }
  }

  // Login
  async login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      const data = await this.apiRequest('/api/login', 'POST', { username, password });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Force screen switch
      document.getElementById('login-screen').classList.remove('active');
      document.getElementById('main-screen').classList.add('active');

      const userInfo = document.getElementById('current-user');
      if (userInfo) {
        userInfo.textContent = `${this.user.username} (${this.user.role_name})`;
      }

      if (this.user.role_name === '管理员') {
        const adminMenu = document.getElementById('admin-menu-item');
        const adminBackup = document.getElementById('admin-backup-item');
        if (adminMenu) adminMenu.style.display = 'block';
        if (adminBackup) adminBackup.style.display = 'block';
      }

      this.loadOrders();
    } catch (error) {
      console.error('Login error:', error);
      // Handled by apiRequest
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token = null;
    this.user = null;
    this.showLoginScreen();
  }

  showLoginScreen() {
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('main-screen').classList.remove('active');
  }

  showMainScreen() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    document.getElementById('current-user').textContent = `${this.user.username} (${this.user.role_name})`;
  }

  switchView(viewName) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });

    document.querySelector(`.nav-link[data-view="${viewName}"]`).classList.add('active');
    document.getElementById(`${viewName}-view`).classList.add('active');

    if (viewName === 'orders') {
      this.loadOrders();
    } else if (viewName === 'users') {
      this.loadUsers();
    }
  }

  resetFilters() {
    document.getElementById('filter-salesperson').value = '';
    document.getElementById('filter-serial').value = '';
    document.getElementById('filter-software-sn').value = '';
    document.getElementById('filter-start').value = '';
    document.getElementById('filter-end').value = '';
    this.loadOrders();
  }

  async loadOrders() {
    const params = new URLSearchParams();
    const salesperson = document.getElementById('filter-salesperson').value;
    const serial = document.getElementById('filter-serial').value;
    const softwareSn = document.getElementById('filter-software-sn').value;
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;

    if (salesperson) params.append('salesperson', salesperson);
    if (serial) params.append('serial_number', serial);
    if (softwareSn) params.append('software_sn', softwareSn);
    if (start) params.append('start_date', start);
    if (end) params.append('end_date', end);

    try {
      const orders = await this.apiRequest(`/api/orders?${params.toString()}`);
      this.renderOrders(orders);
    } catch (error) {
      // Handled by apiRequest
    }
  }

  renderOrders(orders) {
    const tbody = document.getElementById('orders-table-body');
    const noData = document.getElementById('no-data');

    if (orders.length === 0) {
      tbody.innerHTML = '';
      noData.classList.add('show');
      return;
    }

    noData.classList.remove('show');
    tbody.innerHTML = orders.map(order => {
      const statusMap = {
        pending: '<span class="badge badge-pending">待审批</span>',
        approved: '<span class="badge badge-approved">已审批</span>',
        rejected: '<span class="badge badge-rejected">已拒绝</span>'
      };

      const canEdit = this.user.role_name === '管理员' ||
                     this.user.role_name === '技术' ||
                     (this.user.role_name === '销售' && order.status === 'pending' && order.created_by === this.user.id);

      const canDelete = this.user.role_name === '管理员';

      let actions = '';
      if (canEdit) {
        actions += `<button class="action-btn" onclick="app.openOrderDetail(${order.id})">查看/编辑</button>`;
      }
      if (canDelete) {
        actions += `<button class="action-btn delete" onclick="app.deleteOrder(${order.id})">删除</button>`;
      }

      return `
        <tr>
          <td>${order.id}</td>
          <td>${order.salesperson}</td>
          <td>${order.device_name}</td>
          <td>${order.model}</td>
          <td>${order.serial_number || '-'}</td>
          <td>${statusMap[order.status]}</td>
          <td>${new Date(order.created_at).toLocaleString('zh-CN')}</td>
          <td>${actions}</td>
        </tr>
      `;
    }).join('');
  }

  async createOrder() {
    const form = document.getElementById('new-order-form');
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value || null;
    });
    if (data.quantity) {
      data.quantity = parseInt(data.quantity);
    }

    // Validate required fields
    if (!data.salesperson || !data.device_name || !data.model) {
      alert('销售人员、设备名称和型号为必填项！');
      return;
    }

    try {
      const result = await this.apiRequest('/api/orders', 'POST', data);
      alert(`订单创建成功！自动生成序列号：${result.serial_number}`);
      form.reset();
      this.switchView('orders');
      this.loadOrders();
    } catch (error) {
      // Handled by apiRequest
    }
  }

  async openOrderDetail(orderId) {
    this.currentOrderId = orderId;
    try {
      const order = await this.apiRequest(`/api/orders/${orderId}`);
      this.renderOrderDetail(order);
      this.openModal('order-modal');
    } catch (error) {
      // Handled by apiRequest
    }
  }

  renderOrderDetail(order) {
    const canEdit = this.user.role_name === '管理员' || this.user.role_name === '技术';
    const isSales = this.user.role_name === '销售';

    const statusOptions = {
      pending: '待审批',
      approved: '已审批',
      rejected: '已拒绝'
    };

    let html = `
      <div class="detail-section">
        <h4>基本信息</h4>
        <div class="detail-grid">
          <div class="detail-row">
            <div class="detail-label">销售人员：</div>
            <div class="detail-value"><input type="text" name="salesperson" value="${order.salesperson || ''}" ${isSales ? '' : 'readonly'}></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">装机人员：</div>
            <div class="detail-value"><input type="text" name="installer" value="${order.installer || ''}"></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">预计发货时间：</div>
            <div class="detail-value"><input type="date" name="expected_delivery" value="${order.expected_delivery || ''}"></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">设备名称：</div>
            <div class="detail-value"><input type="text" name="device_name" value="${order.device_name || ''}" ${isSales ? '' : 'readonly'}></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">型号：</div>
            <div class="detail-value"><input type="text" name="model" value="${order.model || ''}" ${isSales ? '' : 'readonly'}></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">数量：</div>
            <div class="detail-value"><input type="number" name="quantity" value="${order.quantity || 1}" min="1"></div>
          </div>
          <div class="detail-row" style="grid-column: 1 / -1;">
            <div class="detail-label">备注：</div>
            <div class="detail-value"><textarea name="notes" rows="2">${order.notes || ''}</textarea></div>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>设备配置</h4>
        <div class="detail-grid">
          <div class="detail-row">
            <div class="detail-label">CPU：</div>
            <div class="detail-value"><input type="text" name="cpu" value="${order.cpu || ''}"></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">主板：</div>
            <div class="detail-value"><input type="text" name="motherboard" value="${order.motherboard || ''}"></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">内存：</div>
            <div class="detail-value"><input type="text" name="memory" value="${order.memory || ''}"></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">显卡：</div>
            <div class="detail-value"><input type="text" name="gpu" value="${order.gpu || ''}"></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">散热器：</div>
            <div class="detail-value"><input type="text" name="cooler" value="${order.cooler || ''}"></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">系统盘：</div>
            <div class="detail-value"><input type="text" name="system_disk" value="${order.system_disk || ''}"></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">存储盘：</div>
            <div class="detail-value"><input type="text" name="storage_disk" value="${order.storage_disk || ''}"></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">输入卡：</div>
            <div class="detail-value"><input type="text" name="input_card" value="${order.input_card || ''}"></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">输出卡：</div>
            <div class="detail-value"><input type="text" name="output_card" value="${order.output_card || ''}"></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">电源：</div>
            <div class="detail-value"><input type="text" name="power_supply" value="${order.power_supply || ''}"></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">软件：</div>
            <div class="detail-value"><input type="text" name="software" value="${order.software || ''}"></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">软件序列号：</div>
            <div class="detail-value"><input type="text" name="software_sn" value="${order.software_sn || ''}"></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">机箱：</div>
            <div class="detail-value"><input type="text" name="case" value="${order.case || ''}"></div>
          </div>
          <div class="detail-row" style="grid-column: 1 / -1;">
            <div class="detail-label">其它：</div>
            <div class="detail-value"><textarea name="other" rows="2">${order.other || ''}</textarea></div>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>审批信息${!canEdit ? '（只读）' : ''}</h4>
        <div class="detail-grid">
          <div class="detail-row">
            <div class="detail-label">自动生成序列号：</div>
            <div class="detail-value" style="display: flex; gap: 10px; align-items: center;">
              <input type="text" name="serial_number" value="${order.serial_number || ''}" ${canEdit ? '' : 'readonly'} style="flex: 1;">
              ${order.serial_number ? `<button class="btn btn-primary btn-sm qr-btn" data-sn="${order.serial_number.replace(/"/g, '&quot;')}">生成二维码</button>` : ''}
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-label">系统名称：</div>
            <div class="detail-value"><input type="text" name="system_name" value="${order.system_name || ''}" ${canEdit ? '' : 'readonly'}></div>
          </div>
          ${canEdit ? `
            <div class="detail-row">
              <div class="detail-label">状态：</div>
              <div class="detail-value">
                <select name="status">
                  <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>待审批</option>
                  <option value="approved" ${order.status === 'approved' ? 'selected' : ''}>已审批</option>
                  <option value="rejected" ${order.status === 'rejected' ? 'selected' : ''}>已拒绝</option>
                </select>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      ${order.status === 'approved' ? `
        <div class="detail-section" style="margin-top: 20px;">
          <div style="text-align: center;">
            <button class="btn btn-primary btn-lg" onclick="app.downloadShippingList(${order.id})">下载发货清单</button>
            <p style="color: #666; font-size: 12px; margin-top: 8px;">只有审批通过的订单可以下载发货清单</p>
          </div>
        </div>
      ` : ''}
    `;

    document.getElementById('order-modal-body').innerHTML = html;
  }

  async saveOrderEdit() {
    if (!this.currentOrderId) return;

    const data = {};
    document.querySelectorAll('#order-modal-body input, #order-modal-body select, #order-modal-body textarea').forEach(input => {
      if (input.name) {
        data[input.name] = input.value || null;
        if (input.name === 'quantity') {
          data[input.name] = parseInt(input.value) || 1;
        }
      }
    });

    // Validate required fields
    if (!data.salesperson || !data.device_name || !data.model) {
      alert('销售人员、设备名称和型号为必填项！');
      return;
    }

    try {
      await this.apiRequest(`/api/orders/${this.currentOrderId}`, 'PUT', data);
      alert('订单更新成功！');
      this.closeModal();
      this.loadOrders();
    } catch (error) {
      // Handled by apiRequest
    }
  }

  async deleteOrder(orderId) {
    if (!confirm('确定要删除这个订单吗？此操作不可撤销。')) return;

    try {
      await this.apiRequest(`/api/orders/${orderId}`, 'DELETE');
      this.loadOrders();
    } catch (error) {
      // Handled by apiRequest
    }
  }

  // Users management
  async loadUsers() {
    if (this.user.role_name !== '管理员') return;

    try {
      const users = await this.apiRequest('/api/users');
      this.renderUsers(users);
    } catch (error) {
      // Handled by apiRequest
    }
  }

  renderUsers(users) {
    const tbody = document.getElementById('users-table-body');
    const noData = document.getElementById('no-users-data');

    if (users.length === 0) {
      tbody.innerHTML = '';
      noData.classList.add('show');
      return;
    }

    noData.classList.remove('show');
    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.role_name}</td>
        <td>${user.role_level}</td>
        <td>
          <button class="action-btn" onclick="app.editUser(${user.id}, '${user.username}', '${user.role_name}', ${user.role_level})">编辑</button>
          <button class="action-btn delete" onclick="app.deleteUser(${user.id})">删除</button>
        </td>
      </tr>
    `).join('');
  }

  openAddUserModal() {
    document.getElementById('user-modal-title').textContent = '新增用户';
    document.getElementById('user-id').value = '';
    document.getElementById('user-username').value = '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-role-name').value = '';
    document.getElementById('user-role-level').value = '1';
    this.openModal('user-modal');
  }

  editUser(id, username, roleName, roleLevel) {
    document.getElementById('user-modal-title').textContent = '编辑用户';
    document.getElementById('user-id').value = id;
    document.getElementById('user-username').value = username;
    document.getElementById('user-password').value = '';
    document.getElementById('user-role-name').value = roleName;
    document.getElementById('user-role-level').value = roleLevel;
    this.openModal('user-modal');
  }

  async saveUser() {
    const id = document.getElementById('user-id').value;
    const username = document.getElementById('user-username').value;
    const password = document.getElementById('user-password').value;
    const role_name = document.getElementById('user-role-name').value;
    const role_level = parseInt(document.getElementById('user-role-level').value);

    if (!username || !role_name) {
      alert('用户名和角色名称为必填项');
      return;
    }

    if (!id && !password) {
      alert('新增用户必须设置密码');
      return;
    }

    try {
      if (id) {
        await this.apiRequest(`/api/users/${id}`, 'PUT', { role_name, role_level });
        alert('用户更新成功');
      } else {
        await this.apiRequest('/api/users', 'POST', { username, password, role_name, role_level });
        alert('用户创建成功');
      }
      this.closeModal();
      this.loadUsers();
    } catch (error) {
      // Handled by apiRequest
    }
  }

  async deleteUser(id) {
    if (!confirm('确定要删除这个用户吗？')) return;

    try {
      await this.apiRequest(`/api/users/${id}`, 'DELETE');
      this.loadUsers();
    } catch (error) {
      // Handled by apiRequest
    }
  }

  // Change password
  openChangePasswordModal() {
    document.getElementById('old-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    this.openModal('password-modal');
  }

  async changePassword() {
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
      alert('两次输入的新密码不一致！');
      return;
    }

    if (newPassword.length < 6) {
      alert('新密码长度至少6位');
      return;
    }

    try {
      await this.apiRequest('/api/change-password', 'POST', {
        oldPassword,
        newPassword
      });
      alert('密码修改成功，请重新登录');
      this.closeModal();
      this.logout();
    } catch (error) {
      // Handled by apiRequest
    }
  }

  // Backup and import
  async exportBackup() {
    try {
      const response = await fetch('/api/backup', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = response.headers.get('Content-Disposition')?.split('filename=')[1] || `erp_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.download = filename.replace(/"/g, '');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message);
    }
  }

  async importBackup() {
    const fileInput = document.getElementById('import-file');
    if (!fileInput.files || fileInput.files.length === 0) {
      alert('请选择备份文件');
      return;
    }

    if (!confirm('警告：导入会覆盖当前所有订单数据！确定要继续吗？')) {
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        const result = await this.apiRequest('/api/import', 'POST', backupData);
        alert(result.message);
        this.loadOrders();
      } catch (error) {
        // Handled by apiRequest
      }
    };

    reader.readAsText(file);
  }

  // Modal helpers
  openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
  }

  closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('show');
    });
    this.currentOrderId = null;
  }

  // Copy serial number and open QR code generator
  copyAndGenerateQr(serialNumber) {
    navigator.clipboard.writeText(serialNumber).then(() => {
      // Open QR code generator in new tab
      const url = `https://www.qr-code-generator.com/?q=${encodeURIComponent(serialNumber)}`;
      window.open(url, '_blank');
    }).catch(err => {
      // Fallback if clipboard fails
      const url = `https://www.qr-code-generator.com/?q=${encodeURIComponent(serialNumber)}`;
      window.open(url, '_blank');
    });
  }

  // Paste one row from table and fill the device configuration fields only
  // Basic info (salesperson, device_name, model, etc.) are filled manually by user
  // Only fill the device configuration details starting from CPU
  pasteFillForm() {
    // Get text from user input via popup (compatible with HTTP/non-HTTPS)
    const text = prompt('请粘贴从Excel复制的一行设备配置数据：');
    if (!text || !text.trim()) {
      return;
    }

    // Split into cells (handle tab separated from Excel copy)
    let cells;
    if (text.includes('\t')) {
      cells = text.split('\t');
    } else {
      cells = text.split(',');
    }
    cells = cells.map(c => c.trim());

    // Field mapping - only device configuration
    // Order: CPU, 主板, 内存, 显卡, 散热器, 系统盘, 存储盘, 输入卡, 输出卡, 电源, 软件, 软件序列号, 机箱, 其它, 系统名称
    const fieldMap = [
      'cpu', 'motherboard', 'memory', 'gpu', 'cooler', 'system_disk', 'storage_disk',
      'input_card', 'output_card', 'power_supply', 'software', 'software_sn', 'case', 'other', 'system_name'
    ];

    // Fill each field
    let filledCount = 0;
    fieldMap.forEach((name, index) => {
      const input = document.querySelector(`#new-order-form [name="${name}"]`);
      if (input && cells[index] !== undefined) {
        input.value = cells[index] || '';
        if (cells[index]) filledCount++;
      }
    });

    alert(`填充完成！共填充 ${filledCount} 个配置字段。`);
  }

  // Table import - open modal
  openImportTableModal() {
    this.importData = [];
    this.openModal('import-table-modal');
  }

  // Parse pasted data from Excel
  parsePasteData() {
    const text = document.getElementById('paste-data').value.trim();
    if (!text) {
      alert('请粘贴表格数据');
      return;
    }
    this.parseTableText(text);
  }

  // Parse CSV or Excel file
  parseFileData() {
    const fileInput = document.getElementById('csv-file');
    if (!fileInput.files || fileInput.files.length === 0) {
      alert('请选择文件');
      return;
    }
    const file = fileInput.files[0];
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'xls' || ext === 'xlsx') {
      // Parse Excel file using SheetJS
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        // Convert to array of arrays
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        // Convert to text format (tab separated)
        const text = json.map(row => row.join('\t')).join('\n');
        this.parseTableText(text);
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Parse CSV/txt file
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        this.parseTableText(text);
      };
      reader.readAsText(file);
    }
  }

  // Parse table text (handle both pasted and CSV)
  parseTableText(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
      alert('没有找到数据');
      return;
    }

    // Column mapping: expected order
    // 0:销售人员, 1:装机人员, 2:预计发货时间, 3:设备名称, 4:型号, 5:数量, 6:备注, 7:CPU, 8:主板, 9:内存, 10:显卡, 11:散热器, 12:系统盘, 13:存储盘, 14:输入卡, 15:输出卡, 16:电源, 17:软件, 18:软件序列号, 19:机箱, 20:其它, 21:系统名称
    this.importData = [];
    const errors = [];

    lines.forEach((line, index) => {
      // Split by tab or comma, handle quoted cells
      let cells;
      if (line.includes('\t')) {
        cells = line.split('\t');
      } else {
        // Handle CSV - simple split, doesn't handle commas inside quotes perfectly but good enough
        cells = line.split(',').map(cell => cell.replace(/^"|"$/g, '').trim());
      }

      cells = cells.map(c => c.trim());

      const salesperson = cells[0];
      const device_name = cells[3];
      const model = cells[4];

      if (!salesperson || !device_name || !model) {
        // Skip header row if it's the first line or contains header keywords
        const hasHeaderKeyword = line.toLowerCase().includes('销售') || line.toLowerCase().includes('设备') || line.toLowerCase().includes('型号') || line.toLowerCase().includes('软件');
        if (index === 0 || hasHeaderKeyword) {
          // Skip header row
          return;
        }
        errors.push(`第${index + 1}行：缺少必填项（销售人员、设备名称、型号），已跳过`);
        return;
      }

      const order = {
        salesperson: cells[0] || null,
        installer: cells[1] || null,
        expected_delivery: cells[2] || null,
        device_name: cells[3] || null,
        model: cells[4] || null,
        quantity: cells[5] ? parseInt(cells[5]) : 1,
        notes: cells[6] || null,
        cpu: cells[7] || null,
        motherboard: cells[8] || null,
        memory: cells[9] || null,
        gpu: cells[10] || null,
        cooler: cells[11] || null,
        system_disk: cells[12] || null,
        storage_disk: cells[13] || null,
        input_card: cells[14] || null,
        output_card: cells[15] || null,
        power_supply: cells[16] || null,
        software: cells[17] || null,
        software_sn: cells[18] || null,
        case_: cells[19] || null,
        other: cells[20] || null,
        system_name: cells[21] || null
      };

      this.importData.push(order);
    });

    this.renderPreview();

    if (errors.length > 0) {
      alert(`解析完成，但有${errors.length}个错误:\n${errors.join('\n')}`);
    }

    if (this.importData.length === 0) {
      alert('没有成功解析出任何订单，请检查格式');
    }
  }

  // Render preview
  renderPreview() {
    const tbody = document.getElementById('preview-table-body');
    const countEl = document.getElementById('preview-count');
    const importBtn = document.getElementById('confirm-import');
    const importCount = document.getElementById('import-count');

    countEl.textContent = this.importData.length;
    importCount.textContent = this.importData.length;

    if (this.importData.length === 0) {
      tbody.innerHTML = '';
      importBtn.disabled = true;
      return;
    }

    importBtn.disabled = false;

    tbody.innerHTML = this.importData.map((order, index) => {
      const isValid = order.salesperson && order.device_name && order.model;
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${order.salesperson || '-'}</td>
          <td>${order.device_name || '-'}</td>
          <td>${order.model || '-'}</td>
          <td>${isValid ? '<span style="color: green;">✓ 有效</span>' : '<span style="color: red;">✗ 缺少必填项</span>'}</td>
        </tr>
      `;
    }).join('');
  }

  // Confirm and import all
  async confirmImport() {
    if (!this.importData || this.importData.length === 0) {
      alert('没有可导入的数据');
      return;
    }

    const validCount = this.importData.filter(o => o.salesperson && o.device_name && o.model).length;
    if (!confirm(`确定要导入 ${validCount} 条订单吗？此操作不可撤销。`)) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const order of this.importData) {
      if (!order.salesperson || !order.device_name || !order.model) {
        errorCount++;
        continue;
      }
      try {
        await this.apiRequest('/api/orders', 'POST', order);
        successCount++;
      } catch (err) {
        errorCount++;
      }
    }

    alert(`导入完成：成功 ${successCount} 条，失败 ${errorCount} 条`);
    this.closeModal();
    this.loadOrders();
  }

  // Download shipping list (only for approved orders)
  async downloadShippingList(orderId) {
    try {
      const order = await this.apiRequest(`/api/orders/${orderId}`);

      if (order.status !== 'approved') {
        alert('只有审批通过的订单才能下载发货清单！');
        return;
      }

      // Collect accessories (non-empty configuration items)
      const accessories = [];
      const accessoryMap = [
        { key: 'case_', name: '机箱' },
        { key: 'cpu', name: 'cpu' },
        { key: 'motherboard', name: '主板' },
        { key: 'memory', name: '内存' },
        { key: 'gpu', name: '显卡' },
        { key: 'cooler', name: '风扇' },
        { key: 'system_disk', name: '硬盘' },
        { key: 'storage_disk', name: '素材盘' },
        { key: 'input_card', name: '输入卡' },
        { key: 'output_card', name: '输出卡' },
        { key: 'power_supply', name: '电源' },
        { key: 'software', name: '软件' },
        { key: 'other', name: '其它' }
      ];

      accessoryMap.forEach(item => {
        const value = order[item.key];
        if (value && value.trim()) {
          accessories.push({
            name: item.name,
            spec: value.trim(),
            unit: this.getUnitByType(item.name),
            quantity: 1
          });
        }
      });

      // Generate HTML content
      const html = this.generateShippingListHtml(order, accessories);

      // Create and download
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `发货清单_${order.id}_${order.device_name.replace(/\s+/g, '_')}.html`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      // Handled by apiRequest
    }
  }

  // Get appropriate unit by type
  getUnitByType(name) {
    const unitMap = {
      '机箱': '个',
      'cpu': '颗',
      '主板': '个',
      '内存': '条',
      '显卡': '块',
      '风扇': '个',
      '硬盘': '块',
      '素材盘': '块',
      '输入卡': '块',
      '输出卡': '块',
      '电源': '个',
      '软件': '套',
      '其它': ''
    };
    return unitMap[name] || '个';
  }

  // Generate shipping list HTML
  generateShippingListHtml(order, accessories) {
    const date = new Date().toLocaleDateString('zh-CN');
    const quantity = order.quantity || 1;

    let accessoriesHtml = accessories.map((acc, index) => `
      <tr>
        <td style="border: 1px solid #000; padding: 8px 12px; text-align: center;">${index + 1}</td>
        <td style="border: 1px solid #000; padding: 8px 12px;">${acc.name}</td>
        <td style="border: 1px solid #000; padding: 8px 12px;">${acc.spec}</td>
        <td style="border: 1px solid #000; padding: 8px 12px; text-align: center;">${acc.unit}</td>
        <td style="border: 1px solid #000; padding: 8px 12px; text-align: right;">${acc.quantity}.00</td>
        <td style="border: 1px solid #000; padding: 8px 12px; text-align: right;">${acc.quantity}.00</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>天影视通产品发货清单</title>
  <style>
    body { font-family: "SimHei", "Microsoft YaHei", sans-serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .date { text-align: right; font-size: 14px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background-color: #f0f0f0; }
    .info-table td { border: 1px solid #000; padding: 10px 12px; }
    .accessory-table th { border: 1px solid #000; padding: 10px 12px; text-align: center; }
    @media print { @page { size: A4; margin: 1cm; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>天影视通产品发货清单</h1>
  </div>
  <div class="date">生成日期：${date}</div>

  <table class="info-table">
    <thead>
      <tr>
        <th style="border: 1px solid #000; padding: 10px 12px; width: 60px;">序号</th>
        <th style="border: 1px solid #000; padding: 10px 12px;">设备名称</th>
        <th style="border: 1px solid #000; padding: 10px 12px;">品牌/型号</th>
        <th style="border: 1px solid #000; padding: 10px 12px; width: 80px;">数量</th>
        <th style="border: 1px solid #000; padding: 10px 12px; width: 120px;">销售人员</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 10px 12px; text-align: center;">1</td>
        <td style="border: 1px solid #000; padding: 10px 12px;">${order.device_name}</td>
        <td style="border: 1px solid #000; padding: 10px 12px;">${order.model}</td>
        <td style="border: 1px solid #000; padding: 10px 12px; text-align: center;">${quantity}</td>
        <td style="border: 1px solid #000; padding: 10px 12px;">${order.salesperson}</td>
      </tr>
    </tbody>
  </table>

  <h3 style="margin-top: 30px; margin-bottom: 15px;">附件：</h3>
  <table class="accessory-table">
    <thead>
      <tr>
        <th style="width: 50px;">序号</th>
        <th style="width: 100px;">名称</th>
        <th>规格</th>
        <th style="width: 60px;">单位</th>
        <th style="width: 80px;">数量</th>
        <th style="width: 100px;">需采购数量</th>
      </tr>
    </thead>
    <tbody>
${accessoriesHtml}
    </tbody>
  </table>

  <div style="margin-top: 40px;">
    <table style="border: none; width: 300px; margin-left: auto;">
      <tr>
        <td style="border: none; padding: 5px;">审核：</td>
        <td style="border: none; padding: 5px;">__________</td>
      </tr>
      <tr>
        <td style="border: none; padding: 5px;">发货：</td>
        <td style="border: none; padding: 5px;">__________</td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  }
}

// Initialize app after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ERPSystem();
});
