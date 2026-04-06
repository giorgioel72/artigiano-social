// Funzione per fare richieste API
async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Errore nella richiesta');
    }
    
    return result;
}

// Gestione login
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('errorMessage');
        const submitBtn = document.getElementById('submitBtn');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Accesso in corso...';
        errorDiv.style.display = 'none';
        
        try {
            const data = await apiRequest('/auth/login', 'POST', {
                email,
                password
            });
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            window.location.href = '../dashboard.html';
            
        } catch (error) {
            errorDiv.textContent = error.message || 'Credenziali non valide';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Accedi';
        }
    });
}

// Gestione registrazione
const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('nome').value;
        const cognome = document.getElementById('cognome').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const professione = document.getElementById('professione').value;
        const errorDiv = document.getElementById('errorMessage');
        const submitBtn = document.getElementById('submitBtn');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrazione in corso...';
        errorDiv.style.display = 'none';
        
        try {
            const data = await apiRequest('/auth/register', 'POST', {
                nome,
                cognome,
                email,
                password,
                professione
            });
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            window.location.href = '../dashboard.html';
            
        } catch (error) {
            errorDiv.textContent = error.message || 'Errore durante la registrazione';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registrati';
        }
    });
}

// Gestione logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../../index.html';
    });
}

// Aggiorna navbar in base allo stato di login
function updateNavbar() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const navLinks = document.getElementById('navLinks');
    
    if (navLinks) {
        if (token && user) {
            navLinks.innerHTML = `
                <a href="../dashboard.html">Dashboard</a>
                <a href="#" id="logoutBtn">Logout</a>
            `;
            
            document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '../../index.html';
            });
        } else {
            navLinks.innerHTML = `
                <a href="login.html">Accedi</a>
                <a href="register.html">Registrati</a>
            `;
        }
    }
}

document.addEventListener('DOMContentLoaded', updateNavbar);
