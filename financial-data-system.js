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
            views: {
                all: ['Symbol', 'Company Name', 'Market Cap', 'Industry', 'Sector', 'Country'],
                performance: ['Symbol', 'Company Name', '1D Change', '1W Change', '1M Change', '3M Change', 'YTD Change', '1Y Change'],
                fundamentals: ['Symbol', 'Company Name', 'Market Cap', 'Exchange', 'Industry', 'Sector']
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
            loadingOverlay: document.querySelector('.loading-overlay')
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
                if (e.target.tagName === 'TH') {
                    this.handleSort(e.target.textContent.trim());
                }
            });

            // Error boundary for event listeners
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
                btn.classList.toggle('active', btn.dataset.view === view);
            });

            this.state.currentView = view;
            this.renderTable();
        } catch (error) {
            console.error('View change failed:', error);
            this.showError('Failed to change view. Please try again.');
        }
    }

    // Advanced sorting system with multi-type support
    handleSort(column) {
        try {
            const isNumeric = this.CONFIG.numericColumns.includes(column);
            
            // Toggle sort direction
            if (this.state.sortConfig.column === column) {
                this.state.sortConfig.direction = 
                    this.state.sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                this.state.sortConfig = { column, direction: 'asc' };
            }

            // Sort data
            this.state.filteredData.sort((a, b) => {
                let compareA = a[column];
                let compareB = b[column];

                if (isNumeric) {
                    compareA = parseFloat(compareA) || 0;
                    compareB = parseFloat(compareB) || 0;
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

    // Enhanced table rendering with view management
    renderTable() {
        try {
            const tbody = this.elements.table.querySelector('tbody');
            const visibleColumns = this.CONFIG.views[this.state.currentView];

            // Update header visibility
            const headers = this.elements.table.querySelectorAll('th');
            headers.forEach(header => {
                const columnName = header.textContent.trim();
                header.style.display = visibleColumns.includes(columnName) ? '' : 'none';
            });

            // Render rows with visible columns
            tbody.innerHTML = this.state.filteredData.map(row => `
                <tr>
                    ${Object.entries(row).map(([key, value]) => {
                        if (!visibleColumns.includes(key)) return '';
                        
                        // Enhanced cell rendering with formatting
                        const isNumeric = this.CONFIG.numericColumns.includes(key);
                        const formattedValue = this.formatCellValue(key, value);
                        const classes = this.getCellClasses(key, value);
                        
                        return `<td class="${classes}">${formattedValue}</td>`;
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
        return value;
    }

    // Market cap formatting utility
    formatMarketCap(value) {
        const number = parseFloat(value);
        if (isNaN(number)) return value;
        
        if (number >= 1e12) return `${(number / 1e12).toFixed(1)}T`;
        if (number >= 1e9) return `${(number / 1e9).toFixed(1)}B`;
        if (number >= 1e6) return `${(number / 1e6).toFixed(1)}M`;
        return value;
    }

    // Percentage formatting utility
    formatPercentage(value) {
        const number = parseFloat(value);
        if (isNaN(number)) return value;
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
        // Implement your error UI here
        console.error(message);
    }

    // Method to update data from the fetch operation
    updateData(newData) {
        this.state.data = newData;
        this.state.filteredData = [...newData];
        this.renderTable();
    }
}

// Initialize the manager
const dataManager = new FinancialDataManager();

// Modify the existing fetchGoogleSheetJSON function to use the manager
async function fetchGoogleSheetJSON() {
    try {
        const response = await fetch(webAppURL);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const jsonData = await response.json();
        dataManager.updateData(jsonData);
    } catch (error) {
        console.error("Error fetching data:", error);
        dataManager.showError('Failed to fetch data. Please try again later.');
    }
}

// Initialize the fetch
fetchGoogleSheetJSON();