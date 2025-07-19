const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Set up password protection
const APP_PASSWORD = process.env.APP_PASSWORD || 'admin123'; // Default password if not set in .env

// Import models
const TestModel = require('./models/TestModel');
const BusinessConfig = require('./models/BusinessConfig');
const Invoice = require('./models/Invoice');
const Quote = require('./models/Quote');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB Atlas');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });

// MongoDB will handle storage - removing in-memory arrays

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Serve main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API routes
app.get('/api/invoices', async (req, res) => {
    try {
        const invoices = await Invoice.find().sort({ createdAt: -1 });
        res.json(invoices);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

app.get('/api/quotes', async (req, res) => {
    try {
        const quotes = await Quote.find().sort({ createdAt: -1 });
        res.json(quotes);
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ error: 'Failed to fetch quotes' });
    }
});

app.get('/api/dashboard', async (req, res) => {
    try {
        const [invoices, quotes] = await Promise.all([
            Invoice.find().sort({ createdAt: -1 }),
            Quote.find().sort({ createdAt: -1 })
        ]);
        res.json({ invoices, quotes });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

app.post('/api/invoices', async (req, res) => {
    try {
        const invoiceData = {
            id: uuidv4(),
            number: `INV-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            dueDate: req.body.dueDate,
            clientName: req.body.clientName,
            clientEmail: req.body.clientEmail,
            vehicleInformation: req.body.vehicleInformation || {},
            items: req.body.items || [],
            workDescription: req.body.workDescription || '',
            total: parseFloat(req.body.total || 0),
            status: 'pending'
        };

        const invoice = new Invoice(invoiceData);
        await invoice.save();

        res.json(invoice);
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

app.post('/api/quotes', async (req, res) => {
    try {
        const quoteData = {
            id: uuidv4(),
            number: `QUO-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            validUntil: req.body.validUntil,
            clientName: req.body.clientName,
            clientEmail: req.body.clientEmail,
            vehicleInformation: req.body.vehicleInformation || {},
            items: req.body.items || [],
            total: parseFloat(req.body.total || 0),
            status: 'pending'
        };

        const quote = new Quote(quoteData);
        await quote.save();

        res.json(quote);
    } catch (error) {
        console.error('Error creating quote:', error);
        res.status(500).json({ error: 'Failed to create quote' });
    }
});

// Edit invoice endpoint
app.put('/api/invoices/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findOne({ id: req.params.id });
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Update invoice fields
        invoice.dueDate = req.body.dueDate;
        invoice.clientName = req.body.clientName;
        invoice.clientEmail = req.body.clientEmail;
        invoice.vehicleInformation = req.body.vehicleInformation || {};
        invoice.items = req.body.items || [];
        invoice.workDescription = req.body.workDescription || '';
        invoice.total = parseFloat(req.body.total || 0);
        if (req.body.status) {
            invoice.status = req.body.status;
        }

        await invoice.save();
        res.json(invoice);
    } catch (error) {
        console.error('Error updating invoice:', error);
        res.status(500).json({ error: 'Failed to update invoice' });
    }
});

// Edit quote endpoint
app.put('/api/quotes/:id', async (req, res) => {
    try {
        const quote = await Quote.findOne({ id: req.params.id });
        if (!quote) {
            return res.status(404).json({ error: 'Quote not found' });
        }

        // Update quote fields
        quote.validUntil = req.body.validUntil;
        quote.clientName = req.body.clientName;
        quote.clientEmail = req.body.clientEmail;
        quote.vehicleInformation = req.body.vehicleInformation || {};
        quote.items = req.body.items || [];
        quote.total = parseFloat(req.body.total || 0);
        if (req.body.status) {
            quote.status = req.body.status;
        }

        await quote.save();
        res.json(quote);
    } catch (error) {
        console.error('Error updating quote:', error);
        res.status(500).json({ error: 'Failed to update quote' });
    }
});

// Get single invoice endpoint
app.get('/api/invoices/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findOne({ id: req.params.id });
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        res.json(invoice);
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

// Get single quote endpoint
app.get('/api/quotes/:id', async (req, res) => {
    try {
        const quote = await Quote.findOne({ id: req.params.id });
        if (!quote) {
            return res.status(404).json({ error: 'Quote not found' });
        }
        res.json(quote);
    } catch (error) {
        console.error('Error fetching quote:', error);
        res.status(500).json({ error: 'Failed to fetch quote' });
    }
});

// Convert quote to invoice
app.post('/api/quotes/:id/convert', async (req, res) => {
    try {
        const quote = await Quote.findOne({ id: req.params.id });
        if (!quote) {
            return res.status(404).json({ error: 'Quote not found' });
        }

        // Create new invoice from quote
        const invoiceData = {
            id: uuidv4(),
            number: `INV-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            dueDate: req.body.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            clientName: quote.clientName,
            clientEmail: quote.clientEmail,
            vehicleInformation: quote.vehicleInformation || {},
            items: quote.items,
            total: quote.total,
            status: 'pending'
        };

        const invoice = new Invoice(invoiceData);
        await invoice.save();

        // Update quote status
        quote.status = 'converted';
        await quote.save();

        res.json(invoice);
    } catch (error) {
        console.error('Error converting quote to invoice:', error);
        res.status(500).json({ error: 'Failed to convert quote to invoice' });
    }
});

// Update invoice status endpoint
app.put('/api/invoices/:id/status', async (req, res) => {
    try {
        const invoice = await Invoice.findOne({ id: req.params.id });
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Update status only
        invoice.status = req.body.status;
        await invoice.save();

        res.json(invoice);
    } catch (error) {
        console.error('Error updating invoice status:', error);
        res.status(500).json({ error: 'Failed to update invoice status' });
    }
});

// Update quote status endpoint
app.put('/api/quotes/:id/status', async (req, res) => {
    try {
        const quote = await Quote.findOne({ id: req.params.id });
        if (!quote) {
            return res.status(404).json({ error: 'Quote not found' });
        }

        // Update status only
        quote.status = req.body.status;
        await quote.save();

        res.json(quote);
    } catch (error) {
        console.error('Error updating quote status:', error);
        res.status(500).json({ error: 'Failed to update quote status' });
    }
});

// Delete invoice endpoint
app.delete('/api/invoices/:id', async (req, res) => {
    try {
        const result = await Invoice.deleteOne({ id: req.params.id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        res.json({ success: true, message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('Error deleting invoice:', error);
        res.status(500).json({ error: 'Failed to delete invoice' });
    }
});

// Delete quote endpoint
app.delete('/api/quotes/:id', async (req, res) => {
    try {
        const result = await Quote.deleteOne({ id: req.params.id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Quote not found' });
        }

        res.json({ success: true, message: 'Quote deleted successfully' });
    } catch (error) {
        console.error('Error deleting quote:', error);
        res.status(500).json({ error: 'Failed to delete quote' });
    }
});

// Line item types
const lineItemTypes = [
    { value: 'parts', label: 'Parts' },
    { value: 'labor', label: 'Labor' },
    { value: 'fee', label: 'Fee' }
];

// Configuration routes
app.get('/api/config', async (req, res) => {
    try {
        let config = await BusinessConfig.findOne();
        if (!config) {
            // Create default config if none exists
            config = new BusinessConfig({});
            await config.save();
        }
        res.json(config);
    } catch (error) {
        console.error('Error fetching business config:', error);
        res.status(500).json({ error: 'Failed to fetch business configuration' });
    }
});

app.post('/api/config', async (req, res) => {
    try {
        let config = await BusinessConfig.findOne();
        if (!config) {
            // Create new config if none exists
            config = new BusinessConfig(req.body);
        } else {
            // Update existing config
            Object.assign(config, req.body);
        }
        await config.save();
        res.json(config);
    } catch (error) {
        console.error('Error saving business config:', error);
        res.status(500).json({ error: 'Failed to save business configuration' });
    }
});

// Line item types endpoint
app.get('/api/line-item-types', (req, res) => {
    res.json(lineItemTypes);
});

// Password verification endpoint
app.post('/api/verify-password', (req, res) => {
    const { password } = req.body;

    if (password === APP_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

// PDF generation routes
app.get('/api/invoices/:id/pdf', async (req, res) => {
    try {
        const invoice = await Invoice.findOne({ id: req.params.id });
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const config = await BusinessConfig.findOne() || {};
        const html = generatePDFHTML(invoice, 'invoice', config);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('Error generating invoice PDF:', error);
        res.status(500).json({ error: 'Failed to generate invoice PDF' });
    }
});

app.get('/api/quotes/:id/pdf', async (req, res) => {
    try {
        const quote = await Quote.findOne({ id: req.params.id });
        if (!quote) {
            return res.status(404).json({ error: 'Quote not found' });
        }

        const config = await BusinessConfig.findOne() || {};
        const html = generatePDFHTML(quote, 'quote', config);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('Error generating quote PDF:', error);
        res.status(500).json({ error: 'Failed to generate quote PDF' });
    }
});

// PDF HTML generation function
function generatePDFHTML(document, type, config) {
    const isInvoice = type === 'invoice';
    const title = isInvoice ? 'INVOICE' : 'QUOTE';
    const dateLabel = isInvoice ? 'Due Date' : 'Valid Until';
    const dateValue = isInvoice ? document.dueDate : document.validUntil;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${document.number}</title>
        <style>
            @media print {
                body { margin: 0; }
                .no-print { display: none; }
            }
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #333;
                line-height: 1.4;
            }
            .header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                border-bottom: 2px solid #007bff;
                padding-bottom: 20px;
            }
            .business-info {
                flex: 1;
            }
            .business-name {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 5px;
            }
            .business-details {
                font-size: 14px;
                color: #666;
            }
            .document-info {
                text-align: right;
                flex: 1;
            }
            .document-title {
                font-size: 32px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 10px;
            }
            .document-number {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            .client-section {
                margin-bottom: 30px;
            }
            .section-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #007bff;
            }
            .client-info {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
            }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
            }
            .items-table th {
                background: #007bff;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: bold;
            }
            .items-table td {
                padding: 10px 12px;
                border-bottom: 1px solid #dee2e6;
            }
            .items-table tr:nth-child(even) {
                background: #f8f9fa;
            }
            .text-right {
                text-align: right;
            }
            .text-center {
                text-align: center;
            }
            .total-section {
                margin-top: 20px;
                text-align: right;
            }
            .total-row {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 5px;
            }
            .total-label {
                width: 150px;
                font-weight: bold;
                padding: 5px 10px;
            }
            .total-value {
                width: 100px;
                padding: 5px 10px;
                text-align: right;
            }
            .grand-total {
                border-top: 2px solid #007bff;
                font-size: 18px;
                font-weight: bold;
                color: #007bff;
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
                font-size: 12px;
                color: #666;
                text-align: center;
            }
            .print-button {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
            }
            .print-button:hover {
                background: #0056b3;
            }
            .work-description {
                margin-top: 30px;
                margin-bottom: 30px;
            }
            .work-description-content {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                white-space: pre-wrap;
                line-height: 1.5;
            }
        </style>
    </head>
    <body>
        <button class="print-button no-print" onclick="window.print()">Print PDF</button>
        
        <div class="header">
            <div class="business-info">
                <div class="business-name">${config.businessName || 'Your Business Name'}</div>
                <div class="business-details">
                    ${config.ownerName ? `<div>${config.ownerName}</div>` : ''}
                    ${config.address ? `<div>${config.address}</div>` : ''}
                    ${config.city || config.state || config.zipCode ? `<div>${config.city}${config.city && config.state ? ', ' : ''}${config.state} ${config.zipCode}</div>` : ''}
                    ${config.phone ? `<div>Phone: ${config.phone}</div>` : ''}
                    ${config.email ? `<div>Email: ${config.email}</div>` : ''}
                    ${config.website ? `<div>Website: ${config.website}</div>` : ''}
                </div>
            </div>
            <div class="document-info">
                <div class="document-title">${title}</div>
                <div class="document-number">${document.number}</div>
                <div>Date: ${document.date}</div>
                <div>${dateLabel}: ${dateValue}</div>
            </div>
        </div>
        
        <div class="client-section">
            <div class="section-title">Bill To:</div>
            <div class="client-info">
                <div><strong>${document.clientName}</strong></div>
                <div>${document.clientEmail}</div>
            </div>
        </div>
        
        ${document.vehicleInformation && (document.vehicleInformation.make || document.vehicleInformation.model || document.vehicleInformation.year || document.vehicleInformation.engine || document.vehicleInformation.milage) ? `
        <div class="client-section">
            <div class="section-title">Vehicle Information:</div>
            <div class="client-info">
                ${document.vehicleInformation.year ? `<div><strong>Year:</strong> ${document.vehicleInformation.year}</div>` : ''}
                ${document.vehicleInformation.make ? `<div><strong>Make:</strong> ${document.vehicleInformation.make}</div>` : ''}
                ${document.vehicleInformation.model ? `<div><strong>Model:</strong> ${document.vehicleInformation.model}</div>` : ''}
                ${document.vehicleInformation.engine ? `<div><strong>Engine:</strong> ${document.vehicleInformation.engine}</div>` : ''}
                ${document.vehicleInformation.milage ? `<div><strong>Mileage:</strong> ${document.vehicleInformation.milage}</div>` : ''}
            </div>
        </div>
        ` : ''}
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Type</th>
                    <th class="text-center">Quantity</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${document.items.map(item => `
                    <tr>
                        <td>${item.description}</td>
                        <td>${item.type ? lineItemTypes.find(t => t.value === item.type)?.label || item.type : 'Other'}</td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-right">${item.price.toFixed(2)}</td>
                        <td class="text-right">${item.total.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="total-section">
            <div class="total-row grand-total">
                <div class="total-label">Total:</div>
                <div class="total-value">${document.total.toFixed(2)}</div>
            </div>
        </div>
        
        ${isInvoice && document.workDescription ? `
        <div class="work-description">
            <div class="section-title">Work Description:</div>
            <div class="work-description-content">${document.workDescription}</div>
        </div>
        ` : ''}
        
        <div class="footer">
            <div>Thank you for your business!</div>
            ${isInvoice ? '<div>Payment is due by the due date specified above.</div>' : '<div>This quote is valid until the date specified above.</div>'}
        </div>
    </body>
    </html>
    `;
}

// Admin endpoints for MongoDB testing
app.get('/admin', async (req, res) => {
    try {
        // Store a test value
        const testData = new TestModel({
            key: `test-${Date.now()}`,
            value: {
                message: 'Hello MongoDB!',
                timestamp: new Date(),
                randomNumber: Math.floor(Math.random() * 1000)
            }
        });

        await testData.save();

        res.json({
            success: true,
            message: 'Test data stored successfully',
            data: testData
        });
    } catch (error) {
        console.error('Error storing test data:', error);
        res.status(500).json({
            success: false,
            message: 'Error storing test data',
            error: error.message
        });
    }
});

app.get('/admin-pull', async (req, res) => {
    try {
        // Retrieve first 3 entries from database
        const testData = await TestModel.find()
            .sort({ createdAt: -1 }) // Sort by newest first
            .limit(3);

        res.json({
            success: true,
            message: `Retrieved ${testData.length} entries`,
            data: testData
        });
    } catch (error) {
        console.error('Error retrieving test data:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving test data',
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});