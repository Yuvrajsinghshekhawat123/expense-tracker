import mysql from 'mysql2/promise';

// Simple connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '123240',
    database: 'expense_tracker',
    waitForConnections: true,
    connectionLimit: 10
});

async function query(sql, params) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

export { pool, query };