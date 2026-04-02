/**
 * Server.js
 * 
  Serves as project backend and has endpoints for:
  1) Collecting user data
  2) Showing tables 
  3) Adding suppliers
  4) Annual expenses for parts
  5) Budget projections
 */

//Imports
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

//App setup
const app = express();
const port = 3000;

/*Additional aid:
  CORS usage (So that we aren't blocked)
  JSON parsing (for talking to the front end)
*/
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend/assets from the backend
const projectRoot = path.join(__dirname, '..');
app.use('/Frontend', express.static(path.join(projectRoot, 'Frontend')));
app.use('/Resources', express.static(path.join(projectRoot, 'Resources')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(projectRoot, 'Frontend', 'index.html'));
});



// /api/connect-db sets memory for user info
// Used for memory on user sign-in
let dbConfig = null;

//FUnction to make sure credentials exist and are valid
function hasDbConfig() {
  return !!(dbConfig && dbConfig.user && dbConfig.database);
}

//Function creates and closes DB connections by request
async function withConnection(handler, res) {
  //Error if not signed in
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

/*
 * ENDPOINT 1
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
 * ENDPOINT 2
 * Returns selected table.
 */
app.post('/api/getTable', async (req, res) => {
  //Pulls table name out of request
  const table = (req.body.table || req.body.tableName || '').trim();

  // Prevents DB from being nuked!
  if (!table || !/^[a-zA-Z0-9_]+$/.test(table)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid table name.'
    });
  }

  //Fetches and returns information
  return withConnection(async (connection) => {
    //Select the table
    const [results, fields] = await connection.query(`SELECT * FROM \`${table}\``);
    return res.json({
      status: 'success',
      //lengths for building the table
      rows: results.length,
      columns: fields.length,
      data: results
    });
  }, res);
});

/**
 * ENDPOINT 3
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
 * ENDPOINT 4
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
 * ENDPOINT 5
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

//Hosts the app for access from the front end
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
