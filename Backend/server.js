/**
 * DB Final Web App Backend
 *
 * This server provides API routes for the four required project operations:
 * 1) Show table
 * 2) Add supplier
 * 3) Annual expenses for parts
 * 4) Budget projection
 *
 * It also serves static frontend files so the project can be run from one Node process.
 */
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Middleware for JSON/form parsing + CORS for local frontend requests.
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend/assets from project root.
const projectRoot = path.join(__dirname, '..');
app.use('/Frontend', express.static(path.join(projectRoot, 'Frontend')));
app.use('/Resources', express.static(path.join(projectRoot, 'Resources')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(projectRoot, 'Frontend', 'index.html'));
});

/**
 * In-memory DB config set by /api/connect-db.
 *
 * NOTE: This is intentionally simple for class/demo usage.
 * For production, use environment variables or a secure secret store.
 */
let dbConfig = null;

/**
 * @returns {boolean} true if db credentials were provided and validated.
 */
function hasDbConfig() {
  return !!(dbConfig && dbConfig.user && dbConfig.database);
}

/**
 * Helper wrapper that creates and closes a DB connection per request.
 *
 * @param {(connection: import('mysql2/promise').Connection) => Promise<void>} handler
 * @param {import('express').Response} res
 */
async function withConnection(handler, res) {
  if (!hasDbConfig()) {
    return res.status(400).json({
      status: 'error',
      message: 'Database is not connected. Please connect first.'
    });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    return await handler(connection);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * POST /api/connect-db
 * Validates DB credentials and stores them for subsequent requests.
 */
app.post('/api/connect-db', async (req, res) => {
  const { username, password, database } = req.body;

  if (!username || !database) {
    return res.status(400).json({
      status: 'error',
      message: 'username and database are required.'
    });
  }

  const candidateConfig = {
    host: 'localhost',
    user: username,
    password: password || '',
    database
  };

  try {
    const connection = await mysql.createConnection(candidateConfig);
    await connection.ping();
    await connection.end();

    dbConfig = candidateConfig;
    return res.json({ status: 'success', message: 'Connected to MySQL.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * POST /api/getTable
 * Body: { tableName: string } or { table: string }
 * Returns all rows from the selected table.
 */
app.post('/api/getTable', async (req, res) => {
  const table = (req.body.table || req.body.tableName || '').trim();

  // Simple allow-list style validation to prevent SQL injection via table name.
  if (!table || !/^[a-zA-Z0-9_]+$/.test(table)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid table name.'
    });
  }

  return withConnection(async (connection) => {
    const [results, fields] = await connection.query(`SELECT * FROM \`${table}\``);
    return res.json({
      status: 'success',
      rows: results.length,
      columns: fields.length,
      data: results
    });
  }, res);
});

/**
 * POST /api/addSupplier
 * Body: { supplierName, email, phoneNumbers[] }
 * Inserts into suppliers + phones in a single transaction.
 */
app.post('/api/addSupplier', async (req, res) => {
  const supplierName = (req.body.supplierName || '').trim();
  const email = (req.body.email || '').trim();
  let phoneNumbers = req.body.phoneNumbers || req.body['phoneNumbers[]'] || [];

  if (!Array.isArray(phoneNumbers)) {
    phoneNumbers = [phoneNumbers];
  }

  // Trim numbers, remove empty strings, and deduplicate values.
  const cleanedPhones = [...new Set(phoneNumbers.map((p) => String(p).trim()).filter(Boolean))];

  if (!supplierName || !email || cleanedPhones.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'supplierName, email, and at least one phone number are required.'
    });
  }

  return withConnection(async (connection) => {
    await connection.beginTransaction();

    try {
      // suppliers._id is non-auto-increment in this schema, so generate next ID.
      const [[nextIdRow]] = await connection.query(
        'SELECT COALESCE(MAX(_id), 0) + 1 AS nextId FROM suppliers'
      );
      const newSupplierId = nextIdRow.nextId;

      await connection.query(
        'INSERT INTO suppliers (_id, name, email) VALUES (?, ?, ?)',
        [newSupplierId, supplierName, email]
      );

      const phoneValues = cleanedPhones.map((number) => [newSupplierId, number]);
      await connection.query('INSERT INTO phones (supp_id, number) VALUES ?', [phoneValues]);

      await connection.commit();
      return res.json({
        status: 'success',
        message: 'Supplier added successfully.',
        supplierId: newSupplierId
      });
    } catch (err) {
      await connection.rollback();

      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          status: 'error',
          message: 'Supplier email or phone number already exists.'
        });
      }

      return res.status(500).json({ status: 'error', message: err.message });
    }
  }, res);
});

/**
 * POST /api/annualExpenses
 * Body: { startYear, endYear }
 * Returns expense total per year for the selected range.
 */
app.post('/api/annualExpenses', async (req, res) => {
  const startYear = Number(req.body.startYear);
  const endYear = Number(req.body.endYear);

  if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || startYear > endYear) {
    return res.status(400).json({
      status: 'error',
      message: 'startYear and endYear must be valid integers, and startYear <= endYear.'
    });
  }

  return withConnection(async (connection) => {
    const [rows] = await connection.query(
      `SELECT YEAR(o.\`when\`) AS year,
              ROUND(COALESCE(SUM(oi.qty * p.price), 0), 2) AS totalSpent
       FROM orders o
       JOIN order_items oi ON oi.supp_id = o.supp_id AND oi.\`when\` = o.\`when\`
       JOIN parts p ON p._id = oi.part_id
       WHERE YEAR(o.\`when\`) BETWEEN ? AND ?
       GROUP BY YEAR(o.\`when\`)
       ORDER BY year`,
      [startYear, endYear]
    );

    // Fill missing years with 0 to make output easier to display.
    const expenseByYear = new Map(rows.map((r) => [r.year, Number(r.totalSpent)]));
    const data = [];
    for (let year = startYear; year <= endYear; year += 1) {
      data.push({ year, totalSpent: expenseByYear.get(year) || 0 });
    }

    return res.json({ status: 'success', data });
  }, res);
});

/**
 * POST /api/budgetProjection
 * Body: { numYears, inflationRate }
 * Uses 2022 as baseline year and applies compound inflation for N future years.
 */
app.post('/api/budgetProjection', async (req, res) => {
  const numYears = Number(req.body.numYears);
  const inflationRate = Number(req.body.inflationRate);

  if (!Number.isInteger(numYears) || numYears < 1 || !Number.isFinite(inflationRate) || inflationRate < 0) {
    return res.status(400).json({
      status: 'error',
      message: 'numYears must be an integer >= 1 and inflationRate must be a number >= 0.'
    });
  }

  return withConnection(async (connection) => {
    const baseYear = 2022;
    const [[row]] = await connection.query(
      `SELECT ROUND(COALESCE(SUM(oi.qty * p.price), 0), 2) AS totalSpent
       FROM orders o
       JOIN order_items oi ON oi.supp_id = o.supp_id AND oi.\`when\` = o.\`when\`
       JOIN parts p ON p._id = oi.part_id
       WHERE YEAR(o.\`when\`) = ?`,
      [baseYear]
    );

    const baseAmount = Number(row.totalSpent || 0);
    const growth = 1 + inflationRate / 100;
    const data = [];

    for (let i = 1; i <= numYears; i += 1) {
      data.push({
        year: baseYear + i,
        projectedTotal: Number((baseAmount * growth ** i).toFixed(2))
      });
    }

    return res.json({
      status: 'success',
      baseYear,
      baseAmount,
      inflationRate,
      data
    });
  }, res);
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
