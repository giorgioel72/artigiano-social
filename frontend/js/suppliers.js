
let map;
let markers = [];
let userLocation = null;
let currentSuppliers = [];

// Inizializzazione
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🗺️ Inizializzazione mappa fornitori...');
    updateNavbar();
    await initMap();
    await loadSuppliers();
    setupEventListeners();
});

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
                <a href="${basePath}suppliers.html" class="active">Fornitori</a>
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

// Inizializza la mappa
async function initMap() {
    return new Promise((resolve) => {
        try {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        userLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        console.log('📍 Posizione utente:', userLocation);
                        
                        map = L.map('map').setView([userLocation.lat, userLocation.lng], 13);
                        
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© OpenStreetMap contributors'
                        }).addTo(map);
                        
                        L.marker([userLocation.lat, userLocation.lng], {
                            icon: L.divIcon({
                                className: 'user-location-marker',
                                html: '<i class="fas fa-circle" style="color: #e67e22; font-size: 20px;"></i>',
                                iconSize: [20, 20]
                            })
                        }).addTo(map).bindPopup('La tua posizione');
                        
                        resolve();
                    },
                    (error) => {
                        console.error('❌ Errore geolocalizzazione:', error);
                        map = L.map('map').setView([41.9028, 12.4964], 12);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© OpenStreetMap contributors'
                        }).addTo(map);
                        resolve();
                    }
                );
            } else {
                map = L.map('map').setView([41.9028, 12.4964], 12);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
                resolve();
            }
        } catch (error) {
            console.error('❌ Errore inizializzazione mappa:', error);
            resolve();
        }
    });
}

// Carica fornitori
async function loadSuppliers() {
    try {
        const response = await fetch(`${API_URL}/suppliers`);
        const suppliers = await response.json();
        currentSuppliers = suppliers;
        displaySuppliers(suppliers);
        
        if (map) {
            displayMarkers(suppliers);
        }
    } catch (error) {
        console.error('❌ Errore caricamento fornitori:', error);
        document.getElementById('suppliersList').innerHTML = '<p class="error">Errore nel caricamento dei fornitori</p>';
    }
}

// Carica fornitori vicini
async function loadNearbySuppliers() {
    if (!userLocation) return;
    
    try {
        const radius = document.getElementById('radiusInput').value * 1000;
        const category = document.getElementById('categoryFilter').value;
        
        let url = `${API_URL}/suppliers/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&maxDistance=${radius}`;
        if (category) url += `&category=${category}`;
        
        const response = await fetch(url);
        const suppliers = await response.json();
        currentSuppliers = suppliers;
        displaySuppliers(suppliers);
        if (map) {
            displayMarkers(suppliers);
        }
    } catch (error) {
        console.error('❌ Errore caricamento fornitori vicini:', error);
    }
}

// Mostra fornitori nella lista (CON BOTTONE ELIMINA)
function displaySuppliers(suppliers) {
    const list = document.getElementById('suppliersList');
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!list) return;
    
    if (suppliers.length === 0) {
        list.innerHTML = '<p class="no-results">Nessun fornitore trovato nella zona</p>';
        return;
    }
    
    list.innerHTML = suppliers.map(supplier => {
        // Verifica se l'utente loggato è il proprietario del fornitore
        const canDelete = token && user && supplier.addedBy?._id === user.id;
        
        return `
            <div class="supplier-card" onclick="focusOnSupplier(${supplier.indirizzo.coordinate.lat}, ${supplier.indirizzo.coordinate.lng})">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <h3>${supplier.name}</h3>
                    ${canDelete ? `
                        <button onclick="event.stopPropagation(); deleteSupplier('${supplier._id}', '${supplier.name}')" 
                                class="btn-icon" style="color: #dc3545; background: none; border: none; cursor: pointer; font-size: 1.2rem;" 
                                title="Elimina fornitore">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
                <span class="supplier-category">${supplier.category}</span>
                <div class="supplier-address">
                    <i class="fas fa-map-marker-alt"></i> ${supplier.indirizzo.via}, ${supplier.indirizzo.città}
                </div>
                <div class="supplier-contact">
                    ${supplier.telefono ? `<span><i class="fas fa-phone"></i> ${supplier.telefono}</span>` : ''}
                    ${supplier.distance ? `<span><i class="fas fa-road"></i> ${(supplier.distance / 1000).toFixed(1)} km</span>` : ''}
                </div>
                ${supplier.addedBy ? `
                    <div style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">
                        <i class="fas fa-user"></i> Aggiunto da: ${supplier.addedBy.nome || 'Utente'}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Mostra markers sulla mappa
function displayMarkers(suppliers) {
    if (!map) {
        console.error('❌ Mappa non disponibile');
        return;
    }
    
    markers.forEach(marker => {
        if (marker) marker.remove();
    });
    markers = [];
    
    suppliers.forEach(supplier => {
        if (supplier.indirizzo?.coordinate?.lat && supplier.indirizzo?.coordinate?.lng) {
            try {
                const marker = L.marker([supplier.indirizzo.coordinate.lat, supplier.indirizzo.coordinate.lng])
                    .addTo(map)
                    .bindPopup(`
                        <div class="popup-content">
                            <h4>${supplier.name}</h4>
                            <div class="popup-category">${supplier.category}</div>
                            <div class="popup-address">${supplier.indirizzo.via}, ${supplier.indirizzo.città}</div>
                            ${supplier.telefono ? `<div class="popup-phone"><i class="fas fa-phone"></i> ${supplier.telefono}</div>` : ''}
                        </div>
                    `);
                markers.push(marker);
            } catch (e) {
                console.error('❌ Errore creazione marker:', e);
            }
        }
    });
}

// Focus su un fornitore
window.focusOnSupplier = function(lat, lng) {
    if (map) {
        map.setView([lat, lng], 16);
    }
};

// ELIMINA FORNITORE
window.deleteSupplier = async function(supplierId, supplierName) {
    if (!confirm(`Sei sicuro di voler eliminare "${supplierName}"?`)) {
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Devi fare login');
        window.location.href = 'auth/login.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/suppliers/${supplierId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Errore durante l\'eliminazione');
        }
        
        alert('✅ Fornitore eliminato con successo!');
        
        // Ricarica la lista fornitori
        if (userLocation) {
            loadNearbySuppliers();
        } else {
            loadSuppliers();
        }
        
    } catch (error) {
        console.error('❌ Errore eliminazione:', error);
        alert('❌ ' + error.message);
    }
};

// Event listeners
function setupEventListeners() {
    const filterBtn = document.getElementById('filterBtn');
    const categoryFilter = document.getElementById('categoryFilter');
    const radiusInput = document.getElementById('radiusInput');
    const addSupplierBtn = document.getElementById('addSupplierBtn');
    
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            if (userLocation) {
                loadNearbySuppliers();
            } else {
                loadSuppliers();
            }
        });
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            if (userLocation) {
                loadNearbySuppliers();
            } else {
                loadSuppliers();
            }
        });
    }
    
    if (radiusInput) {
        radiusInput.addEventListener('change', () => {
            if (userLocation) {
                loadNearbySuppliers();
            }
        });
    }
    
    if (addSupplierBtn) {
        addSupplierBtn.addEventListener('click', openSupplierModal);
    }
}

// Gestione modal fornitori
function openSupplierModal() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Devi fare login per aggiungere un fornitore');
        window.location.href = 'auth/login.html';
        return;
    }
    document.getElementById('supplierModal').classList.add('active');
}

window.closeSupplierModal = function() {
    document.getElementById('supplierModal').classList.remove('active');
    document.getElementById('supplierForm').reset();
    document.getElementById('modalError').style.display = 'none';
    document.getElementById('modalSuccess').style.display = 'none';
    
    const saveBtn = document.getElementById('saveSupplierBtn');
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva fornitore';
};

// Submit form nuovo fornitore
const supplierForm = document.getElementById('supplierForm');
if (supplierForm) {
    supplierForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Devi fare login');
            window.location.href = 'auth/login.html';
            return;
        }
        
        const supplierData = {
            name: document.getElementById('supplierName').value,
            category: document.getElementById('supplierCategory').value,
            indirizzo: {
                via: document.getElementById('supplierVia').value,
                città: document.getElementById('supplierCittà').value,
                cap: document.getElementById('supplierCap').value || undefined
            },
            telefono: document.getElementById('supplierPhone').value || undefined,
            email: document.getElementById('supplierEmail').value || undefined,
            website: document.getElementById('supplierWebsite').value || undefined
        };
        
        const saveBtn = document.getElementById('saveSupplierBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';
        
        try {
            const response = await fetch(`${API_URL}/suppliers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(supplierData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Errore durante il salvataggio');
            }
            
            document.getElementById('modalError').style.display = 'none';
            document.getElementById('modalSuccess').style.display = 'block';
            document.getElementById('modalSuccess').textContent = '✅ Fornitore aggiunto con successo!';
            
            setTimeout(() => {
                closeSupplierModal();
                if (userLocation) {
                    loadNearbySuppliers();
                } else {
                    loadSuppliers();
                }
            }, 2000);
            
        } catch (error) {
            document.getElementById('modalError').textContent = '❌ ' + error.message;
            document.getElementById('modalError').style.display = 'block';
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva fornitore';
        }
    });
}
