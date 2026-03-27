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
    const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html') || window.location.pathname.includes('verify-email.html');
    
    if (!token && !isAuthPage) {
        window.location.href = '/login.html';
    } else if (token && isAuthPage) {
        window.location.href = '/index.html';
    }
};

// --- AUTH LOGIC ---
const login = async (loginIdentifier, password) => {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: loginIdentifier, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Identifiants incorrects.');

        localStorage.setItem('anonyme_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        window.location.href = '/index.html';
        
    } catch (e) { 
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
            errorEl.innerText = e.message;
            errorEl.classList.remove('hidden');
        } else {
            alert(e.message);
        }
        throw e;
    }
};

const register = async (userData) => {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        return data; // success
    } catch (e) { 
        alert(e.message); 
        throw e;
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
    toast.className = `toast animate-fade-up ${type.toLowerCase()}`;
    const icon = type === 'MESSAGE' ? '✉️' : (type === 'LIKE' ? '❤️' : '🔔');
    toast.innerHTML = `<span>${icon}</span> <span>${text}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
};

// Auto-init for every page
window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initGlobalNotifications();
});
