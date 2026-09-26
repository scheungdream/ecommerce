function showToast(message, type = 'success') {
    const container = document.querySelector('.toast-container');
    const colors = {
        success: 'text-bg-success',
        error: 'text-bg-danger',
        warning: 'text-bg-warning',
        info: 'text-bg-info'
    };
    const icons = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };
    const toast = document.createElement('div');
    toast.className = `toast align-items-center ${colors[type] || 'text-bg-primary'} border-0 show fade-in`;
    toast.role = 'alert';
    toast.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi ${icons[type] || 'bi-info-circle-fill'} me-2"></i>
                        ${escapeHtml(message)}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto"
                            data-bs-dismiss="toast" onclick="this.parentElement.parentElement.remove()"></button>
                </div>
            `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function getToken() {
    return localStorage.getItem('token');
}

async function clearExpiredToken(token){
    if(token) {
        const response = await fetch("/api/auth/check-expired", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({token: token}),
        });
        const result = await response.json();
        if (result.expired) {
            localStorage.removeItem("token");
        }
    }
}