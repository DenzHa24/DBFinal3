/**
 * Shared status message helper for all pages.
 * Pages that want messages should include <p id="result"></p>.
 */
function setResult(message, isError = false) {
  const result = document.getElementById('result');
  if (!result) return;
  result.textContent = message;
  result.style.color = isError ? '#b91c1c' : '#064e3b';
}

/**
 * Build an HTML table from an array of objects.
 * @param {Array<Record<string, unknown>>} data
 * @returns {HTMLTableElement}
 */
function createTable(data) {
  const table = document.createElement('table');

  if (!Array.isArray(data) || data.length === 0) {
    const empty = document.createElement('caption');
    empty.textContent = 'No rows found.';
    table.appendChild(empty);
    return table;
  }

  const columns = Object.keys(data[0]);
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  columns.forEach((col) => {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach((rowObj) => {
    const tr = document.createElement('tr');
    columns.forEach((col) => {
      const td = document.createElement('td');
      td.textContent = rowObj[col];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

/**
 * Small fetch wrapper that posts JSON and normalizes error handling.
 */
async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

/**
 * Connect DB modal form handler.
 */
async function connectDb(form) {
  const dbCredentials = Object.fromEntries(new FormData(form));
  await postJson('http://localhost:3000/api/connect-db', dbCredentials);
  sessionStorage.setItem('credentialsReceived', 'true');
  document.getElementById('dbModal').style.display = 'none';
}

/**
 * Show table page handler.
 */
function checkTable() {
  const form = document.getElementById('table-display');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(form));

    try {
      const data = await postJson('http://localhost:3000/api/getTable', formData);
      const container = document.getElementById('table');
      container.innerHTML = '';
      container.appendChild(createTable(data.data));
      setResult(`Loaded ${data.rows} rows from ${formData.tableName}.`);
    } catch (err) {
      setResult(err.message, true);
    }
  });
}

/**
 * Add supplier page handler.
 */
function addSupplier() {
  const form = document.getElementById('supplier-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const payload = {
      supplierName: formData.get('supplierName'),
      email: formData.get('email'),
      phoneNumbers: formData.getAll('phoneNumbers[]')
    };

    try {
      const data = await postJson('http://localhost:3000/api/addSupplier', payload);
      setResult(`${data.message} Supplier ID: ${data.supplierId}.`);
      form.reset();
      document.getElementById('extraPhones').innerHTML = '';
    } catch (err) {
      setResult(err.message, true);
    }
  });
}

/**
 * Annual expenses page handler.
 */
function calculateExpenses() {
  const form = document.getElementById('annual-expenses-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(form));

    try {
      const data = await postJson('http://localhost:3000/api/annualExpenses', payload);
      const container = document.getElementById('table');
      container.innerHTML = '';
      container.appendChild(createTable(data.data));
      setResult('Annual expenses calculated successfully.');
    } catch (err) {
      setResult(err.message, true);
    }
  });
}

/**
 * Budget projection page handler.
 */
function budgetProjection() {
  const form = document.getElementById('budget-projection-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(form));

    try {
      const data = await postJson('http://localhost:3000/api/budgetProjection', payload);
      const container = document.getElementById('table');
      container.innerHTML = '';
      container.appendChild(createTable(data.data));
      setResult(
        `Projection built from ${data.baseYear} expenses ($${data.baseAmount}) at ${data.inflationRate}% inflation.`
      );
    } catch (err) {
      setResult(err.message, true);
    }
  });
}

/**
 * Dynamically append another phone input on Add Supplier page.
 */
function addPhone() {
  const container = document.getElementById('extraPhones');
  if (!container) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'phoneNumbers[]';
  input.placeholder = 'Additional phone';
  container.appendChild(input);
}

/**
 * Page bootstrap:
 * - handle DB modal if present (index page)
 * - register handlers for whichever form exists on current page
 */
window.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('dbModal');
  const form = document.getElementById('dbForm');

  if (modal && form) {
    if (sessionStorage.getItem('credentialsReceived') === 'true') {
      modal.style.display = 'none';
    } else {
      modal.style.display = 'flex';
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await connectDb(form);
          setResult('Database connected successfully.');
        } catch (err) {
          setResult(err.message, true);
        }
      });
    }
  }

  checkTable();
  addSupplier();
  calculateExpenses();
  budgetProjection();
});
