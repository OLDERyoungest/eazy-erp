-- ERP System Database Schema

-- Users table (for roles and permissions)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名，支持中文',
  password VARCHAR(255) NOT NULL COMMENT '加密密码',
  role_name VARCHAR(50) NOT NULL COMMENT '角色名称：销售、技术、管理员',
  role_level INT NOT NULL COMMENT '权限等级：1=销售，2=技术，3=管理员',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (role_name),
  INDEX (role_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders table (device information)
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  -- Basic information
  salesperson VARCHAR(50) NOT NULL COMMENT '销售人员',
  installer VARCHAR(50) COMMENT '装机人员',
  expected_delivery DATE COMMENT '预计发货时间',
  device_name VARCHAR(100) NOT NULL COMMENT '设备名称',
  model VARCHAR(100) NOT NULL COMMENT '型号',
  quantity INT DEFAULT 1 COMMENT '数量',
  notes TEXT COMMENT '备注',

  -- Device details
  cpu VARCHAR(100) COMMENT 'CPU',
  motherboard VARCHAR(100) COMMENT '主板',
  memory VARCHAR(100) COMMENT '内存',
  gpu VARCHAR(100) COMMENT '显卡',
  cooler VARCHAR(100) COMMENT '散热器',
  system_disk VARCHAR(100) COMMENT '系统盘',
  storage_disk VARCHAR(100) COMMENT '存储盘',
  input_card VARCHAR(100) COMMENT '输入卡',
  output_card VARCHAR(100) COMMENT '输出卡',
  power_supply VARCHAR(100) COMMENT '电源',
  software VARCHAR(200) COMMENT '软件',
  software_sn VARCHAR(200) COMMENT '软件序列号',
  case_ VARCHAR(100) COMMENT '机箱',
  other TEXT COMMENT '其它',

  -- Technical approval fields
  system_name VARCHAR(100) COMMENT '系统名称，由技术人员填写',
  serial_number VARCHAR(100) COMMENT '产品序列号，自动生成或技术修改',

  -- Status and metadata
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '状态：待审批，已审批，已拒绝',
  created_by INT NOT NULL COMMENT '创建人用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (salesperson),
  INDEX (serial_number),
  INDEX (software_sn),
  INDEX (created_at),
  INDEX (status),
  INDEX (device_name),
  INDEX (model)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default users (password: 123456)
-- Admin: admin / 123456
-- Sales: sales / 123456
-- Tech: tech / 123456
INSERT INTO users (username, password, role_name, role_level) VALUES
('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6z2Xy', '管理员', 3),
('sales', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6z2Xy', '销售', 1),
('tech', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6z2Xy', '技术', 2);
-- Default password is 123456 for all default accounts
