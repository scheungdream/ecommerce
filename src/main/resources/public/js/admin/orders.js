import { fetchTableData, saveEntity, formatDate } from './api.js';
import { renderFormFields } from './modals.js';

let currentPage = 0;
const pageSize = 20;
let currentData = [];
let bootstrapModal = null;
let orderDetailModal = null;

function getToken() {
    return localStorage.getItem('token');
}

const orderFields = [
    { name: 'orderNumber', label: 'Order Number', type: 'text', required: true, disabled: true },
    { name: 'receiverName', label: 'Receiver Name', type: 'text', required: true },
    { name: 'receiverPhone', label: 'Receiver Phone', type: 'text', required: true },
    { name: 'shippingAddress', label: 'Shipping Address', type: 'text', required: true },
    { name: 'totalAmount', label: 'Total Amount ($)', type: 'number', step: '0.01', required: true, disabled: true },
    { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'PAID', 'SHIPPED', 'CANCELLED', 'RETURNED'] }
];

async function loadData(page = 0, keyword = '') {
    currentPage = page;
    const tableBody = document.getElementById('tableBody');
    const alertBox = document.getElementById('statusAlert');
    alertBox.classList.add('d-none');

    try {
        const data = await fetchTableData('/api/admin/orders', currentPage, pageSize, keyword);
        if (data.content) {
            currentData = data.content;
            renderTable(currentData);
            renderPagination(data, keyword);
        } else {
            currentData = data;
            renderTable(currentData);
            document.getElementById('pagination').innerHTML = '';
            document.getElementById('pageInfo').textContent = `Total ${data.length} records`;
        }
    } catch (err) {
        alertBox.textContent = `Error loading orders: ${err.message}`;
        alertBox.classList.remove('d-none');
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-danger">Failed to load data.</td></tr>`;
    }
}

function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    if (!data || data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-muted">No records found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = data.map(item => `
    <tr>
      <td class="px-3 fw-semibold">${item.user.username || 'N/A'}</td>
      <td class="px-3 text-muted">${item.user.email || 'N/A'}</td>
      <td class="px-3">${item.receiverName || 'N/A'}</td>
      <td class="px-3 text-muted">${formatDate(item.createdAt)}</td>
      <td class="px-3"><span class="badge bg-success-subtle text-success border border-success-subtle">${item.status || 'COMPLETED'}</span></td>
      <td class="px-3 fw-semibold">$${item.totalAmount || 0}</td>
      <td class="px-3 col-actions">
        <button data-action="view" data-id="${item.id}" class="btn btn-sm btn-link text-decoration-none p-0 me-2"><i class="bi bi-eye"></i> View</button>
        <button data-action="edit" data-id="${item.id}" class="btn btn-sm btn-link text-decoration-none p-0 me-2">Edit</button>
      </td>
    </tr>
  `).join('');

    tableBody.querySelectorAll('button').forEach(btn => {
        const id = parseInt(btn.dataset.id);
        if (btn.dataset.action === 'view') btn.onclick = () => handleViewOrderDetail(id);
        if (btn.dataset.action === 'edit') btn.onclick = () => handleEdit(id);
    });
}

function renderPagination(pageData, keyword = '') {
    const paginationEl = document.getElementById('pagination');
    const pageInfoEl = document.getElementById('pageInfo');
    const totalPages = pageData.totalPages || 1;
    const pageNum = pageData.number || 0;

    pageInfoEl.textContent = `Page ${pageNum + 1} of ${totalPages} (Total ${pageData.totalElements || 0} records)`;
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    let html = `<li class="page-item ${pageNum === 0 ? 'disabled' : ''}"><button class="page-link" id="btnPrev">Previous</button></li>`;
    for (let i = 0; i < totalPages; i++) {
        html += `<li class="page-item ${i === pageNum ? 'active' : ''}"><button class="page-link page-num" data-page="${i}">${i + 1}</button></li>`;
    }
    html += `<li class="page-item ${pageNum >= totalPages - 1 ? 'disabled' : ''}"><button class="page-link" id="btnNext">Next</button></li>`;

    paginationEl.innerHTML = html;

    const btnPrev = document.getElementById('btnPrev');
    if (btnPrev) btnPrev.onclick = () => loadData(pageNum - 1, keyword);
    const btnNext = document.getElementById('btnNext');
    if (btnNext) btnNext.onclick = () => loadData(pageNum + 1, keyword);

    paginationEl.querySelectorAll('.page-num').forEach(btn => {
        btn.onclick = () => loadData(parseInt(btn.dataset.page), keyword);
    });
}

async function handleViewOrderDetail(orderId) {
    const detailBody = document.getElementById('orderDetailBody');
    detailBody.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>`;
    orderDetailModal.show();

    try {
        const token = getToken();
        let order = currentData.find(o => o.id === orderId);
        const res = await fetch(`/api/admin/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (res.ok) order = await res.json();

        if (!order) showToast('Order details not found.', 'error');

        const itemsHtml = (order.orderItems && order.orderItems.length > 0) ? order.orderItems.map(i => `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <img src="${i.productImage}" alt="" class="img-preview border" style="width: 40px; height: 40px;">
            <span>${i.productName || i.name || 'Product'}</span>
          </div>
        </td>
        <td class="text-center">$${i.price || 0}</td>
        <td class="text-center">${i.quantity || 1}</td>
        <td class="text-end fw-semibold">$${((i.price || 0) * (i.quantity || 1)).toFixed(2)}</td>
      </tr>
    `).join('') : `<tr><td colspan="4" class="text-center text-muted py-3">No product items details found.</td></tr>`;

        detailBody.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-6">
          <div class="p-3 bg-light rounded border">
            <h6 class="fw-bold mb-2 text-primary">Order Summary</h6>
            <div class="small"><strong>Order ID:</strong> #${order.id}</div>
            <div class="small"><strong>Order Number:</strong> ${order.orderNumber}</div>
            <div class="small"><strong>Order Date:</strong> ${formatDate(order.orderDate || 'N/A')}</div>
            <div class="small"><strong>Paid At:</strong> ${formatDate(order.paidAt || 'N/A')}</div>
            <div class="small"><strong>Shipped At:</strong> ${formatDate(order.shippedAt || 'N/A')}</div>
            <div class="small"><strong>Status:</strong> <span class="badge bg-success-subtle text-success border border-success-subtle">${order.status || 'COMPLETED'}</span></div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="p-3 bg-light rounded border">
            <h6 class="fw-bold mb-2 text-primary">Receiver Info</h6>
            <div class="small"><strong>Name:</strong> ${order.receiverName || 'N/A'}</div>
            <div class="small"><strong>Phone:</strong> ${order.receiverPhone || 'N/A'}</div>
            <div class="small"><strong>Address:</strong> ${order.shippingAddress || 'N/A'}</div>
          </div>
        </div>
      </div>

      <h6 class="fw-bold mb-3">Purchased Items</h6>
      <div class="table-responsive mb-3">
        <table class="table table-bordered align-middle">
          <thead class="table-light">
            <tr>
              <th>Item</th>
              <th class="text-center" style="width: 100px;">Price</th>
              <th class="text-center" style="width: 80px;">Qty</th>
              <th class="text-end" style="width: 110px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="text-end fw-bold">Total Amount:</td>
              <td class="text-end fw-bold text-danger fs-6">$${order.totalAmount || 0}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
    } catch (err) {
        detailBody.innerHTML = `<div class="alert alert-danger m-0">Failed to load order details: ${err.message}</div>`;
    }
}

async function handleEdit(id) {
    const item = currentData.find(d => d.id === id);
    if (!item) return;

    document.getElementById('editId').value = id;
    document.getElementById('modalTitle').textContent = `Edit Order #${id}`;
    await renderFormFields(orderFields, item);
    bootstrapModal.show();
}

document.addEventListener('DOMContentLoaded', () => {
    bootstrapModal = new bootstrap.Modal(document.getElementById('createModal'));
    orderDetailModal = new bootstrap.Modal(document.getElementById('orderDetailModal'));

    document.getElementById('searchBtn').onclick = () => {
        loadData(0, document.getElementById('searchInput').value.trim()).then();
    };

    document.getElementById('searchInput').onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            loadData(0, document.getElementById('searchInput').value.trim()).then();
        }
    };

    document.getElementById('createForm').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData.entries());
        const id = payload.id;
        delete payload.id;

        try {
            await saveEntity(`/api/admin/orders/${id}`, 'PUT', payload);
            bootstrapModal.hide();
            await loadData(currentPage);
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    loadData(0).then();
});