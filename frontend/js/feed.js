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

// Crea HTML per una card lavoro
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
    
    // Avatar dell'autore
    const authorAvatar = work.author?.avatar 
        ? `<img src="${work.author.avatar}" alt="Avatar" class="author-avatar-img">`
        : `<div class="author-avatar">${work.author?.nome?.charAt(0) || ''}${work.author?.cognome?.charAt(0) || ''}</div>`;
    
    return `
        <div class="work-card" onclick="viewWork('${work._id}')">
            <div class="work-card-header">
                ${authorAvatar}
                <div class="author-info">
                    <a href="profile.html?id=${work.author?._id}" class="author-name" onclick="event.stopPropagation()">
                        ${work.author?.nome || ''} ${work.author?.cognome || ''}
                    </a>
                    <span class="author-profession">${work.author?.professione || ''}</span>
                </div>
                <div class="work-date">${data}</div>
            </div>
            
            <div class="work-image">
                ${primaImmagine 
                    ? `<img src="${primaImmagine}" alt="${work.title}" style="width:100%; height:100%; object-fit:cover;">` 
                    : getCategoryIcon(work.category)}
            </div>
            
            <div class="work-content">
                <h3 class="work-title">${work.title}</h3>
                <span class="work-category">${getCategoryLabel(work.category)}</span>
                <p class="work-description">${descrizioneBreve}</p>
                
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
    
    if (navLinks) {
        if (token && user) {
            navLinks.innerHTML = `
                <a href="feed.html" class="active">Feed</a>
                <a href="dashboard.html">Dashboard</a>
                <a href="works.html">I miei lavori</a>
                <a href="profile.html">Profilo</a>
                <a href="messages.html">Messaggi</a>
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
