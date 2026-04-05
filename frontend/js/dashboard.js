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

// Carica pubblicità per la dashboard
async function loadAds() {
    try {
        const placements = ['dashboard_top', 'dashboard_sidebar', 'dashboard_bottom'];
        
        for (const placement of placements) {
            const response = await fetch(`${API_URL}/ads/placement/${placement}?limit=1`);
            const ads = await response.json();
            
            if (ads.length > 0) {
                displayAd(ads[0], placement);
            }
        }
    } catch (error) {
        console.error('❌ Errore caricamento pubblicità:', error);
    }
}

// Mostra una pubblicità
function displayAd(ad, placement) {
    const container = document.getElementById(`ad-${placement}`);
    if (!container) return;
    
    container.innerHTML = `
        <a href="${ad.linkUrl}" target="_blank" class="ad-container" onclick="trackAdClick('${ad._id}')">
            <img src="${ad.imageUrl}" alt="${ad.title}" class="ad-image">
            ${ad.description ? `<p class="ad-description">${ad.description}</p>` : ''}
        </a>
    `;
}

// Traccia click
window.trackAdClick = async function(adId) {
    try {
        await fetch(`${API_URL}/ads/${adId}/click`, { method: 'POST' });
    } catch (error) {
        console.error('❌ Errore tracciamento click:', error);
    }
};

// Carica dati utente e lavori
async function loadUserData() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!token || !user) {
        window.location.href = 'auth/login.html';
        return;
    }
    
    try {
        // Carica profilo utente aggiornato
        const userData = await apiRequest('/users/me');
        
        // Aggiorna UI con dati utente
        document.getElementById('userName').textContent = `${userData.nome} ${userData.cognome}`;
        document.getElementById('userProfession').textContent = userData.professione;
        document.getElementById('userEmail').textContent = userData.email;
        document.getElementById('welcomeName').textContent = userData.nome;
        
        // ⭐ AVATAR - Se presente, mostra immagine, altrimenti iniziali
        const avatarContainer = document.getElementById('userAvatar');
        if (avatarContainer) {
            if (userData.avatar) {
                // Mostra immagine avatar
                avatarContainer.innerHTML = `<img src="${userData.avatar}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                avatarContainer.style.background = 'transparent';
                avatarContainer.style.color = 'transparent';
            } else {
                // Mostra iniziali
                avatarContainer.textContent = userData.nome.charAt(0) + userData.cognome.charAt(0);
                avatarContainer.style.background = '#e67e22';
                avatarContainer.style.color = 'white';
            }
        }
        
        // Aggiorna statistiche
        document.getElementById('worksCount').textContent = userData.lavoriCount || '0';
        document.getElementById('reviewsCount').textContent = userData.recensioniCount || '0';
        document.getElementById('rating').textContent = userData.rating || '0.0';
        
        // Carica i lavori dell'utente
        await loadUserWorks(userData._id);
        
        // ⭐ Carica le pubblicità
        await loadAds();
        
    } catch (error) {
        console.error('Errore:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'auth/login.html';
    }
}

// Carica lavori dell'utente
async function loadUserWorks(userId) {
    const worksList = document.getElementById('userWorks');
    if (!worksList) return;
    
    try {
        const works = await apiRequest(`/works/user/${userId}`);
        
        if (works.length === 0) {
            worksList.innerHTML = `
                <div class="no-works">
                    <p>Non hai ancora pubblicato nessun lavoro.</p>
                    <a href="add-work.html" class="btn btn-primary btn-small">
                        <i class="fas fa-plus-circle"></i> Pubblica il tuo primo lavoro
                    </a>
                </div>
            `;
            return;
        }
        
        // Mostra solo i 3 lavori più recenti
        const recentWorks = works.slice(0, 3);
        
        worksList.innerHTML = recentWorks.map(work => {
            const data = new Date(work.createdAt).toLocaleDateString('it-IT');
            const icona = getCategoryIcon(work.category);
            const primaImmagine = work.images && work.images.length > 0 ? work.images[0] : null;
            
            return `
                <div class="work-item" data-id="${work._id}">
                    <div class="work-image-small">
                        ${primaImmagine ? `<img src="${primaImmagine}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;">` : icona}
                    </div>
                    <div class="work-info">
                        <h4>${work.title}</h4>
                        <p>${work.description.substring(0, 80)}${work.description.length > 80 ? '...' : ''}</p>
                        <div class="work-meta">
                            <span><i class="fas fa-map-marker-alt"></i> ${work.luogo || 'Luogo non specificato'}</span>
                            <span><i class="fas fa-calendar"></i> ${data}</span>
                            <span><i class="fas fa-heart"></i> ${work.likes?.length || 0}</span>
                            <span><i class="fas fa-comment"></i> ${work.comments?.length || 0}</span>
                        </div>
                    </div>
                    <div class="work-actions">
                        <button class="btn-icon" onclick="viewWork('${work._id}')" title="Visualizza">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="editWork('${work._id}')" title="Modifica">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Se ci sono più di 3 lavori, mostra link "Vedi tutti"
        if (works.length > 3) {
            const viewAllLink = document.createElement('a');
            viewAllLink.href = 'works.html';
            viewAllLink.className = 'view-all';
            viewAllLink.innerHTML = 'Vedi tutti i lavori (' + works.length + ') →';
            worksList.parentNode.appendChild(viewAllLink);
        }
        
    } catch (error) {
        console.error('Errore caricamento lavori:', error);
        worksList.innerHTML = '<p class="error">Errore nel caricamento dei lavori</p>';
    }
}

// Funzione per ottenere icona in base alla categoria
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

// Funzioni per navigazione
window.viewWork = function(workId) {
    window.location.href = `work-detail.html?id=${workId}`;
};

window.editWork = function(workId) {
    window.location.href = `edit-work.html?id=${workId}`;
};

// Inizializzazione
document.addEventListener('DOMContentLoaded', loadUserData);
