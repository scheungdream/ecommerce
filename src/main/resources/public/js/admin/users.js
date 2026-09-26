import { fetchTableData, deleteEntity, saveEntity } from './api.js';
import { renderFormFields } from './modals.js';

let currentPage = 0;
const pageSize = 20;
let currentData = [];
let bootstrapModal = null;
let isEditMode = false;

const userFields = [
    { name: 'username', label: 'Username', type: 'text', required: true },
    { name: 'password', label: 'Password (leave blank to keep unchange on edit)', type: 'password', required: false },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'role', label: 'Role', type: 'select', options: ['ROLE_USER', 'ROLE_ADMIN'] },
    { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'PENDING'] }
];

async function loadData(page = 0, keyword = '') {
    currentPage = page;
    const tableBody = document.getElementById('tableBody');
    const alertBox = document.getElementById('statusAlert');
    alertBox.classList.add('d-none');

    try {
        const data = await fetchTableData('/api/admin/users', currentPage, pageSize, keyword);
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
        alertBox.textContent = `Error loading users: ${err.message}`;
        alertBox.classList.remove('d-none');
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-danger">Failed to load data.</td></tr>`;
    }
}

function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    if (!data || data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">No records found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = data.map(item => `
    <tr>
      <td class="px-3 fw-semibold">${item.username}</td>
      <td class="px-3 text-muted">${item.email}</td>
      <td class="px-3"><span class="badge bg-light text-dark border">${item.role || 'USER'}</span></td>
      <td class="px-3"><span class="badge bg-primary-subtle text-primary border border-primary-subtle">${item.status || 'ACTIVE'}</span></td>
      <td class="px-3 col-actions">
        <button data-action="edit" data-id="${item.id}" class="btn btn-sm btn-link text-decoration-none p-0 me-2">Edit</button>
        <button data-action="delete" data-id="${item.id}" class="btn btn-sm btn-link text-danger text-decoration-none p-0">Delete</button>
      </td>
    </tr>
  `).join('');

    tableBody.querySelectorAll('button').forEach(btn => {
        const id = parseInt(btn.dataset.id);
        if (btn.dataset.action === 'edit') btn.onclick = () => handleEdit(id);
        if (btn.dataset.action === 'delete') btn.onclick = () => handleDelete(id);
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

async function handleAdd() {
    isEditMode = false;
    document.getElementById('editId').value = '';
    document.getElementById('modalTitle').textContent = 'Create User';
    await renderFormFields(userFields);
    bootstrapModal.show();
}

async function handleEdit(id) {
    isEditMode = true;
    const item = currentData.find(d => d.id === id);
    if (!item) return;

    document.getElementById('editId').value = id;
    document.getElementById('modalTitle').textContent = `Edit User #${id}`;
    await renderFormFields(userFields, item);
    bootstrapModal.show();
}

async function handleDelete(id) {
    if (!confirm(`Are you sure you want to delete #${id}?`)) return;
    try {
        await deleteEntity('/api/admin/users', id);
        await loadData(currentPage);
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    bootstrapModal = new bootstrap.Modal(document.getElementById('createModal'));

    document.getElementById('addBtn').onclick = handleAdd;

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

        const endpoint = isEditMode ? `/api/admin/users/${id}` : '/api/admin/users';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            await saveEntity(endpoint, method, payload);
            bootstrapModal.hide();
            await loadData(currentPage);
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    loadData(0).then();
});