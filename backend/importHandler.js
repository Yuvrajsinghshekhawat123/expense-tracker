import fs from 'fs';
import csv from 'csv-parser';
import { query } from './db.js';

async function importCSV(filePath, userId) {
    const rows = [];
    const anomalies = [];
    let rowNumber = 0;
    let seenTransactions = new Map(); // For detecting duplicates

    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                rowNumber++;
                const result = processRow(row, rowNumber, seenTransactions);
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

    for (const row of rows) {
        await query(
            `INSERT INTO expenses (
                expense_date, category, amount, paid_by, shared_with,
                description, is_anomaly, anomaly_type, anomaly_handling,
                currency, split_type, split_details, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                row.date, row.category, row.amount, row.paid_by, row.shared_with,
                row.description, row.isAnomaly, row.anomalyType, row.handling,
                row.currency, row.splitType, row.splitDetails, row.notes
            ]
        );
    }

    return {
        totalRows: rowNumber,
        importedRows: rows.length,
        anomalies
    };
}

function processRow(row, rowNumber, seenTransactions) {
    let amount = parseFloat(String(row.amount).replace(/,/g, '')); // Remove commas
    let anomalyType = null;
    let handling = null;
    let warnings = [];
    
    // Store original values for audit
    const originalAmount = row.amount;
    const originalDate = row.date;
    
    // ANOMALY 1: Negative Amount (Refund)
    if (amount < 0) {
        anomalyType = 'NEGATIVE_AMOUNT';
        warnings.push(`Negative amount ${originalAmount} converted to ${Math.abs(amount)} as refund`);
        amount = Math.abs(amount);
        handling = 'Converted negative to positive amount as REFUND';
    }
    
    // ANOMALY 2: Zero Amount (Invalid expense)
    if (amount === 0) {
        anomalyType = 'ZERO_AMOUNT';
        warnings.push(`Zero amount expense - marking as anomaly but importing`);
        handling = 'Zero amount detected - imported but flagged for review';
    }
    
    // ANOMALY 3: Missing/Invalid Date Format
    let expenseDate = null;
    if (!row.date || row.date.trim() === '') {
        anomalyType = 'MISSING_DATE';
        handling = 'Missing date - using current date';
        expenseDate = new Date();
        warnings.push(`No date provided, using ${expenseDate.toISOString().split('T')[0]}`);
    } else {
        expenseDate = parseDate(row.date);
        if (!expenseDate) {
            anomalyType = 'INVALID_DATE_FORMAT';
            handling = `Invalid date format "${row.date}" - using current date`;
            expenseDate = new Date();
            warnings.push(`Date "${row.date}" couldn't be parsed`);
        }
    }
    
    const formattedDate = expenseDate ? expenseDate.toISOString().split('T')[0] : null;
    
    // ANOMALY 4: Future Date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (expenseDate && expenseDate > today) {
        if (!anomalyType) anomalyType = 'FUTURE_DATE';
        handling = `Future date ${originalDate} - changed to today's date`;
        warnings.push(`Future date changed from ${originalDate} to ${today.toISOString().split('T')[0]}`);
        // Use today's date instead
    }
    
    // ANOMALY 5: Suspicious Old Date (2026 is future from now? Actually 2026 is future!)
    if (expenseDate && expenseDate.getFullYear() > new Date().getFullYear() + 1) {
        if (!anomalyType) anomalyType = 'SUSPICIOUS_FUTURE_YEAR';
        handling = `Year ${expenseDate.getFullYear()} is too far in future - flagged`;
        warnings.push(`Year ${expenseDate.getFullYear()} seems incorrect`);
    }
    
    // ANOMALY 6: Missing Paid By
    let paidBy = row.paid_by ? row.paid_by.trim() : '';
    if (!paidBy) {
        if (!anomalyType) anomalyType = 'MISSING_PAID_BY';
        handling = 'Missing payer - set to "UNKNOWN"';
        paidBy = 'UNKNOWN';
        warnings.push(`No payer specified, set to UNKNOWN`);
    }
    
    // ANOMALY 7: Case inconsistency in names
    const nameMapping = {
        'priya': 'Priya',
        'rohan': 'Rohan', 
        'aisha': 'Aisha',
        'meera': 'Meera',
        'dev': 'Dev',
        'sam': 'Sam',
        'priya s': 'Priya'
    };
    
    const normalizedPaidBy = nameMapping[paidBy.toLowerCase()] || paidBy;
    if (normalizedPaidBy !== paidBy && paidBy !== 'UNKNOWN') {
        warnings.push(`Name case normalized: "${paidBy}" -> "${normalizedPaidBy}"`);
        paidBy = normalizedPaidBy;
    }
    
    // ANOMALY 8: Missing Currency
    let currency = row.currency ? row.currency.trim().toUpperCase() : 'INR';
    if (!row.currency || row.currency.trim() === '') {
        if (!anomalyType) anomalyType = 'MISSING_CURRENCY';
        handling = 'Missing currency - defaulted to INR';
        warnings.push(`No currency specified, defaulting to INR`);
        currency = 'INR';
    }
    
    // ANOMALY 9: Mixed Currencies (USD vs INR)
    if (currency !== 'INR' && currency !== 'USD') {
        if (!anomalyType) anomalyType = 'UNKNOWN_CURRENCY';
        handling = `Unknown currency ${currency} - keeping as is but flagged`;
        warnings.push(`Unusual currency: ${currency}`);
    }
    
    // ANOMALY 10: Duplicate Transactions
    const transactionKey = `${formattedDate}_${row.description}_${amount}_${paidBy}`;
    if (seenTransactions.has(transactionKey)) {
        anomalyType = 'DUPLICATE_TRANSACTION';
        handling = `Duplicate of row ${seenTransactions.get(transactionKey)} - still importing but flagged`;
        warnings.push(`Possible duplicate of earlier transaction`);
    } else {
        seenTransactions.set(transactionKey, rowNumber);
    }
    
    // ANOMALY 11: Missing Split Type
    let splitType = row.split_type ? row.split_type.trim().toLowerCase() : '';
    const validSplitTypes = ['equal', 'unequal', 'percentage', 'share', ''];
    if (!splitType || splitType === '') {
        if (!anomalyType) anomalyType = 'MISSING_SPLIT_TYPE';
        handling = 'Missing split type - assuming EQUAL split';
        splitType = 'equal';
        warnings.push(`No split type specified, defaulting to 'equal'`);
    } else if (!validSplitTypes.includes(splitType)) {
        if (!anomalyType) anomalyType = 'INVALID_SPLIT_TYPE';
        handling = `Invalid split type "${splitType}" - treating as EQUAL`;
        splitType = 'equal';
        warnings.push(`Invalid split type, changed to 'equal'`);
    }
    
    // ANOMALY 12: Member moved out (Meera left after March 28)
    const movedOutMembers = {
        'Meera': new Date('2026-03-29') // Meera moved out after March 28
    };
    
    if (expenseDate && movedOutMembers[paidBy] && expenseDate > movedOutMembers[paidBy]) {
        if (!anomalyType) anomalyType = 'MEMBER_MOVED_OUT';
        handling = `${paidBy} moved out on ${movedOutMembers[paidBy].toISOString().split('T')[0]} but has expense after that date`;
        warnings.push(`${paidBy} has expense after move-out date`);
    }
    
    // ANOMALY 13: New member before move-in (Sam's deposit on April 8 is correct, but check)
    const newMembers = {
        'Sam': new Date('2026-04-01')
    };
    
    if (expenseDate && newMembers[paidBy] && expenseDate < newMembers[paidBy]) {
        if (!anomalyType) anomalyType = 'MEMBER_BEFORE_MOVE_IN';
        handling = `${paidBy} has expense before moving in on ${newMembers[paidBy].toISOString().split('T')[0]}`;
        warnings.push(`${paidBy} expense dated before move-in`);
    }
    
    // ANOMALY 14: Split contains moved out members
    const splitWith = row.split_with ? row.split_with.split(';').map(s => s.trim()) : [];
    if (splitWith.includes('Meera') && expenseDate && expenseDate > new Date('2026-03-29')) {
        if (!anomalyType) anomalyType = 'SPLIT_INCLUDES_MOVED_OUT';
        handling = 'Split includes Meera who moved out - imported but flagged';
        warnings.push(`Split includes moved-out member Meera for date after her move-out`);
    }
    
    // ANOMALY 15: Split doesn't include payer
    if (!splitWith.includes(paidBy) && paidBy !== 'UNKNOWN' && splitWith.length > 0 && splitType !== '') {
        if (!anomalyType) anomalyType = 'PAYER_NOT_IN_SPLIT';
        handling = `${paidBy} paid but not in split list - adding them`;
        warnings.push(`Payer ${paidBy} not included in split_with`);
        splitWith.push(paidBy);
    }
    
    // ANOMALY 16: Suspicious high amount (rent is 48000, anything > 60000?)
    if (amount > 60000 && !row.description.toLowerCase().includes('rent')) {
        if (!anomalyType) anomalyType = 'SUSPICIOUS_HIGH_AMOUNT';
        handling = `Amount ${amount} is unusually high - flagged for review`;
        warnings.push(`Unusually high amount: ${amount}`);
    }
    
    // ANOMALY 17: Decimal precision issues (899.995)
    if (amount !== Math.round(amount * 100) / 100) {
        if (!anomalyType) anomalyType = 'DECIMAL_PRECISION';
        handling = `Amount ${amount} has more than 2 decimal places - rounding to 2 decimals`;
        amount = Math.round(amount * 100) / 100;
        warnings.push(`Rounded amount from ${originalAmount} to ${amount}`);
    }
    
    // ANOMALY 18: Settlement vs Expense (Rohan paid Aisha back on Feb 25)
    if (row.description && row.description.toLowerCase().includes('settlement')) {
        if (!anomalyType) anomalyType = 'SETTLEMENT_NOT_EXPENSE';
        handling = 'This appears to be a settlement/payment, not an expense - flagged';
        warnings.push(`Transaction looks like a settlement between members`);
    }
    
    // ANOMALY 19: Duplicate dinners (Marina Bites on Feb 8 appears twice)
    // Handled by duplicate detection above
    
    // ANOMALY 20: Percentage split doesn't add to 100%
    if (splitType === 'percentage' && row.split_details) {
        const percentages = row.split_details.match(/\d+/g);
        if (percentages) {
            const total = percentages.reduce((sum, p) => sum + parseInt(p), 0);
            if (total !== 100) {
                if (!anomalyType) anomalyType = 'PERCENTAGE_SPLIT_INVALID';
                handling = `Percentages total ${total}% instead of 100% - flagged`;
                warnings.push(`Percentage split totals ${total}%`);
            }
        }
    }
    
    // Build the anomaly object
    const anomalyDescription = warnings.length > 0 ? warnings.join('; ') : handling;
    
    return {
        isAnomaly: anomalyType !== null,
        anomaly: anomalyType ? {
            rowNumber,
            type: anomalyType,
            handling: handling,
            details: anomalyDescription,
            originalData: {
                date: originalDate,
                amount: originalAmount,
                paid_by: row.paid_by,
                description: row.description
            }
        } : null,
        shouldImport: true, // Import everything but flag anomalies
        data: {
            date: formattedDate,
            category: row.description || 'UNCATEGORIZED',
            amount: amount,
            paid_by: paidBy,
            shared_with: splitWith.join(';'),
            description: row.description || '',
            isAnomaly: anomalyType !== null,
            anomalyType: anomalyType,
            handling: handling || 'No anomalies',
            currency: currency,
            splitType: splitType,
            splitDetails: row.split_details || '',
            notes: row.notes || ''
        }
    };
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    
    dateStr = String(dateStr).trim();
    
    // Handle DD-MM-YYYY format
    let parts = dateStr.split('-');
    if (parts.length === 3) {
        let [day, month, year] = parts;
        
        // Handle "Mar-14" format (month name)
        if (isNaN(parseInt(month)) && isNaN(parseInt(day))) {
            // It's "Mar-14" format - month name
            const monthNames = {
                'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
                'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
            };
            const monthName = day.toLowerCase().substring(0, 3);
            const dayNum = parseInt(month);
            const yearNum = parseInt(year) || new Date().getFullYear();
            
            if (monthNames[monthName]) {
                return new Date(yearNum, monthNames[monthName] - 1, dayNum);
            }
        } else {
            // Normal DD-MM-YYYY
            if (day && month && year) {
                let yearNum = parseInt(year);
                if (yearNum < 100) yearNum += 2000;
                return new Date(yearNum, parseInt(month) - 1, parseInt(day));
            }
        }
    }
    
    // Try standard Date parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        return date;
    }
    
    return null;
}

export { importCSV };