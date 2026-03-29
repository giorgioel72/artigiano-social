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
    
    if (!token) {
        window.location.href = 'auth/login.html';
        throw new Error('Non autenticato');
    }
    
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

// Carica dati del lavoro da modificare
async function loadWorkData() {
    try {
        const work = await apiRequest(`/works/${workId}`);
        
        // Verifica che l'utente sia l'autore
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (currentUser.id !== work.author._id) {
            alert('Non sei autorizzato a modificare questo lavoro');
            window.location.href = 'dashboard.html';
            return;
        }
        
        // Popola il form
        document.getElementById('workId').value = work._id;
        document.getElementById('title').value = work.title;
        document.getElementById('description').value = work.description;
        document.getElementById('category').value = work.category;
        document.getElementById('luogo').value = work.luogo || '';
        document.getElementById('status').value = work.status || 'completato';
        
        // Mostra statistiche
        document.getElementById('workLikes').textContent = work.likes?.length || 0;
        document.getElementById('workComments').textContent = work.comments?.length || 0;
        document.getElementById('workDate').textContent = new Date(work.createdAt).toLocaleDateString('it-IT');
        
        // Nascondi loading, mostra form
        document.getElementById('loading').style.display = 'none';
        document.getElementById('workForm').style.display = 'block';
        
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

// Gestione submit modifica
const editForm = document.getElementById('editWorkForm');

if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const workData = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            category: document.getElementById('category').value,
            luogo: document.getElementById('luogo').value || '',
            status: document.getElementById('status').value
        };
        
        // Validazione
        if (!workData.title || !workData.description || !workData.category) {
            showError('Tutti i campi obbligatori devono essere compilati');
            return;
        }
        
        // Disabilita bottone
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';
        
        hideMessages();
        
        try {
            const result = await apiRequest(`/works/${workId}`, 'PUT', workData);
            
            showSuccess('Lavoro aggiornato con successo!');
            
            // Dopo 2 secondi, torna al dettaglio
            setTimeout(() => {
                window.location.href = `work-detail.html?id=${workId}`;
            }, 2000);
            
        } catch (error) {
            showError(error.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Salva modifiche';
        }
    });
}

// Funzioni helper per messaggi
function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('successMessage').style.display = 'none';
}

function showSuccess(message) {
    document.getElementById('successMessage').textContent = message;
    document.getElementById('successMessage').style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
}

function hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

// Aggiorna navbar
function updateNavbar() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const navLinks = document.getElementById('navLinks');
    
    if (navLinks) {
        if (token && user) {
            navLinks.innerHTML = `
                <a href="dashboard.html">Dashboard</a>
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
                <a href="auth/login.html">Accedi</a>
                <a href="auth/register.html">Registrati</a>
            `;
        }
    }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    loadWorkData();
});