// Main application JavaScript
class InvoiceQuoteApp {
    constructor() {
        this.invoices = [];
        this.quotes = [];
        this.businessConfig = {};
        this.lineItemTypes = [];
        this.currentView = 'dashboard';
        this.isAuthenticated = false;
        this.init();
    }

    async init() {
        // Check if user is authenticated
        this.isAuthenticated = this.checkAuthentication();

        // Update navigation visibility
        this.updateNavVisibility();

        if (this.isAuthenticated) {
            await this.loadData();
            this.showDashboard();
        } else {
            this.showLoginForm();
        }
    }

    updateNavVisibility() {
        const navbar = document.getElementById('main-nav');
        if (navbar) {
            navbar.style.display = this.isAuthenticated ? 'flex' : 'none';
        }
    }

    checkAuthentication() {
        // Check if authentication token exists in localStorage
        const authToken = localStorage.getItem('invoiceAppAuth');
        return authToken === 'authenticated';
    }

    showLoginForm() {
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="row justify-content-center mt-5">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="text-center">Invoice & Quote App</h3>
                        </div>
                        <div class="card-body">
                            <form id="login-form" onsubmit="app.verifyPassword(event)">
                                <div class="mb-3">
                                    <label for="password" class="form-label">Password</label>
                                    <input type="password" class="form-control" id="password" required>
                                </div>
                                <div class="d-grid">
                                    <button type="submit" class="btn btn-primary">Login</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async verifyPassword(event) {
        event.preventDefault();

        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/verify-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (data.success) {
                // Store authentication in localStorage
                localStorage.setItem('invoiceAppAuth', 'authenticated');
                this.isAuthenticated = true;

                // Update navigation visibility
                this.updateNavVisibility();

                // Load data and show dashboard
                await this.loadData();
                this.showDashboard();
            } else {
                alert('Invalid password. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error verifying password. Please try again.');
        }
    }

    async loadData() {
        try {
            const [dashboardResponse, configResponse, typesResponse] = await Promise.all([
                fetch('/api/dashboard'),
                fetch('/api/config'),
                fetch('/api/line-item-types')
            ]);

            const dashboardData = await dashboardResponse.json();
            this.invoices = dashboardData.invoices;
            this.quotes = dashboardData.quotes;

            this.businessConfig = await configResponse.json();
            this.lineItemTypes = await typesResponse.json();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    showDashboard() {
        this.currentView = 'dashboard';
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-12">
                    <h1>Dashboard</h1>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5>Recent Invoices</h5>
                            <button class="btn btn-primary btn-sm" onclick="app.showInvoiceForm()">New Invoice</button>
                        </div>
                        <div class="card-body">
                            ${this.renderRecentInvoices()}
                            <button class="btn btn-outline-primary btn-sm" onclick="app.showInvoices()">View All</button>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5>Recent Quotes</h5>
                            <button class="btn btn-success btn-sm" onclick="app.showQuoteForm()">New Quote</button>
                        </div>
                        <div class="card-body">
                            ${this.renderRecentQuotes()}
                            <button class="btn btn-outline-success btn-sm" onclick="app.showQuotes()">View All</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRecentInvoices() {
        if (this.invoices.length === 0) {
            return '<p class="text-muted">No invoices yet</p>';
        }

        return this.invoices.slice(0, 5).map(invoice => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <strong>${invoice.number}</strong><br>
                    <small class="text-muted">${invoice.clientName}</small>
                </div>
                <div class="text-end">
                    <span class="badge bg-${invoice.status === 'paid' ? 'success' : 'warning'}">
                        ${invoice.status}
                    </span><br>
                    <small>$${invoice.total.toFixed(2)}</small>
                </div>
            </div>
        `).join('');
    }

    renderRecentQuotes() {
        if (this.quotes.length === 0) {
            return '<p class="text-muted">No quotes yet</p>';
        }

        return this.quotes.slice(0, 5).map(quote => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <strong>${quote.number}</strong><br>
                    <small class="text-muted">${quote.clientName}</small>
                </div>
                <div class="text-end">
                    <span class="badge bg-${quote.status === 'accepted' ? 'success' : quote.status === 'converted' ? 'info' : 'warning'}">
                        ${quote.status}
                    </span><br>
                    <small>$${quote.total.toFixed(2)}</small>
                </div>
            </div>
        `).join('');
    }

    showInvoices() {
        this.currentView = 'invoices';
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1>Invoices</h1>
                        <button class="btn btn-primary" onclick="app.showInvoiceForm()">New Invoice</button>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-12">
                    ${this.renderInvoicesTable()}
                </div>
            </div>
        `;
    }

    renderInvoicesTable() {
        if (this.invoices.length === 0) {
            return '<div class="alert alert-info">No invoices found. Create your first invoice!</div>';
        }

        return `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Number</th>
                            <th>Client</th>
                            <th>Date</th>
                            <th>Due Date</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.invoices.map(invoice => `
                            <tr>
                                <td><strong>${invoice.number}</strong></td>
                                <td>${invoice.clientName}</td>
                                <td>${invoice.date}</td>
                                <td>${invoice.dueDate}</td>
                                <td>$${invoice.total.toFixed(2)}</td>
                                <td>
                                    <div class="dropdown">
                                        <span class="badge bg-${invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : 'warning'} dropdown-toggle" 
                                              data-bs-toggle="dropdown" 
                                              aria-expanded="false"
                                              style="cursor: pointer;">
                                            ${invoice.status}
                                        </span>
                                        <ul class="dropdown-menu">
                                            <li><a class="dropdown-item" href="#" onclick="app.updateInvoiceStatus('${invoice.id}', 'pending'); return false;">Pending</a></li>
                                            <li><a class="dropdown-item" href="#" onclick="app.updateInvoiceStatus('${invoice.id}', 'paid'); return false;">Paid</a></li>
                                            <li><a class="dropdown-item" href="#" onclick="app.updateInvoiceStatus('${invoice.id}', 'overdue'); return false;">Overdue</a></li>
                                        </ul>
                                    </div>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary me-1" onclick="app.showInvoiceForm('${invoice.id}')">
                                        Edit
                                    </button>
                                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="app.downloadPDF('${invoice.id}', 'invoice')">
                                        PDF
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="app.deleteInvoice('${invoice.id}')">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    showQuotes() {
        this.currentView = 'quotes';
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1>Quotes</h1>
                        <button class="btn btn-success" onclick="app.showQuoteForm()">New Quote</button>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-12">
                    ${this.renderQuotesTable()}
                </div>
            </div>
        `;
    }

    renderQuotesTable() {
        if (this.quotes.length === 0) {
            return '<div class="alert alert-info">No quotes found. Create your first quote!</div>';
        }

        return `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Number</th>
                            <th>Client</th>
                            <th>Date</th>
                            <th>Valid Until</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.quotes.map(quote => `
                            <tr>
                                <td><strong>${quote.number}</strong></td>
                                <td>${quote.clientName}</td>
                                <td>${quote.date}</td>
                                <td>${quote.validUntil}</td>
                                <td>$${quote.total.toFixed(2)}</td>
                                <td>
                                    <div class="dropdown">
                                        <span class="badge bg-${quote.status === 'accepted' ? 'success' : quote.status === 'converted' ? 'info' : quote.status === 'rejected' ? 'danger' : 'warning'} dropdown-toggle" 
                                              data-bs-toggle="dropdown" 
                                              aria-expanded="false"
                                              style="cursor: pointer;">
                                            ${quote.status}
                                        </span>
                                        <ul class="dropdown-menu">
                                            <li><a class="dropdown-item" href="#" onclick="app.updateQuoteStatus('${quote.id}', 'pending'); return false;">Pending</a></li>
                                            <li><a class="dropdown-item" href="#" onclick="app.updateQuoteStatus('${quote.id}', 'accepted'); return false;">Accepted</a></li>
                                            <li><a class="dropdown-item" href="#" onclick="app.updateQuoteStatus('${quote.id}', 'rejected'); return false;">Rejected</a></li>
                                        </ul>
                                    </div>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary me-1" onclick="app.showQuoteForm('${quote.id}')">
                                        Edit
                                    </button>
                                    ${quote.status === 'pending' ? `
                                        <button class="btn btn-sm btn-outline-success me-1" onclick="app.convertQuoteToInvoice('${quote.id}')">
                                            Convert
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="app.downloadPDF('${quote.id}', 'quote')">
                                        PDF
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="app.deleteQuote('${quote.id}')">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async showInvoiceForm(invoiceId = null) {
        let invoice = null;
        let isEditing = false;

        if (invoiceId) {
            isEditing = true;
            try {
                const response = await fetch(`/api/invoices/${invoiceId}`);
                if (response.ok) {
                    invoice = await response.json();
                } else {
                    alert('Error fetching invoice data');
                    return;
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error fetching invoice data');
                return;
            }
        }

        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-12">
                    <h1>${isEditing ? 'Edit' : 'Create'} Invoice</h1>
                </div>
            </div>
            
            <form id="invoice-form" onsubmit="app.submitInvoice(event, '${invoiceId || ''}')">
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-section">
                            <h5>Client Information</h5>
                            <div class="mb-3">
                                <label for="clientName" class="form-label">Client Name</label>
                                <input type="text" class="form-control" id="clientName" value="${invoice?.clientName || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label for="clientEmail" class="form-label">Client Email</label>
                                <input type="email" class="form-control" id="clientEmail" value="${invoice?.clientEmail || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label for="dueDate" class="form-label">Due Date</label>
                                <input type="date" class="form-control" id="dueDate" value="${invoice?.dueDate || ''}" required>
                            </div>
                            ${isEditing ? `
                            <div class="mb-3">
                                <label for="status" class="form-label">Status</label>
                                <select class="form-control" id="status">
                                    <option value="pending" ${invoice.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="paid" ${invoice.status === 'paid' ? 'selected' : ''}>Paid</option>
                                    <option value="overdue" ${invoice.status === 'overdue' ? 'selected' : ''}>Overdue</option>
                                </select>
                            </div>` : ''}
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="form-section">
                            <h5>Items</h5>
                            <div id="items-container">
                                ${isEditing && invoice.items.length > 0 ?
                invoice.items.map(item => `
                                        <div class="item-row">
                                            <div class="row">
                                                <div class="col-md-4">
                                                    <input type="text" class="form-control" placeholder="Description" name="description" value="${item.description}" required>
                                                </div>
                                                <div class="col-md-2">
                                                    <select class="form-control" name="type" required onchange="app.handleTypeChange(this)">
                                                        <option value="">Type</option>
                                                        ${this.lineItemTypes.map(type =>
                    `<option value="${type.value}" ${item.type === type.value ? 'selected' : ''}>${type.label}</option>`
                ).join('')}
                                                    </select>
                                                </div>
                                                <div class="col-md-2">
                                                    <input type="number" class="form-control" placeholder="Qty" name="quantity" min="1" value="${item.quantity}" required>
                                                </div>
                                                <div class="col-md-2">
                                                    <input type="number" class="form-control" placeholder="Price" name="price" step="0.01" min="0" value="${item.price}" required>
                                                </div>
                                                <div class="col-md-2">
                                                    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.parentElement.remove(); app.calculateTotal()">×</button>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('') : `
                                    <div class="item-row">
                                        <div class="row">
                                            <div class="col-md-4">
                                                <input type="text" class="form-control" placeholder="Description" name="description" required>
                                            </div>
                                            <div class="col-md-2">
                                                <select class="form-control" name="type" required onchange="app.handleTypeChange(this)">
                                                    <option value="">Type</option>
                                                    ${this.lineItemTypes.map(type => `<option value="${type.value}">${type.label}</option>`).join('')}
                                                </select>
                                            </div>
                                            <div class="col-md-2">
                                                <input type="number" class="form-control" placeholder="Qty" name="quantity" min="1" required>
                                            </div>
                                            <div class="col-md-2">
                                                <input type="number" class="form-control" placeholder="Price" name="price" step="0.01" min="0" required>
                                            </div>
                                            <div class="col-md-2">
                                                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.parentElement.remove(); app.calculateTotal()">×</button>
                                            </div>
                                        </div>
                                    </div>
                                `}
                            </div>
                            <button type="button" class="btn btn-outline-secondary btn-sm mt-2" onclick="app.addItem()">Add Item</button>
                            <div class="mt-3">
                                <div class="total-display">Total: $<span id="total-amount">0.00</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-md-12">
                        <div class="form-section">
                            <h5>Work Description</h5>
                            <div class="mb-3">
                                <textarea class="form-control" id="workDescription" rows="4" placeholder="Enter a detailed description of the work performed...">${invoice?.workDescription || ''}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-md-12">
                        <button type="submit" class="btn btn-primary">${isEditing ? 'Update' : 'Create'} Invoice</button>
                        <button type="button" class="btn btn-secondary" onclick="app.showInvoices()">Cancel</button>
                    </div>
                </div>
            </form>
        `;

        // Set default due date (30 days from now) if not editing
        if (!isEditing) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
        }

        this.setupFormListeners();
    }

    async showQuoteForm(quoteId = null) {
        let quote = null;
        let isEditing = false;

        if (quoteId) {
            isEditing = true;
            try {
                const response = await fetch(`/api/quotes/${quoteId}`);
                if (response.ok) {
                    quote = await response.json();
                } else {
                    alert('Error fetching quote data');
                    return;
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error fetching quote data');
                return;
            }
        }

        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-12">
                    <h1>${isEditing ? 'Edit' : 'Create'} Quote</h1>
                </div>
            </div>
            
            <form id="quote-form" onsubmit="app.submitQuote(event, '${quoteId || ''}')">
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-section">
                            <h5>Client Information</h5>
                            <div class="mb-3">
                                <label for="clientName" class="form-label">Client Name</label>
                                <input type="text" class="form-control" id="clientName" value="${quote?.clientName || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label for="clientEmail" class="form-label">Client Email</label>
                                <input type="email" class="form-control" id="clientEmail" value="${quote?.clientEmail || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label for="validUntil" class="form-label">Valid Until</label>
                                <input type="date" class="form-control" id="validUntil" value="${quote?.validUntil || ''}" required>
                            </div>
                            ${isEditing ? `
                            <div class="mb-3">
                                <label for="status" class="form-label">Status</label>
                                <select class="form-control" id="status">
                                    <option value="pending" ${quote.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="accepted" ${quote.status === 'accepted' ? 'selected' : ''}>Accepted</option>
                                    <option value="rejected" ${quote.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                                </select>
                            </div>` : ''}
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="form-section">
                            <h5>Items</h5>
                            <div id="items-container">
                                ${isEditing && quote.items.length > 0 ?
                quote.items.map(item => `
                                        <div class="item-row">
                                            <div class="row">
                                                <div class="col-md-4">
                                                    <input type="text" class="form-control" placeholder="Description" name="description" value="${item.description}" required>
                                                </div>
                                                <div class="col-md-2">
                                                    <select class="form-control" name="type" required onchange="app.handleTypeChange(this)">
                                                        <option value="">Type</option>
                                                        ${this.lineItemTypes.map(type =>
                    `<option value="${type.value}" ${item.type === type.value ? 'selected' : ''}>${type.label}</option>`
                ).join('')}
                                                    </select>
                                                </div>
                                                <div class="col-md-2">
                                                    <input type="number" class="form-control" placeholder="Qty" name="quantity" min="1" value="${item.quantity}" required>
                                                </div>
                                                <div class="col-md-2">
                                                    <input type="number" class="form-control" placeholder="Price" name="price" step="0.01" min="0" value="${item.price}" required>
                                                </div>
                                                <div class="col-md-2">
                                                    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.parentElement.remove(); app.calculateTotal()">×</button>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('') : `
                                    <div class="item-row">
                                        <div class="row">
                                            <div class="col-md-4">
                                                <input type="text" class="form-control" placeholder="Description" name="description" required>
                                            </div>
                                            <div class="col-md-2">
                                                <select class="form-control" name="type" required onchange="app.handleTypeChange(this)">
                                                    <option value="">Type</option>
                                                    ${this.lineItemTypes.map(type => `<option value="${type.value}">${type.label}</option>`).join('')}
                                                </select>
                                            </div>
                                            <div class="col-md-2">
                                                <input type="number" class="form-control" placeholder="Qty" name="quantity" min="1" required>
                                            </div>
                                            <div class="col-md-2">
                                                <input type="number" class="form-control" placeholder="Price" name="price" step="0.01" min="0" required>
                                            </div>
                                            <div class="col-md-2">
                                                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.parentElement.remove(); app.calculateTotal()">×</button>
                                            </div>
                                        </div>
                                    </div>
                                `}
                            </div>
                            <button type="button" class="btn btn-outline-secondary btn-sm mt-2" onclick="app.addItem()">Add Item</button>
                            <div class="mt-3">
                                <div class="total-display">Total: $<span id="total-amount">0.00</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-md-12">
                        <button type="submit" class="btn btn-success">${isEditing ? 'Update' : 'Create'} Quote</button>
                        <button type="button" class="btn btn-secondary" onclick="app.showQuotes()">Cancel</button>
                    </div>
                </div>
            </form>
        `;

        // Set default valid until date (30 days from now) if not editing
        if (!isEditing) {
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 30);
            document.getElementById('validUntil').value = validUntil.toISOString().split('T')[0];
        }

        this.setupFormListeners();
    }

    showConfiguration() {
        this.currentView = 'configuration';
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-12">
                    <h1>Business Configuration</h1>
                    <p class="text-muted">Configure your business information for invoices and quotes</p>
                </div>
            </div>
            
            <form id="config-form" onsubmit="app.submitConfiguration(event)">
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-section">
                            <h5>Business Information</h5>
                            <div class="mb-3">
                                <label for="businessName" class="form-label">Business Name</label>
                                <input type="text" class="form-control" id="businessName" value="${this.businessConfig?.businessName || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label for="ownerName" class="form-label">Owner Name</label>
                                <input type="text" class="form-control" id="ownerName" value="${this.businessConfig?.ownerName || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="email" class="form-label">Email</label>
                                <input type="email" class="form-control" id="email" value="${this.businessConfig?.email || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="phone" class="form-label">Phone</label>
                                <input type="tel" class="form-control" id="phone" value="${this.businessConfig?.phone || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="website" class="form-label">Website</label>
                                <input type="url" class="form-control" id="website" value="${this.businessConfig?.website || ''}">
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="form-section">
                            <h5>Address Information</h5>
                            <div class="mb-3">
                                <label for="address" class="form-label">Street Address</label>
                                <input type="text" class="form-control" id="address" value="${this.businessConfig?.address || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="city" class="form-label">City</label>
                                <input type="text" class="form-control" id="city" value="${this.businessConfig?.city || ''}">
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="state" class="form-label">State</label>
                                        <input type="text" class="form-control" id="state" value="${this.businessConfig?.state || ''}">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="zipCode" class="form-label">ZIP Code</label>
                                        <input type="text" class="form-control" id="zipCode" value="${this.businessConfig?.zipCode || ''}">
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="hourlyRate" class="form-label">Default Hourly Rate ($)</label>
                                <input type="number" class="form-control" id="hourlyRate" step="0.01" min="0" value="${this.businessConfig?.hourlyRate || 0}">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-md-12">
                        <button type="submit" class="btn btn-primary">Save Configuration</button>
                        <button type="button" class="btn btn-secondary" onclick="app.showDashboard()">Cancel</button>
                    </div>
                </div>
            </form>
        `;
    }

    // Handle type change for automatic labor calculation
    handleTypeChange(selectElement) {
        const row = selectElement.closest('.item-row');
        const priceInput = row.querySelector('input[name="price"]');
        const quantityInput = row.querySelector('input[name="quantity"]');

        if (selectElement.value === 'labor') {
            // Auto-fill with hourly rate
            priceInput.value = this.businessConfig.hourlyRate || 0;
            priceInput.placeholder = 'Hourly Rate';
            quantityInput.placeholder = 'Hours';
        } else {
            priceInput.placeholder = 'Price';
            quantityInput.placeholder = 'Qty';
        }

        this.calculateTotal();
    }

    addItem() {
        const container = document.getElementById('items-container');
        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';
        itemRow.innerHTML = `
            <div class="row">
                <div class="col-md-4">
                    <input type="text" class="form-control" placeholder="Description" name="description" required>
                </div>
                <div class="col-md-2">
                    <select class="form-control" name="type" required onchange="app.handleTypeChange(this)">
                        <option value="">Type</option>
                        ${this.lineItemTypes.map(type => `<option value="${type.value}">${type.label}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control" placeholder="Qty" name="quantity" min="0.1" step="0.1" required>
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control" placeholder="Price" name="price" step="0.01" min="0" required>
                </div>
                <div class="col-md-2">
                    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.parentElement.remove(); app.calculateTotal()">×</button>
                </div>
            </div>
        `;
        container.appendChild(itemRow);
        this.setupFormListeners();
    }

    setupFormListeners() {
        const inputs = document.querySelectorAll('input[name="quantity"], input[name="price"]');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.calculateTotal());
        });
        this.calculateTotal();
    }

    calculateTotal() {
        const items = document.querySelectorAll('.item-row');
        let total = 0;

        items.forEach(item => {
            const quantity = parseFloat(item.querySelector('input[name="quantity"]').value) || 0;
            const price = parseFloat(item.querySelector('input[name="price"]').value) || 0;
            total += quantity * price;
        });

        const totalElement = document.getElementById('total-amount');
        if (totalElement) {
            totalElement.textContent = total.toFixed(2);
        }
    }

    logout() {
        // Remove authentication from localStorage
        localStorage.removeItem('invoiceAppAuth');
        this.isAuthenticated = false;

        // Update navigation visibility
        this.updateNavVisibility();

        // Show login form
        this.showLoginForm();

        // Clear any loaded data
        this.invoices = [];
        this.quotes = [];
    }

    getFormData() {
        const clientName = document.getElementById('clientName').value;
        const clientEmail = document.getElementById('clientEmail').value;
        const dueDate = document.getElementById('dueDate')?.value;
        const validUntil = document.getElementById('validUntil')?.value;
        const status = document.getElementById('status')?.value;
        const workDescription = document.getElementById('workDescription')?.value;

        const items = [];
        const itemRows = document.querySelectorAll('.item-row');

        itemRows.forEach(row => {
            const description = row.querySelector('input[name="description"]').value;
            const type = row.querySelector('select[name="type"]').value;
            const quantity = parseFloat(row.querySelector('input[name="quantity"]').value);
            const price = parseFloat(row.querySelector('input[name="price"]').value);

            if (description && type && quantity && price) {
                items.push({
                    description,
                    type,
                    quantity,
                    price,
                    total: quantity * price
                });
            }
        });

        const total = items.reduce((sum, item) => sum + item.total, 0);

        const formData = {
            clientName,
            clientEmail,
            items,
            total
        };

        if (dueDate) formData.dueDate = dueDate;
        if (validUntil) formData.validUntil = validUntil;
        if (status) formData.status = status;
        if (workDescription) formData.workDescription = workDescription;

        return formData;
    }

    async submitInvoice(event, invoiceId = '') {
        event.preventDefault();

        const formData = this.getFormData();
        const isEditing = !!invoiceId;

        try {
            const url = isEditing ? `/api/invoices/${invoiceId}` : '/api/invoices';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                await this.loadData();
                this.showInvoices();
                alert(`Invoice ${isEditing ? 'updated' : 'created'} successfully!`);
            } else {
                alert(`Error ${isEditing ? 'updating' : 'creating'} invoice`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert(`Error ${isEditing ? 'updating' : 'creating'} invoice`);
        }
    }

    async submitQuote(event, quoteId = '') {
        event.preventDefault();

        const formData = this.getFormData();
        const isEditing = !!quoteId;

        try {
            const url = isEditing ? `/api/quotes/${quoteId}` : '/api/quotes';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                await this.loadData();
                this.showQuotes();
                alert(`Quote ${isEditing ? 'updated' : 'created'} successfully!`);
            } else {
                alert(`Error ${isEditing ? 'updating' : 'creating'} quote`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert(`Error ${isEditing ? 'updating' : 'creating'} quote`);
        }
    }

    async submitConfiguration(event) {
        event.preventDefault();

        const configData = {
            businessName: document.getElementById('businessName').value,
            ownerName: document.getElementById('ownerName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            website: document.getElementById('website').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            zipCode: document.getElementById('zipCode').value,
            hourlyRate: parseFloat(document.getElementById('hourlyRate').value) || 0
        };

        try {
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(configData)
            });

            if (response.ok) {
                this.businessConfig = await response.json();
                alert('Configuration saved successfully!');
                this.showDashboard();
            } else {
                alert('Error saving configuration');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error saving configuration');
        }
    }

    async convertQuoteToInvoice(quoteId) {
        try {
            const response = await fetch(`/api/quotes/${quoteId}/convert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                await this.loadData();
                this.showQuotes();
                alert('Quote converted to invoice successfully!');
            } else {
                alert('Error converting quote to invoice');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error converting quote to invoice');
        }
    }

    // PDF download functionality
    downloadPDF(id, type) {
        const url = `/api/${type}s/${id}/pdf`;
        window.open(url, '_blank');
    }

    // Delete an invoice
    async deleteInvoice(invoiceId) {
        if (!confirm('Are you sure you want to delete this invoice?')) {
            return;
        }

        try {
            const response = await fetch(`/api/invoices/${invoiceId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                // Remove the invoice from the local array
                this.invoices = this.invoices.filter(invoice => invoice.id !== invoiceId);

                // Refresh the invoices view
                this.showInvoices();

                // Show success message
                alert('Invoice deleted successfully');
            } else {
                alert('Error deleting invoice');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting invoice');
        }
    }

    // Delete a quote
    async deleteQuote(quoteId) {
        if (!confirm('Are you sure you want to delete this quote?')) {
            return;
        }

        try {
            const response = await fetch(`/api/quotes/${quoteId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                // Remove the quote from the local array
                this.quotes = this.quotes.filter(quote => quote.id !== quoteId);

                // Refresh the quotes view
                this.showQuotes();

                // Show success message
                alert('Quote deleted successfully');
            } else {
                alert('Error deleting quote');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting quote');
        }
    }

    // Update invoice status
    async updateInvoiceStatus(invoiceId, newStatus) {
        try {
            const response = await fetch(`/api/invoices/${invoiceId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                // Update the invoice status in the local array
                const invoice = this.invoices.find(inv => inv.id === invoiceId);
                if (invoice) {
                    invoice.status = newStatus;
                }

                // Refresh the invoices view
                this.showInvoices();
            } else {
                alert('Error updating invoice status');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error updating invoice status');
        }
    }

    // Update quote status
    async updateQuoteStatus(quoteId, newStatus) {
        try {
            const response = await fetch(`/api/quotes/${quoteId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                // Update the quote status in the local array
                const quote = this.quotes.find(q => q.id === quoteId);
                if (quote) {
                    quote.status = newStatus;
                }

                // Refresh the quotes view
                this.showQuotes();
            } else {
                alert('Error updating quote status');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error updating quote status');
        }
    }
}

// Initialize the app
const app = new InvoiceQuoteApp();

// Global functions for navigation - these are no longer needed since we're using app.method() directly in the HTML
// We're keeping them for backward compatibility
function showDashboard() {
    if (app.isAuthenticated) {
        app.showDashboard();
    }
}

function showInvoices() {
    if (app.isAuthenticated) {
        app.showInvoices();
    }
}

function showQuotes() {
    if (app.isAuthenticated) {
        app.showQuotes();
    }
}