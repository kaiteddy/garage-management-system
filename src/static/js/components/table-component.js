/**
 * Reusable Table Component
 */

class TableComponent {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.options = {
            searchable: true,
            paginated: true,
            sortable: true,
            selectable: false,
            actions: true,
            perPageOptions: [20, 50, 100],
            defaultPerPage: 20,
            ...options
        };
        
        this.data = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.perPage = this.options.defaultPerPage;
        this.searchTerm = '';
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.selectedRows = new Set();
        
        this.callbacks = {
            onRowClick: null,
            onRowSelect: null,
            onAction: null,
            onSort: null,
            onPageChange: null,
            onSearch: null
        };
    }

    /**
     * Initialize the table
     */
    init() {
        if (!this.container) {
            console.error(`Table container '${this.containerId}' not found`);
            return;
        }

        this.render();
        this.setupEventListeners();
    }

    /**
     * Set table data
     */
    setData(data, columns) {
        this.data = data || [];
        this.columns = columns || [];
        this.filteredData = [...this.data];
        this.currentPage = 1;
        this.selectedRows.clear();
        this.updateTable();
    }

    /**
     * Set callback functions
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Render the table structure
     */
    render() {
        this.container.innerHTML = `
            <div class="table-component">
                ${this.options.searchable ? this.renderSearchBox() : ''}
                <div class="table-controls">
                    <div class="table-info">
                        <span id="${this.containerId}-info">0 items</span>
                    </div>
                    <div class="table-actions">
                        ${this.options.selectable ? this.renderBulkActions() : ''}
                        ${this.options.paginated ? this.renderPerPageSelector() : ''}
                    </div>
                </div>
                <div class="table-wrapper">
                    <table class="data-table" id="${this.containerId}-table">
                        <thead id="${this.containerId}-thead">
                            <!-- Headers will be rendered here -->
                        </thead>
                        <tbody id="${this.containerId}-tbody">
                            <!-- Data will be rendered here -->
                        </tbody>
                    </table>
                </div>
                ${this.options.paginated ? this.renderPagination() : ''}
            </div>
        `;
    }

    /**
     * Render search box
     */
    renderSearchBox() {
        return `
            <div class="table-search">
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="${this.containerId}-search" placeholder="Search..." />
                </div>
            </div>
        `;
    }

    /**
     * Render bulk actions
     */
    renderBulkActions() {
        return `
            <div class="bulk-actions" id="${this.containerId}-bulk-actions" style="display: none;">
                <span class="selected-count">0 selected</span>
                <button class="btn btn-sm btn-danger" onclick="tableComponents['${this.containerId}'].deleteSelected()">
                    <i class="fas fa-trash"></i> Delete Selected
                </button>
            </div>
        `;
    }

    /**
     * Render per page selector
     */
    renderPerPageSelector() {
        return `
            <select id="${this.containerId}-per-page" class="per-page-selector">
                ${this.options.perPageOptions.map(option => 
                    `<option value="${option}" ${option === this.perPage ? 'selected' : ''}>${option} per page</option>`
                ).join('')}
            </select>
        `;
    }

    /**
     * Render pagination
     */
    renderPagination() {
        return `<div class="pagination" id="${this.containerId}-pagination"></div>`;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        if (this.options.searchable) {
            const searchInput = document.getElementById(`${this.containerId}-search`);
            if (searchInput) {
                searchInput.addEventListener('input', this.debounce((e) => {
                    this.search(e.target.value);
                }, 300));
            }
        }

        // Per page change
        if (this.options.paginated) {
            const perPageSelect = document.getElementById(`${this.containerId}-per-page`);
            if (perPageSelect) {
                perPageSelect.addEventListener('change', (e) => {
                    this.setPerPage(parseInt(e.target.value));
                });
            }
        }

        // Table body click events
        const tbody = document.getElementById(`${this.containerId}-tbody`);
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                this.handleTableClick(e);
            });
        }
    }

    /**
     * Handle table click events
     */
    handleTableClick(e) {
        const row = e.target.closest('tr');
        if (!row) return;

        const rowIndex = parseInt(row.dataset.index);
        const rowData = this.getCurrentPageData()[rowIndex];

        // Handle checkbox clicks
        if (e.target.type === 'checkbox' && this.options.selectable) {
            this.toggleRowSelection(rowIndex, e.target.checked);
            return;
        }

        // Handle action button clicks
        if (e.target.closest('.action-btn')) {
            const action = e.target.closest('.action-btn').dataset.action;
            if (this.callbacks.onAction) {
                this.callbacks.onAction(action, rowData, rowIndex);
            }
            return;
        }

        // Handle row clicks
        if (this.callbacks.onRowClick) {
            this.callbacks.onRowClick(rowData, rowIndex);
        }
    }

    /**
     * Update table content
     */
    updateTable() {
        this.renderHeaders();
        this.renderData();
        this.updateInfo();
        if (this.options.paginated) {
            this.updatePagination();
        }
    }

    /**
     * Render table headers
     */
    renderHeaders() {
        const thead = document.getElementById(`${this.containerId}-thead`);
        if (!thead || !this.columns) return;

        let headerHTML = '<tr>';
        
        if (this.options.selectable) {
            headerHTML += `
                <th class="select-column">
                    <input type="checkbox" id="${this.containerId}-select-all" />
                </th>
            `;
        }

        this.columns.forEach(column => {
            const sortable = this.options.sortable && column.sortable !== false;
            const sortClass = this.sortColumn === column.key ? `sorted-${this.sortDirection}` : '';
            
            headerHTML += `
                <th class="${sortable ? 'sortable' : ''} ${sortClass}" 
                    ${sortable ? `onclick="tableComponents['${this.containerId}'].sort('${column.key}')"` : ''}>
                    ${column.title}
                    ${sortable ? '<i class="fas fa-sort"></i>' : ''}
                </th>
            `;
        });

        if (this.options.actions) {
            headerHTML += '<th class="actions-column">Actions</th>';
        }

        headerHTML += '</tr>';
        thead.innerHTML = headerHTML;

        // Setup select all checkbox
        if (this.options.selectable) {
            const selectAllCheckbox = document.getElementById(`${this.containerId}-select-all`);
            if (selectAllCheckbox) {
                selectAllCheckbox.addEventListener('change', (e) => {
                    this.selectAll(e.target.checked);
                });
            }
        }
    }

    /**
     * Render table data
     */
    renderData() {
        const tbody = document.getElementById(`${this.containerId}-tbody`);
        if (!tbody) return;

        const pageData = this.getCurrentPageData();

        if (pageData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${this.getColumnCount()}" class="no-data">
                        ${this.searchTerm ? 'No results found for your search.' : 'No data available.'}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = pageData.map((row, index) => {
            const isSelected = this.selectedRows.has(this.getRowId(row, index));
            
            let rowHTML = `<tr data-index="${index}" class="${isSelected ? 'selected' : ''}">`;
            
            if (this.options.selectable) {
                rowHTML += `
                    <td class="select-column">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} />
                    </td>
                `;
            }

            this.columns.forEach(column => {
                const value = this.getCellValue(row, column);
                const formattedValue = this.formatCellValue(value, column, row);
                rowHTML += `<td class="${column.className || ''}">${formattedValue}</td>`;
            });

            if (this.options.actions) {
                rowHTML += `<td class="actions-column">${this.renderRowActions(row, index)}</td>`;
            }

            rowHTML += '</tr>';
            return rowHTML;
        }).join('');
    }

    /**
     * Get cell value
     */
    getCellValue(row, column) {
        if (column.render) {
            return column.render(row);
        }
        
        return column.key.split('.').reduce((obj, key) => obj?.[key], row) || '';
    }

    /**
     * Format cell value
     */
    formatCellValue(value, column, row) {
        if (column.format) {
            return column.format(value, row);
        }
        
        return value || '-';
    }

    /**
     * Render row actions
     */
    renderRowActions(row, index) {
        const actions = this.options.rowActions || [
            { action: 'view', icon: 'fas fa-eye', title: 'View', className: 'btn-info' },
            { action: 'edit', icon: 'fas fa-edit', title: 'Edit', className: 'btn-primary' },
            { action: 'delete', icon: 'fas fa-trash', title: 'Delete', className: 'btn-danger' }
        ];

        return actions.map(action => `
            <button class="btn btn-sm ${action.className} action-btn" 
                    data-action="${action.action}" 
                    title="${action.title}">
                <i class="${action.icon}"></i>
            </button>
        `).join('');
    }

    /**
     * Get current page data
     */
    getCurrentPageData() {
        if (!this.options.paginated) {
            return this.filteredData;
        }

        const start = (this.currentPage - 1) * this.perPage;
        const end = start + this.perPage;
        return this.filteredData.slice(start, end);
    }

    /**
     * Search functionality
     */
    search(term) {
        this.searchTerm = term.toLowerCase();
        
        if (!this.searchTerm) {
            this.filteredData = [...this.data];
        } else {
            this.filteredData = this.data.filter(row => {
                return this.columns.some(column => {
                    const value = this.getCellValue(row, column);
                    return String(value).toLowerCase().includes(this.searchTerm);
                });
            });
        }

        this.currentPage = 1;
        this.updateTable();

        if (this.callbacks.onSearch) {
            this.callbacks.onSearch(term, this.filteredData);
        }
    }

    /**
     * Sort functionality
     */
    sort(columnKey) {
        if (this.sortColumn === columnKey) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnKey;
            this.sortDirection = 'asc';
        }

        const column = this.columns.find(col => col.key === columnKey);
        
        this.filteredData.sort((a, b) => {
            const aValue = this.getCellValue(a, column);
            const bValue = this.getCellValue(b, column);
            
            let comparison = 0;
            if (aValue > bValue) comparison = 1;
            if (aValue < bValue) comparison = -1;
            
            return this.sortDirection === 'desc' ? -comparison : comparison;
        });

        this.updateTable();

        if (this.callbacks.onSort) {
            this.callbacks.onSort(columnKey, this.sortDirection);
        }
    }

    /**
     * Pagination functionality
     */
    goToPage(page) {
        this.currentPage = page;
        this.updateTable();

        if (this.callbacks.onPageChange) {
            this.callbacks.onPageChange(page);
        }
    }

    /**
     * Set items per page
     */
    setPerPage(perPage) {
        this.perPage = perPage;
        this.currentPage = 1;
        this.updateTable();
    }

    /**
     * Update pagination
     */
    updatePagination() {
        const paginationContainer = document.getElementById(`${this.containerId}-pagination`);
        if (!paginationContainer) return;

        const totalPages = Math.ceil(this.filteredData.length / this.perPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination-controls">';

        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `<button class="btn btn-sm" onclick="tableComponents['${this.containerId}'].goToPage(${this.currentPage - 1})">Previous</button>`;
        }

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'active' : '';
            paginationHTML += `<button class="btn btn-sm ${activeClass}" onclick="tableComponents['${this.containerId}'].goToPage(${i})">${i}</button>`;
        }

        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `<button class="btn btn-sm" onclick="tableComponents['${this.containerId}'].goToPage(${this.currentPage + 1})">Next</button>`;
        }

        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;
    }

    /**
     * Update info display
     */
    updateInfo() {
        const infoElement = document.getElementById(`${this.containerId}-info`);
        if (!infoElement) return;

        const total = this.filteredData.length;
        const start = this.options.paginated ? (this.currentPage - 1) * this.perPage + 1 : 1;
        const end = this.options.paginated ? Math.min(this.currentPage * this.perPage, total) : total;

        if (total === 0) {
            infoElement.textContent = '0 items';
        } else if (this.options.paginated && total > this.perPage) {
            infoElement.textContent = `Showing ${start} to ${end} of ${total} items`;
        } else {
            infoElement.textContent = `${total} item${total !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Selection functionality
     */
    toggleRowSelection(index, selected) {
        const pageData = this.getCurrentPageData();
        const row = pageData[index];
        const rowId = this.getRowId(row, index);

        if (selected) {
            this.selectedRows.add(rowId);
        } else {
            this.selectedRows.delete(rowId);
        }

        this.updateSelectionUI();

        if (this.callbacks.onRowSelect) {
            this.callbacks.onRowSelect(row, selected, Array.from(this.selectedRows));
        }
    }

    /**
     * Select all rows
     */
    selectAll(selected) {
        if (selected) {
            this.getCurrentPageData().forEach((row, index) => {
                this.selectedRows.add(this.getRowId(row, index));
            });
        } else {
            this.selectedRows.clear();
        }

        this.updateSelectionUI();
        this.updateTable();
    }

    /**
     * Update selection UI
     */
    updateSelectionUI() {
        const bulkActions = document.getElementById(`${this.containerId}-bulk-actions`);
        const selectedCount = this.selectedRows.size;

        if (bulkActions) {
            if (selectedCount > 0) {
                bulkActions.style.display = 'block';
                bulkActions.querySelector('.selected-count').textContent = `${selectedCount} selected`;
            } else {
                bulkActions.style.display = 'none';
            }
        }
    }

    /**
     * Get row ID for selection tracking
     */
    getRowId(row, index) {
        return row.id || index;
    }

    /**
     * Get total column count
     */
    getColumnCount() {
        let count = this.columns.length;
        if (this.options.selectable) count++;
        if (this.options.actions) count++;
        return count;
    }

    /**
     * Debounce function
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
     * Refresh table data
     */
    refresh() {
        this.updateTable();
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedRows.clear();
        this.updateSelectionUI();
        this.updateTable();
    }

    /**
     * Get selected rows
     */
    getSelectedRows() {
        return Array.from(this.selectedRows);
    }
}

// Global table components registry
window.tableComponents = window.tableComponents || {};

// Helper function to create table component
window.createTable = function(containerId, options = {}) {
    const table = new TableComponent(containerId, options);
    window.tableComponents[containerId] = table;
    return table;
};
