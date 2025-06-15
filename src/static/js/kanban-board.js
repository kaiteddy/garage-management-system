/**
 * Kanban Board for Job Management
 * Professional garage workflow management system
 */

class KanbanBoard {
    constructor() {
        this.columns = [
            { id: 'BOOKED_IN', label: 'Booked In', color: '#3b82f6' },
            { id: 'IN_PROGRESS', label: 'In Progress', color: '#f59e0b' },
            { id: 'AWAITING_PARTS', label: 'Awaiting Parts', color: '#ef4444' },
            { id: 'QUALITY_CHECK', label: 'Quality Check', color: '#8b5cf6' },
            { id: 'READY_FOR_COLLECTION', label: 'Ready for Collection', color: '#10b981' },
            { id: 'COMPLETED', label: 'Completed', color: '#6b7280' }
        ];
        this.jobs = {};
        this.draggedJob = null;
        this.init();
    }

    init() {
        this.createKanbanHTML();
        this.loadJobs();
        this.setupEventListeners();
    }

    createKanbanHTML() {
        const container = document.getElementById('kanban-container');
        if (!container) {
            console.error('Kanban container not found');
            return;
        }

        container.innerHTML = `
            <div class="kanban-header">
                <h2 class="kanban-title">
                    <i class="fas fa-tasks"></i>
                    Workshop Job Board
                </h2>
                <div class="kanban-controls">
                    <button class="btn btn-primary" onclick="kanban.showNewJobModal()">
                        <i class="fas fa-plus"></i>
                        New Job
                    </button>
                    <button class="btn btn-outline-primary" onclick="kanban.refreshBoard()">
                        <i class="fas fa-sync-alt"></i>
                        Refresh
                    </button>
                </div>
            </div>
            <div class="kanban-board">
                ${this.columns.map(column => this.createColumnHTML(column)).join('')}
            </div>
        `;
    }

    createColumnHTML(column) {
        return `
            <div class="kanban-column" data-status="${column.id}">
                <div class="kanban-column-header" style="border-top: 4px solid ${column.color}">
                    <h3 class="kanban-column-title">${column.label}</h3>
                    <span class="kanban-column-count" id="count-${column.id}">0</span>
                </div>
                <div class="kanban-column-content" 
                     ondrop="kanban.handleDrop(event)" 
                     ondragover="kanban.handleDragOver(event)"
                     data-status="${column.id}">
                    <div class="kanban-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        Loading jobs...
                    </div>
                </div>
            </div>
        `;
    }

    async loadJobs() {
        try {
            const response = await fetch('/api/jobs/kanban');
            const result = await response.json();

            if (result.success) {
                // Convert columns array to jobs object for easier access
                this.jobs = {};
                if (result.columns) {
                    result.columns.forEach(column => {
                        this.jobs[column.id] = {
                            jobs: column.jobs || [],
                            count: (column.jobs || []).length
                        };
                    });
                }
                this.renderJobs();
            } else {
                this.showError('Failed to load jobs: ' + (result.error || result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
            this.showError('Failed to load jobs');
        }
    }

    renderJobs() {
        // Initialize jobs if not already done
        if (!this.jobs) {
            this.jobs = {};
        }

        this.columns.forEach(column => {
            const columnContent = document.querySelector(`[data-status="${column.id}"] .kanban-column-content`);
            const countElement = document.getElementById(`count-${column.id}`);

            if (!columnContent) return;

            const columnData = this.jobs[column.id] || { jobs: [], count: 0 };
            
            // Update count
            countElement.textContent = columnData.count;

            // Render jobs
            if (columnData.jobs.length === 0) {
                columnContent.innerHTML = `
                    <div class="kanban-empty">
                        <i class="fas fa-inbox"></i>
                        <p>No jobs in this stage</p>
                    </div>
                `;
            } else {
                columnContent.innerHTML = columnData.jobs.map(job => this.createJobCardHTML(job)).join('');
            }
        });
    }

    createJobCardHTML(job) {
        const priorityClass = this.getPriorityClass(job.priority);
        const priorityIcon = this.getPriorityIcon(job.priority);
        const dueDate = job.due_date ? new Date(job.due_date).toLocaleDateString('en-GB') : '';
        const isOverdue = job.due_date && new Date(job.due_date) < new Date();

        return `
            <div class="kanban-job-card ${priorityClass}" 
                 draggable="true" 
                 data-job-id="${job.id}"
                 ondragstart="kanban.handleDragStart(event)"
                 onclick="kanban.showJobDetails(${job.id})">
                
                <div class="job-card-header">
                    <div class="job-number">#${job.job_number}</div>
                    <div class="job-priority">
                        <i class="${priorityIcon}"></i>
                    </div>
                </div>

                <div class="job-card-content">
                    <h4 class="job-title">${job.description || 'No description'}</h4>
                    
                    <div class="job-details">
                        <div class="job-customer">
                            <i class="fas fa-user"></i>
                            ${job.customer_name || 'Unknown Customer'}
                        </div>
                        
                        <div class="job-vehicle">
                            <i class="fas fa-car"></i>
                            ${job.vehicle_registration || 'No Vehicle'} 
                            ${job.vehicle_make ? `(${job.vehicle_make} ${job.vehicle_model || ''})` : ''}
                        </div>

                        ${job.assigned_technician ? `
                            <div class="job-technician">
                                <i class="fas fa-user-cog"></i>
                                ${job.assigned_technician}
                            </div>
                        ` : ''}

                        ${job.bay_number ? `
                            <div class="job-bay">
                                <i class="fas fa-map-marker-alt"></i>
                                Bay ${job.bay_number}
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="job-card-footer">
                    ${dueDate ? `
                        <div class="job-due-date ${isOverdue ? 'overdue' : ''}">
                            <i class="fas fa-calendar"></i>
                            ${dueDate}
                        </div>
                    ` : ''}
                    
                    <div class="job-amount">
                        £${(job.total_amount || 0).toFixed(2)}
                    </div>
                </div>

                ${job.estimated_hours ? `
                    <div class="job-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${this.calculateProgress(job)}%"></div>
                        </div>
                        <small>${job.actual_hours || 0}h / ${job.estimated_hours}h</small>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getPriorityClass(priority) {
        const classes = {
            'URGENT': 'priority-urgent',
            'HIGH': 'priority-high',
            'NORMAL': 'priority-normal',
            'LOW': 'priority-low'
        };
        return classes[priority] || 'priority-normal';
    }

    getPriorityIcon(priority) {
        const icons = {
            'URGENT': 'fas fa-exclamation-triangle',
            'HIGH': 'fas fa-arrow-up',
            'NORMAL': 'fas fa-minus',
            'LOW': 'fas fa-arrow-down'
        };
        return icons[priority] || 'fas fa-minus';
    }

    calculateProgress(job) {
        if (!job.estimated_hours || job.estimated_hours === 0) return 0;
        return Math.min(100, (job.actual_hours / job.estimated_hours) * 100);
    }

    // Drag and Drop handlers
    handleDragStart(event) {
        this.draggedJob = event.target.dataset.jobId;
        event.target.style.opacity = '0.5';
        event.dataTransfer.effectAllowed = 'move';
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        // Add visual feedback
        const column = event.currentTarget;
        column.classList.add('drag-over');
    }

    async handleDrop(event) {
        event.preventDefault();
        
        const column = event.currentTarget;
        column.classList.remove('drag-over');
        
        const newStatus = column.dataset.status;
        const jobId = this.draggedJob;

        if (!jobId || !newStatus) return;

        try {
            const response = await fetch(`/api/jobs/${jobId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Job status updated successfully', 'success');
                this.loadJobs(); // Refresh the board
            } else {
                this.showError('Failed to update job status: ' + result.error);
            }
        } catch (error) {
            console.error('Error updating job status:', error);
            this.showError('Failed to update job status');
        }

        // Reset drag state
        this.draggedJob = null;
        document.querySelectorAll('.kanban-job-card').forEach(card => {
            card.style.opacity = '1';
        });
    }

    setupEventListeners() {
        // Remove drag-over class when dragging leaves
        document.addEventListener('dragleave', (event) => {
            if (event.target.classList.contains('kanban-column-content')) {
                event.target.classList.remove('drag-over');
            }
        });

        // Reset opacity when drag ends
        document.addEventListener('dragend', () => {
            document.querySelectorAll('.kanban-job-card').forEach(card => {
                card.style.opacity = '1';
            });
        });
    }

    refreshBoard() {
        this.loadJobs();
    }

    showJobDetails(jobId) {
        // This will integrate with existing job detail modal
        if (typeof showJobDetail === 'function') {
            showJobDetail(jobId);
        } else {
            console.log('Job details for ID:', jobId);
        }
    }

    showNewJobModal() {
        // This will integrate with existing new job modal
        console.log('Show new job modal');
    }

    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }
}

// Global kanban instance
let kanban;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('kanban-container')) {
        kanban = new KanbanBoard();
    }
});
