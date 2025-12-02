-- Minimal tables for Invoicez backend (MySQL 8)
-- Run as a privileged user (root/DBA) in the target schema (invoicez_db).

USE invoicez_db;

CREATE TABLE IF NOT EXISTS Clients (
  ClientID BIGINT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(255) NOT NULL,
  Contact VARCHAR(255) NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Staff (
  StaffID BIGINT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(255) NOT NULL,
  NIM VARCHAR(100) UNIQUE,
  Role VARCHAR(255),
  Type VARCHAR(100),
  Contact VARCHAR(255),
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Products (
  ProductID BIGINT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(255) NOT NULL,
  Description TEXT NULL,
  UnitPrice DECIMAL(12,2) NOT NULL DEFAULT 0,
  Category VARCHAR(100) NULL,
  Type VARCHAR(100) NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Invoices (
  InvoiceID BIGINT AUTO_INCREMENT PRIMARY KEY,
  InvoiceCode VARCHAR(255) NOT NULL UNIQUE,
  InvoiceType VARCHAR(100) NOT NULL,
  InvoiceDate DATE NOT NULL,
  ClientID BIGINT NULL,
  StaffID BIGINT NULL,
  Subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  DownPaymentAmount DECIMAL(12,2) NOT NULL DEFAULT 0,
  AmountPaid DECIMAL(12,2) NOT NULL DEFAULT 0,
  TotalDue DECIMAL(12,2) NOT NULL DEFAULT 0,
  Status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  Notes TEXT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoices_client FOREIGN KEY (ClientID) REFERENCES Clients(ClientID),
  CONSTRAINT fk_invoices_staff  FOREIGN KEY (StaffID) REFERENCES Staff(StaffID)
);

CREATE TABLE IF NOT EXISTS InvoiceItems (
  ItemID BIGINT AUTO_INCREMENT PRIMARY KEY,
  InvoiceID VARCHAR(255) NOT NULL, -- store InvoiceCode for convenience
  Description TEXT NOT NULL,
  Quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
  UnitPrice DECIMAL(12,2) NOT NULL DEFAULT 0,
  LineTotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  PurchaseLocation VARCHAR(255) NULL,
  ProductID BIGINT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Receipts (
  ReceiptID BIGINT AUTO_INCREMENT PRIMARY KEY,
  InvoiceID BIGINT NOT NULL,
  Amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  Method VARCHAR(100) NULL,
  Notes TEXT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_receipts_invoice FOREIGN KEY (InvoiceID) REFERENCES Invoices(InvoiceID)
);

CREATE TABLE IF NOT EXISTS Handovers (
  LetterID BIGINT AUTO_INCREMENT PRIMARY KEY,
  InvoiceCode VARCHAR(255) NOT NULL,
  StaffNIM VARCHAR(100) NOT NULL,
  Description TEXT NULL,
  LetterDate DATE NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
);

-- Basic indexes (aligns with loader + API usage)
-- Indexes (skip IF NOT EXISTS for MySQL 8 compatibility; will error if duplicates)
-- Run once on a clean schema. If already exists, drop manually or ignore errors.
CREATE INDEX idx_clients_name ON Clients(Name);
CREATE INDEX idx_staff_name ON Staff(Name);
CREATE UNIQUE INDEX idx_staff_nim ON Staff(NIM);

CREATE UNIQUE INDEX idx_invoices_code ON Invoices(InvoiceCode);
CREATE INDEX idx_invoices_status_date ON Invoices(Status, InvoiceDate);
CREATE INDEX idx_invoices_client ON Invoices(ClientID);
CREATE INDEX idx_invoices_staff ON Invoices(StaffID);

CREATE INDEX idx_items_invoice ON InvoiceItems(InvoiceID);
CREATE INDEX idx_items_product ON InvoiceItems(ProductID);

CREATE INDEX idx_receipts_invoice ON Receipts(InvoiceID);
CREATE INDEX idx_receipts_created ON Receipts(CreatedAt);

CREATE INDEX idx_handovers_code ON Handovers(InvoiceCode);
CREATE INDEX idx_handovers_staffnim ON Handovers(StaffNIM);
CREATE INDEX idx_handovers_date ON Handovers(LetterDate);

CREATE INDEX idx_products_category ON Products(Category);
CREATE INDEX idx_products_type ON Products(Type);
