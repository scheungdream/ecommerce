import { fetchTableData, deleteFile, uploadFile, formatDate } from './api.js';

let currentPage = 0;
const pageSize = 20;

async function loadData(page = 0, keyword = '') {
    currentPage = page;
    const tableBody = document.getElementById('tableBody');
    const alertBox = document.getElementById('statusAlert');
    alertBox.classList.add('d-none');

    try {
        const data = await fetchTableData('/api/admin/files', currentPage, pageSize, keyword);
        renderTable(data);
        document.getElementById('pagination').innerHTML = '';
        document.getElementById('pageInfo').textContent = `Total ${data.length} records`;
    } catch (err) {
        alertBox.textContent = `Error loading files: ${err.message}`;
        alertBox.classList.remove('d-none');
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-danger">Failed to load data.</td></tr>`;
    }
}

function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    if (!data || data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted">No records found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = data.map(item => `
    <tr>
      <td class="px-3">
        <img src="${item.url}" class="img-preview border" alt="${item.name}">
      </td>
      <td class="px-3 fw-semibold">
        <a href="#" data-action="preview" data-url="${item.url}" data-name="${item.name}" class="text-decoration-none">
          ${item.name}
        </a>
      </td>
      <td class="px-3 text-muted">${(item.size / 1024).toFixed(1)} KB</td>
      <td class="px-3 text-muted">${formatDate(item.lastModified)}</td>
      <td class="px-3 col-actions">
        <button data-action="delete" data-name="${item.name}" class="btn btn-sm btn-link text-danger text-decoration-none p-0">Delete</button>
      </td>
    </tr>
  `).join('');

    tableBody.querySelectorAll('[data-action]').forEach(element => {
        const action = element.dataset.action;

        if (action === 'delete') {
            element.onclick = () => handleDelete(element.dataset.name);
        } else if (action === 'preview') {
            element.onclick = (e) => {
                e.preventDefault();
                openPreviewModal(element.dataset.url, element.dataset.name);
            };
        }
    });
}

function openPreviewModal(url, fileName) {
    const modalElement = document.getElementById('imagePreviewModal');
    const modalTitle = document.getElementById('imagePreviewModalLabel');
    const modalImage = document.getElementById('modalPreviewImage');

    modalTitle.textContent = fileName;
    modalImage.src = url;

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalElement);
    bsModal.show();
}

async function handleDelete(fileName) {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;
    try {
        await deleteFile(fileName);
        await loadData(0);
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const uploadInput = document.getElementById('fileUploadInput');

    document.getElementById('addBtn').onclick = () => uploadInput.click();

    uploadInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            await uploadFile(file);
            e.target.value = '';
            await loadData(0);
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    document.getElementById('searchBtn').onclick = () => {
        loadData(0, document.getElementById('searchInput').value.trim()).then();
    };

    document.getElementById('searchInput').onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            loadData(0, document.getElementById('searchInput').value.trim()).then();
        }
    };

    loadData(0).then();
});