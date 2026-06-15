import express from 'express';
import multer from 'multer';
import { importCSV } from './importHandler.js';
import { query } from './db.js';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('../frontend'));

// Endpoint 1: Upload and Import CSV
app.post('/api/import', upload.single('csvfile'), async (req, res) => {
    try {
        const result = await importCSV(req.file.path);

        // Save import report
        await query(
            `INSERT INTO import_reports 
            (total_rows, rows_imported, anomalies_found, report_details, file_name)
            VALUES (?, ?, ?, ?, ?)`,
            [
                result.totalRows,
                result.importedRows,
                result.anomalies.length,
                JSON.stringify(result.anomalies),
                req.file.originalname
            ]
        );

        res.json({
            success: true,
            message: 'Import completed',
            stats: {
                total: result.totalRows,
                imported: result.importedRows,
                anomalies: result.anomalies.length
            },
            anomalies: result.anomalies
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Endpoint 2: Get all expenses
app.get('/api/expenses', async (req, res) => {
    try {
        const expenses = await query(
            'SELECT * FROM expenses ORDER BY expense_date DESC'
        );
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// Endpoint 3: Get import reports
app.get('/api/reports', async (req, res) => {
    try {
        const reports = await query(
            'SELECT * FROM import_reports ORDER BY import_date DESC'
        );
        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});