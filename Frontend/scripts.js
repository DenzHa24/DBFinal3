//On inital load, prompt for DB information, save to current tab so that
//refreshing does not force another login
window.addEventListener("DOMContentLoaded", () => {
    //Only prompt for credentials if we do not have them.
    if (sessionStorage.getItem('credentialsReceived') === 'true') {
        document.getElementById("dbModal").style.display = "none";
    } else {
        //Make the popup appear and get the form
        document.getElementById("dbModal").style.display = "flex";
        const form = document.getElementById("dbForm");

        //Form event listener
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const dbCredentials = Object.fromEntries(new FormData(form));

            try {
                const res = await fetch("http://localhost:3000/api/connect-db", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dbCredentials)
                });

                const data = await res.json();
                console.log("Backend response:", data);

                if (data.status === "success") {
                    document.getElementById("dbModal").style.display = "none";

                    //Set session storage to true so no relogging
                    sessionStorage.setItem('credentialsReceived', 'true');
                } else {
                    alert("DB connection failed");
                }

            } catch (err) {
                console.error(err);
                alert("Server error");
            }
        });
    }
});


//UNTESTED
function createTable(data) {
    const table = document.createElement("table");

    if (!data || data.length === 0) return table;

    // Get columns from first object
    const columns = Object.keys(data[0]);

    // HEADER ROW
    const headerRow = document.createElement("tr");

    columns.forEach(col => {
        const th = document.createElement("th");
        th.textContent = col;
        headerRow.appendChild(th);
    });

    table.appendChild(headerRow);

    // DATA ROWS
    data.forEach(rowObj => {
        const tr = document.createElement("tr");

        columns.forEach(col => {
            const td = document.createElement("td");
            td.textContent = rowObj[col];
            tr.appendChild(td);
        });

        table.appendChild(tr);
    });

    return table;
}


//UNTESTED
function checkTable() {
    const form = document.getElementById("table-display");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const dbName = Object.fromEntries(new FormData(form));

        try {
            const res = await fetch("http://localhost:3000/api/getTable", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dbName)
            });

            const data = await res.json();

            if (data.status === "success") {

                const tableData = data.data; // 👈 array of objects

                const container = document.getElementById("table");
                container.innerHTML = "";

                container.appendChild(createTable(tableData));

            } else {
                alert("DB connection failed");
            }

        } catch (err) {
            console.error(err);
            alert("Server error");
        }
    });
}

function addSupplier() {

}

function calculateExpenses() {

}

function budgetProjection() {

}

function addPhone() {
    const container = document.getElementById('extraPhones');

    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'phoneNumbers[]';
    input.placeholder = 'Additional phone';

    container.appendChild(input);
}