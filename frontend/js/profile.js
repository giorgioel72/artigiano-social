const API_URL = 'https://artigiano-social-api.onrender.com/api';

let currentProfileUserId = null;
let isOwnProfile = false;

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

// Carica profilo utente
async function loadProfile() {
    try {
        // Ottieni l'ID dalla URL (se presente)
        const urlParams = new URLSearchParams(window.location.search);
        const profileId = urlParams.get('id');
        
        // Ottieni l'utente loggato
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (!token || !userStr) {
            window.location.href = 'auth/login.html';
            return;
        }
        
        const loggedUser = JSON.parse(userStr);
        
        // Determina quale profilo caricare
        let userId = profileId || loggedUser.id;
        currentProfileUserId = userId;
        
        // Verifica se è il proprio profilo
        isOwnProfile = (userId === loggedUser.id);
        
        console.log('👤 Carico profilo:', userId);
        console.log('📌 È proprio profilo:', isOwnProfile);
        
        // Carica i dati del profilo
        const user = await apiRequest(`/users/${userId}`);
        
        // Se è il proprio profilo, carica anche i dati completi
        if (isOwnProfile) {
            const fullUser = await apiRequest('/users/me');
            displayProfile(fullUser, true);
        } else {
            displayProfile(user, false);
        }
        
        // Aggiorna la UI in base al proprietario
        updateUIBasedOnOwnership();
        
    } catch (error) {
        console.error('❌ Errore caricamento profilo:', error);
        if (error.message.includes('404')) {
            alert('Profilo non trovato');
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'auth/login.html';
        }
    }
}

// Aggiorna UI in base al proprietario del profilo
function updateUIBasedOnOwnership() {
    console.log('🎨 Aggiorno UI, isOwnProfile:', isOwnProfile);
    
    // Nascondi il pulsante "Pubblica nuovo lavoro" se non è il proprio profilo
    const publishButton = document.getElementById('publishWorkBtn');
    if (publishButton) {
        if (isOwnProfile) {
            publishButton.style.display = 'inline-block';
            console.log('✅ Mostro pulsante pubblica (profilo proprio)');
        } else {
            publishButton.style.display = 'none';
            console.log('🚫 Nascondo pulsante pubblica (profilo altrui)');
        }
    }
    
    // Nascondi la fotocamera dell'avatar se non è il proprio profilo
    const changeAvatarBtn = document.querySelector('.btn-change-avatar');
    if (changeAvatarBtn) {
        if (isOwnProfile) {
            changeAvatarBtn.style.display = 'flex';
            console.log('✅ Fotocamera visibile (profilo proprio)');
        } else {
            changeAvatarBtn.style.display = 'none';
            console.log('🚫 Fotocamera nascosta (profilo altrui)');
        }
    }
    
    // Nascondi tabs di modifica se non è proprio profilo
    const editTabBtn = document.getElementById('editTabBtn');
    const securityTabBtn = document.getElementById('securityTabBtn');
    
    if (!isOwnProfile) {
        if (editTabBtn) editTabBtn.style.display = 'none';
        if (securityTabBtn) securityTabBtn.style.display = 'none';
        
        // Mostra un messaggio informativo
        const infoCard = document.querySelector('.info-card');
        if (infoCard && !document.querySelector('.alert-info')) {
            const notice = document.createElement('div');
            notice.className = 'alert alert-info';
            notice.innerHTML = '<i class="fas fa-info-circle"></i> Stai visualizzando il profilo di un altro artigiano. Solo il proprietario può modificarlo.';
            infoCard.insertBefore(notice, infoCard.firstChild);
        }
    } else {
        if (editTabBtn) editTabBtn.style.display = 'inline-block';
        if (securityTabBtn) securityTabBtn.style.display = 'inline-block';
        
        // Rimuovi messaggio informativo se presente
        const infoMessage = document.querySelector('.alert-info');
        if (infoMessage) infoMessage.remove();
    }
}

// Mostra profilo nella UI
function displayProfile(user, isOwn) {
    console.log('📊 Display profile, isOwn:', isOwn);
    
    // Nome e professione
    document.getElementById('profileName').textContent = `${user.nome} ${user.cognome}`;
    document.getElementById('profileProfession').textContent = user.professione;
    document.getElementById('profileLocation').querySelector('span').textContent = user.città || 'Località non specificata';
    
    // Avatar
    const avatarImg = document.getElementById('avatarImg');
    if (user.avatar) {
        avatarImg.src = user.avatar;
    } else {
        const initials = user.nome.charAt(0) + user.cognome.charAt(0);
        avatarImg.src = `https://via.placeholder.com/150/2c3e50/e67e22?text=${initials}`;
    }
    
    // Statistiche
    document.getElementById('profileWorks').textContent = user.lavoriCount || 0;
    document.getElementById('profileReviews').textContent = user.recensioniCount || 0;
    document.getElementById('profileRating').textContent = user.rating || '0.0';
    
    // CONTATTI CON PRIVACY E LINK CLICCABILE
    const profileEmail = document.getElementById('profileEmail');
    const profilePhone = document.getElementById('profilePhone');
    const profileWebsite = document.getElementById('profileWebsite');
    
    // Email - visibile solo se showEmail = true o è il proprietario
    if (isOwn || (user.privacy && user.privacy.showEmail)) {
        profileEmail.innerHTML = user.email;
        profileEmail.parentElement.style.display = 'flex';
    } else {
        profileEmail.innerHTML = '🔒 Privato';
        profileEmail.parentElement.style.display = 'flex';
    }
    
    // Telefono - visibile solo se showTelefono = true o è il proprietario
    if (isOwn || (user.privacy && user.privacy.showTelefono)) {
        profilePhone.innerHTML = user.telefono || 'Non specificato';
        profilePhone.parentElement.style.display = 'flex';
    } else {
        profilePhone.innerHTML = '🔒 Privato';
        profilePhone.parentElement.style.display = 'flex';
    }
    
    // Sito web - sempre visibile se presente, e CLICCABILE
    if (user.sitoWeb) {
        const sito = user.sitoWeb.startsWith('http') ? user.sitoWeb : `https://${user.sitoWeb}`;
        profileWebsite.innerHTML = `<a href="${sito}" target="_blank" rel="noopener noreferrer">${user.sitoWeb}</a>`;
    } else {
        profileWebsite.innerHTML = 'Non specificato';
    }
    
    // Tab Info
    document.getElementById('profileBio').textContent = user.bio || 'Nessuna biografia inserita';
    document.getElementById('infoFullName').textContent = `${user.nome} ${user.cognome}`;
    document.getElementById('infoProfession').textContent = user.professione;
    
    // Info details con privacy
    const infoEmail = document.getElementById('infoEmail');
    const infoPhone = document.getElementById('infoPhone');
    const infoWebsite = document.getElementById('infoWebsite');
    
    if (isOwn || (user.privacy && user.privacy.showEmail)) {
        infoEmail.textContent = user.email;
    } else {
        infoEmail.innerHTML = '🔒 Privato';
    }
    
    if (isOwn || (user.privacy && user.privacy.showTelefono)) {
        infoPhone.textContent = user.telefono || '-';
    } else {
        infoPhone.innerHTML = '🔒 Privato';
    }
    
    if (user.sitoWeb) {
        const sito = user.sitoWeb.startsWith('http') ? user.sitoWeb : `https://${user.sitoWeb}`;
        infoWebsite.innerHTML = `<a href="${sito}" target="_blank" rel="noopener noreferrer">${user.sitoWeb}</a>`;
    } else {
        infoWebsite.textContent = '-';
    }
    
    document.getElementById('infoCity').textContent = user.città || '-';
    document.getElementById('infoAddress').textContent = (isOwn && user.indirizzo) ? user.indirizzo : '-';
    document.getElementById('infoJoined').textContent = new Date(user.createdAt).toLocaleDateString('it-IT');
    
    // Popola form modifica (solo se è proprio profilo)
    if (isOwn) {
        document.getElementById('editNome').value = user.nome;
        document.getElementById('editCognome').value = user.cognome;
        document.getElementById('editProfessione').value = user.professione;
        document.getElementById('editBio').value = user.bio || '';
        document.getElementById('editTelefono').value = user.telefono || '';
        document.getElementById('editCittà').value = user.città || '';
        document.getElementById('editIndirizzo').value = user.indirizzo || '';
        document.getElementById('editSitoWeb').value = user.sitoWeb || '';
        
        // Checkbox privacy
        const showEmailCheck = document.getElementById('showEmail');
        const showTelefonoCheck = document.getElementById('showTelefono');
        
        if (showEmailCheck && user.privacy) {
            showEmailCheck.checked = user.privacy.showEmail || false;
        }
        if (showTelefonoCheck && user.privacy) {
            showTelefonoCheck.checked = user.privacy.showTelefono || false;
        }
    }
}

// Gestione cambio tab
window.showTab = function(tabName) {
    console.log('📌 Cambio tab:', tabName);
    
    // Verifica che il tab sia accessibile
    if (!isOwnProfile && (tabName === 'edit' || tabName === 'security')) {
        alert('Non puoi modificare il profilo di un altro utente');
        return;
    }
    
    // Nascondi tutti i tab
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Rimuovi active da tutti i bottoni
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostra il tab selezionato
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Attiva il bottone corrispondente (cerca per onclick)
    const buttons = document.querySelectorAll('.tab-btn');
    for (let btn of buttons) {
        if (btn.getAttribute('onclick')?.includes(tabName)) {
            btn.classList.add('active');
            break;
        }
    }
};

// Funzione per andare alla pagina dei lavori dell'utente
window.viewUserWorks = function() {
    // Ottieni l'ID del profilo corrente
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('id');
    const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Determina quale ID usare
    let userId = profileId || loggedUser.id;
    
    console.log('👁️ Visualizzo lavori per utente:', userId);
    
    // Vai alla pagina dei lavori
    window.location.href = `user-works.html?id=${userId}`;
};

// Gestione upload avatar - SOLO PER PROFILO PROPRIO
function setupAvatarUpload() {
    const avatarInput = document.getElementById('avatarInput');
    if (!avatarInput) return;
    
    avatarInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // ⭐ CONTROLLO DI SICUREZZA: Se non è il proprio profilo, blocca
        if (!isOwnProfile) {
            alert('❌ Non puoi cambiare l\'avatar di un altro utente!');
            return;
        }
        
        // Validazione
        if (!file.type.startsWith('image/')) {
            alert('❌ Il file deve essere un\'immagine!');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('❌ L\'immagine non può superare i 5MB');
            return;
        }
        
        const formData = new FormData();
        formData.append('avatar', file);
        
        const token = localStorage.getItem('token');
        
        // Mostra feedback
        const avatarImg = document.getElementById('avatarImg');
        const originalSrc = avatarImg.src;
        avatarImg.style.opacity = '0.5';
        
        try {
            console.log('📡 Invio avatar...');
            
            // ⭐ IMPORTANTE: NON inviare alcun ID nell'URL!
            const response = await fetch(`${API_URL}/upload/avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Upload fallito: ${error}`);
            }
            
            const result = await response.json();
            console.log('✅ Avatar upload OK:', result);
            
            // Aggiorna l'immagine mostrata
            avatarImg.src = result.avatarUrl;
            avatarImg.style.opacity = '1';
            
            // Aggiorna i dati utente nel localStorage
            const user = JSON.parse(localStorage.getItem('user'));
            user.avatar = result.avatarUrl;
            localStorage.setItem('user', JSON.stringify(user));
            
            alert('✅ Avatar aggiornato con successo!');
            
            // Forza l'aggiornamento della navbar
            if (typeof window.updateNavbar === 'function') {
                window.updateNavbar();
            }
            
        } catch (error) {
            console.error('❌ Errore upload avatar:', error);
            alert('❌ Errore upload avatar: ' + error.message);
            avatarImg.src = originalSrc;
            avatarImg.style.opacity = '1';
        }
        
        e.target.value = '';
    });
}

// Gestione modifica profilo
document.addEventListener('DOMContentLoaded', async () => {
    await loadProfile();
    setupAvatarUpload(); // Inizializza l'upload avatar
    
    // Form modifica profilo - SOLO se è proprio profilo
    const editForm = document.getElementById('editProfileForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!isOwnProfile) {
                alert('Non puoi modificare il profilo di un altro utente');
                return;
            }
            
            const errorDiv = document.getElementById('editError');
            const successDiv = document.getElementById('editSuccess');
            const submitBtn = editForm.querySelector('button[type="submit"]');
            
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Salvataggio...';
            
            try {
                const data = {
                    nome: document.getElementById('editNome').value,
                    cognome: document.getElementById('editCognome').value,
                    professione: document.getElementById('editProfessione').value,
                    bio: document.getElementById('editBio').value,
                    telefono: document.getElementById('editTelefono').value,
                    città: document.getElementById('editCittà').value,
                    indirizzo: document.getElementById('editIndirizzo').value,
                    sitoWeb: document.getElementById('editSitoWeb').value,
                    privacy: {
                        showEmail: document.getElementById('showEmail')?.checked || false,
                        showTelefono: document.getElementById('showTelefono')?.checked || false
                    }
                };
                
                const updatedUser = await apiRequest('/users/profile', 'PUT', data);
                
                successDiv.textContent = 'Profilo aggiornato con successo!';
                successDiv.style.display = 'block';
                
                // Aggiorna localStorage con i nuovi dati
                const user = JSON.parse(localStorage.getItem('user'));
                user.nome = updatedUser.user.nome;
                user.cognome = updatedUser.user.cognome;
                user.professione = updatedUser.user.professione;
                localStorage.setItem('user', JSON.stringify(user));
                
                // Ricarica il profilo
                if (isOwnProfile) {
                    const fullUser = await apiRequest('/users/me');
                    displayProfile(fullUser, true);
                }
                
                setTimeout(() => {
                    successDiv.style.display = 'none';
                }, 3000);
                
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Salva modifiche';
            }
        });
    }
    
    // Form cambio password - SOLO se è proprio profilo
    const passwordForm = document.getElementById('changePasswordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!isOwnProfile) {
                alert('Non puoi cambiare la password di un altro utente');
                return;
            }
            
            const errorDiv = document.getElementById('passwordError');
            const successDiv = document.getElementById('passwordSuccess');
            const submitBtn = passwordForm.querySelector('button[type="submit"]');
            
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (newPassword !== confirmPassword) {
                errorDiv.textContent = 'Le password non coincidono';
                errorDiv.style.display = 'block';
                return;
            }
            
            if (newPassword.length < 6) {
                errorDiv.textContent = 'La password deve essere di almeno 6 caratteri';
                errorDiv.style.display = 'block';
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Aggiornamento...';
            
            try {
                await apiRequest('/users/password', 'PUT', {
                    currentPassword,
                    newPassword
                });
                
                successDiv.textContent = 'Password aggiornata con successo!';
                successDiv.style.display = 'block';
                
                passwordForm.reset();
                
                setTimeout(() => {
                    successDiv.style.display = 'none';
                }, 3000);
                
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Aggiorna password';
            }
        });
    }
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
                <a href="${basePath}profile.html" class="active">Profilo</a>
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

// Chiamata iniziale per navbar
document.addEventListener('DOMContentLoaded', updateNavbar);
