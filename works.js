const API_URL = 'http://localhost:5000/api';

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

// Crea card lavoro (SENZA avatar)
function createWorkCard(work) {
    const data = new Date(work.createdAt).toLocaleDateString('it-IT');
    const primaImmagine = work.images && work.images.length > 0 ? work.images[0] : null;
    const icona = getCategoryIcon(work.category);
    
    return `
        <div class="work-card" onclick="viewWork('${work._id}')">
            <div class="work-card-header">
                <div class="author-avatar">
                    ${work.author?.nome?.charAt(0) || ''}${work.author?.cognome?.charAt(0) || ''}
                </div>
                <div class="author-info">
                    <span class="author-name">${work.author?.nome || ''} ${work.author?.cognome || ''}</span>
                    <span class="author-profession">${work.author?.professione || ''}</span>
                </div>
                <div class="work-date">${data}</div>
            </div>
            
            <div class="work-image">
                ${primaImmagine 
                    ? `<img src="${primaImmagine}" style="width:100%; height:100%; object-fit:cover;">` 
                    : icona}
            </div>
            
            <div class="work-content">
                <h3 class="work-title">${work.title}</h3>
                <span class="work-category">${getCategoryLabel(work.category)}</span>
                <p class="work-description">${work.description.substring(0, 100)}...</p>
                
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
                <div class="work-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); editWork('${work._id}')" title="Modifica">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); deleteWork('${work._id}')" title="Elimina">
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
    
    if (navLinks) {
        if (token && user) {
            navLinks.innerHTML = `
                <a href="feed.html">Feed</a>
                <a href="dashboard.html">Dashboard</a>
                <a href="works.html" class="active">I miei lavori</a>
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
            window.location.href = 'auth/login.html';
        }
    }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    loadMyWorks();
});