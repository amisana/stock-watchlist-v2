// financial-data-system.js

// URL of your Google Apps Script web app
const webAppURL = "https://script.google.com/macros/s/AKfycbzI7x-J4hBQonF_fPm6n3AiddqirKHKTHD2dTeCMOMsBdHTTtMFAPIAwVO6s_13GOOh/exec";

// Utility to parse Market Cap strings like "1,815.6 B" into numeric values
function parseMarketCap(marketCapStr) {
    if (!marketCapStr) return 0;
    const number = parseFloat(marketCapStr.replace(/,/g, '').replace('B', '').replace('M', '').replace('T', '')) || 0;
    if (marketCapStr.includes('T')) return number * 1e12;
    if (marketCapStr.includes('B')) return number * 1e9;
    if (marketCapStr.includes('M')) return number * 1e6;
    return number;
}

// Enhanced Financial Data Table Management System
class FinancialDataManager {
    constructor() {
        // Core state management
        this.state = {
            data: [],
            filteredData: [],
            currentView: 'all',
            sortConfig: {
                column: null,
                direction: 'asc'
            },
            loading: false
        };

        // Configuration constants
        this.CONFIG = {
            webAppURL: webAppURL,
            views: {
                all: ['Symbol', 'Company Name', 'Relevance to Data Centers', 'Data Center Categorization', 'Market Cap', 'Exchange', 'Industry', 'Sector', 'Country', '1D Change', '1W Change', '1M Change', '3M Change', '6M Change', 'YTD Change', '1Y Change', '3Y Change', '5Y Change', '10Y Change', '15Y Change', '20Y Change'],
                performance: ['Symbol', 'Company Name', '1D Change', '1W Change', '1M Change', '3M Change', '6M Change', 'YTD Change', '1Y Change', '3Y Change', '5Y Change', '10Y Change', '15Y Change', '20Y Change'],
                fundamentals: ['Symbol', 'Company Name', 'Market Cap', 'Exchange', 'Industry', 'Sector', 'Country']
            },
            numericColumns: ['Market Cap', '1D Change', '1W Change', '1M Change', '3M Change', 
                           '6M Change', 'YTD Change', '1Y Change', '3Y Change', '5Y Change', 
                           '10Y Change', '15Y Change', '20Y Change'],
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

    // Initialize all event listeners with error handling
    initializeEventListeners() {
        try {
            // Debounced search handler
            this.elements.searchInput?.addEventListener('input', 
                this.debounce(this.handleSearch.bind(this), this.CONFIG.debounceDelay)
            );

            // View switching
            this.elements.viewButtons?.forEach(button => {
                button.addEventListener('click', (e) => this.handleViewChange(e));
            });

            // Table header click handling for sorting
            this.elements.table?.querySelector('thead')?.addEventListener('click', (e) => {
                let target = e.target;
                // Traverse up to the th element if inner elements are clicked
                while (target && target.tagName !== 'TH') {
                    target = target.parentElement;
                }
                if (target && target.tagName === 'TH') {
                    const column = target.dataset.key;
                    if (column) this.handleSort(column, target);
                }
            });

        } catch (error) {
            console.error('Failed to initialize event listeners:', error);
            this.showError('Application initialization failed. Please refresh the page.');
        }
    }

    // Sophisticated search implementation with multi-field support
    handleSearch(event) {
        try {
            const searchTerm = event.target.value.toLowerCase();
            
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

    // View management system
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

    // Advanced sorting system with multi-type support
    handleSort(column, thElement) {
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

            // Remove existing sort indicators from all headers
            this.elements.table.querySelectorAll('th').forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
            });

            // Add sort indicator to the current sorted column
            thElement.classList.add(this.state.sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc');

            // Sort data
            this.state.filteredData.sort((a, b) => {
                let compareA = a[column];
                let compareB = b[column];

                if (isNumeric) {
                    compareA = isNaN(parseFloat(compareA)) ? 0 : parseFloat(compareA);
                    compareB = isNaN(parseFloat(compareB)) ? 0 : parseFloat(compareB);
                } else {
                    compareA = compareA.toString().toLowerCase();
                    compareB = compareB.toString().toLowerCase();
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

// financial-data-system.js

// ... [Existing code above remains unchanged] ...

// Enhanced table rendering with view management
renderTable() {
    try {
        const tbody = this.elements.table.querySelector('tbody');
        const visibleColumns = this.CONFIG.views[this.state.currentView];

        // Update header visibility
        const headers = this.elements.table.querySelectorAll('th');
        headers.forEach(header => {
            const columnName = header.dataset.key;
            header.style.display = visibleColumns.includes(columnName) ? '' : 'none';
        });

        // Render rows with visible columns
        tbody.innerHTML = this.state.filteredData.map(row => `
            <tr>
                ${visibleColumns.map(key => {
                    const value = row[key];
                    // Enhanced cell rendering with formatting
                    const isNumeric = this.CONFIG.numericColumns.includes(key);
                    let formattedValue = this.formatCellValue(key, value);
                    let classes = this.getCellClasses(key, value);

                    if (key === 'Relevance to Data Centers') {
                        // Replace text with info icon and tooltip
                        return `
                            <td class="${classes}">
                                <div class="tooltip-container">
                                    <span class="info-icon" tabindex="0" aria-label="Relevance Information">
                                        ℹ️
                                    </span>
                                    <span class="tooltip-text">${this.escapeHTML(value)}</span>
                                </div>
                            </td>
                        `;
                    }

                    // Check if it's the first column to add 'frozen-column' class
                    const isFirstColumn = key === visibleColumns[0];
                    const tdClass = isFirstColumn ? `${classes} frozen-column` : classes;

                    return `<td class="${tdClass}">${formattedValue || "N/A"}</td>`;
                }).join('')}
            </tr>
        `).join('');
    } catch (error) {
        console.error('Table rendering failed:', error);
        this.showError('Failed to display data. Please refresh the page.');
    }
}

    // Utility function for cell value formatting
    formatCellValue(key, value) {
        if (this.CONFIG.numericColumns.includes(key)) {
            if (key === 'Market Cap') {
                return this.formatMarketCap(value);
            }
            return this.formatPercentage(value);
        }
        return value || "N/A";
    }

    // Market cap formatting utility
    formatMarketCap(value) {
        const number = parseFloat(value);
        if (isNaN(number)) return "N/A";
        
        if (number >= 1e12) return `${(number / 1e12).toFixed(1)}T`;
        if (number >= 1e9) return `${(number / 1e9).toFixed(1)}B`;
        if (number >= 1e6) return `${(number / 1e6).toFixed(1)}M`;
        return number.toLocaleString();
    }

    // Percentage formatting utility
    formatPercentage(value) {
        const number = parseFloat(value);
        if (isNaN(number)) return "N/A";
        return `${(number * 100).toFixed(2)}%`;
    }

    // Utility function for cell classes
    getCellClasses(key, value) {
        const classes = [];
        
        if (key === 'Symbol') classes.push('symbol');
        if (key === 'Company Name') classes.push('company-name');
        
        if (this.CONFIG.numericColumns.includes(key) && key !== 'Market Cap') {
            classes.push('price-change');
            classes.push(parseFloat(value) >= 0 ? 'positive' : 'negative');
        }

        return classes.join(' ');
    }

    // Debounce utility for search optimization
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

    // Error handling utility
    showError(message) {
        // Display error message in the error overlay
        if (this.elements.errorOverlay) {
            this.elements.errorOverlay.textContent = message;
            this.elements.errorOverlay.style.display = 'flex';
        }
    }

    // Hide error overlay
    hideError() {
        if (this.elements.errorOverlay) {
            this.elements.errorOverlay.style.display = 'none';
            this.elements.errorOverlay.textContent = '';
        }
    }

    // Method to update data from the fetch operation
    updateData(newData) {
        this.state.data = newData;
        this.state.filteredData = [...newData];
        this.renderTable();
    }

    // Show loading overlay
    showLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'flex';
        }
    }

    // Hide loading overlay
    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'none';
        }
    }

    // Fetch data from Google Apps Script
    async fetchData() {
        this.state.loading = true;
        this.showLoading();
        this.hideError();
        try {
            const response = await fetch(this.CONFIG.webAppURL);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const jsonData = await response.json();
            // Validate and parse data
            const validatedData = this.validateData(jsonData);
            this.updateData(validatedData);
        } catch (error) {
            console.error("Error fetching data:", error);
            this.showError('Failed to fetch data. Please try again later.');
        } finally {
            this.state.loading = false;
            this.hideLoading();
        }
    }

    // Validate and parse fetched data
    validateData(data) {
        return data.map(item => ({
            ...item,
            'Market Cap': parseMarketCap(item['Market Cap']),
            '1D Change': parseFloat(item['1D Change']) || 0,
            '1W Change': parseFloat(item['1W Change']) || 0,
            '1M Change': parseFloat(item['1M Change']) || 0,
            '3M Change': parseFloat(item['3M Change']) || 0,
            '6M Change': parseFloat(item['6M Change']) || 0,
            'YTD Change': parseFloat(item['YTD Change']) || 0,
            '1Y Change': parseFloat(item['1Y Change']) || 0,
            '3Y Change': parseFloat(item['3Y Change']) || 0,
            '5Y Change': parseFloat(item['5Y Change']) || 0,
            '10Y Change': parseFloat(item['10Y Change']) || 0,
            '15Y Change': parseFloat(item['15Y Change']) || 0,
            '20Y Change': parseFloat(item['20Y Change']) || 0,
        }));
    }

    // Utility function to escape HTML to prevent XSS attacks
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the manager and fetch data
document.addEventListener('DOMContentLoaded', () => {
    const dataManager = new FinancialDataManager();
    dataManager.fetchData();
});
