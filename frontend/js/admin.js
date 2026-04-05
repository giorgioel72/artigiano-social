const API_URL = 'http://localhost:5000/api';

// Variabili globali per il widget
let cloudinaryWidget = null;
let currentImagePublicId = null;

// Inizializza il widget Cloudinary
function initCloudinaryWidget() {
    cloudinaryWidget = cloudinary.createUploadWidget({
        cloudName: 'dmwuednbq',
        uploadPreset: 'artigiano_social',
        sources: ['local', 'url', 'camera', 'google_drive', 'dropbox'],
        multiple: false,
        maxFiles: 1,
        cropping: true,
        croppingAspectRatio: 16/9,
        showAdvancedOptions: false,
        styles: {
            palette: {
                window: "#FFFFFF",
                windowBorder: "#e67e22",
                tabIcon: "#e67e22",
                menuIcons: "#5A5A5A",
                textDark: "#000000",
                textLight: "#FFFFFF",
                link: "#e67e22",
                action: "#e67e22",
                inactiveTabIcon: "#0E2F5A",
                error: "#F44235",
                inProgress: "#e67e22",
                complete: "#20B832",
                sourceBg: "#F4F4F4"
            }
        },
        language: 'it'
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            console.log('✅ Immagine caricata:', result.info);
            
            const imageUrl = result.info.secure_url;
            currentImagePublicId = result.info.public_id;
            
            document.getElementById('adImageUrl').value = imageUrl;
            showImagePreview(imageUrl);
            document.getElementById('deleteImageBtn').disabled = false;
            showMessage('success', '✅ Immagine caricata con successo!');
        }
    });
}

// Mostra anteprima dell'immagine
function showImagePreview(url) {
    let previewContainer = document.getElementById('imagePreviewContainer');
    
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'imagePreviewContainer';
        previewContainer.className = 'image-preview-container';
        
        const imageUrlField = document.getElementById('adImageUrl').parentNode;
        imageUrlField.appendChild(previewContainer);
    }
    
    previewContainer.innerHTML = `
        <div class="image-preview">
            <img src="${url}" alt="Anteprima">
            <p class="preview-note">Anteprima della pubblicità</p>
        </div>
    `;
}

// Cancella l'immagine corrente
async function deleteCurrentImage() {
    if (!currentImagePublicId) {
        alert('Nessuna immagine da cancellare');
        return;
    }
    
    if (!confirm('Sei sicuro di voler cancellare questa immagine da Cloudinary?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/upload/destroy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ publicId: currentImagePublicId })
        });
        
        if (!response.ok) throw new Error('Errore cancellazione');
        
        document.getElementById('adImageUrl').value = '';
        currentImagePublicId = null;
        
        const previewContainer = document.getElementById('imagePreviewContainer');
        if (previewContainer) previewContainer.remove();
        
        document.getElementById('deleteImageBtn').disabled = true;
        showMessage('success', '✅ Immagine cancellata');
        
    } catch (error) {
        console.error('❌ Errore cancellazione:', error);
        showMessage('error', '❌ Errore nella cancellazione');
    }
}

// Mostra messaggi
function showMessage(type, text) {
    let msgDiv = document.getElementById('modalMessage');
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'modalMessage';
        msgDiv.className = `alert alert-${type}`;
        document.querySelector('.modal-body').insertBefore(msgDiv, document.querySelector('.modal-body').firstChild);
    } else {
        msgDiv.className = `alert alert-${type}`;
    }
    msgDiv.textContent = text;
    msgDiv.style.display = 'block';
    setTimeout(() => msgDiv.style.display = 'none', 3000);
}

// Carica tutte le pubblicità
async function loadAds() {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.log('❌ Token mancante, redirect a login');
            window.location.href = '../../pages/auth/login.html';
            return;
        }
        
        console.log('📡 Caricamento pubblicità...');
        
        const response = await fetch(`${API_URL}/ads`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            console.log('🔑 Token scaduto, redirect a login');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/auth/login.html';
            return;
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Errore caricamento');
        }
        
        const ads = await response.json();
        console.log('✅ Pubblicità caricate:', ads.length);
        displayAds(ads);
    } catch (error) {
        console.error('❌ Errore:', error);
        document.getElementById('adsList').innerHTML = `
            <p class="error">❌ Errore: ${error.message}</p>
        `;
    }
}

// Mostra le pubblicità
function displayAds(ads) {
    const container = document.getElementById('adsList');
    
    if (ads.length === 0) {
        container.innerHTML = '<p class="no-data">Nessuna pubblicità inserita</p>';
        return;
    }
    
    container.innerHTML = ads.map(ad => `
        <div class="ad-card" data-id="${ad._id}">
            <img src="${ad.imageUrl}" alt="${ad.title}" class="ad-image">
            <div class="ad-info">
                <h3>${ad.title}</h3>
                <p>${ad.description || ''}</p>
                <div class="ad-meta">
                    <span class="ad-placement">${getPlacementLabel(ad.placement)}</span>
                    <span class="ad-status ${ad.status}">${ad.status === 'active' ? 'Attiva' : 'Inattiva'}</span>
                </div>
                <div class="ad-stats">
                    <span><i class="fas fa-eye"></i> ${ad.impressions || 0}</span>
                    <span><i class="fas fa-click"></i> ${ad.clicks || 0}</span>
                </div>
                <div class="ad-actions">
                    <button onclick="editAd('${ad._id}')" class="btn-icon" title="Modifica">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteAd('${ad._id}')" class="btn-icon delete" title="Elimina">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${ad.createdBy ? `<div class="ad-author">
                    <small><i class="fas fa-user"></i> ${ad.createdBy.nome || 'Utente'}</small>
                </div>` : ''}
            </div>
        </div>
    `).join('');
}

// Helper per etichetta posizione
function getPlacementLabel(placement) {
    const labels = {
        'dashboard_top': 'Dashboard - Alto',
        'dashboard_sidebar': 'Dashboard - Laterale',
        'dashboard_bottom': 'Dashboard - Basso'
    };
    return labels[placement] || placement;
}

// Apri modal per nuova pubblicità
document.getElementById('addAdBtn').addEventListener('click', () => {
    document.getElementById('modalTitle').textContent = 'Nuova pubblicità';
    document.getElementById('adForm').reset();
    document.getElementById('adId').value = '';
    currentImagePublicId = null;
    
    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) previewContainer.remove();
    
    document.getElementById('deleteImageBtn').disabled = true;
    document.getElementById('adModal').classList.add('active');
});

// Chiudi modal
window.closeAdModal = function() {
    document.getElementById('adModal').classList.remove('active');
    const modalMessage = document.getElementById('modalMessage');
    if (modalMessage) modalMessage.style.display = 'none';
};

// Upload con Cloudinary
document.getElementById('uploadImageBtn').addEventListener('click', () => {
    if (!cloudinaryWidget) initCloudinaryWidget();
    cloudinaryWidget.open();
});

// Cancella immagine
document.getElementById('deleteImageBtn').addEventListener('click', deleteCurrentImage);

// Submit form
document.getElementById('adForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    const adId = document.getElementById('adId').value;
    const isEditing = !!adId;
    
    const adData = {
        title: document.getElementById('adTitle').value,
        description: document.getElementById('adDescription').value,
        imageUrl: document.getElementById('adImageUrl').value,
        linkUrl: document.getElementById('adLinkUrl').value,
        placement: document.getElementById('adPlacement').value,
        status: document.getElementById('adStatus').value,
        priority: parseInt(document.getElementById('adPriority').value) || 0
    };
    
    if (!adData.imageUrl) {
        alert('Devi caricare un\'immagine!');
        return;
    }
    
    const saveBtn = document.getElementById('saveAdBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';
    
    try {
        const url = isEditing ? `${API_URL}/ads/${adId}` : `${API_URL}/ads`;
        const method = isEditing ? 'PUT' : 'POST';
        
        console.log(`📡 ${method} ${url}`, adData);
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(adData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Errore durante il salvataggio');
        }
        
        console.log('✅ Salvataggio riuscito:', result);
        alert('✅ Pubblicità salvata con successo!');
        closeAdModal();
        loadAds();
        
    } catch (error) {
        console.error('❌ Errore:', error);
        alert('❌ ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva';
    }
});

// Modifica pubblicità
window.editAd = async function(id) {
    try {
        console.log('📡 Modifica pubblicità:', id);
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/ads/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Errore caricamento');
        }
        
        const ad = await response.json();
        console.log('✅ Pubblicità caricata:', ad);
        
        document.getElementById('modalTitle').textContent = 'Modifica pubblicità';
        document.getElementById('adId').value = ad._id;
        document.getElementById('adTitle').value = ad.title;
        document.getElementById('adDescription').value = ad.description || '';
        document.getElementById('adImageUrl').value = ad.imageUrl;
        document.getElementById('adLinkUrl').value = ad.linkUrl;
        document.getElementById('adPlacement').value = ad.placement;
        document.getElementById('adStatus').value = ad.status;
        document.getElementById('adPriority').value = ad.priority || 0;
        
        showImagePreview(ad.imageUrl);
        document.getElementById('deleteImageBtn').disabled = true;
        
        document.getElementById('adModal').classList.add('active');
        
    } catch (error) {
        console.error('❌ Errore:', error);
        alert('Errore: ' + error.message);
    }
};

// Elimina pubblicità
window.deleteAd = async function(id) {
    if (!confirm('Sei sicuro di voler eliminare questa pubblicità?')) return;
    
    try {
        console.log('📡 Eliminazione pubblicità:', id);
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/ads/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Errore eliminazione');
        }
        
        console.log('✅ Eliminazione riuscita');
        alert('✅ Pubblicità eliminata con successo!');
        loadAds();
        
    } catch (error) {
        console.error('❌ Errore:', error);
        alert('Errore: ' + error.message);
    }
};

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Avvio pagina admin');
    
    if (!document.querySelector('script[src*="cloudinary"]')) {
        const script = document.createElement('script');
        script.src = 'https://widget.cloudinary.com/v2.0/global/all.js';
        script.onload = initCloudinaryWidget;
        document.head.appendChild(script);
    } else {
        initCloudinaryWidget();
    }
    
    loadAds();
});
