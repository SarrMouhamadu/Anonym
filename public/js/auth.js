const AUTH_KEY = 'anonyme_token';

// Helper to get headers
const getAuthHeaders = () => {
    const token = localStorage.getItem(AUTH_KEY);
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

// Check if logged in
const checkAuth = () => {
    const token = localStorage.getItem(AUTH_KEY);
    if (!token && !window.location.pathname.includes('login.html') && 
        !window.location.pathname.includes('register.html') &&
        !window.location.pathname.includes('verify-email.html')) {
        window.location.href = '/login.html';
    }
};

// Login logic
const login = async (loginIdentifier, password) => {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: loginIdentifier, password })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erreur lors de la connexion');

        localStorage.setItem(AUTH_KEY, data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect based on role
        if (data.user.role === 'ADMIN') window.location.href = '/admin/dashboard.html';
        else if (data.user.role === 'PRO') window.location.href = '/pro/dashboard.html';
        else window.location.href = '/index.html';

    } catch (error) {
        alert(error.message);
    }
};

// Register logic
const register = async (userData) => {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erreur lors de l\'inscription');

        alert(data.message);
        window.location.href = '/login.html';
    } catch (error) {
        alert(error.message);
    }
};

const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem('user');
    window.location.href = '/login.html';
};
