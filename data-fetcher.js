// data-fetcher.js

// URL of your Google Apps Script web app
const webAppURL =
  "https://script.google.com/macros/s/AKfycbzt3Z461huDzH3ihK776WPThGKUlXYXb6RYBA-mchHxozT3IU09ca1EoBp7sVLqguQy/exec";

/**
 * Fetches JSON from the Google Apps Script and populates a table.
 */
async function fetchGoogleSheetJSON() {
  try {
    const response = await fetch(webAppURL);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    // Expecting: { columns: [...], rows: [...] }
    const { columns, rows } = await response.json();

    populateTable(columns, rows);
  } catch (error) {
    console.error("Error fetching data from Google Apps Script:", error);
  }
}

/**
 * Dynamically creates a table header (from `columns`) and a table body (from `rows`).
 */
function populateTable(columns, rows) {
  // Select the table (make sure it exists in your HTML)
  const table = document.getElementById("financial-table");

  // Clear any existing <thead> or <tbody>
  table.innerHTML = "";

  // Create THEAD
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  columns.forEach((colName, colIndex) => {
    const th = document.createElement("th");
    th.textContent = colName;

    // Example styling or class for the first column
    if (colIndex === 0) {
      th.classList.add("frozen-column");
    }

    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create TBODY
  const tbody = document.createElement("tbody");

  rows.forEach((rowArr) => {
    const tr = document.createElement("tr");

    rowArr.forEach((cellValue, colIndex) => {
      const td = document.createElement("td");

      // Example styling based on column index
      if (colIndex === 0) {
        // Could add custom styling for the first column (e.g. "symbol")
        td.classList.add("symbol");
      } else if (colIndex >= 9 && colIndex <= 20) {
        // Price change columns (example logic)
        const numericVal = parseFloat(cellValue) || 0;
        td.classList.add("price-change");
        td.classList.add(numericVal >= 0 ? "positive" : "negative");
      }

      // Fill cell value (or blank if undefined/null)
      td.textContent = cellValue ?? "";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
}

/**
 * Initialize script on load
 */
fetchGoogleSheetJSON();
