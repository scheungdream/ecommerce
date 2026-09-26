import { fetchTableData } from './api.js';

let currentPage = 0;
let currentSearch = '';
let createModalInstance = null;
let stockModalInstance = null;

const DEFAULT_IMAGE_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2280%22%20height%3D%2280%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f8f9fa%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%236c757d%22%20font-size%3D%2210%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E";

function getToken() {
    return localStorage.getItem('token');
}

document.addEventListener('DOMContentLoaded', () => {
    createModalInstance = new bootstrap.Modal(document.getElementById('createModal'));
    stockModalInstance = new bootstrap.Modal(document.getElementById('stockModal'));

    document.getElementById('addBtn').addEventListener('click', openCreateModal);
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('searchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    document.getElementById('createForm').addEventListener('submit', handleProductSubmit);
    document.getElementById('stockForm').addEventListener('submit', handleStockSubmit);

    const fileInput = document.getElementById('imageFileInput');
    document.getElementById('selectImageBtn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    document.getElementById('refreshGalleryBtn').addEventListener('click', loadImageGallery);

    document.getElementById('imageUrl').addEventListener('input', (e) => {
        updateImagePreview(e.target.value);
        highlightSelectedImageInGallery(e.target.value);
    });

    loadProducts().then();
});

async function loadImageGallery() {
    const galleryContainer = document.getElementById('imageGallery');
    galleryContainer.innerHTML = `<div class="text-center w-100 py-3 text-muted small"><div class="spinner-border spinner-border-sm me-1"></div> Loading gallery...</div>`;

    try {
        const token = getToken();
        const response = await fetch('/api/admin/files', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) showToast('Failed to fetch image list', 'error');
        const files = await response.json();

        if (!files || files.length === 0) {
            galleryContainer.innerHTML = `<div class="text-center w-100 py-3 text-muted small">No images uploaded yet.</div>`;
            return;
        }

        const currentUrl = document.getElementById('imageUrl').value;

        galleryContainer.innerHTML = files.map(file => {
            const isSelected = currentUrl === file.url;
            return `
                <div class="position-relative group-image-item" style="width: 60px; height: 60px;">
                    <img src="${file.url}" 
                         alt="${file.name}" 
                         class="w-100 h-100 rounded border object-fit-cover gallery-img-item ${isSelected ? 'border-primary border-3' : ''}" 
                         style="cursor: pointer;"
                         onclick="window.selectGalleryImage('${file.url}')">
                    
                    <button type="button" 
                            class="btn btn-danger btn-sm p-0 position-absolute top-0 end-0 translate-middle-y rounded-circle d-flex align-items-center justify-content-center" 
                            style="width: 18px; height: 18px; font-size: 10px; opacity: 0.8;"
                            title="Delete File"
                            onclick="window.deleteGalleryImage('${file.name}', event)">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            `;
        }).join('');
    } catch (err) {
        galleryContainer.innerHTML = `<div class="text-center w-100 py-3 text-danger small">Failed to load gallery</div>`;
    }
}

window.selectGalleryImage = function(url) {
    document.getElementById('imageUrl').value = url;
    updateImagePreview(url);
    highlightSelectedImageInGallery(url);
};

window.deleteGalleryImage = async function(fileName, event) {
    event.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

    try {
        const token = getToken();
        const response = await fetch(`/api/admin/files/${encodeURIComponent(fileName)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) showToast('Failed to delete file', 'error');

        const currentUrl = document.getElementById('imageUrl').value;
        if (currentUrl.endsWith(fileName)) {
            document.getElementById('imageUrl').value = '';
            updateImagePreview('');
        }

        await loadImageGallery();
    } catch (err) {
        alert(err.message);
    }
};

function highlightSelectedImageInGallery(selectedUrl) {
    const items = document.querySelectorAll('.gallery-img-item');
    items.forEach(img => {
        if (img.getAttribute('src') === selectedUrl) {
            img.classList.add('border-primary', 'border-3');
        } else {
            img.classList.remove('border-primary', 'border-3');
        }
    });
}

function updateImagePreview(url) {
    const preview = document.getElementById('imagePreview');
    if (url && url.trim() !== '') {
        preview.src = url;
    } else {
        preview.src = DEFAULT_IMAGE_PLACEHOLDER;
    }
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const spinner = document.getElementById('uploadSpinner');
    spinner.classList.remove('d-none');

    try {
        const token = getToken();
        const response = await fetch('/api/admin/files/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!response.ok) showToast('Failed to upload image', 'error');

        const data = await response.json();
        let uploadedUrl = data.url;
        if (uploadedUrl && uploadedUrl.includes('src/main/resources/public')) {
            uploadedUrl = uploadedUrl.replace('src/main/resources/public', '');
        }

        document.getElementById('imageUrl').value = uploadedUrl;
        updateImagePreview(uploadedUrl);

        await loadImageGallery();
        highlightSelectedImageInGallery(uploadedUrl);
    } catch (err) {
        alert('Upload failed: ' + err.message);
    } finally {
        spinner.classList.add('d-none');
        e.target.value = '';
    }
}

async function loadProducts(page = 0) {
    currentPage = page;
    const alertBox = document.getElementById('statusAlert');
    alertBox.classList.add('d-none');

    try {
        const query = `/api/admin/products?page=${page}&size=10${currentSearch ? `&keyword=${encodeURIComponent(currentSearch)}` : ''}`;
        const data = await fetchTableData(query);

        renderTable(data.content || []);
        renderPagination(data.totalPages || 1, data.number || 0);
        document.getElementById('pageInfo').textContent = `Showing page ${(data.number || 0) + 1} of ${data.totalPages || 1}`;
    } catch (err) {
        alertBox.textContent = `Error loading products: ${err.message}`;
        alertBox.classList.remove('d-none');
    }
}

function renderTable(products) {
    const tbody = document.getElementById('tableBody');
    if (!products || products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">No products found.</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td>
                <img src="${p.imageUrl || DEFAULT_IMAGE_PLACEHOLDER}" 
                     alt="${p.name}" 
                     width="40" height="40" 
                     class="rounded object-fit-cover border"
            </td>
            <td class="fw-semibold">${p.name}</td>
            <td><span class="badge bg-secondary-subtle text-secondary border">${p.category || 'N/A'}</span></td>
            <td class="fw-bold text-dark">$${Number(p.price).toFixed(2)}</td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold ${p.stock <= 5 ? 'text-danger' : 'text-dark'}">${p.stock}</span>
                    <button class="btn btn-sm btn-link text-decoration-none p-0 me-2" onclick="openStockModal(${p.id}, ${p.stock})">
                        [Adjust]
                    </button>
                </div>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-sm btn-link text-decoration-none p-0 me-2" onclick="openEditModal(${p.id})">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-link text-danger text-decoration-none p-0" onclick="deleteProduct(${p.id})">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function handleSearch() {
    currentSearch = document.getElementById('searchInput').value.trim();
    loadProducts(0).then();
}

function openCreateModal() {
    document.getElementById('modalTitle').textContent = 'Add Product';
    document.getElementById('editId').value = '';
    document.getElementById('createForm').reset();

    updateImagePreview('');
    loadImageGallery().then();

    const stockInput = document.getElementById('stock');
    if (stockInput) stockInput.parentElement.classList.remove('d-none');

    createModalInstance.show();
}

window.openEditModal = async function(id) {
    try {
        const token = getToken();
        const response = await fetch(`/api/admin/products/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) showToast('Failed to fetch product', 'error');
        const p = await response.json();

        document.getElementById('modalTitle').textContent = 'Edit Product';
        document.getElementById('editId').value = p.id;
        document.getElementById('name').value = p.name || '';
        document.getElementById('category').value = p.category || '';
        document.getElementById('price').value = p.price || 0;
        document.getElementById('description').value = p.description || '';
        document.getElementById('imageUrl').value = p.imageUrl || '';

        updateImagePreview(p.imageUrl);
        await loadImageGallery();

        const stockInput = document.getElementById('stock');
        if (stockInput) stockInput.parentElement.classList.add('d-none');

        createModalInstance.show();
    } catch (err) {
        alert(err.message);
    }
};

async function handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/admin/products/${id}` : '/api/admin/products';

    const payload = {
        name: document.getElementById('name').value,
        category: document.getElementById('category').value,
        price: parseFloat(document.getElementById('price').value),
        description: document.getElementById('description').value,
        imageUrl: document.getElementById('imageUrl').value
    };

    if (!id) {
        payload.stock = parseInt(document.getElementById('stock').value, 10) || 0;
    }

    try {
        const token = getToken();
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) showToast('Failed to save product', 'error');

        createModalInstance.hide();
        await loadProducts(currentPage);
    } catch (err) {
        alert(err.message);
    }
}

window.openStockModal = function(id, currentStock) {
    document.getElementById('stockProductId').value = id;
    document.getElementById('currentStockDisplay').value = currentStock;
    document.getElementById('stockQuantity').value = 1;
    document.getElementById('typeIncrease').checked = true;
    stockModalInstance.show();
};

async function handleStockSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('stockProductId').value;
    const type = document.querySelector('input[name="stockType"]:checked').value;
    const quantity = parseInt(document.getElementById('stockQuantity').value, 10);

    try {
        const token = getToken();
        const response = await fetch(`/api/admin/products/${id}/stock`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ type, quantity })
        });

        if (!response.ok) {
            showToast('Failed to adjust stock', 'error');
        }

        stockModalInstance.hide();
        await loadProducts(currentPage);
    } catch (err) {
        alert(err.message);
    }
}

window.deleteProduct = async function(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const token = getToken();
        const response = await fetch(`/api/admin/products/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            method: 'DELETE'
        });
        if (!response.ok) showToast('Failed to delete product', 'error');
        await loadProducts(currentPage);
    } catch (err) {
        alert(err.message);
    }
};

function renderPagination(totalPages, currentPage) {
    const pagination = document.getElementById('pagination');
    let html = '';

    html += `<li class="page-item ${currentPage === 0 ? 'disabled' : ''}">
        <button class="page-link" onclick="window.changePage(${currentPage - 1})">Previous</button>
    </li>`;

    for (let i = 0; i < totalPages; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <button class="page-link" onclick="window.changePage(${i})">${i + 1}</button>
        </li>`;
    }

    html += `<li class="page-item ${currentPage >= totalPages - 1 ? 'disabled' : ''}">
        <button class="page-link" onclick="window.changePage(${currentPage + 1})">Next</button>
    </li>`;

    pagination.innerHTML = html;
}

window.changePage = function(page) {
    if (page >= 0) loadProducts(page).then();
};