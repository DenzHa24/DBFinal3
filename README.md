# DBFinal

Node.js + Express web application for a database systems final project.

## What this app does

This app supports the 4 required operations:

1. **Show table**: user enters a table name, app prints table contents.
2. **Add new supplier**: user enters supplier data and phone numbers, app inserts rows with validation and transaction safety.
3. **Annual Expenses for Parts**: user enters start year/end year, app returns yearly totals.
4. **Budget Projection**: user enters N years + inflation rate, app projects costs for years after **2022**.

---

## Project structure

- `Backend/server.js`
  - Express server
  - Serves frontend static files
  - Exposes all API endpoints
  - Connects to MySQL using `mysql2/promise`

- `Frontend/index.html`
  - Landing page + DB credential modal

- `Frontend/tableCheck.html`
  - Show table UI

- `Frontend/addSupplier.html`
  - Add supplier UI

- `Frontend/annualExpenses.html`
  - Annual expenses UI

- `Frontend/budgetProjections.html`
  - Budget projection UI

- `Frontend/scripts.js`
  - Frontend form handlers, API calls, and dynamic table rendering

- `make_tables.sql`, `parts_table.sql`
  - Schema creation scripts

---

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create/populate your MySQL database locally.

3. Start the backend server:

```bash
node Backend/server.js
```

4. Open:

- `http://localhost:3000/`

---

## API documentation

### `POST /api/connect-db`
Validate/store DB credentials for subsequent API calls.

**Body**
```json
{
  "username": "root",
  "password": "...",
  "database": "dbfinal"
}
```

### `POST /api/getTable`
Fetch full table contents.

**Body**
```json
{
  "tableName": "suppliers"
}
```

### `POST /api/addSupplier`
Insert supplier + phones in one transaction.

**Body**
```json
{
  "supplierName": "Acme Parts",
  "email": "acme@example.com",
  "phoneNumbers": ["555-1111", "555-2222"]
}
```

### `POST /api/annualExpenses`
Return total amount spent on parts per year in range.

**Body**
```json
{
  "startYear": 2019,
  "endYear": 2022
}
```

### `POST /api/budgetProjection`
Project expenses for the next N years starting after 2022.

**Body**
```json
{
  "numYears": 5,
  "inflationRate": 2
}
```

---

## Notes

- The DB connection is intentionally stored in memory for classroom/demo simplicity.
- For production use, move credentials to environment variables and use a connection pool.
