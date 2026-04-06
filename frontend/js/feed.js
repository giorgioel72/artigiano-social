const API_URL = 'https://artigiano-social-api.onrender.com/api';

let allWorks = [];
let currentPage = 1;
const worksPerPage = 5;

// Funzione per richieste (pubblica, senza token obbligatorio)
async function apiRequest(endpoint) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Errore nella richiesta');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Carica tutti i lavori
async function loadWorks() {
    try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('worksFeed').style.display = 'none';
        document.getElementById('noResults').style.display = 'none';
        
        allWorks = await apiRequest('/works');
        
        document.getElementById('loading').style.display = 'none';
        
        if (allWorks.length === 0) {
            document.getElementById('noResults').style.display = 'block';
            return;
        }
        
        document.getElementById('worksFeed').style.display = 'flex';
        applyFiltersAndSort();
        
    } catch (error) {
        console.error('Errore caricamento lavori:', error);
        document.getElementById('loading').innerHTML = `
            <i class="fas fa-exclamation-circle"></i> 
            Errore nel caricamento dei lavori: ${error.message}
        `;
    }
}

// Applica filtri e ordinamento
function applyFiltersAndSort() {
    const category = document.getElementById('categoryFilter').value;
    const sortBy = document.getElementById('sortFilter').value;
    
    let filteredWorks = [...allWorks];
    
    if (category !== 'tutte') {
        filteredWorks = filteredWorks.filter(work => work.category === category);
    }
    
    switch(sortBy) {
        case 'nuovi':
            filteredWorks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'popolari':
            filteredWorks.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
            break;
        case 'commentati':
            filteredWorks.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
            break;
    }
    
    currentPage = 1;
    displayWorks(filteredWorks);
}

// Mostra lavori con paginazione
function displayWorks(works) {
    const feed = document.getElementById('worksFeed');
    
    if (works.length === 0) {
        document.getElementById('worksFeed').style.display = 'none';
        document.getElementById('noResults').style.display = 'block';
        document.getElementById('loadMore').style.display = 'none';
        return;
    }
    
    document.getElementById('worksFeed').style.display = 'flex';
    document.getElementById('noResults').style.display = 'none';
    
    const start = 0;
    const end = currentPage * worksPerPage;
    const worksToShow = works.slice(start, end);
    
    feed.innerHTML = worksToShow.map(work => createWorkCard(work)).join('');
    
    if (end < works.length) {
        document.getElementById('loadMore').style.display = 'block';
    } else {
        document.getElementById('loadMore').style.display = 'none';
    }
    
    window.filteredWorks = works;
}

// Crea HTML per una card lavoro - CON INDICATORE ONLINE
function createWorkCard(work) {
    const data = new Date(work.createdAt).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    const primaImmagine = work.images && work.images.length > 0 
        ? work.images[0] 
        : null;
    
    const descrizioneBreve = work.description.length > 150 
        ? work.description.substring(0, 150) + '...' 
        : work.description;
    
    // ⭐ AVATAR CON INDICATORE ONLINE
    const authorAvatar = work.author?.avatar 
        ? `<div class="author-avatar-container" data-user-id="${work.author._id}" style="position: relative; display: inline-block; margin-right: 1rem;">
            <img src="${work.author.avatar}" alt="Avatar" class="author-avatar-img" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
            <div class="online-indicator" style="display: none; position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; background-color: #4cd964; border-radius: 50%; border: 2px solid white;"></div>
           </div>`
        : `<div class="author-avatar-container" data-user-id="${work.author._id}" style="position: relative; display: inline-block; margin-right: 1rem;">
            <div class="author-avatar" style="width:40px; height:40px; background:#e67e22; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1rem; font-weight:bold;">
                ${work.author?.nome?.charAt(0) || ''}${work.author?.cognome?.charAt(0) || ''}
            </div>
            <div class="online-indicator" style="display: none; position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; background-color: #4cd964; border-radius: 50%; border: 2px solid white;"></div>
           </div>`;
    
    return `
        <div class="work-card" onclick="viewWork('${work._id}')">
            <div class="work-card-header" style="display:flex; align-items:center; padding:1rem; background:#f8f9fa;">
                ${authorAvatar}
                <div class="author-info" style="flex:1;">
                    <a href="profile.html?id=${work.author?._id}" class="author-name" style="font-weight:bold; color:#2c3e50; text-decoration:none;" onclick="event.stopPropagation()">
                        ${work.author?.nome || ''} ${work.author?.cognome || ''}
                    </a>
                    <span class="author-profession" style="font-size:0.85rem; color:#e67e22; display:block;">${work.author?.professione || ''}</span>
                </div>
                <div class="work-date" style="font-size:0.85rem; color:#888;">${data}</div>
            </div>
            
            <div class="work-image" style="width:100%; background:#f8f9fa; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                ${primaImmagine 
                    ? `<img src="${primaImmagine}" alt="${work.title}" style="width:100%; height:auto; max-height:400px; object-fit:contain;">` 
                    : `<span style="font-size:3rem;">${getCategoryIcon(work.category)}</span>`}
            </div>
            
            <div class="work-content" style="padding:1rem;">
                <h3 class="work-title" style="margin:0 0 0.5rem 0; color:#2c3e50;">${work.title}</h3>
                <span class="work-category" style="display:inline-block; padding:0.2rem 0.8rem; background:#e67e22; color:white; border-radius:20px; font-size:0.8rem; margin-bottom:0.5rem;">${getCategoryLabel(work.category)}</span>
                <p class="work-description" style="color:#666; margin:0.5rem 0; line-height:1.4;">${descrizioneBreve}</p>
                
                <div class="work-info" style="display:flex; gap:1rem; margin:0.5rem 0; font-size:0.9rem; color:#666;">
                    <span><i class="fas fa-map-marker-alt" style="color:#e67e22; margin-right:0.3rem;"></i> ${work.luogo || 'Luogo non specificato'}</span>
                    <span><i class="fas fa-tag" style="color:#e67e22; margin-right:0.3rem;"></i> ${work.status || 'completato'}</span>
                </div>
            </div>
            
            <div class="work-card-footer" style="display:flex; justify-content:space-between; align-items:center; padding:1rem; background:#f8f9fa; border-top:1px solid #eee;">
                <div class="work-stats" style="display:flex; gap:1rem;">
                    <span><i class="fas fa-heart" style="color:#e67e22;"></i> ${work.likes?.length || 0}</span>
                    <span><i class="fas fa-comment" style="color:#e67e22;"></i> ${work.comments?.length || 0}</span>
                    <span><i class="fas fa-image" style="color:#e67e22;"></i> ${work.images?.length || 0}</span>
                </div>
                <button class="view-details-btn" onclick="event.stopPropagation(); viewWork('${work._id}')" style="padding:0.3rem 1rem; background:#e67e22; color:white; border:none; border-radius:5px; cursor:pointer;">
                    <i class="fas fa-arrow-right"></i> Dettagli
                </button>
            </div>
        </div>
    `;
}

// Carica altri lavori
window.loadMoreWorks = function() {
    currentPage++;
    displayWorks(window.filteredWorks || allWorks);
};

// Vai al dettaglio lavoro
window.viewWork = function(workId) {
    window.location.href = `work-detail.html?id=${workId}`;
};

// Funzioni helper
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
    return icons[category] || '🛠️';
}

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

// Event listeners per filtri
document.getElementById('categoryFilter').addEventListener('change', applyFiltersAndSort);
document.getElementById('sortFilter').addEventListener('change', applyFiltersAndSort);

// Ricerca
document.getElementById('searchBtn').addEventListener('click', searchWorks);
document.getElementById('searchInput').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') searchWorks();
});

function searchWorks() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        applyFiltersAndSort();
        return;
    }
    
    const filtered = allWorks.filter(work => 
        work.title.toLowerCase().includes(searchTerm) ||
        work.description.toLowerCase().includes(searchTerm) ||
        work.author?.nome?.toLowerCase().includes(searchTerm) ||
        work.author?.cognome?.toLowerCase().includes(searchTerm)
    );
    
    document.getElementById('worksFeed').innerHTML = filtered.map(work => createWorkCard(work)).join('');
    
    if (filtered.length === 0) {
        document.getElementById('noResults').style.display = 'block';
        document.getElementById('loadMore').style.display = 'none';
    } else {
        document.getElementById('noResults').style.display = 'none';
        document.getElementById('loadMore').style.display = 'none';
    }
}

// Aggiorna navbar
function updateNavbar() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const navLinks = document.getElementById('navLinks');
    const currentPath = window.location.pathname;
    
    if (navLinks) {
        if (token && user) {
            const isInPages = currentPath.includes('/pages/');
            const basePath = isInPages ? '' : 'pages/';
            
            navLinks.innerHTML = `
                <a href="${basePath}feed.html" class="active">Feed</a>
                <a href="${basePath}dashboard.html">Dashboard</a>
                <a href="${basePath}works.html">I miei lavori</a>
                <a href="${basePath}profile.html">Profilo</a>
                <a href="${basePath}messages.html">Messaggi</a>
                <a href="${basePath}suppliers.html">Fornitori</a>
                <a href="#" id="logoutBtn">Logout</a>
            `;
            
            document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = isInPages ? '../index.html' : 'index.html';
            });
        } else {
            navLinks.innerHTML = `
                <a href="../index.html">Home</a>
                <a href="feed.html" class="active">Feed</a>
                <a href="auth/login.html">Accedi</a>
                <a href="auth/register.html">Registrati</a>
            `;
        }
    }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    loadWorks();
});
