//username = root
//password = my password
//hostname = 127.0.0.1
const express = require('express');
const app = express();
app.use(express.json());
const port = 3000;

const mysql = require('mysql2');
const cors = require("cors");
app.use(cors());



//Initialize variables for future
let username;
let password;
let database;



//STARTING THE SERVER -------------------------------------------------------------------------------------------------
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
//STARTING THE SERVER -------------------------------------------------------------------------------------------------


//Endpoint to provide values for username, password and database to be used in the future -----------------------------
app.post("/api/connect-db", async (req, res) => {
    username = req.user;
    password = req.password;
    database = req.database;

    try {
        // connect then close connection
        const connection = mysql.createConnection({
            host: "localhost",
            user: username,
            password: password,
            database: database
        });
        await connection.end();
        res.json({ status: "success", message: "Connected to MySQL!" });

    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});
//Endpoint to provide values for username, password and database to be used in the future -----------------------------

//Endpoint to get a table ---------------------------------------------------------------------------------------------
app.post("/api/getTable", async (req, res) => {

    const { table } = req.body;

    //Prevent tables from getting nuked
    if (!table || !/^[a-zA-Z0-9_]+$/.test(table)) {
        return res.status(400).json({
            status: "error",
            message: "Invalid table name"
        });
    }

    const connection = mysql.createConnection({
        host: "localhost",
        user: username,
        password: password,
        database: database
    });

    const sql = `SELECT * FROM \`${table}\``;

    connection.query(sql, function (err, results, fields) {
        if (err) {
            connection.end();
            return res.status(500).json({
                status: "error",
                message: err.message
            });
        }

        const rowCount = results.length;      // number of rows
        const colCount = fields.length;       // number of columns

        res.json({
            status: "success",
            rows: rowCount,
            columns: colCount,
            data: results
        });
    });

});
//Endpoint to get a table ---------------------------------------------------------------------------------------------





app.post('/addSupplier', (req, res) => {
    const supplierName = req.body.supplierName?.trim();
    const email = req.body.email?.trim();

    let phoneNumbers = req.body.phoneNumbers || [];

    // Ensure phoneNumbers is always an array
    if (!Array.isArray(phoneNumbers)) {
        phoneNumbers = [phoneNumbers];
    }

    // Trim and remove empty values
    phoneNumbers = phoneNumbers
        .map(phone => String(phone).trim())
        .filter(phone => phone !== '');

    // Basic validation
    if (!supplierName || !email || phoneNumbers.length === 0) {
        return res.status(400).send('Error: supplier name, email, and at least one phone number are required.');
    }

    // Optional: prevent duplicate phone numbers in the same submission
    const uniquePhones = [...new Set(phoneNumbers)];
    if (uniquePhones.length !== phoneNumbers.length) {
        return res.status(400).send('Error: duplicate phone numbers were entered in the form.');
    }

    // Start transaction so inserts stay consistent
    db.beginTransaction((err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error: could not start transaction.');
        }

        const insertSupplierSQL = `
            INSERT INTO SUPPLIERS (Name, Email)
            VALUES (?, ?)
        `;

        db.query(insertSupplierSQL, [supplierName, email], (err, supplierResult) => {
            if (err) {
                return db.rollback(() => {
                    console.error(err);

                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).send('Error: that supplier email already exists.');
                    }

                    return res.status(500).send('Database error: could not add supplier.');
                });
            }

            const supplierID = supplierResult.insertId;

            const phoneValues = phoneNumbers.map(phone => [phone, supplierID]);

            const insertPhonesSQL = `
                INSERT INTO PHONE_NUMBERS (PhoneNumber, SupplierID)
                VALUES ?
            `;

            db.query(insertPhonesSQL, [phoneValues], (err) => {
                if (err) {
                    return db.rollback(() => {
                        console.error(err);

                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(400).send('Error: one of the phone numbers already exists.');
                        }

                        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                            return res.status(400).send('Error: invalid supplier reference.');
                        }

                        return res.status(500).send('Database error: could not add phone numbers.');
                    });
                }

                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error(err);
                            return res.status(500).send('Database error: could not commit transaction.');
                        });
                    }

                    res.send('Supplier added successfully.');
                });
            });
        });
    });
});

/*
app.post("/api/addNewSupplier", async (req, res) => {
    const { table, values } = req.body;

    try {

        // Build SQL dynamically but safely
        const columns = Object.keys(values);
        const placeholders = columns.map(() => "?").join(", ");
        const sql = `INSERT INTO \`${table}\` (${columns.join(", ")}) VALUES (${placeholders})`;

        connection.query(sql, Object.values(values), (err, result) => {
            if (err) throw err;

            res.json({
                status: "success",
                insertedId: result.insertId
            });
        });

    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});
*/