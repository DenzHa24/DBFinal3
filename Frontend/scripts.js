//On page load, prompt for access

console.log("SCRIPT LOADED");

window.addEventListener("DOMContentLoaded", () => {

    if (sessionStorage.getItem('credentialsReceived') === 'true') {
        return;
    }

    document.getElementById("dbModal").style.display = "flex";

    const form = document.getElementById("dbForm");

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

                // ✔ store ONLY after success
                sessionStorage.setItem('credentialsReceived', 'true');
            } else {
                alert("DB connection failed");
            }

        } catch (err) {
            console.error(err);
            alert("Server error");
        }
    });
});



function checkTable(){

}

function addSupplier(){

}

function calculateExpenses(){

}

function budgetProjection(){

}

function addPhone() {
    const container = document.getElementById('extraPhones');

    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'phoneNumbers[]';
    input.placeholder = 'Additional phone';

    container.appendChild(input);
}