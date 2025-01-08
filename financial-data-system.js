/*******************************************************
 * financial-data-system.js
 *
 * Merged script combining the data fetching logic
 * (previously in data-fetcher.js) and the FinancialDataManager
 * class (previously in financial-data-system.js).
 ******************************************************/

/** 
 * URL of your Google Apps Script web app
 * (Replace with your own deployed Web App URL) 
 */
const webAppURL =
  "https://script.google.com/macros/s/AKfycbzt3Z461huDzH3ihK776WPThGKUlXYXb6RYBA-mchHxozT3IU09ca1EoBp7sVLqguQy/exec";

/**
 * Utility to parse Market Cap strings like "1,815.6 B" into numeric values.
 * Formerly in data-fetcher.js, integrated here for completeness.
 */
function parseMarketCap(marketCapStr) {
  if (!marketCapStr) return 0;
  const number = parseFloat(
    marketCapStr
      .replace(/,/g, "")
      .replace("B", "")
      .replace("M", "")
      .replace("T", "")
  ) || 0;

  if (marketCapStr.includes("T")) return number * 1e12;
  if (marketCapStr.includes("B")) return number * 1e9;
  if (marketCapStr.includes("M")) return number * 1e6;
  return number;
}

/**
 * Enhanced Financial Data Table Management System
 */
class FinancialDataManager {
  constructor() {
    // Core state
    this.state = {
      columns: [],       // Dynamic column names
      data: [],          // Full array of objects
      filteredData: [],  // Filtered array for searching
      currentView: "all",
      sortConfig: {
        column: null,
        direction: "asc",
      },
      loading: false,
    };

    // Configuration constants
    this.CONFIG = {
      webAppURL: webAppURL,
      views: {
        all: [], // Will be filled with all columns once fetched
        performance: [
          "Symbol",
          "Company Name",
          "1D Change",
          "1W Change",
          "1M Change",
          "3M Change",
          "6M Change",
          "YTD Change",
          "1Y Change",
          "3Y Change",
          "5Y Change",
          "10Y Change",
          "15Y Change",
          "20Y Change",
        ],
        fundamentals: [
          "Symbol",
          "Company Name",
          "Market Cap",
          "Exchange",
          "Industry",
          "Sector",
          "Country",
        ],
      },
      // Columns that display info tooltips when encountered normally
      infoColumns: [
        "Relevance",
        "Relevance (Ext)",
        "Inclusion",
        "Description",
      ],
      // Known numeric columns
      numericColumns: [
        "Market Cap",
        "1D Change",
        "1W Change",
        "1M Change",
        "3M Change",
        "6M Change",
        "YTD Change",
        "1Y Change",
        "3Y Change",
        "5Y Change",
        "10Y Change",
        "15Y Change",
        "20Y Change",
      ],
      debounceDelay: 300,
    };

    // DOM Elements
    this.elements = {
      table: document.getElementById("financial-table"),
      searchInput: document.getElementById("tableSearch"),
      viewButtons: document.querySelectorAll(".view-btn"),
      loadingOverlay: document.querySelector(".loading-overlay"),
      errorOverlay: document.querySelector(".error-overlay"),
    };

    // Initialize event listeners
    this.initializeEventListeners();
  }

  /**
   * Initialize all event listeners with error handling
   */
  initializeEventListeners() {
    try {
      // Debounced search handler
      if (this.elements.searchInput) {
        this.elements.searchInput.addEventListener(
          "input",
          this.debounce(this.handleSearch.bind(this), this.CONFIG.debounceDelay)
        );
      }

      // View switching
      this.elements.viewButtons.forEach((button) => {
        button.addEventListener("click", (e) => this.handleViewChange(e));
      });

      // Global click listener to close any open tooltips
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".tooltip-container")) {
          this.closeAllTooltips();
        }
      });
    } catch (error) {
      console.error("Failed to initialize event listeners:", error);
      this.showError("Application initialization failed. Please refresh the page.");
    }
  }

  /**
   * Sophisticated search implementation with multi-field support
   */
  handleSearch(event) {
    try {
      const searchTerm = event.target.value.toLowerCase();

      // Filter based on any text-based field
      this.state.filteredData = this.state.data.filter((item) => {
        return Object.entries(item).some(([key, value]) => {
          // Skip numeric columns for text search
          if (this.CONFIG.numericColumns.includes(key)) return false;
          return String(value).toLowerCase().includes(searchTerm);
        });
      });

      this.renderTable();
    } catch (error) {
      console.error("Search operation failed:", error);
      this.showError("Search operation failed. Please try again.");
    }
  }

  /**
   * View management system
   */
  handleViewChange(event) {
    try {
      const view = event.target.dataset.view;

      // Update active state on buttons
      this.elements.viewButtons.forEach((btn) => {
        const isActive = btn.dataset.view === view;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-pressed", isActive);
      });

      this.state.currentView = view;
      this.renderTable();
    } catch (error) {
      console.error("View change failed:", error);
      this.showError("Failed to change view. Please try again.");
    }
  }

  /**
   * Handle sorting when a header is clicked
   */
  handleSort(column) {
    try {
      const isNumeric = this.CONFIG.numericColumns.includes(column);

      // Determine sort direction
      if (this.state.sortConfig.column === column) {
        // Toggle sort direction
        this.state.sortConfig.direction =
          this.state.sortConfig.direction === "asc" ? "desc" : "asc";
      } else {
        // Set new sort column and default to ascending
        this.state.sortConfig = { column, direction: "asc" };
      }

      // Sort data in place
      this.state.filteredData.sort((a, b) => {
        let compareA = a[column];
        let compareB = b[column];

        if (isNumeric) {
          compareA = isNaN(parseFloat(compareA)) ? 0 : parseFloat(compareA);
          compareB = isNaN(parseFloat(compareB)) ? 0 : parseFloat(compareB);
        } else {
          compareA = compareA?.toString().toLowerCase();
          compareB = compareB?.toString().toLowerCase();
        }

        if (compareA < compareB) {
          return this.state.sortConfig.direction === "asc" ? -1 : 1;
        }
        if (compareA > compareB) {
          return this.state.sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });

      this.renderTable();
    } catch (error) {
      console.error("Sorting operation failed:", error);
      this.showError("Failed to sort data. Please try again.");
    }
  }

  /**
   * Dynamically build and render the table (header + rows)
   */
  renderTable() {
    try {
      // 1. Build thead
      this.buildTableHeader();

      // 2. Build tbody
      const tbody = this.elements.table.querySelector("tbody");
      if (!tbody) return; // Safety check

      // Determine which columns to show for the current view
      let visibleColumns = [];
      if (this.state.currentView === "all") {
        visibleColumns = [...this.state.columns];
      } else {
        const subset = this.CONFIG.views[this.state.currentView] || [];
        visibleColumns = this.state.columns.filter((col) => subset.includes(col));
      }

      // Clear old rows
      tbody.innerHTML = "";

      // Render each row in filteredData
      this.state.filteredData.forEach((row) => {
        const tr = document.createElement("tr");

        visibleColumns.forEach((col, colIndex) => {
          const value = row[col];
          const formattedValue = this.formatCellValue(col, value);
          const classes = this.getCellClasses(col, value);

          // -----------------------------------------------------------
          // 1) If column is in infoColumns => existing tooltip approach
          // -----------------------------------------------------------
          if (this.CONFIG.infoColumns.includes(col)) {
            const td = document.createElement("td");
            td.className = classes;

            // Tooltip container
            const tooltipContainer = document.createElement("div");
            tooltipContainer.classList.add("tooltip-container");

            // Info icon
            const infoIcon = document.createElement("span");
            infoIcon.classList.add("info-icon");
            infoIcon.setAttribute("tabindex", "0");
            infoIcon.setAttribute("aria-label", `Info about ${col}`);
            infoIcon.innerHTML = `
              <!-- SVG Icon for Info -->
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2" fill="none"/>
                  <line x1="8" y1="4" x2="8" y2="8" stroke="currentColor" stroke-width="2"/>
                  <circle cx="8" cy="12" r="0.5" fill="currentColor"/>
              </svg>
            `;

            // Tooltip text
            const tooltipText = document.createElement("span");
            tooltipText.classList.add("tooltip-text");
            tooltipText.textContent = this.escapeHTML(value) || "No additional information.";

            // Assemble tooltip
            tooltipContainer.appendChild(infoIcon);
            tooltipContainer.appendChild(tooltipText);

            // Keyboard & click toggles
            const toggleTooltip = () => {
              tooltipText.classList.toggle("visible");
            };
            const closeTooltip = () => {
              tooltipText.classList.remove("visible");
            };

            infoIcon.addEventListener("keydown", (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleTooltip();
              } else if (e.key === "Escape") {
                e.preventDefault();
                closeTooltip();
                infoIcon.blur();
              }
            });
            infoIcon.addEventListener("blur", closeTooltip);
            infoIcon.addEventListener("click", toggleTooltip);

            td.appendChild(tooltipContainer);
            tr.appendChild(td);

          // -----------------------------------------------------------
          // 2) Otherwise, normal cell
          //    But we want a special "Symbol + Info" approach for colIndex === 0
          // -----------------------------------------------------------
          } else {
            const td = document.createElement("td");
            if (colIndex === 0) {
              // This is the frozen first column
              td.className = `${classes} frozen-column`;

              // Create a container for Symbol + optional Relevance icon
              const symbolContainer = document.createElement("div");
              symbolContainer.style.display = "inline-flex";
              symbolContainer.style.alignItems = "center";
              symbolContainer.style.gap = "0.25rem";

              // The Symbol text
              const symbolText = document.createElement("span");
              symbolText.textContent = formattedValue ?? "N/A";

              // Check if "Relevance" data is present
              const relevanceValue = row["Relevance"] || "";
              if (relevanceValue.trim() !== "") {
                // Build a new tooltip icon for the "Relevance" column
                const tooltipContainer = document.createElement("div");
                tooltipContainer.classList.add("tooltip-container");

                const infoIcon = document.createElement("span");
                infoIcon.classList.add("info-icon");
                infoIcon.setAttribute("tabindex", "0");
                infoIcon.setAttribute("aria-label", "Relevance Information");
                infoIcon.innerHTML = `
                  <!-- SVG Icon for Info -->
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2" fill="none"/>
                      <line x1="8" y1="4" x2="8" y2="8" stroke="currentColor" stroke-width="2"/>
                      <circle cx="8" cy="12" r="0.5" fill="currentColor"/>
                  </svg>
                `;

                // Tooltip text for Relevance
                const tooltipText = document.createElement("span");
                tooltipText.classList.add("tooltip-text");
                tooltipText.textContent = this.escapeHTML(relevanceValue);

                tooltipContainer.appendChild(infoIcon);
                tooltipContainer.appendChild(tooltipText);

                // Same keyboard/click toggles as the existing tooltip logic
                const toggleTooltip = () => {
                  tooltipText.classList.toggle("visible");
                };
                const closeTooltip = () => {
                  tooltipText.classList.remove("visible");
                };

                infoIcon.addEventListener("keydown", (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleTooltip();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    closeTooltip();
                    infoIcon.blur();
                  }
                });
                infoIcon.addEventListener("blur", closeTooltip);
                infoIcon.addEventListener("click", toggleTooltip);

                // Place Symbol text + Relevance icon in the same container
                symbolContainer.appendChild(symbolText);
                symbolContainer.appendChild(tooltipContainer);

              } else {
                // If no Relevance data, just show the Symbol
                symbolContainer.appendChild(symbolText);
              }

              td.appendChild(symbolContainer);
            } else {
              // Standard cell for columns other than Symbol
              td.className = classes;
              td.textContent = formattedValue ?? "N/A";
            }

            tr.appendChild(td);
          }
        });

        tbody.appendChild(tr);
      });
    } catch (error) {
      console.error("Table rendering failed:", error);
      this.showError("Failed to display data. Please refresh the page.");
    }
  }

  /**
   * Create/Update the table header dynamically
   */
  buildTableHeader() {
    // Remove old thead if it exists
    let oldThead = this.elements.table.querySelector("thead");
    if (oldThead) {
      this.elements.table.removeChild(oldThead);
    }

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    // Determine which columns to show for the current view
    let visibleColumns = [];
    if (this.state.currentView === "all") {
      visibleColumns = [...this.state.columns];
    } else {
      const subset = this.CONFIG.views[this.state.currentView] || [];
      visibleColumns = this.state.columns.filter((col) => subset.includes(col));
    }

    visibleColumns.forEach((colName) => {
      const th = document.createElement("th");
      th.textContent = colName;
      th.dataset.key = colName;

      // Debounce column-header click for sorting
      th.addEventListener(
        "click",
        this.debounce(() => {
          // Remove existing sort indicators from all headers
          thead.querySelectorAll("th").forEach((thEl) => {
            thEl.classList.remove("sort-asc", "sort-desc");
          });

          // Sort by this column
          this.handleSort(colName);

          // Indicate direction
          if (this.state.sortConfig.column === colName) {
            th.classList.add(
              this.state.sortConfig.direction === "asc" ? "sort-asc" : "sort-desc"
            );
          }
        }, 200)
      );

      // If currently sorted by this column, add a class
      if (this.state.sortConfig.column === colName) {
        th.classList.add(
          this.state.sortConfig.direction === "asc" ? "sort-asc" : "sort-desc"
        );
      }

      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    this.elements.table.appendChild(thead);

    // Ensure <tbody> exists
    if (!this.elements.table.querySelector("tbody")) {
      const tbody = document.createElement("tbody");
      this.elements.table.appendChild(tbody);
    }
  }

  /**
   * Utility function for cell value formatting
   */
  formatCellValue(key, value) {
    // If numeric column
    if (this.CONFIG.numericColumns.includes(key)) {
      if (key === "Market Cap") {
        return this.formatMarketCap(value);
      }
      return this.formatPercentage(value);
    }
    // Escape for textual columns
    return this.escapeHTML(value ?? "N/A");
  }

  /**
   * Market cap formatting utility
   */
  formatMarketCap(value) {
    const number = parseFloat(value);
    if (isNaN(number)) return "N/A";

    if (number >= 1e12) return `${(number / 1e12).toFixed(1)}T`;
    if (number >= 1e9) return `${(number / 1e9).toFixed(1)}B`;
    if (number >= 1e6) return `${(number / 1e6).toFixed(1)}M`;
    return number.toLocaleString();
  }

  /**
   * Percentage formatting utility
   */
  formatPercentage(value) {
    const number = parseFloat(value);
    if (isNaN(number)) return "N/A";
    return `${(number * 100).toFixed(2)}%`;
  }

  /**
   * Utility function for cell classes
   */
  getCellClasses(key, value) {
    const classes = [];

    if (key === "Symbol") classes.push("symbol");
    if (key === "Company Name") classes.push("company-name");

    // Numeric columns except Market Cap => color-coded
    if (this.CONFIG.numericColumns.includes(key) && key !== "Market Cap") {
      classes.push("price-change");
      classes.push(parseFloat(value) >= 0 ? "positive" : "negative");
    }
    return classes.join(" ");
  }

  /**
   * Debounce utility
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Error handling utility
   */
  showError(message) {
    if (this.elements.errorOverlay) {
      this.elements.errorOverlay.textContent = message;
      this.elements.errorOverlay.style.display = "flex";
    }
  }

  hideError() {
    if (this.elements.errorOverlay) {
      this.elements.errorOverlay.style.display = "none";
      this.elements.errorOverlay.textContent = "";
    }
  }

  /**
   * Update data and re-render
   */
  updateData(newData) {
    this.state.data = newData;
    this.state.filteredData = [...newData];
    this.renderTable();
  }

  /**
   * Show/hide loading overlay
   */
  showLoading() {
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.style.display = "flex";
    }
  }

  hideLoading() {
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.style.display = "none";
    }
  }

  /**
   * Fetch data from Google Apps Script
   * (Combines logic from the old data-fetcher.js)
   */
  async fetchData() {
    this.state.loading = true;
    this.showLoading();
    this.hideError();

    try {
      const response = await fetch(this.CONFIG.webAppURL);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Expecting structure: { columns: [...], rows: [...] }
      const { columns, rows } = await response.json();

      // Validate structure
      if (!Array.isArray(columns) || !Array.isArray(rows)) {
        throw new Error("Invalid data format: 'columns' or 'rows' is missing or not an array");
      }

      // Convert rows => array of objects
      const processedData = rows.map((rowArr) => {
        const obj = {};
        columns.forEach((colName, idx) => {
          obj[colName] = rowArr[idx];
        });
        return obj;
      });

      // Save columns in state
      this.state.columns = columns;

      // Update 'all' view to include all columns
      this.CONFIG.views.all = [...columns];

      // Validate and parse data
      const validatedData = this.validateData(processedData);
      this.updateData(validatedData);
    } catch (error) {
      console.error("Error fetching data:", error);
      this.showError(
        `Failed to fetch data. ${error.message ? `Details: ${error.message}` : ""}`
      );
    } finally {
      this.state.loading = false;
      this.hideLoading();
    }
  }

  /**
   * Validate and parse fetched data
   */
  validateData(dataArray) {
    return dataArray.map((item) => {
      const copy = { ...item };

      // Parse Market Cap
      if ("Market Cap" in copy) {
        copy["Market Cap"] = parseMarketCap(copy["Market Cap"]);
      }

      // Parse each "Change" column
      [
        "1D Change",
        "1W Change",
        "1M Change",
        "3M Change",
        "6M Change",
        "YTD Change",
        "1Y Change",
        "3Y Change",
        "5Y Change",
        "10Y Change",
        "15Y Change",
        "20Y Change",
      ].forEach((changeCol) => {
        if (Object.hasOwn(copy, changeCol)) {
          copy[changeCol] = parseFloat(copy[changeCol]) || 0;
        }
      });
      return copy;
    });
  }

  /**
   * Escape HTML (for tooltip text & any text cells)
   */
  escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Close all open tooltips
   */
  closeAllTooltips() {
    const tooltips = this.elements.table.querySelectorAll(".tooltip-text.visible");
    tooltips.forEach((tooltip) => {
      tooltip.classList.remove("visible");
    });
  }
}

// Initialize the manager after DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const dataManager = new FinancialDataManager();
  dataManager.fetchData();
});
