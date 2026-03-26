const loadStats = async () => {
    try {
        const res = await fetch('/api/admin/stats', { headers: getAuthHeaders() });
        const stats = await res.json();
        document.getElementById('statUsers').innerText = stats.userCount;
        document.getElementById('statPosts').innerText = stats.postCount;
        document.getElementById('statReports').innerText = stats.reportCount;
        document.getElementById('statPros').innerText = stats.proCount;
    } catch (e) { console.error(e); }
};

const loadUsers = async () => {
    try {
        const response = await fetch('/api/admin/users', {
            headers: getAuthHeaders()
        });
        const users = await response.json();
        const tbody = document.getElementById('adminDataTable');
        tbody.innerHTML = '';

        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            tr.innerHTML = `
                <td style="padding: 10px;">${u.pseudo} <br><small style="color: grey;">${u.fullName} (${u.email || 'Pas d\'email'})</small></td>
                <td style="padding: 10px;">${u.role}</td>
                <td style="padding: 10px;">${u.status}</td>
                <td style="padding: 10px;">
                    <button class="action-btn" onclick="updateRole('${u.id}', 'PRO')">Rendre PRO</button>
                    <button class="action-btn" onclick="updateStatus('${u.id}', 'BANNED')" style="color: var(--danger);">Bannir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
    }
};

const updateRole = async (userId, role) => {
    const note = prompt('Raison du changement de rôle :');
    try {
        const res = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ role, note })
        });
        if (!res.ok) throw new Error('Erreur modification');
        loadUsers();
    } catch (error) {
        alert(error.message);
    }
};

const updateStatus = async (userId, status) => {
    const note = prompt('Raison du changement de statut :');
    try {
        const res = await fetch(`/api/admin/users/${userId}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status, note })
        });
        if (!res.ok) throw new Error('Erreur modification');
        loadUsers();
    } catch (error) {
        alert(error.message);
    }
};

const loadVerifications = async () => {
    try {
        const res = await fetch('/api/admin/verifications', { headers: getAuthHeaders() });
        const data = await res.json();
        const tbody = document.getElementById('adminDataTable');
        tbody.innerHTML = '';
        data.forEach(v => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:10px;">${v.user.pseudo} <br><small>${v.user.fullName}</small></td>
                <td style="padding:10px;">${v.reason}</td>
                <td style="padding:10px;">${v.status}</td>
                <td style="padding:10px;">
                    <button class="action-btn" onclick="updateVerifStatus('${v.id}', 'RESOLVED')">Approuver</button>
                    <button class="action-btn" onclick="updateVerifStatus('${v.id}', 'DISMISSED')" style="color:var(--danger);">Rejeter</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error(e); }
};

const updateVerifStatus = async (id, status) => {
    const note = prompt('Note administrative :');
    try {
        await fetch(`/api/admin/verifications/${id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status, note })
        });
        loadVerifications();
    } catch (e) { alert(e.message); }
};

const loadAllPosts = async () => {
    try {
        const response = await fetch('/api/admin/posts', {
            headers: getAuthHeaders()
        });
        const posts = await response.json();
        const tbody = document.getElementById('adminDataTable');
        tbody.innerHTML = '';
        
        posts.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 10px;">@${p.user.pseudo} <br><small>${p.content.substring(0, 30)}...</small></td>
                <td style="padding: 10px;">${p.mediaType} ${p.mediaUrl ? '🔗' : ''}</td>
                <td style="padding: 10px;">${p.status}</td>
                <td colspan="2" style="padding: 10px;">
                    <button class="action-btn" onclick="deletePostAdmin('${p.id}')" style="color: var(--danger);">Supprim.</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error(e); }
};

const deletePostAdmin = async (id) => {
    const note = prompt('Motif de suppression :');
    if (!note) return;
    try {
        const res = await fetch(`/api/admin/posts/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            body: JSON.stringify({ note })
        });
        loadAllPosts();
    } catch (e) { console.error(e); }
};

const loadReports = async () => {
    try {
        const response = await fetch('/api/admin/reports', {
            headers: getAuthHeaders()
        });
        const reports = await response.json();
        const tbody = document.getElementById('adminDataTable');
        tbody.innerHTML = '';
        
        // Custom report headers logic if needed
        reports.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 10px;">${r.targetType} <br><small>${r.reason}</small></td>
                <td style="padding: 10px;">${r.status}</td>
                <td colspan="2" style="padding: 10px;">
                    <button class="action-btn" onclick="resolveReport('${r.id}', 'RESOLVED')">Résoudre</button>
                    <button class="action-btn" onclick="resolveReport('${r.id}', 'DISMISSED')">Rejeter</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
    }
};

const resolveReport = async (id, status) => {
    try {
        const res = await fetch(`/api/admin/reports/${id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });
        loadReports();
    } catch (err) {
        console.error(err);
    }
};

const loadLogs = async () => {
    try {
        const response = await fetch('/api/admin/logs', {
            headers: getAuthHeaders()
        });
        const logs = await response.json();
        const tbody = document.getElementById('adminDataTable');
        tbody.innerHTML = '';
        
        logs.forEach(l => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 10px;">${new Date(l.createdAt).toLocaleDateString()}</td>
                <td style="padding: 10px;">${l.action}</td>
                <td style="padding: 10px;">Cible: ${l.targetType} (ID: ${l.targetId.substring(0,8)}...)</td>
                <td style="padding: 10px;">${l.note}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
};
