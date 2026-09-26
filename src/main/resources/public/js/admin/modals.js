import { fetchFileList } from './api.js';

let uploadedFilesList = [];

export async function renderFormFields(fieldsConfig, item = {}) {
    uploadedFilesList = await fetchFileList();
    const formFields = document.getElementById('formFields');

    formFields.innerHTML = fieldsConfig.map(field => {
        let val = item[field.name] !== undefined && item[field.name] !== null ? item[field.name] : '';

        if (field.type === 'select') {
            return `
        <div>
          <label class="form-label fw-semibold small text-uppercase mb-1">${field.label}</label>
          <select name="${field.name}" class="form-select">
            ${field.options.map(opt => `<option value="${opt}" ${val === opt ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>
        </div>
      `;
        }

        if (field.type === 'imageSelect') {
            return `
        <div>
          <label class="form-label fw-semibold small text-uppercase mb-1">${field.label}</label>
          <input type="hidden" name="${field.name}" id="selectedImageUrl" value="${val}">

          <div class="d-flex align-items-center justify-content-between mb-2">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="document.getElementById('fileUploadInput').click()">
              <i class="bi bi-upload"></i> Upload New Image
            </button>
            <button type="button" class="btn btn-sm btn-link text-danger text-decoration-none p-0" id="clearImageBtn">
              Clear Selection
            </button>
          </div>

          <div id="modalImageGrid" class="image-grid-selector"></div>
        </div>
      `;
        }

        if (field.type === 'textarea') {
            return `
        <div>
          <label class="form-label fw-semibold small text-uppercase mb-1">${field.label}</label>
          <textarea name="${field.name}" rows="3" class="form-control">${val}</textarea>
        </div>
      `;
        }

        return `
      <div>
        <label class="form-label fw-semibold small text-uppercase mb-1">${field.label}</label>
        <input type="${field.type}" name="${field.name}" value="${field.name === 'password' ? '' : val}"
               ${field.step ? `step="${field.step}"` : ''}
               ${field.required ? 'required' : ''} class="form-control" ${field.disabled ? 'disabled' : ''}>
      </div>
    `;
    }).join('');

    if (fieldsConfig.some(f => f.type === 'imageSelect')) {
        const clearBtn = document.getElementById('clearImageBtn');
        if (clearBtn) {
            clearBtn.onclick = () => selectImage('');
        }
        renderImageGrid(item.imageUrl || '');
    }
}

export function renderImageGrid(selectedUrl) {
    const gridContainer = document.getElementById('modalImageGrid');
    if (!gridContainer) return;

    if (!uploadedFilesList || uploadedFilesList.length === 0) {
        gridContainer.innerHTML = `<div class="w-100 text-center py-4 text-muted small">No images uploaded yet. Click "Upload New Image" to add one.</div>`;
        return;
    }

    gridContainer.innerHTML = uploadedFilesList.map(f => {
        const isSelected = selectedUrl === f.url;
        return `
      <div class="image-grid-card ${isSelected ? 'selected' : ''}" data-url="${f.url}" title="${f.name}">
        <img src="${f.url}" alt="${f.name}">
        <div class="check-icon"><i class="bi bi-check"></i></div>
      </div>
    `;
    }).join('');

    gridContainer.querySelectorAll('.image-grid-card').forEach(card => {
        card.onclick = () => selectImage(card.dataset.url);
    });
}

export function selectImage(url) {
    const input = document.getElementById('selectedImageUrl');
    if (input) input.value = url;
    renderImageGrid(url);
}