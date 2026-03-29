// NON dichiariamo API_URL qui perché esiste già in altri file
// Usiamo quella globale o la definiamo solo se non esiste

// Funzione di ricerca globale (utenti + lavori)
async function searchArtigiani(query) {
    if (!query || query.length < 2) {
        hideSearchResults();
        return;
    }

    try {
        console.log('🔍 Ricerca:', query);
        
        // Usa API_URL se esiste già, altrimenti usa quella di default
        const baseUrl = typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:5000/api';
        
        // Cerca UTENTI
        const usersResponse = await fetch(`${baseUrl}/users/search/query?q=${encodeURIComponent(query)}`);
        const users = await usersResponse.json();
        
        // Cerca LAVORI
        const worksResponse = await fetch(`${baseUrl}/works/search?q=${encodeURIComponent(query)}`);
        const works = await worksResponse.json();
        
        console.log('✅ Utenti trovati:', users.length);
        console.log('✅ Lavori trovati:', works.length);
        
        displaySearchResults(users, works);
    } catch (error) {
        console.error('❌ Errore ricerca:', error);
    }
}

// Mostra risultati ricerca (utenti + lavori)
function displaySearchResults(users, works) {
    let resultsContainer = document.getElementById('searchResults');
    
    // Se non esiste, crealo
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'searchResults';
        resultsContainer.className = 'search-results';
        
        const searchContainer = document.querySelector('.nav-search');
        if (searchContainer) {
            searchContainer.appendChild(resultsContainer);
        } else {
            return;
        }
    }

    const totalResults = users.length + works.length;
    
    if (totalResults === 0) {
        resultsContainer.innerHTML = `
            <div class="search-result-item no-results">
                <i class="fas fa-search"></i> Nessun risultato trovato
            </div>
        `;
        resultsContainer.style.display = 'block';
        return;
    }

    let html = '';
    
    // Sezione UTENTI
    if (users.length > 0) {
        html += `<div class="search-section-title"><i class="fas fa-users"></i> Artigiani</div>`;
        html += users.map(user => {
            const profilePath = window.location.pathname.includes('/pages/') 
                ? `profile.html?id=${user._id}`
                : `pages/profile.html?id=${user._id}`;
            
            return `
                <a href="${profilePath}" class="search-result-item" onclick="hideSearchResults()">
                    <div class="search-result-avatar">
                        ${user.nome?.charAt(0) || ''}${user.cognome?.charAt(0) || ''}
                    </div>
                    <div class="search-result-info">
                        <div class="search-result-name">${user.nome || ''} ${user.cognome || ''}</div>
                        <div class="search-result-profession">${user.professione || 'Artigiano'}</div>
                        ${user.città ? `<div class="search-result-city">${user.città}</div>` : ''}
                    </div>
                </a>
            `;
        }).join('');
    }
    
    // Sezione LAVORI
    if (works.length > 0) {
        html += `<div class="search-section-title"><i class="fas fa-briefcase"></i> Lavori</div>`;
        html += works.map(work => {
            const workPath = window.location.pathname.includes('/pages/') 
                ? `work-detail.html?id=${work._id}`
                : `pages/work-detail.html?id=${work._id}`;
            
            // Tronca la descrizione se troppo lunga
            const description = work.description.length > 60 
                ? work.description.substring(0, 60) + '...' 
                : work.description;
            
            return `
                <a href="${workPath}" class="search-result-item" onclick="hideSearchResults()">
                    <div class="search-result-avatar work-avatar">
                        ${getCategoryIcon(work.category)}
                    </div>
                    <div class="search-result-info">
                        <div class="search-result-name">${work.title || ''}</div>
                        <div class="search-result-profession">${work.author?.nome || 'Artigiano'} ${work.author?.cognome || ''}</div>
                        <div class="search-result-description">${description}</div>
                    </div>
                </a>
            `;
        }).join('');
    }
    
    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';
}

// Helper per icona categoria
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

// Nascondi risultati ricerca
function hideSearchResults() {
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
}

// Esegui ricerca e mostra risultati
function performSearch() {
    const searchInput = document.querySelector('.nav-search input');
    if (!searchInput) return;
    
    const query = searchInput.value.trim();
    if (query.length >= 2) {
        searchArtigiani(query);
    } else {
        alert('Inserisci almeno 2 caratteri per cercare');
    }
}

// Inizializza ricerca su tutte le pagine
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.nav-search input');
    const searchButton = document.querySelector('.nav-search button');
    
    if (!searchInput) return;
    
    console.log('🔧 Inizializzazione ricerca...');
    
    // Variabile per il debounce
    let searchTimeout;
    
    // Evento input con debounce
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            hideSearchResults();
            return;
        }
        
        searchTimeout = setTimeout(() => {
            searchArtigiani(query);
        }, 300);
    });
    
    // Evento focus
    searchInput.addEventListener('focus', function(e) {
        if (e.target.value.trim().length >= 2) {
            const resultsContainer = document.getElementById('searchResults');
            if (resultsContainer) {
                resultsContainer.style.display = 'block';
            }
        }
    });
    
    // Gestione click sulla lente
    if (searchButton) {
        console.log('🔍 Bottone ricerca trovato');
        
        searchButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('👆 Click sulla lente');
            performSearch();
        });
        
        searchButton.style.cursor = 'pointer';
    }
    
    // Gestione tasto Enter
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            console.log('⌨️ Enter premuto');
            performSearch();
        }
    });
    
    // Chiudi risultati cliccando fuori
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-search')) {
            hideSearchResults();
        }
    });
    
    // Tasto ESC per chiudere
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideSearchResults();
        }
    });
});

// Esponi funzioni globalmente
window.searchArtigiani = searchArtigiani;
window.hideSearchResults = hideSearchResults;
window.performSearch = performSearch;