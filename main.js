// Gestione menu mobile
const mobileMenu = document.getElementById('mobileMenu');
const navLinks = document.getElementById('navLinks');

if (mobileMenu) {
    mobileMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
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
            // Utente loggato -> dashboard
            logoLink.href = currentPath.includes('/pages/') ? 'dashboard.html' : 'pages/dashboard.html';
            console.log('🔗 Logo punta a dashboard');
        } else {
            // Utente non loggato -> home
            logoLink.href = currentPath.includes('/pages/') ? '../index.html' : 'index.html';
            console.log('🔗 Logo punta a home');
        }
    }
    
    if (navLinks) {
        if (token && user) {
            // UTENTE LOGGATO - Mostra tutti i link
            console.log('✅ Utente loggato, mostro link completi');
            
            // Determina il percorso base
            const isInPages = currentPath.includes('/pages/');
            const basePath = isInPages ? '' : 'pages/';
            
            // ⭐ LINK ADMIN - solo se l'utente è admin
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
            
            // Gestione logout
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = isInPages ? '../index.html' : 'index.html';
                });
            }
        } else {
            // UTENTE NON LOGGATO - Mostra solo link pubblici
            console.log('❌ Utente non loggato, mostro solo link pubblici');
            
            // Determina il percorso base
            const isInPages = currentPath.includes('/pages/');
            
            if (isInPages) {
                // Siamo in una pagina dentro /pages/
                navLinks.innerHTML = `
                    <a href="../index.html" class="${currentPath.endsWith('index.html') ? 'active' : ''}">Home</a>
                    <a href="feed.html" class="${currentPath.includes('feed.html') ? 'active' : ''}">Feed</a>
                    <a href="auth/login.html" class="${currentPath.includes('login.html') ? 'active' : ''}">Accedi</a>
                    <a href="auth/register.html" class="${currentPath.includes('register.html') ? 'active' : ''}">Registrati</a>
                `;
            } else {
                // Siamo nella root
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
        const response = await fetch('http://localhost:5000/api/works?limit=3');
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

// Inizializzazione - Chiama updateNavbar IMMEDIATAMENTE
(function() {
    console.log('🚀 Inizializzazione main.js');
    if (typeof window.updateNavbar === 'function') {
        window.updateNavbar();
    } else {
        console.error('❌ updateNavbar non definita');
    }
})();

// DOM Content Loaded - per altre inizializzazioni
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM caricato');
    loadLatestWorks();
});

// Chiudi menu mobile quando si clicca fuori
document.addEventListener('click', (e) => {
    if (!e.target.closest('.mobile-menu') && !e.target.closest('.nav-links')) {
        const navLinks = document.getElementById('navLinks');
        if (navLinks && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
        }
    }
});