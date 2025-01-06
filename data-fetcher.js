// URL of your Google Apps Script web app
const webAppURL = "https://script.google.com/macros/s/AKfycbzI7x-J4hBQonF_fPm6n3AiddqirKHKTHD2dTeCMOMsBdHTTtMFAPIAwVO6s_13GOOh/exec";

// Function to fetch and process the Google Apps Script JSON data
async function fetchGoogleSheetJSON() {
    try {
        const response = await fetch(webAppURL);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const jsonData = await response.json();
        populateTable(jsonData);
    } catch (error) {
        console.error("Error fetching data from Google Apps Script:", error);
    }
}

// Function to populate the table with fetched data
function populateTable(data) {
    const tableBody = document.querySelector("#financial-table tbody");

    // Clear any existing rows
    tableBody.innerHTML = "";

    // Iterate over the data rows
    data.forEach(row => {
        const tr = document.createElement("tr");

        // Assume the row is an object with keys matching your column names
        Object.values(row).forEach((cell, index) => {
            const td = document.createElement("td");

            // Add specific styling based on column types (customize if needed)
            if (index === 0) td.classList.add("symbol");
            if (index >= 9 && index <= 20) {
                td.classList.add("price-change");
                td.classList.add(cell >= 0 ? "positive" : "negative");
            }

            td.textContent = cell || ""; // Fill with empty string if no data
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// Initialize the script
fetchGoogleSheetJSON();
