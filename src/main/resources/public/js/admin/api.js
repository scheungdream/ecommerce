function getToken() {
    return localStorage.getItem('token');
}

export async function fetchTableData(endpoint, page = 0, size = 20, keyword = '') {
    const token = getToken();
    let url = `${endpoint}?page=${page}&size=${size}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (response.status === 401 || response.status === 403) {
        window.location.href = '/admin/login';
        return;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}

export async function deleteEntity(endpoint, id) {
    const token = getToken();
    const response = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (response.status === 401 || response.status === 403) {
        window.location.href = '/admin/login';
        return;
    }
    if (!response.ok) throw new Error('Failed to delete item.');
}

export async function fetchFileList() {
    try {
        const token = getToken();
        const res = await fetch('/api/admin/files', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (res.status === 401 || res.status === 403) {
            window.location.href = '/admin/login';
            return;
        }
        if (res.ok) return await res.json();
    } catch (e) {
        console.error('Failed to load file list', e);
    }
    return [];
}

export async function uploadFile(file) {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/admin/files/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    if (response.status === 401 || response.status === 403) {
        window.location.href = '/admin/login';
        return;
    }
    if (!response.ok) throw new Error('Upload failed');
    return response;
}

export async function deleteFile(fileName) {
    const token = getToken();
    const response = await fetch(`/api/admin/files/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (response.status === 401 || response.status === 403) {
        window.location.href = '/admin/login';
        return;
    }
    if (!response.ok) throw new Error('Failed to delete file.');
}

export async function saveEntity(endpoint, method, payload) {
    const token = getToken();
    const response = await fetch(endpoint, {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });
    if (response.status === 401 || response.status === 403) {
        window.location.href = '/admin/login';
        return;
    }
    if (!response.ok) throw new Error('Failed to save item.');
}

export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}