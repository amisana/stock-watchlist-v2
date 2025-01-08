// financial-data-system.js

// URL of your Google Apps Script web app
const webAppURL = "https://script.google.com/macros/s/AKfycbzt3Z461huDzH3ihK776WPThGKUlXYXb6RYBA-mchHxozT3IU09ca1EoBp7sVLqguQy/exec";

/**
 * Utility to parse Market Cap strings like "1,815.6 B" into numeric values
 */
function parseMarketCap(marketCapStr) {
    if (!marketCapStr) return 0;
    const number = parseFloat(
        marketCapStr.replace(/,/g, '')
                    .replace('B', '')
                    .replace('M', '')
                    .replace('T', '')
    ) || 0;

    if (marketCapStr.includes('T')) return number * 1e12;
    if (marketCapStr.includes('B')) return number * 1e9;
    if (marketCapStr.includes('M')) return number * 1e6;
    return number;
}

/**
 * Enhanced Financial Data Table Management System
 */
class FinancialDataManager {
    constructor() {
        // Core state management
        this.state = {
            columns: [],       // Will store the dynamic column names
            data: [],          // Full array of objects
            filteredData: [],  // Filtered array for searching
            currentView: 'all',
            sortConfig: {
                column: null,
                direction: 'asc'
            },
            loading: false
        };

        // Configuration constants
        this.CONFIG = {
            // The web app URL
            webAppURL: webAppURL,

            // *Optional* "views" that define subsets of columns by name
            // If the sheet changes column names, these may need updating or
            // you can remove them if you want fully dynamic columns all the time.
            views: {
                all: [], // we’ll populate dynamically after columns arrive
                performance: ['Symbol', 'Company Name', '1D Change', '1W Change', '1M Change', '3M Change',
                              '6M Change', 'YTD Change', '1Y Change', '3Y Change', '5Y Change',
                              '10Y Change', '15Y Change', '20Y Change'],
                fundamentals: ['Symbol', 'Company Name', 'Market Cap', 'Exchange', 'Industry',
                               'Sector', 'Country']
            },

            // Known numeric columns (this list can be updated or replaced by dynamic detection)
            numericColumns: [
                'Market Cap', '1D Change', '1W Change', '1M Change', '3M Change', '6M Change',
                'YTD Change', '1Y Change', '3Y Change', '5Y Change', '10Y Change', '15Y Change', '20Y Change'
            ],

            // Debounce delay for searching
            debounceDelay: 300
        };

        // DOM Elements
        this.elements = {
            table: document.getElementById('financial-table'),
            searchInput: document.getElementById('tableSearch'),
            viewButtons: document.querySelectorAll('.view-btn'),
            loadingOverlay: document.querySelector('.loading-overlay'),
            errorOverlay: document.querySelector('.error-overlay')
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
            this.elements.searchInput?.addEventListener(
                'input',
                this.debounce(this.handleSearch.bind(this), this.CONFIG.debounceDelay)
            );

            // View switching
            this.elements.viewButtons?.forEach(button => {
                button.addEventListener('click', (e) => this.handleViewChange(e));
            });

        } catch (error) {
            console.error('Failed to initialize event listeners:', error);
            this.showError('Application initialization failed. Please refresh the page.');
        }
    }

    /**
     * Sophisticated search implementation with multi-field support
     */
    handleSearch(event) {
        try {
            const searchTerm = event.target.value.toLowerCase();

            // Filter based on any text-based field
            this.state.filteredData = this.state.data.filter(item => {
                return Object.entries(item).some(([key, value]) => {
                    // Skip numeric columns for text search
                    if (this.CONFIG.numericColumns.includes(key)) return false;
                    return String(value).toLowerCase().includes(searchTerm);
                });
            });

            this.renderTable();
        } catch (error) {
            console.error('Search operation failed:', error);
            this.showError('Search operation failed. Please try again.');
        }
    }

    /**
     * View management system
     */
    handleViewChange(event) {
        try {
            const view = event.target.dataset.view;

            // Update active state
            this.elements.viewButtons.forEach(btn => {
                const isActive = btn.dataset.view === view;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-pressed', isActive);
            });

            this.state.currentView = view;
            this.renderTable();
        } catch (error) {
            console.error('View change failed:', error);
            this.showError('Failed to change view. Please try again.');
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
                    this.state.sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                // Set new sort column and default to ascending
                this.state.sortConfig = { column, direction: 'asc' };
            }

            // Sort data
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

                if (compareA < compareB) return this.state.sortConfig.direction === 'asc' ? -1 : 1;
                if (compareA > compareB) return this.state.sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });

            this.renderTable();
        } catch (error) {
            console.error('Sorting operation failed:', error);
            this.showError('Failed to sort data. Please try again.');
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
            const tbody = this.elements.table.querySelector('tbody');
            if (!tbody) return; // Safety check

            // Determine which columns to show for the current view
            // If the view is 'all', show all columns. Otherwise, filter by config
            let visibleColumns = [];
            if (this.state.currentView === 'all') {
                visibleColumns = [...this.state.columns];
            } else {
                // Filter the dynamic columns by the configured subset
                const subset = this.CONFIG.views[this.state.currentView] || [];
                // Only include columns that actually exist in the sheet
                visibleColumns = this.state.columns.filter(col => subset.includes(col));
            }

            // Clear old rows
            tbody.innerHTML = "";

            // Render each row in filteredData
            this.state.filteredData.forEach(row => {
                const tr = document.createElement('tr');

                visibleColumns.forEach((col, colIndex) => {
                    const value = row[col];
                    const formattedValue = this.formatCellValue(col, value);
                    const classes = this.getCellClasses(col, value);

                    // Example: special tooltip logic for "Relevance to Data Centers"
                    if (col === 'Relevance to Data Centers') {
                        const td = document.createElement('td');
                        td.className = classes;
                        td.innerHTML = `
                            <div class="tooltip-container">
                                <span class="info-icon" tabindex="0" aria-label="Relevance Information">
                                    ℹ️
                                </span>
                                <span class="tooltip-text">${this.escapeHTML(value)}</span>
                            </div>
                        `;
                        tr.appendChild(td);
                        return;
                    }

                    // Create the td
                    const td = document.createElement('td');
                    // If it's the first visible column, freeze it
                    if (colIndex === 0) {
                        td.className = `${classes} frozen-column`;
                    } else {
                        td.className = classes;
                    }
                    td.textContent = formattedValue ?? "N/A";
                    tr.appendChild(td);
                });

                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('Table rendering failed:', error);
            this.showError('Failed to display data. Please refresh the page.');
        }
    }

    /**
     * Create/Update the table header dynamically (based on this.state.columns)
     */
    buildTableHeader() {
        // Remove any existing thead
        let oldThead = this.elements.table.querySelector('thead');
        if (oldThead) {
            this.elements.table.removeChild(oldThead);
        }

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        // Determine which columns to show for the current view
        let visibleColumns = [];
        if (this.state.currentView === 'all') {
            visibleColumns = [...this.state.columns];
        } else {
            const subset = this.CONFIG.views[this.state.currentView] || [];
            visibleColumns = this.state.columns.filter(col => subset.includes(col));
        }

        visibleColumns.forEach(colName => {
            const th = document.createElement('th');
            th.textContent = colName;
            th.dataset.key = colName;

            // Attach a click handler for sorting
            th.addEventListener('click', () => {
                // Remove existing sort indicators from all headers
                thead.querySelectorAll('th').forEach(thEl => {
                    thEl.classList.remove('sort-asc', 'sort-desc');
                });

                // Sort by this column
                this.handleSort(colName);

                // Indicate direction
                if (this.state.sortConfig.column === colName) {
                    th.classList.add(
                        this.state.sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc'
                    );
                }
            });

            // If this is the currently sorted column, add the appropriate class
            if (this.state.sortConfig.column === colName) {
                th.classList.add(
                    this.state.sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc'
                );
            }

            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        this.elements.table.appendChild(thead);

        // If there's no <tbody>, create one
        if (!this.elements.table.querySelector('tbody')) {
            const tbody = document.createElement('tbody');
            this.elements.table.appendChild(tbody);
        }
    }

    /**
     * Utility function for cell value formatting
     */
    formatCellValue(key, value) {
        if (this.CONFIG.numericColumns.includes(key)) {
            if (key === 'Market Cap') {
                return this.formatMarketCap(value);
            }
            return this.formatPercentage(value);
        }
        return value ?? "N/A";
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

        // Example: highlight "Symbol"
        if (key === 'Symbol') classes.push('symbol');
        if (key === 'Company Name') classes.push('company-name');

        // If it's a numeric column (except Market Cap), show red/green
        if (this.CONFIG.numericColumns.includes(key) && key !== 'Market Cap') {
            classes.push('price-change');
            classes.push(parseFloat(value) >= 0 ? 'positive' : 'negative');
        }
        return classes.join(' ');
    }

    /**
     * Debounce utility for search optimization
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
            this.elements.errorOverlay.style.display = 'flex';
        }
    }

    /**
     * Hide error overlay
     */
    hideError() {
        if (this.elements.errorOverlay) {
            this.elements.errorOverlay.style.display = 'none';
            this.elements.errorOverlay.textContent = '';
        }
    }

    /**
     * Update data (and filteredData) with new info, then re-render table
     */
    updateData(newData) {
        this.state.data = newData;
        this.state.filteredData = [...newData];
        this.renderTable();
    }

    /**
     * Show loading overlay
     */
    showLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'flex';
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Fetch data from Google Apps Script, expecting { columns: [...], rows: [...] }
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

            // Convert rows (array of arrays) => array of objects keyed by columns
            const processedData = rows.map(rowArr => {
                const obj = {};
                columns.forEach((colName, idx) => {
                    obj[colName] = rowArr[idx];
                });
                return obj;
            });

            // Save columns in state
            this.state.columns = columns;

            // (Optional) If you want "all" view to always show every column:
            this.CONFIG.views.all = [...columns];

            // Validate and parse data
            const validatedData = this.validateData(processedData);
            this.updateData(validatedData);

        } catch (error) {
            console.error("Error fetching data:", error);
            this.showError('Failed to fetch data. Please try again later.');
        } finally {
            this.state.loading = false;
            this.hideLoading();
        }
    }

    /**
     * Validate and parse fetched data (e.g., parse Market Cap, numeric changes, etc.)
     */
    validateData(dataArray) {
        return dataArray.map(item => {
            // Make a shallow copy, then parse numeric fields
            const copy = { ...item };

            // Example: if these columns exist in your sheet, parse them. If a column is missing,
            // parseFloat(...) will just result in 0 or NaN, so this is safe.
            copy['Market Cap'] = parseMarketCap(copy['Market Cap']);

            // Attempt to parse each "Change" column
            [
                '1D Change', '1W Change', '1M Change', '3M Change', '6M Change',
                'YTD Change', '1Y Change', '3Y Change', '5Y Change', '10Y Change',
                '15Y Change', '20Y Change'
            ].forEach(changeCol => {
                if (Object.hasOwn(copy, changeCol)) {
                    copy[changeCol] = parseFloat(copy[changeCol]) || 0;
                }
            });
            return copy;
        });
    }

    /**
     * Utility function to escape HTML (for tooltip text, etc.)
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the manager after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const dataManager = new FinancialDataManager();
    dataManager.fetchData();
});
