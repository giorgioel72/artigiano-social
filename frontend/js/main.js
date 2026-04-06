// Configurazione API
const API_URL = 'https://artigiano-social-api.onrender.com/api';

// Variabili globali
let onlineUsers = new Set();
let presenceSocket = null;

// Gestione menu mobile
const mobileMenu = document.getElementById('mobileMenu');
const navLinks = document.getElementById('navLinks');

if (mobileMenu) {
    mobileMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// ⭐ FUNZIONE PER AGGIORNARE GLI INDICATORI ONLINE
function updateOnlineIndicators() {
    document.querySelectorAll('.author-avatar-container, .conversation-avatar-container, .comment-avatar-container, .user-avatar-container').forEach(container => {
        const userId = container.dataset.userId;
        let indicator = container.querySelector('.online-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'online-indicator';
            container.appendChild(indicator);
        }
        
        if (userId && onlineUsers.has(userId)) {
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    });
}

// ⭐ INIZIALIZZA LA PRESENZA ONLINE
function initPresence() {
    const token = localStorage.getItem('token');
    if (!token || presenceSocket) return;
    
    try {
        presenceSocket = io(API_URL.replace('/api', ''), {
            auth: { token },
            transports: ['websocket', 'polling']
        });
        
        presenceSocket.on('user-online', ({ userId, online }) => {
            if (online) {
                onlineUsers.add(userId);
            } else {
                onlineUsers.delete(userId);
            }
            updateOnlineIndicators();
        });
        
        // Richiedi la lista degli utenti online attuali
        fetch(`${API_URL}/online-users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            onlineUsers = new Set(data.onlineUsers);
            updateOnlineIndicators();
        })
        .catch(err => console.error('Errore recupero utenti online:', err));
        
    } catch (error) {
        console.error('❌ Errore inizializzazione presenza:', error);
    }
}

// Aggiorna navbar in base allo stato di login
window.updateNavbar = function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const navLinks = document.getElementById('navLinks');
    const currentPath = window.location.pathname;
    
    console.log('🔄 Aggiorno navbar, logged:', !!token);
    console.log('📌 Path corrente:', currentPath);
    
    // LOGO - cambia destinazione in base al login
    const logoLink = document.querySelector('.logo a');
    if (logoLink) {
        if (token && user) {
            logoLink.href = currentPath.includes('/pages/') ? 'dashboard.html' : 'pages/dashboard.html';
            console.log('🔗 Logo punta a dashboard');
            
            // ⭐ Inizializza la presenza dopo il login
            initPresence();
        } else {
            logoLink.href = currentPath.includes('/pages/') ? '../index.html' : 'index.html';
            console.log('🔗 Logo punta a home');
        }
    }
    
    if (navLinks) {
        if (token && user) {
            console.log('✅ Utente loggato, mostro link completi');
            
            const isInPages = currentPath.includes('/pages/');
            const basePath = isInPages ? '' : 'pages/';
            
            let adminLink = '';
            if (user.role === 'admin') {
                adminLink = `<a href="${basePath}admin/ads.html" class="${currentPath.includes('admin/ads.html') ? 'active' : ''}">
                                <i class="fas fa-crown"></i> Admin
                            </a>`;
            }
            
            navLinks.innerHTML = `
                <a href="${basePath}feed.html" class="${currentPath.includes('feed.html') ? 'active' : ''}">Feed</a>
                <a href="${basePath}dashboard.html" class="${currentPath.includes('dashboard.html') ? 'active' : ''}">Dashboard</a>
                <a href="${basePath}works.html" class="${currentPath.includes('works.html') ? 'active' : ''}">I miei lavori</a>
                <a href="${basePath}profile.html" class="${currentPath.includes('profile.html') && !currentPath.includes('profile.html?id=') ? 'active' : ''}">Profilo</a>
                <a href="${basePath}messages.html" class="${currentPath.includes('messages.html') ? 'active' : ''}">Messaggi</a>
                <a href="${basePath}suppliers.html" class="${currentPath.includes('suppliers.html') ? 'active' : ''}">Fornitori</a>
                ${adminLink}
                <a href="#" id="logoutBtn">Logout</a>
            `;
            
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    if (presenceSocket) presenceSocket.disconnect();
                    window.location.href = isInPages ? '../index.html' : 'index.html';
                });
            }
        } else {
            console.log('❌ Utente non loggato, mostro solo link pubblici');
            
            const isInPages = currentPath.includes('/pages/');
            
            if (isInPages) {
                navLinks.innerHTML = `
                    <a href="../index.html" class="${currentPath.endsWith('index.html') ? 'active' : ''}">Home</a>
                    <a href="feed.html" class="${currentPath.includes('feed.html') ? 'active' : ''}">Feed</a>
                    <a href="auth/login.html" class="${currentPath.includes('login.html') ? 'active' : ''}">Accedi</a>
                    <a href="auth/register.html" class="${currentPath.includes('register.html') ? 'active' : ''}">Registrati</a>
                `;
            } else {
                navLinks.innerHTML = `
                    <a href="index.html" class="${currentPath.endsWith('index.html') || currentPath.endsWith('/') ? 'active' : ''}">Home</a>
                    <a href="pages/feed.html" class="${currentPath.includes('feed.html') ? 'active' : ''}">Feed</a>
                    <a href="pages/auth/login.html" class="${currentPath.includes('login.html') ? 'active' : ''}">Accedi</a>
                    <a href="pages/auth/register.html" class="${currentPath.includes('register.html') ? 'active' : ''}">Registrati</a>
                `;
            }
        }
    } else {
        console.warn('⚠️ Elemento navLinks non trovato');
    }
};

// Carica ultimi lavori (solo per homepage)
async function loadLatestWorks() {
    const worksGrid = document.getElementById('latestWorks');
    
    if (!worksGrid) return;
    
    try {
        const response = await fetch(`${API_URL}/works?limit=3`);
        const works = await response.json();
        
        worksGrid.innerHTML = works.map(work => {
            const icona = getCategoryIcon(work.category);
            const data = new Date(work.createdAt).toLocaleDateString('it-IT');
            const autore = work.author || { nome: 'Artigiano', cognome: '' };
            
            return `
                <div class="work-card" onclick="window.location.href='pages/work-detail.html?id=${work._id}'">
                    <div class="work-image">${icona}</div>
                    <div class="work-content">
                        <h3 class="work-title">${work.title}</h3>
                        <p class="work-description">${work.description.substring(0, 100)}...</p>
                        <div class="work-meta">
                            <div class="work-author">
                                <div class="author-avatar">${autore.nome?.charAt(0) || ''}${autore.cognome?.charAt(0) || ''}</div>
                                <span>${autore.nome || ''} ${autore.cognome || ''}</span>
                            </div>
                            <span>${data}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Errore nel caricamento lavori:', error);
        if (worksGrid) {
            worksGrid.innerHTML = '<p>Errore nel caricamento dei lavori</p>';
        }
    }
}

// Helper per icona categoria
function getCategoryIcon(category) {
    const icons = {
        'muratura': '🧱',
        'idraulica': '🔧',
        'falegnameria': '🪚',
        'elettricità': '⚡',
        'imbiancatura': '🎨',
        'piastrelle': '🔲',
        'giardinaggio': '🌿',
        'altro': '🛠️'
    };
    return icons[category] || '📸';
}

// Inizializzazione
(function() {
    console.log('🚀 Inizializzazione main.js');
    if (typeof window.updateNavbar === 'function') {
        window.updateNavbar();
    } else {
        console.error('❌ updateNavbar non definita');
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM caricato');
    loadLatestWorks();
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.mobile-menu') && !e.target.closest('.nav-links')) {
        const navLinks = document.getElementById('navLinks');
        if (navLinks && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
        }
    }
});
