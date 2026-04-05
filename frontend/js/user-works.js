const API_URL = 'http://localhost:5000/api';

// Ottieni l'ID dalla URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('id');

if (!userId) {
    window.location.href = 'feed.html';
}

// Funzione per richieste
async function apiRequest(endpoint) {
    const token = localStorage.getItem('token');
    
    const options = {
        headers: {}
    };
    
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Errore nella richiesta');
    }
    
    return result;
}

// Carica dati utente e lavori
async function loadUserWorks() {
    try {
        console.log('👤 Carico utente:', userId);
        
        // Carica info utente
        const user = await apiRequest(`/users/${userId}`);
        console.log('✅ Utente:', user.nome);
        
        document.getElementById('userName').textContent = `${user.nome} ${user.cognome}`;
        document.getElementById('userProfession').textContent = user.professione || 'Artigiano';
        
        // Carica lavori dell'utente
        console.log('📋 Carico lavori...');
        const works = await apiRequest(`/works/user/${userId}`);
        console.log(`✅ Trovati ${works.length} lavori`);
        
        document.getElementById('loading').style.display = 'none';
        
        if (works.length === 0) {
            document.getElementById('noResults').style.display = 'block';
            return;
        }
        
        document.getElementById('worksFeed').style.display = 'flex';
        displayWorks(works);
        
    } catch (error) {
        console.error('❌ Errore:', error);
        document.getElementById('loading').innerHTML = `
            <i class="fas fa-exclamation-circle"></i> 
            Errore: ${error.message}
        `;
    }
}

// Mostra i lavori
function displayWorks(works) {
    const feed = document.getElementById('worksFeed');
    
    feed.innerHTML = works.map(work => createWorkCard(work)).join('');
}

// Crea card lavoro
function createWorkCard(work) {
    const data = new Date(work.createdAt).toLocaleDateString('it-IT');
    const primaImmagine = work.images && work.images.length > 0 ? work.images[0] : null;
    
    // Icona in base alla categoria
    const icona = getCategoryIcon(work.category);
    
    // Tronca descrizione
    const descrizione = work.description.length > 100 
        ? work.description.substring(0, 100) + '...' 
        : work.description;
    
    return `
        <div class="work-card" onclick="viewWork('${work._id}')">
            <div class="work-card-header">
                <div class="author-avatar">
                    ${work.author?.nome?.charAt(0) || ''}${work.author?.cognome?.charAt(0) || ''}
                </div>
                <div class="author-info">
                    <span class="author-name">${work.author?.nome || ''} ${work.author?.cognome || ''}</span>
                    <span class="author-profession">${work.author?.professione || 'Artigiano'}</span>
                </div>
                <div class="work-date">${data}</div>
            </div>
            
            <div class="work-image">
                ${primaImmagine 
                    ? `<img src="${primaImmagine}" alt="${work.title}" style="width:100%; height:100%; object-fit:cover;">` 
                    : icona}
            </div>
            
            <div class="work-content">
                <h3 class="work-title">${work.title}</h3>
                <span class="work-category">${getCategoryLabel(work.category)}</span>
                <p class="work-description">${descrizione}</p>
                
                <div class="work-info">
                    <span><i class="fas fa-map-marker-alt"></i> ${work.luogo || 'Luogo non specificato'}</span>
                    <span><i class="fas fa-tag"></i> ${work.status || 'completato'}</span>
                </div>
            </div>
            
            <div class="work-card-footer">
                <div class="work-stats">
                    <span><i class="fas fa-heart"></i> ${work.likes?.length || 0}</span>
                    <span><i class="fas fa-comment"></i> ${work.comments?.length || 0}</span>
                    <span><i class="fas fa-image"></i> ${work.images?.length || 0}</span>
                </div>
                <button class="view-details-btn" onclick="event.stopPropagation(); viewWork('${work._id}')">
                    <i class="fas fa-arrow-right"></i> Dettagli
                </button>
            </div>
        </div>
    `;
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

// Helper per label categoria
function getCategoryLabel(category) {
    const labels = {
        'muratura': 'Muratura',
        'idraulica': 'Idraulica',
        'falegnameria': 'Falegnameria',
        'elettricità': 'Elettricità',
        'imbiancatura': 'Imbiancatura',
        'piastrelle': 'Piastrelle',
        'giardinaggio': 'Giardinaggio',
        'altro': 'Altro'
    };
    return labels[category] || category;
}

// Vai al dettaglio lavoro
window.viewWork = function(workId) {
    window.location.href = `work-detail.html?id=${workId}`;
};

// Aggiorna navbar
function updateNavbar() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const navLinks = document.getElementById('navLinks');
    
    if (navLinks) {
        if (token && user) {
            navLinks.innerHTML = `
                <a href="feed.html">Feed</a>
                <a href="dashboard.html">Dashboard</a>
                <a href="works.html">I miei lavori</a>
                <a href="profile.html">Profilo</a>
                <a href="#" id="logoutBtn">Logout</a>
            `;
            
            document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '../index.html';
            });
        } else {
            navLinks.innerHTML = `
                <a href="feed.html">Feed</a>
                <a href="auth/login.html">Accedi</a>
                <a href="auth/register.html">Registrati</a>
            `;
        }
    }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    loadUserWorks();
});
