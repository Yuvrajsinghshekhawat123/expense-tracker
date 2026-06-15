CREATE DATABASE expense_tracker;
USE expense_tracker;

CREATE TABLE expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    expense_date DATE,
    category VARCHAR(255),
    amount DECIMAL(10, 2),
    paid_by VARCHAR(100),
    shared_with TEXT,
    description TEXT,
    is_anomaly BOOLEAN DEFAULT FALSE,
    anomaly_type VARCHAR(100),
    anomaly_handling TEXT,
    currency VARCHAR(3) DEFAULT 'INR',
    split_type VARCHAR(20),
    split_details TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE import_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_rows INT,
    rows_imported INT,
    anomalies_found INT,
    report_details JSON,
    file_name VARCHAR(255)
);

CREATE TABLE members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE,
    move_in_date DATE,
    move_out_date DATE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Insert known members
INSERT INTO members (name, move_in_date, move_out_date) VALUES
('Aisha', '2026-02-01', NULL),
('Rohan', '2026-02-01', NULL),
('Priya', '2026-02-01', NULL),
('Meera', '2026-02-01', '2026-03-29'),
('Dev', '2026-02-08', '2026-03-12'),
('Sam', '2026-04-01', NULL);