const API_URL = 'http://localhost:5000/api';

// Ottieni ID dalla URL
const urlParams = new URLSearchParams(window.location.search);
const workId = urlParams.get('id');

if (!workId) {
    window.location.href = 'dashboard.html';
}

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

// Carica dettaglio lavoro
async function loadWorkDetail() {
    try {
        const work = await apiRequest(`/works/${workId}`);
        console.log('📦 Lavoro caricato:', work);
        console.log('🖼️ Immagini:', work.images);
        
        displayWork(work);
        
        // Nascondi loading, mostra contenuto
        document.getElementById('loading').style.display = 'none';
        document.getElementById('workContent').style.display = 'block';
        
    } catch (error) {
        console.error('Errore:', error);
        document.getElementById('loading').innerHTML = `
            <i class="fas fa-exclamation-circle"></i> 
            Errore nel caricamento del lavoro: ${error.message}
            <br><br>
            <button onclick="window.location.href='dashboard.html'" class="btn btn-primary">
                Torna alla dashboard
            </button>
        `;
    }
}

// Mostra le immagini
function displayImages(images) {
    const container = document.getElementById('mainImage');
    if (!container) {
        console.error('❌ Elemento mainImage non trovato!');
        return;
    }
    
    if (!images || images.length === 0) {
        container.innerHTML = '<div class="no-image">📸 Nessuna immagine disponibile</div>';
        return;
    }
    
    // Mostra la prima immagine
    const firstImage = images[0];
    container.innerHTML = `<img src="${firstImage}" alt="Lavoro" style="width:100%; max-height:400px; object-fit:contain;">`;
}

// Mostra lavoro nella UI
function displayWork(work) {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Titolo e categoria
    document.getElementById('workTitle').textContent = work.title;
    document.getElementById('workCategory').textContent = getCategoryLabel(work.category);
    
    // Autore
    document.getElementById('authorName').textContent = `${work.author.nome} ${work.author.cognome}`;
    document.getElementById('authorProfession').textContent = work.author.professione;
    
    const authorAvatar = document.getElementById('authorAvatar');
    authorAvatar.textContent = work.author.nome.charAt(0) + work.author.cognome.charAt(0);
    
    const authorLink = document.getElementById('authorLink');
    authorLink.href = `profile.html?id=${work.author._id}`;
    
    // Info lavoro
    document.getElementById('workLuogo').textContent = work.luogo || 'Non specificato';
    document.getElementById('workData').textContent = new Date(work.dataLavoro || work.createdAt).toLocaleDateString('it-IT');
    document.getElementById('workStatus').textContent = work.status;
    document.getElementById('workLikes').textContent = work.likes?.length || 0;
    document.getElementById('workDescription').textContent = work.description;
    
    // Mostra le immagini
    displayImages(work.images);
    
    // Like button
    const likeBtn = document.getElementById('likeBtn');
    const userLiked = work.likes?.includes(currentUser.id);
    
    if (userLiked) {
        likeBtn.classList.add('liked');
        likeBtn.innerHTML = '<i class="fas fa-heart"></i> <span id="likeText">Ti piace</span>';
    } else {
        likeBtn.innerHTML = '<i class="far fa-heart"></i> <span id="likeText">Mi piace</span>';
    }
    
    likeBtn.onclick = () => toggleLike(work._id);
    
    // Azioni autore (se sono l'autore)
    if (currentUser.id === work.author._id) {
        document.getElementById('authorActions').style.display = 'flex';
    }
    
    // Commenti
    document.getElementById('commentCount').textContent = `(${work.comments?.length || 0})`;
    displayComments(work.comments || []);
    
    // Avatar commentatore
    if (currentUser.nome) {
        document.getElementById('commenterAvatar').textContent = 
            currentUser.nome.charAt(0) + (currentUser.cognome?.charAt(0) || '');
    }
}

// Mostra commenti
function displayComments(comments) {
    const commentsList = document.getElementById('commentsList');
    
    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<p class="no-comments">Nessun commento. Scrivi tu il primo!</p>';
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => {
        const date = new Date(comment.createdAt).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="comment-item">
                <div class="comment-avatar">
                    ${comment.user?.nome?.charAt(0) || ''}${comment.user?.cognome?.charAt(0) || ''}
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <a href="profile.html?id=${comment.user?._id}" class="comment-author">
                            ${comment.user?.nome || ''} ${comment.user?.cognome || ''}
                        </a>
                        <span class="comment-date">${date}</span>
                    </div>
                    <div class="comment-text">${comment.text}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Toggle like
async function toggleLike(workId) {
    try {
        const result = await apiRequest(`/works/${workId}/like`, 'POST');
        
        const likeBtn = document.getElementById('likeBtn');
        const workLikes = document.getElementById('workLikes');
        
        if (result.userLiked) {
            likeBtn.classList.add('liked');
            likeBtn.innerHTML = '<i class="fas fa-heart"></i> <span id="likeText">Ti piace</span>';
        } else {
            likeBtn.classList.remove('liked');
            likeBtn.innerHTML = '<i class="far fa-heart"></i> <span id="likeText">Mi piace</span>';
        }
        
        workLikes.textContent = result.likes;
        
    } catch (error) {
        alert('Errore: ' + error.message);
    }
}

// Aggiungi commento
document.getElementById('commentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const text = document.getElementById('commentText').value;
    if (!text.trim()) return;
    
    try {
        await apiRequest(`/works/${workId}/comment`, 'POST', { text });
        loadWorkDetail(); // Ricarica
        document.getElementById('commentText').value = '';
        
    } catch (error) {
        alert('Errore: ' + error.message);
    }
});

// Modifica lavoro
window.editWork = function() {
    window.location.href = `edit-work.html?id=${workId}`;
};

// Elimina lavoro
window.deleteWork = async function() {
    if (!confirm('Sei sicuro di voler eliminare questo lavoro?')) return;
    
    try {
        await apiRequest(`/works/${workId}`, 'DELETE');
        alert('Lavoro eliminato con successo!');
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert('Errore: ' + error.message);
    }
};

// Helper per categoria
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
    loadWorkDetail();
});
