document.write(`
    <div class="sidebar text-white d-flex flex-column shrink-0">
        <div class="p-3 border-bottom border-secondary d-flex align-items-center gap-2">
            <i class="bi bi-speedometer2 text-primary fs-4"></i>
            <span class="fw-bold fs-5">Dashboard</span>
        </div>
        <ul class="nav nav-pills flex-column p-3 mb-auto">
            <li class="nav-item">
                <a href="/admin/overview" class="nav-link w-100 text-start d-flex align-items-center gap-2">
                    <i class="bi bi-graph-up"></i> Overview
                </a>
            </li>
            <li class="nav-item">
                <a href="/admin/orders" class="nav-link w-100 text-start d-flex align-items-center gap-2">
                    <i class="bi bi-cart3"></i> Order Management
                </a>
            </li>
            <li class="nav-item">
                <a href="/admin/products" class="nav-link w-100 text-start d-flex align-items-center gap-2">
                    <i class="bi bi-box-seam"></i> Product Management
                </a>
            </li>
            <li class="nav-item">
                <a href="/admin/users" class="nav-link w-100 text-start d-flex align-items-center gap-2">
                    <i class="bi bi-people"></i> User Management
                </a>
            </li>
            <li class="nav-item">
                <a href="/admin/files" class="nav-link w-100 text-start d-flex align-items-center gap-2">
                    <i class="bi bi-folder2-open"></i> File Management
                </a>
            </li>
        </ul>
    </div>`);