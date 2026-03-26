const API_URL = '/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('anonyme_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

const logout = () => {
    localStorage.removeItem('anonyme_token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
};

const checkAuth = () => {
    const token = localStorage.getItem('anonyme_token');
    if (!token && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
        window.location.href = '/login.html';
    }
};

// --- REAL-TIME NOTIFICATIONS LOGIC ---
let globalSocket;
const initGlobalNotifications = () => {
    const token = localStorage.getItem('anonyme_token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (token && user && typeof io !== 'undefined') {
        globalSocket = io({ auth: { token } });
        
        globalSocket.on('connect', () => {
            globalSocket.emit('join', user.id);
        });

        globalSocket.on('notification', (data) => {
            showToast(data.text, data.type);
        });
    }
};

const showToast = (text, type = 'INFO') => {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'MESSAGE' ? '✉️' : (type === 'LIKE' ? '❤️' : '🔔');
    toast.innerHTML = `<span>${icon}</span> <span>${text}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
};

// Auto-init for every page
window.addEventListener('DOMContentLoaded', initGlobalNotifications);
