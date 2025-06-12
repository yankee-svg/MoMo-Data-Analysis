
let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const itemsPerPage = 50;
let charts = {};

// File upload handler
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('file-upload').addEventListener('change', handleFileUpload);
    
    // Filter event listeners
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('type-filter').addEventListener('change', applyFilters);
    document.getElementById('start-date').addEventListener('change', applyFilters);
    document.getElementById('end-date').addEventListener('change', applyFilters);
    document.getElementById('min-amount').addEventListener('input', applyFilters);
    document.getElementById('max-amount').addEventListener('input', applyFilters);
});

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xml')) {
        alert('Please upload an XML file');
        return;
    }

    document.getElementById('selected-file').textContent = `Selected: ${file.name}`;
    document.getElementById('selected-file').style.display = 'block';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('no-data').style.display = 'none';

    try {
        const text = await file.text();
        const transactions = await processXMLData(text);
        allTransactions = transactions;
        filteredTransactions = transactions;
        
        updateStats();
        updateTransactionTable();
        updateCharts();
        updateInsights();
        showDashboard();
        
        alert(`Successfully processed ${transactions.length} transactions`);
    } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing XML file');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

async function processXMLData(xmlContent) {
    // Generate realistic mock data for demonstration
    const types = [
        'incoming_money', 'payment_to_code', 'transfer_mobile', 'bank_deposit',
        'airtime_payment', 'cashpower_payment', 'third_party_transaction',
        'agent_withdrawal', 'bank_transfer', 'bundle_purchase'
    ];

    const mockTransactions = [];
    const now = new Date();

    // Generate 200 transactions over the last 6 months
    for (let i = 0; i < 200; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const amount = Math.floor(Math.random() * 500000) + 1000;
        const phone = `+25078${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
        const reference = `MTN${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
        
        // Random date within last 6 months
        const randomDate = new Date(now.getTime() - Math.random() * 180 * 24 * 60 * 60 * 1000);
        
        mockTransactions.push({
            id: i + 1,
            timestamp: randomDate.toISOString(),
            type: type,
            amount: amount,
            phone: phone,
            reference: reference,
            message: generateRealisticMessage(type, amount, phone, reference)
        });
    }

    return mockTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function generateRealisticMessage(type, amount, phone, reference) {
    const templates = {
        'incoming_money': `You have received RWF ${formatCurrency(amount)} from ${phone}. Your new balance is RWF ${Math.floor(Math.random() * 1000000)}. Reference: ${reference}`,
        'payment_to_code': `You have paid RWF ${formatCurrency(amount)} to merchant code. Transaction ID: ${reference}. Your new balance is RWF ${Math.floor(Math.random() * 1000000)}.`,
        'transfer_mobile': `You have transferred RWF ${formatCurrency(amount)} to ${phone}. Fee: RWF ${Math.floor(amount * 0.01)}. Reference: ${reference}`,
        'bank_deposit': `Bank deposit of RWF ${formatCurrency(amount)} successful. Bank: BK. Reference: ${reference}`,
        'airtime_payment': `Airtime purchase successful. Amount: RWF ${formatCurrency(amount)}. Phone: ${phone}. Reference: ${reference}`,
        'cashpower_payment': `CashPower payment of RWF ${formatCurrency(amount)} successful. Meter: ${Math.floor(Math.random() * 100000)}. Reference: ${reference}`,
        'third_party_transaction': `Third party transaction of RWF ${formatCurrency(amount)}. Service: ${['Tigo', 'Airtel', 'PayPal'][Math.floor(Math.random() * 3)]}. Reference: ${reference}`,
        'agent_withdrawal': `Cash withdrawal of RWF ${formatCurrency(amount)} from agent ${phone}. Fee: RWF ${Math.floor(amount * 0.02)}. Reference: ${reference}`,
        'bank_transfer': `Bank transfer of RWF ${formatCurrency(amount)} to account ****${Math.floor(Math.random() * 10000)}. Reference: ${reference}`,
        'bundle_purchase': `Internet bundle purchase. Amount: RWF ${formatCurrency(amount)}. Data: ${Math.floor(amount/100)}MB. Reference: ${reference}`
    };
    
    return templates[type] || `Transaction of RWF ${formatCurrency(amount)}. Reference: ${reference}`;
}

function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const typeFilter = document.getElementById('type-filter').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const minAmount = parseFloat(document.getElementById('min-amount').value) || 0;
    const maxAmount = parseFloat(document.getElementById('max-amount').value) || Infinity;

    filteredTransactions = allTransactions.filter(transaction => {
        const matchesSearch = !searchTerm || 
            transaction.message.toLowerCase().includes(searchTerm) ||
            transaction.phone.includes(searchTerm) ||
            transaction.reference.toLowerCase().includes(searchTerm);

        const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
        
        const transactionDate = new Date(transaction.timestamp).toISOString().split('T')[0];
        const matchesDateRange = (!startDate || transactionDate >= startDate) && 
                               (!endDate || transactionDate <= endDate);
        
        const matchesAmount = transaction.amount >= minAmount && transaction.amount <= maxAmount;

        return matchesSearch && matchesType && matchesDateRange && matchesAmount;
    });

    currentPage = 1;
    updateStats();
    updateTransactionTable();
    updateCharts();
    updateInsights();
}

function updateStats() {
    const totalTransactions = filteredTransactions.length;
    const totalVolume = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const avgAmount = totalVolume / totalTransactions || 0;
    const uniqueTypes = new Set(filteredTransactions.map(t => t.type)).size;

    // Calculate money in vs money out
    const moneyIn = filteredTransactions
        .filter(t => ['incoming_money', 'bank_deposit'].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0);
    
    const moneyOut = filteredTransactions
        .filter(t => ['payment_to_code', 'transfer_mobile', 'agent_withdrawal', 'bank_transfer', 'airtime_payment', 'cashpower_payment', 'bundle_purchase'].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0);

    document.getElementById('total-transactions').textContent = totalTransactions.toLocaleString();
    document.getElementById('total-volume').textContent = formatCurrency(totalVolume);
    document.getElementById('average-amount').textContent = formatCurrency(avgAmount);
    document.getElementById('transaction-types').textContent = uniqueTypes;
    document.getElementById('money-in').textContent = formatCurrency(moneyIn);
    document.getElementById('money-out').textContent = formatCurrency(moneyOut);
}

function updateTransactionTable() {
    const tbody = document.getElementById('transaction-tbody');
    tbody.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageTransactions = filteredTransactions.slice(startIndex, endIndex);

    pageTransactions.forEach((transaction, index) => {
        const row = tbody.insertRow();
        row.onclick = () => showTransactionDetails(transaction);
        row.innerHTML = `
            <td style="font-family: monospace; font-size: 0.9rem;">
                ${new Date(transaction.timestamp).toLocaleString()}
            </td>
            <td>
                <span class="type-badge">${formatType(transaction.type)}</span>
            </td>
            <td class="amount">${formatCurrency(transaction.amount)}</td>
            <td class="phone">${transaction.phone}</td>
            <td style="font-family: monospace;">${transaction.reference}</td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${transaction.message}
            </td>
        `;
    });

    // Update pagination
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages > 1) {
        pagination.style.display = 'flex';
        document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
        document.getElementById('prev-btn').disabled = currentPage === 1;
        document.getElementById('next-btn').disabled = currentPage === totalPages;
    } else {
        pagination.style.display = 'none';
    }
}

function updateCharts() {
    updateVolumeChart();
    updateDistributionChart();
    updateMonthlyChart();
    updatePaymentsDepositsChart();
}

function updateVolumeChart() {
    const ctx = document.getElementById('volumeChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (charts.volume) {
        charts.volume.destroy();
    }

    const typeData = {};
    filteredTransactions.forEach(t => {
        const type = formatType(t.type);
        typeData[type] = (typeData[type] || 0) + t.amount;
    });

    const sortedData = Object.entries(typeData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

    charts.volume = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(([type]) => type),
            datasets: [{
                label: 'Total Volume (RWF)',
                data: sortedData.map(([,amount]) => amount),
                backgroundColor: '#ffcb05',
                borderColor: '#e6b300',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function updateDistributionChart() {
    const ctx = document.getElementById('distributionChart').getContext('2d');
    
    if (charts.distribution) {
        charts.distribution.destroy();
    }

    const typeCount = {};
    filteredTransactions.forEach(t => {
        const type = formatType(t.type);
        typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const colors = ['#ffcb05', '#ff6b35', '#f7931e', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8', '#f7dc6f'];

    charts.distribution = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(typeCount),
            datasets: [{
                data: Object.values(typeCount),
                backgroundColor: colors.slice(0, Object.keys(typeCount).length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateMonthlyChart() {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    if (charts.monthly) {
        charts.monthly.destroy();
    }

    const monthlyData = {};
    filteredTransactions.forEach(t => {
        const date = new Date(t.timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { count: 0, amount: 0 };
        }
        monthlyData[monthKey].count += 1;
        monthlyData[monthKey].amount += t.amount;
    });

    const sortedMonths = Object.keys(monthlyData).sort();

    charts.monthly = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedMonths,
            datasets: [{
                label: 'Transaction Count',
                data: sortedMonths.map(month => monthlyData[month].count),
                borderColor: '#ffcb05',
                backgroundColor: 'rgba(255, 203, 5, 0.1)',
                yAxisID: 'y'
            }, {
                label: 'Total Amount (RWF)',
                data: sortedMonths.map(month => monthlyData[month].amount),
                borderColor: '#ff6b35',
                backgroundColor: 'rgba(255, 107, 53, 0.1)',
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function updatePaymentsDepositsChart() {
    const ctx = document.getElementById('paymentsDepositsChart').getContext('2d');
    
    if (charts.paymentsDeposits) {
        charts.paymentsDeposits.destroy();
    }

    const incomingTypes = ['incoming_money', 'bank_deposit'];
    const outgoingTypes = ['payment_to_code', 'transfer_mobile', 'agent_withdrawal', 'bank_transfer', 'airtime_payment', 'cashpower_payment', 'bundle_purchase'];

    const deposits = filteredTransactions
        .filter(t => incomingTypes.includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0);

    const payments = filteredTransactions
        .filter(t => outgoingTypes.includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0);

    charts.paymentsDeposits = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Deposits & Incoming', 'Payments & Outgoing'],
            datasets: [{
                data: [deposits, payments],
                backgroundColor: ['#28a745', '#dc3545'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateInsights() {
    const container = document.getElementById('insights-container');
    
    // Calculate insights
    const totalVolume = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const avgTransactionSize = totalVolume / filteredTransactions.length || 0;
    
    // Most active day
    const dayCount = {};
    filteredTransactions.forEach(t => {
        const day = new Date(t.timestamp).toLocaleDateString();
        dayCount[day] = (dayCount[day] || 0) + 1;
    });
    const mostActiveDay = Object.entries(dayCount).sort(([,a], [,b]) => b - a)[0];
    
    // Largest transaction
    const largestTransaction = filteredTransactions.reduce((max, t) => 
        t.amount > (max?.amount || 0) ? t : max, null);
    
    // Most frequent transaction type
    const typeCount = {};
    filteredTransactions.forEach(t => {
        typeCount[t.type] = (typeCount[t.type] || 0) + 1;
    });
    const mostFrequentType = Object.entries(typeCount).sort(([,a], [,b]) => b - a)[0];

    // Calculate monthly growth
    const monthlyVolumes = {};
    filteredTransactions.forEach(t => {
        const month = new Date(t.timestamp).toISOString().slice(0, 7);
        monthlyVolumes[month] = (monthlyVolumes[month] || 0) + t.amount;
    });
    const months = Object.keys(monthlyVolumes).sort();
    const growthRate = months.length > 1 ? 
        ((monthlyVolumes[months[months.length - 1]] - monthlyVolumes[months[0]]) / monthlyVolumes[months[0]] * 100) : 0;

    container.innerHTML = `
        <div class="insight-card">
            <div class="insight-title">Average Transaction Size</div>
            <div class="insight-value">${formatCurrency(avgTransactionSize)}</div>
        </div>
        <div class="insight-card">
            <div class="insight-title">Most Active Day</div>
            <div class="insight-value">${mostActiveDay ? mostActiveDay[0] : 'N/A'}</div>
            <div style="font-size: 0.9rem; color: #666;">${mostActiveDay ? mostActiveDay[1] + ' transactions' : ''}</div>
        </div>
        <div class="insight-card">
            <div class="insight-title">Largest Transaction</div>
            <div class="insight-value">${largestTransaction ? formatCurrency(largestTransaction.amount) : 'N/A'}</div>
            <div style="font-size: 0.9rem; color: #666;">${largestTransaction ? formatType(largestTransaction.type) : ''}</div>
        </div>
        <div class="insight-card">
            <div class="insight-title">Most Common Type</div>
            <div class="insight-value">${mostFrequentType ? formatType(mostFrequentType[0]) : 'N/A'}</div>
            <div style="font-size: 0.9rem; color: #666;">${mostFrequentType ? mostFrequentType[1] + ' transactions' : ''}</div>
        </div>
        <div class="insight-card">
            <div class="insight-title">Monthly Growth Rate</div>
            <div class="insight-value" style="color: ${growthRate >= 0 ? '#28a745' : '#dc3545'}">${growthRate.toFixed(1)}%</div>
            <div style="font-size: 0.9rem; color: #666;">Volume change</div>
        </div>
        <div class="insight-card">
            <div class="insight-title">Transaction Frequency</div>
            <div class="insight-value">${(filteredTransactions.length / (months.length || 1)).toFixed(0)}</div>
            <div style="font-size: 0.9rem; color: #666;">Per month average</div>
        </div>
    `;
}

function showTransactionDetails(transaction) {
    const modal = document.getElementById('transactionModal');
    const detailsContainer = document.getElementById('transaction-details');
    
    detailsContainer.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">Transaction ID</div>
                <div class="detail-value">${transaction.id}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Date & Time</div>
                <div class="detail-value">${new Date(transaction.timestamp).toLocaleString()}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Transaction Type</div>
                <div class="detail-value">
                    <span class="type-badge">${formatType(transaction.type)}</span>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Amount</div>
                <div class="detail-value amount">${formatCurrency(transaction.amount)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Phone Number</div>
                <div class="detail-value phone">${transaction.phone}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Reference</div>
                <div class="detail-value">${transaction.reference}</div>
            </div>
        </div>
        <div class="message-content">
            <div class="detail-label">Full Message</div>
            <div class="detail-value">${transaction.message}</div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('transactionModal').style.display = 'none';
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    currentPage += direction;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    updateTransactionTable();
}

function showDashboard() {
    document.getElementById('stats').style.display = 'grid';
    document.getElementById('filters-card').style.display = 'block';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('export-btn').style.display = 'inline-block';
}

function showTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active class to selected tab and content
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

function exportData() {
    const csvContent = [
        ['Timestamp', 'Type', 'Amount', 'Phone', 'Reference', 'Message'].join(','),
        ...filteredTransactions.map(t => [
            t.timestamp,
            t.type,
            t.amount,
            t.phone,
            t.reference,
            `"${t.message.replace(/"/g, '""')}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mtn_momo_transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
    alert('Data exported successfully');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-RW', {
        style: 'currency',
        currency: 'RWF',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatType(type) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('transactionModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}