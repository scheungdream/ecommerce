import { fetchTableData } from './api.js';

let rawOrders = [];
let chartInstance = null;
let currentRange = '3m';

async function initOverview() {
    const alertBox = document.getElementById('statusAlert');
    alertBox.classList.add('d-none');

    try {
        const data = await fetchTableData('/api/admin/orders', 0, 1000);
        rawOrders = data.content || data || [];

        document.querySelectorAll('#rangeSelector button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#rangeSelector button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentRange = e.target.dataset.range;
                updateOverview();
            });
        });

        updateOverview();
    } catch (err) {
        alertBox.textContent = `Error loading overview data: ${err.message}`;
        alertBox.classList.remove('d-none');
    }
}

function updateOverview() {
    const now = new Date();
    let startDate = new Date();

    if (currentRange === '3m') {
        startDate.setMonth(now.getMonth() - 2);
        startDate.setDate(1);
    } else if (currentRange === '6m') {
        startDate.setMonth(now.getMonth() - 5);
        startDate.setDate(1);
    } else if (currentRange === '1y') {
        startDate.setFullYear(now.getFullYear() - 1);
        startDate.setDate(1);
    } else if (currentRange === 'ytd') {
        startDate = new Date(now.getFullYear(), 0, 1);
    }

    startDate.setHours(0, 0, 0, 0);

    const filteredOrders = rawOrders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= startDate && orderDate <= now;
    });

    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
    const totalOrdersCount = filteredOrders.length;

    const rangeLabel = { '3m': '3M', '6m': '6M', '1y': '1Y', 'ytd': 'YTD' }[currentRange];
    document.getElementById('revenueCardTitle').textContent = `Total Revenue (${rangeLabel})`;
    document.getElementById('ordersCardTitle').textContent = `Total Orders (${rangeLabel})`;
    document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('totalOrders').textContent = totalOrdersCount.toString();

    const monthlyData = generateMonthlyBuckets(startDate, now);

    filteredOrders.forEach(o => {
        const orderDate = new Date(o.createdAt);
        const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[monthKey] !== undefined) {
            monthlyData[monthKey] += (Number(o.totalAmount) || 0);
        }
    });

    renderChart(Object.keys(monthlyData), Object.values(monthlyData));
}

function generateMonthlyBuckets(startDate, endDate) {
    const buckets = {};
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (current <= endDate) {
        const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        buckets[key] = 0;
        current.setMonth(current.getMonth() + 1);
    }
    return buckets;
}

function renderChart(labels, values) {
    const ctx = document.getElementById('revenueChart').getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue ($)',
                data: values,
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Revenue: $${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', initOverview);