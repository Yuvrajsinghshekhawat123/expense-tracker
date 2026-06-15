-- Create database
CREATE DATABASE expense_tracker;
USE expense_tracker;

-- Main expenses table
CREATE TABLE expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    expense_date DATE NOT NULL,
    category VARCHAR(100),
    amount DECIMAL(10, 2) NOT NULL,
    paid_by VARCHAR(100) NOT NULL,
    shared_with TEXT,  -- comma separated names
    description TEXT,
    is_anomaly BOOLEAN DEFAULT FALSE,
    anomaly_type VARCHAR(100),
    anomaly_handling TEXT,
    original_row_data TEXT,  -- store original CSV row for audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Import reports table
CREATE TABLE import_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_rows INT,
    rows_imported INT,
    anomalies_found INT,
    report_details JSON,  -- store full anomaly report
    file_name VARCHAR(255)
);

-- Members table (for tracking who owes what)
CREATE TABLE members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE,
    move_in_date DATE,
    move_out_date DATE,
    is_active BOOLEAN DEFAULT TRUE
);