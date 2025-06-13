document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL CHART INSTANCES ---
    let typePieChart, monthlyBarChart;

    // --- DOM ELEMENT REFERENCES ---
    const tableBody = document.querySelector('#transactionsTable tbody');
    const typeFilter = document.getElementById('typeFilter');
    const filterBtn = document.getElementById('filterBtn');
    const searchInput = document.getElementById('searchInput');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const modal = document.getElementById('detailsModal');
    const modalBody = document.getElementById('modalBody');
    const closeModalBtn = document.querySelector('.close-button');

    // --- CHART INITIALIZATION (Creates the canvas but with no data) ---
    function initializeCharts() {
        const pieCtx = document.getElementById('typePieChart').getContext('2d');
        typePieChart = new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    label: 'Transaction Count',
                    data: [],
                    backgroundColor: [ // Add some nice colors
                        '#ffcc00', '#004990', '#e63946', '#f1faee', '#a8dadc',
                        '#457b9d', '#1d3557', '#fb8500', '#023047', '#ffb703'
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Transaction Volume by Type'
                    }
                }
            }
        });

        const barCtx = document.getElementById('monthlyBarChart').getContext('2d');
        monthlyBarChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Spent (RWF)',
                    backgroundColor: '#e63946', // Red for spending
                    data: []
                }, {
                    label: 'Received (RWF)',
                    backgroundColor: '#2a9d8f', // Green for receiving
                    data: []
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'RWF ' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Spending vs. Income'
                    }
                }
            }
        });
    }

    // --- DATA FETCHING ---
    async function loadInitialData() {
        console.log("Fetching initial data for dashboard...");
        try {
            const [transactions, summary] = await Promise.all([
                fetch('/api/transactions').then(res => res.json()),
                fetch('/api/summary').then(res => res.json())
            ]);

            console.log("Data received:", { transactions, summary });

            // Now that data is here, populate everything
            renderTable(transactions);
            updateAllCharts(summary);
            populateTypeFilter(summary.by_type);

        } catch (error) {
            console.error("Failed to load initial data:", error);
            tableBody.innerHTML = '<tr><td colspan="6">Error loading data. Please check the console.</td></tr>';
        }
    }
    
    // --- RENDERING AND UPDATING FUNCTIONS ---
    function renderTable(transactions) {
        tableBody.innerHTML = '';
        if (!transactions || transactions.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">No transactions found for the selected criteria.</td></tr>';
            return;
        }

        transactions.forEach(tx => {
            const row = document.createElement('tr');
            const counterparty = tx.recipient_name || tx.sender_name || 'N/A';
            const formattedType = tx.type ? tx.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown';
            
            row.innerHTML = `
                <td>${new Date(tx.timestamp).toLocaleString()}</td>
                <td>${formattedType}</td>
                <td>${tx.amount ? tx.amount.toLocaleString() : 'N/A'}</td>
                <td>${tx.fee ? tx.fee.toLocaleString() : 0}</td>
                <td>${counterparty}</td>
                <td><button class="details-btn" data-raw-message="${escape(tx.raw_message)}">View</button></td>
            `;
            tableBody.appendChild(row);
        });
    }

    function updateAllCharts(summary) {
        // Update Pie Chart
        const pieData = summary.by_type;
        typePieChart.data.labels = pieData.map(d => d.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
        typePieChart.data.datasets[0].data = pieData.map(d => d.count);
        typePieChart.update();

        // Update Bar Chart
        const barData = summary.by_month;
        monthlyBarChart.data.labels = barData.map(d => d.month);
        monthlyBarChart.data.datasets[0].data = barData.map(d => d.total_spent);
        monthlyBarChart.data.datasets[1].data = barData.map(d => d.total_received);
        monthlyBarChart.update();
    }

    function populateTypeFilter(summaryData) {
        if (typeFilter.options.length > 1) return; // Prevent re-populating
        const types = [...new Set(summaryData.map(item => item.type))];
        types.sort().forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            typeFilter.appendChild(option);
        });
    }

    // --- FILTERING LOGIC ---
    async function applyFilters() {
        const params = new URLSearchParams();
        if (typeFilter.value) params.append('type', typeFilter.value);
        if (startDateInput.value) params.append('start_date', startDateInput.value);
        if (endDateInput.value) params.append('end_date', endDateInput.value);
        if (searchInput.value) params.append('search', searchInput.value);

        try {
            const response = await fetch(`/api/transactions?${params.toString()}`);
            const transactions = await response.json();
            renderTable(transactions);
        } catch (error) {
            console.error("Error applying filters:", error);
        }
    }

    // --- EVENT LISTENERS ---
    filterBtn.addEventListener('click', applyFilters);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') applyFilters();
    });
    
    // Modal logic
    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target === modal) modal.style.display = 'none';
    });
    tableBody.addEventListener('click', (event) => {
        if (event.target.classList.contains('details-btn')) {
            const rawMessage = unescape(event.target.getAttribute('data-raw-message'));
            modalBody.textContent = rawMessage;
            modal.style.display = 'block';
        }
    });

    // --- INITIALIZE AND LOAD DASHBOARD ---
    initializeCharts();
    loadInitialData();
});