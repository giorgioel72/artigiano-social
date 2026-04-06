const API_URL = 'https://artigiano-social-api.onrender.com/api';

// Funzione per richieste autenticate
async function apiRequest(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('token');
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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

// Carica i lavori dell'utente
async function loadMyWorks() {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            window.location.href = 'auth/login.html';
            return;
        }
        
        const user = JSON.parse(userStr);
        const userId = user.id || user._id;
        
        if (!userId) {
            throw new Error('ID utente non trovato');
        }
        
        document.getElementById('loading').style.display = 'block';
        document.getElementById('worksFeed').style.display = 'none';
        document.getElementById('noResults').style.display = 'none';
        
        const works = await apiRequest(`/works/user/${userId}`);
        
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

// Crea card lavoro - VERSIONE CON IMMAGINE ADATTIVA
function createWorkCard(work) {
    const data = new Date(work.createdAt).toLocaleDateString('it-IT');
    const primaImmagine = work.images && work.images.length > 0 ? work.images[0] : null;
    const icona = getCategoryIcon(work.category);
    
    return `
        <div class="work-card" onclick="viewWork('${work._id}')" style="cursor:pointer; margin-bottom:20px; border:1px solid #eee; border-radius:8px; overflow:hidden; background:white; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
            <div class="work-card-header" style="display:flex; align-items:center; padding:1rem; background:#f8f9fa; border-bottom:1px solid #eee;">
                <div class="author-avatar" style="width:40px; height:40px; background:#e67e22; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1rem; font-weight:bold; margin-right:1rem;">
                    ${work.author?.nome?.charAt(0) || ''}${work.author?.cognome?.charAt(0) || ''}
                </div>
                <div class="author-info" style="flex:1;">
                    <div class="author-name" style="font-weight:bold; color:#2c3e50;">${work.author?.nome || ''} ${work.author?.cognome || ''}</div>
                    <div class="author-profession" style="font-size:0.85rem; color:#e67e22;">${work.author?.professione || 'Artigiano'}</div>
                </div>
                <div class="work-date" style="font-size:0.85rem; color:#888;">${data}</div>
            </div>
            
            <div class="work-image" style="width:100%; height:200px; background:#f0f0f0; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                ${primaImmagine 
                    ? `<img src="${primaImmagine}" alt="${work.title}" style="width:100%; height:100%; object-fit:cover;">` 
                    : `<span style="font-size:3rem;">${icona}</span>`}
            </div>
            
            <div class="work-content" style="padding:1rem;">
                <h3 class="work-title" style="margin:0 0 0.5rem 0; color:#2c3e50;">${work.title}</h3>
                <span class="work-category" style="display:inline-block; padding:0.2rem 0.8rem; background:#e67e22; color:white; border-radius:20px; font-size:0.8rem; margin-bottom:0.5rem;">${getCategoryLabel(work.category)}</span>
                <p class="work-description" style="color:#666; margin:0.5rem 0; line-height:1.4;">${work.description.substring(0, 100)}${work.description.length > 100 ? '...' : ''}</p>
                
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
                <div class="work-actions" style="display:flex; gap:0.5rem;">
                    <button class="btn-icon" onclick="event.stopPropagation(); editWork('${work._id}')" title="Modifica" style="width:35px; height:35px; border:none; background:white; border-radius:5px; cursor:pointer; color:#666; transition:all 0.3s; display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); deleteWork('${work._id}')" title="Elimina" style="width:35px; height:35px; border:none; background:white; border-radius:5px; cursor:pointer; color:#666; transition:all 0.3s; display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

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
    return icons[category] || '📸';
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

// Funzioni di navigazione
window.viewWork = function(id) {
    window.location.href = `work-detail.html?id=${id}`;
};

window.editWork = function(id) {
    window.location.href = `edit-work.html?id=${id}`;
};

window.deleteWork = async function(id) {
    if (!confirm('Sei sicuro di voler eliminare questo lavoro?')) return;
    
    try {
        await apiRequest(`/works/${id}`, 'DELETE');
        alert('Lavoro eliminato!');
        loadMyWorks();
    } catch (error) {
        alert('Errore: ' + error.message);
    }
};

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
                <a href="${basePath}feed.html">Feed</a>
                <a href="${basePath}dashboard.html">Dashboard</a>
                <a href="${basePath}works.html" class="active">I miei lavori</a>
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
            window.location.href = 'auth/login.html';
        }
    }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    loadMyWorks();
});
