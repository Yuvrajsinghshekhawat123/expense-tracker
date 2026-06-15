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