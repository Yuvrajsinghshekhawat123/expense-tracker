import fs from 'fs';
import csv from 'csv-parser';
import { query } from './db.js';

// ANOMALY DETECTION RULES
// Each problem is detected and handled with clear logic
// The importCSV() function reads a CSV file, detects anomalies in each row, stores valid data in the database, and returns a summary.

async function importCSV(filePath, userId) {
    const rows = [];
    const anomalies = [];
    let rowNumber = 0;

    // Read CSV file
    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                rowNumber++;
                const result = processRow(row, rowNumber);

                if (result.isAnomaly) {
                    anomalies.push(result.anomaly);
                }

                if (result.shouldImport) {
                    rows.push(result.data);
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    // Insert valid rows into database
    for (const row of rows) {
        await query(
            `INSERT INTO expenses (
                expense_date,
                category,
                amount,
                paid_by,
                shared_with,
                description,
                is_anomaly,
                anomaly_type,
                anomaly_handling
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                row.date,
                row.category,
                row.amount,
                row.paid_by,
                row.shared_with,
                row.description,
                row.isAnomaly,
                row.anomalyType,
                row.handling
            ]
        );
    }

    return {
        totalRows: rowNumber,
        importedRows: rows.length,
        anomalies
    };
}





/*
3. Process each row
const result = processRow(row, rowNumber);

For every row, processRow() checks for anomalies such as:
Negative amount
Missing date
Future date
Missing payer

*/

function processRow(row, rowNumber) {
    let amount = parseFloat(row.amount);
    let anomalyType = null;
    let handling = null;

    // ANOMALY 1: Negative Amount
    if (amount < 0) {
        anomalyType = 'NEGATIVE_AMOUNT';
        amount = Math.abs(amount);
        handling = 'Converted to positive amount as REFUND';
    }

    // ANOMALY 2: Missing Date
    if (!row.date || row.date.trim() === '') {
        anomalyType = 'MISSING_DATE';
        handling = 'Missing date - using current date';
        row.date = new Date().toISOString().split('T')[0];
    }

    // ANOMALY 3: Future Date
    const expenseDate = new Date(row.date);
    const today = new Date();

    if (expenseDate > today) {
        anomalyType = 'FUTURE_DATE';
        handling = `Future date ${row.date} - changed to today's date`;
        row.date = today.toISOString().split('T')[0];
    }

    // ANOMALY 4: Missing Paid By
    if (!row.paid_by || row.paid_by.trim() === '') {
        anomalyType = 'MISSING_PAID_BY';
        handling = 'Missing payer - set to "UNKNOWN"';
        row.paid_by = 'UNKNOWN';
    }

    return {
        isAnomaly: anomalyType !== null,
        anomaly: anomalyType
            ? { rowNumber, type: anomalyType, handling }
            : null,
        shouldImport: true,
        data: {
            date: row.date,
            category: row.category || 'UNCATEGORIZED',
            amount,
            paid_by: row.paid_by,
            shared_with: row.shared_with || '',
            description: row.description || '',
            isAnomaly: anomalyType !== null,
            anomalyType,
            handling
        }
    };
}

export { importCSV };