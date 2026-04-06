const API_URL = 'https://artigiano-social-api.onrender.com/api';

// Ottieni ID dalla URL
const urlParams = new URLSearchParams(window.location.search);
const workId = urlParams.get('id');

if (!workId) {
    window.location.href = 'dashboard.html';
}

// Variabili globali per il lightbox
let currentImageIndex = 0;
let currentImagesList = [];

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

// Mostra le immagini con lightbox
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
    
    // Salva la lista delle immagini per il lightbox
    currentImagesList = images;
    
    // Mostra la prima immagine (come miniatura cliccabile)
    const firstImage = images[0];
    
    container.innerHTML = `
        <div class="image-container" style="position: relative; cursor: pointer;" onclick="openLightbox(0)">
            <img src="${firstImage}" 
                 alt="Lavoro" 
                 style="width:100%; height:100%; object-fit:contain; max-height:500px;"
                 onload="this.style.opacity='1'"
                 onerror="this.src='https://via.placeholder.com/500x300?text=Immagine+non+disponibile'">
            <div class="image-overlay" style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px;">
                <i class="fas fa-expand"></i> Clicca per ingrandire
            </div>
        </div>
    `;
    
    // Se ci sono più immagini, aggiungi una galleria di miniature
    if (images.length > 1) {
        const existingGallery = document.querySelector('.image-gallery');
        if (existingGallery) existingGallery.remove();
        
        const gallery = document.createElement('div');
        gallery.className = 'image-gallery';
        gallery.style.cssText = 'display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;';
        
        gallery.innerHTML = images.map((img, index) => `
            <img src="${img}" 
                 alt="Miniatura" 
                 style="width:80px; height:80px; object-fit:cover; border-radius:5px; cursor:pointer; border:2px solid ${index === 0 ? '#e67e22' : 'transparent'}; transition: all 0.3s;"
                 onclick="event.stopPropagation(); changeMainImage('${img}', ${index})"
                 onmouseover="this.style.borderColor='#e67e22'"
                 onmouseout="this.style.borderColor='${index === 0 ? '#e67e22' : 'transparent'}'">
        `).join('');
        
        container.parentNode.appendChild(gallery);
    }
}

// Cambia l'immagine principale
window.changeMainImage = function(imageUrl, index) {
    const mainImage = document.getElementById('mainImage');
    if (mainImage) {
        mainImage.innerHTML = `
            <div class="image-container" style="position: relative; cursor: pointer;" onclick="openLightbox(${index})">
                <img src="${imageUrl}" 
                     alt="Lavoro" 
                     style="width:100%; height:100%; object-fit:contain; max-height:500px;">
                <div class="image-overlay" style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px;">
                    <i class="fas fa-expand"></i> Clicca per ingrandire
                </div>
            </div>
        `;
        
        // Aggiorna il bordo delle miniature
        document.querySelectorAll('.image-gallery img').forEach((img, i) => {
            img.style.borderColor = i === index ? '#e67e22' : 'transparent';
        });
    }
};

// APRI LIGHTBOX
window.openLightbox = function(index) {
    currentImageIndex = index;
    
    // Crea o riutilizza il lightbox
    let lightbox = document.getElementById('lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <span class="lightbox-close">&times;</span>
            <span class="lightbox-prev">&#10094;</span>
            <span class="lightbox-next">&#10095;</span>
            <div class="lightbox-counter"></div>
        `;
        document.body.appendChild(lightbox);
        
        // Eventi
        lightbox.querySelector('.lightbox-close').onclick = closeLightbox;
        lightbox.querySelector('.lightbox-prev').onclick = () => changeImage(-1);
        lightbox.querySelector('.lightbox-next').onclick = () => changeImage(1);
        lightbox.onclick = (e) => {
            if (e.target === lightbox) closeLightbox();
        };
        document.addEventListener('keydown', handleLightboxKey);
    }
    
    updateLightboxImage();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
};

// CHIUDI LIGHTBOX
window.closeLightbox = function() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// CAMBIA IMMAGINE NEL LIGHTBOX
window.changeImage = function(direction) {
    if (!currentImagesList.length) return;
    
    currentImageIndex += direction;
    if (currentImageIndex < 0) currentImageIndex = currentImagesList.length - 1;
    if (currentImageIndex >= currentImagesList.length) currentImageIndex = 0;
    
    updateLightboxImage();
};

// AGGIORNA L'IMMAGINE NEL LIGHTBOX
function updateLightboxImage() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    
    const img = currentImagesList[currentImageIndex];
    let imgElement = lightbox.querySelector('img');
    const counter = lightbox.querySelector('.lightbox-counter');
    
    if (imgElement) {
        imgElement.src = img;
    } else {
        imgElement = document.createElement('img');
        imgElement.src = img;
        lightbox.insertBefore(imgElement, lightbox.querySelector('.lightbox-counter'));
    }
    
    if (counter) {
        counter.textContent = `${currentImageIndex + 1} / ${currentImagesList.length}`;
    }
    
    // Aggiorna bordo miniatura se presente
    const galleryImgs = document.querySelectorAll('.image-gallery img');
    galleryImgs.forEach((thumb, i) => {
        thumb.style.borderColor = i === currentImageIndex ? '#e67e22' : 'transparent';
    });
}

// GESTIONE TASTI PER LIGHTBOX
function handleLightboxKey(e) {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('active')) return;
    
    switch(e.key) {
        case 'Escape':
            closeLightbox();
            break;
        case 'ArrowLeft':
            changeImage(-1);
            break;
        case 'ArrowRight':
            changeImage(1);
            break;
    }
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
    
    if (!commentsList) return;

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
    const currentPath = window.location.pathname;
    
    if (navLinks) {
        if (token && user) {
            const isInPages = currentPath.includes('/pages/');
            const basePath = isInPages ? '' : 'pages/';
            
            navLinks.innerHTML = `
                <a href="${basePath}feed.html">Feed</a>
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
