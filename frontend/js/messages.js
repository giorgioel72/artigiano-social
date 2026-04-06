
let socket = null;
let currentConversation = null;
let currentUser = null;
let typingTimeout = null;

// Inizializzazione
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inizializzazione chat...');
    await loadCurrentUser();
    await loadConversations();
    initSocket();
    setupEventListeners();
});

// Carica utente corrente
async function loadCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        console.log('❌ Utente non loggato, redirect a login');
        window.location.href = 'auth/login.html';
        return;
    }
    currentUser = JSON.parse(userStr);
    console.log('👤 Utente corrente:', currentUser.nome);
}

// Inizializza Socket.io
function initSocket() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.error('❌ Token non trovato');
        return;
    }

    console.log('🔌 Connessione a Socket.io...');
    
    socket = io(API_URL.replace('/api', ''), {
        auth: { token },
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('✅ Connesso al server chat');
    });

    socket.on('new-message', (message) => {
        console.log('📨 Nuovo messaggio:', message);
        handleNewMessage(message);
    });

    socket.on('user-typing', ({ userId, userName, isTyping }) => {
        console.log('✍️ Utente sta scrivendo:', userId, isTyping);
        handleUserTyping(userId, userName, isTyping);
    });

    socket.on('messages-read', ({ messageIds }) => {
        console.log('👁️ Messaggi letti:', messageIds);
        updateMessagesReadStatus(messageIds);
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Errore connessione chat:', error);
    });

    socket.on('disconnect', () => {
        console.log('🔴 Disconnesso dal server chat');
    });
}

// Carica conversazioni
async function loadConversations() {
    try {
        console.log('📋 Caricamento conversazioni...');
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/chat/conversations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }

        const conversations = await response.json();
        console.log(`✅ Caricate ${conversations.length} conversazioni`);
        
        displayConversations(conversations);

        if (socket && conversations.length > 0) {
            const conversationIds = conversations.map(c => c._id);
            socket.emit('join-conversations', conversationIds);
            console.log('🔊 Unito a stanze:', conversationIds);
        }

    } catch (error) {
        console.error('❌ Errore caricamento conversazioni:', error);
        showError('conversationsList', 'Errore nel caricamento delle conversazioni');
    }
}

// Mostra conversazioni - CON INDICATORE ONLINE
function displayConversations(conversations) {
    const list = document.getElementById('conversationsList');
    
    if (!list) return;

    if (conversations.length === 0) {
        list.innerHTML = `
            <div class="no-conversations">
                <i class="fas fa-comments"></i>
                <p>Nessuna conversazione</p>
                <button onclick="openNewChat()" class="btn btn-primary btn-small">
                    <i class="fas fa-plus"></i> Nuova chat
                </button>
            </div>
        `;
        return;
    }

    list.innerHTML = conversations.map(conv => {
        const otherUser = conv.participants.find(p => p._id !== currentUser.id);
        const lastMessage = conv.lastMessage;
        const time = lastMessage ? new Date(lastMessage.createdAt).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        }) : '';
        
        const isActive = currentConversation?._id === conv._id;

        // ⭐ AVATAR CON INDICATORE ONLINE
        const avatarHtml = otherUser?.avatar 
            ? `<div class="conversation-avatar-container" data-user-id="${otherUser._id}" style="position: relative; display: inline-block; margin-right: 1rem;">
                <img src="${otherUser.avatar}" alt="Avatar" class="conversation-avatar-img" style="width:50px; height:50px; border-radius:50%; object-fit:cover;">
                <div class="online-indicator" style="display: none; position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; background-color: #4cd964; border-radius: 50%; border: 2px solid white;"></div>
               </div>`
            : `<div class="conversation-avatar-container" data-user-id="${otherUser._id}" style="position: relative; display: inline-block; margin-right: 1rem;">
                <div class="conversation-avatar" style="width:50px; height:50px; background:#e67e22; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; font-weight:bold;">
                    ${otherUser?.nome?.charAt(0) || ''}${otherUser?.cognome?.charAt(0) || ''}
                </div>
                <div class="online-indicator" style="display: none; position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; background-color: #4cd964; border-radius: 50%; border: 2px solid white;"></div>
               </div>`;

        return `
            <div class="conversation-item ${isActive ? 'active' : ''}" 
                 onclick="selectConversation('${conv._id}', '${otherUser?.nome || ''}', '${otherUser?.cognome || ''}')">
                ${avatarHtml}
                <div class="conversation-info" style="flex:1;">
                    <div class="conversation-name" style="font-weight:bold; color:#2c3e50;">
                        ${otherUser?.nome || ''} ${otherUser?.cognome || ''}
                    </div>
                    <div class="conversation-last-message" style="font-size:0.85rem; color:#666;">
                        ${lastMessage 
                            ? (lastMessage.sender?._id === currentUser.id ? 'Tu: ' : '') + 
                              (lastMessage.text.substring(0, 30) + (lastMessage.text.length > 30 ? '...' : ''))
                            : 'Nessun messaggio'}
                    </div>
                </div>
                <div class="conversation-time" style="font-size:0.75rem; color:#999;">${time}</div>
            </div>
        `;
    }).join('');
}

// Seleziona una conversazione
window.selectConversation = async function(conversationId, otherUserName, otherUserSurname) {
    console.log('👉 Selezionata conversazione:', conversationId);
    
    document.querySelectorAll('.conversation-item').forEach(el => {
        el.classList.remove('active');
    });
    
    const selected = Array.from(document.querySelectorAll('.conversation-item')).find(
        el => el.getAttribute('onclick')?.includes(conversationId)
    );
    if (selected) selected.classList.add('active');

    try {
        await loadConversation(conversationId, otherUserName, otherUserSurname);
    } catch (error) {
        console.error('❌ Errore in selectConversation:', error);
        alert('Errore nel caricamento della conversazione');
    }
};

// Carica una conversazione specifica
async function loadConversation(conversationId, otherUserName, otherUserSurname) {
    console.log('📥 Carico conversazione:', conversationId);
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('Token non trovato');
        }

        const messagesResponse = await fetch(`${API_URL}/chat/messages/${conversationId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!messagesResponse.ok) {
            throw new Error(`Errore HTTP messaggi: ${messagesResponse.status}`);
        }

        const data = await messagesResponse.json();
        console.log(`✅ Ricevuti ${data.messages?.length || 0} messaggi`);

        currentConversation = {
            _id: conversationId,
            participants: [
                { _id: currentUser.id, nome: currentUser.nome, cognome: currentUser.cognome },
                { _id: 'other', nome: otherUserName || 'Utente', cognome: otherUserSurname || '' }
            ]
        };
        
        if (socket) {
            socket.emit('join-conversation', conversationId);
        }

        document.getElementById('noChatSelected').style.display = 'none';
        document.getElementById('chatActive').style.display = 'flex';
        
        const otherUser = currentConversation.participants?.find(p => p._id !== currentUser.id);
        
        if (otherUser) {
            // ⭐ AVATAR NELL'HEADER DELLA CHAT CON INDICATORE
            const chatAvatar = document.getElementById('chatAvatar');
            if (chatAvatar) {
                if (otherUser.avatar) {
                    chatAvatar.innerHTML = `<div class="conversation-avatar-container" data-user-id="${otherUser._id}" style="position: relative; display: inline-block; width:40px; height:40px;">
                        <img src="${otherUser.avatar}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                        <div class="online-indicator" style="display: none; position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; background-color: #4cd964; border-radius: 50%; border: 2px solid white;"></div>
                    </div>`;
                } else {
                    chatAvatar.innerHTML = `<div class="conversation-avatar-container" data-user-id="${otherUser._id}" style="position: relative; display: inline-block; width:40px; height:40px; background:#e67e22; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">
                        ${otherUser.nome?.charAt(0) || ''}${otherUser.cognome?.charAt(0) || ''}
                        <div class="online-indicator" style="display: none; position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; background-color: #4cd964; border-radius: 50%; border: 2px solid white;"></div>
                    </div>`;
                }
            }
            
            document.getElementById('chatUserName').textContent = `${otherUser.nome || ''} ${otherUser.cognome || ''}`;
            document.getElementById('chatUserProfession').textContent = otherUser.professione || 'Artigiano';
        }

        displayMessages(data.messages || []);
        
        const unreadMessages = (data.messages || [])
            .filter(m => m.sender?._id !== currentUser.id && !m.read)
            .map(m => m._id);
        
        if (unreadMessages.length > 0 && socket) {
            socket.emit('mark-read', {
                conversationId,
                messageIds: unreadMessages
            });
        }

    } catch (error) {
        console.error('❌ Errore loadConversation:', error);
        throw error;
    }
}

// Mostra messaggi
function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    
    if (!container) return;

    if (messages.length === 0) {
        container.innerHTML = `
            <div class="no-messages">
                <i class="fas fa-comment-dots"></i>
                <p>Nessun messaggio. Invia tu il primo!</p>
            </div>
        `;
        scrollToBottom();
        return;
    }

    container.innerHTML = messages.map(msg => createMessageHTML(msg)).join('');
    scrollToBottom();
}

// Crea HTML per un messaggio
function createMessageHTML(message) {
    if (!message.sender) return '';
    
    const isOwn = message.sender._id === currentUser.id;
    const time = new Date(message.createdAt).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // ⭐ AVATAR DEL MITTENTE CON INDICATORE
    const senderAvatar = message.sender.avatar 
        ? `<div class="message-avatar-container" data-user-id="${message.sender._id}" style="position: relative; display: inline-block; width:35px; height:35px; margin-right:0.5rem;">
            <img src="${message.sender.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
            <div class="online-indicator" style="display: none; position: absolute; bottom: 2px; right: 2px; width: 10px; height: 10px; background-color: #4cd964; border-radius: 50%; border: 2px solid white;"></div>
           </div>`
        : `<div class="message-avatar-container" data-user-id="${message.sender._id}" style="position: relative; display: inline-block; width:35px; height:35px; background:#e67e22; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; margin-right:0.5rem;">
            ${message.sender.nome?.charAt(0) || ''}${message.sender.cognome?.charAt(0) || ''}
            <div class="online-indicator" style="display: none; position: absolute; bottom: 2px; right: 2px; width: 10px; height: 10px; background-color: #4cd964; border-radius: 50%; border: 2px solid white;"></div>
           </div>`;
    
    return `
        <div class="message ${isOwn ? 'message-own' : 'message-other'}" id="msg-${message._id}" style="display:flex; align-items:flex-end; margin-bottom:1rem;">
            ${!isOwn ? senderAvatar : ''}
            <div class="message-content" style="max-width:60%; padding:0.75rem 1rem; border-radius:15px; ${isOwn ? 'background:#e67e22; color:white; border-bottom-right-radius:5px;' : 'background:white; color:#333; border-bottom-left-radius:5px; box-shadow:0 1px 3px rgba(0,0,0,0.1);'}">
                ${message.text}
                <div class="message-time" style="font-size:0.7rem; margin-top:0.25rem; opacity:0.7; text-align:right;">
                    ${time}
                    ${isOwn ? `<span class="message-status" style="margin-left:0.5rem;">
                        ${message.read ? '✓✓' : '✓'}
                    </span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Gestione nuovo messaggio in tempo reale
function handleNewMessage(message) {
    console.log('📨 Nuovo messaggio ricevuto:', message);
    
    if (currentConversation && message.conversation === currentConversation._id) {
        const container = document.getElementById('messagesContainer');
        
        if (!container) return;
        
        if (container.children.length === 1 && container.children[0].classList.contains('no-messages')) {
            container.innerHTML = '';
        }
        
        container.innerHTML += createMessageHTML(message);
        scrollToBottom();
        
        if (message.sender._id !== currentUser.id && socket) {
            socket.emit('mark-read', {
                conversationId: currentConversation._id,
                messageIds: [message._id]
            });
        }
    }
    
    loadConversations();
}

// Gestione "sta scrivendo"
function handleUserTyping(userId, userName, isTyping) {
    const indicator = document.getElementById('typingIndicator');
    const typingUser = document.getElementById('typingUser');
    
    if (!indicator || !typingUser) return;
    
    if (isTyping && userId !== currentUser.id) {
        typingUser.textContent = userName || 'Qualcuno';
        indicator.style.display = 'block';
    } else {
        indicator.style.display = 'none';
    }
}

// Aggiorna stato lettura messaggi
function updateMessagesReadStatus(messageIds) {
    // Implementazione base
}

// Invio messaggio
const messageForm = document.getElementById('messageForm');
if (messageForm) {
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const textarea = document.getElementById('messageText');
        const text = textarea.value.trim();
        
        if (!text || !currentConversation || !socket) return;
        
        console.log('📤 Invio messaggio:', text);
        
        socket.emit('send-message', {
            conversationId: currentConversation._id,
            text
        });
        
        textarea.value = '';
        autoResize(textarea);
    });
}

// Gestione "sta scrivendo"
window.handleTyping = function(event) {
    if (!currentConversation || !socket) return;
    
    if (event.key === 'Enter' && !event.shiftKey) return;
    
    socket.emit('typing', {
        conversationId: currentConversation._id,
        isTyping: true
    });
    
    if (typingTimeout) clearTimeout(typingTimeout);
    
    typingTimeout = setTimeout(() => {
        socket.emit('typing', {
            conversationId: currentConversation._id,
            isTyping: false
        });
    }, 2000);
};

// Auto resize textarea
window.autoResize = function(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
};

// Scroll in basso
function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// Apri nuova chat
window.openNewChat = function() {
    console.log('➕ Apertura nuova chat');
    const modal = document.getElementById('newChatModal');
    if (modal) {
        modal.style.display = 'flex';
        loadUsers();
    }
};

// Chiudi modal nuova chat
window.closeNewChatModal = function() {
    console.log('❌ Chiusura modal');
    const modal = document.getElementById('newChatModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// Carica utenti per nuova chat
async function loadUsers() {
    try {
        console.log('👥 Caricamento utenti...');
        
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Token non trovato');
        
        const response = await fetch(`${API_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }
        
        const users = await response.json();
        console.log(`✅ Caricati ${users.length} utenti`);
        
        const otherUsers = users.filter(u => u._id !== currentUser.id);
        displayUsers(otherUsers);
        
    } catch (error) {
        console.error('❌ Errore caricamento utenti:', error);
        document.getElementById('usersList').innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i>
                Errore: ${error.message}
            </div>
        `;
    }
}

// Mostra utenti per nuova chat - CON INDICATORE ONLINE
function displayUsers(users) {
    const list = document.getElementById('usersList');
    
    if (!list) return;

    if (users.length === 0) {
        list.innerHTML = '<div class="no-users">Nessun altro utente trovato</div>';
        return;
    }
    
    list.innerHTML = users.map(user => {
        const avatarHtml = user.avatar 
            ? `<div class="user-avatar-container" data-user-id="${user._id}" style="position: relative; display: inline-block; width:40px; height:40px; margin-right:1rem;">
                <img src="${user.avatar}" class="user-avatar-img" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                <div class="online-indicator" style="display: none; position: absolute; bottom: 2px; right: 2px; width: 10px; height: 10px; background-color: #4cd964; border-radius: 50%; border: 2px solid white;"></div>
               </div>`
            : `<div class="user-avatar-container" data-user-id="${user._id}" style="position: relative; display: inline-block; width:40px; height:40px; background:#2c3e50; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-right:1rem;">
                ${user.nome?.charAt(0) || ''}${user.cognome?.charAt(0) || ''}
                <div class="online-indicator" style="display: none; position: absolute; bottom: 2px; right: 2px; width: 10px; height: 10px; background-color: #4cd964; border-radius: 50%; border: 2px solid white;"></div>
               </div>`;
        
        return `
            <div class="user-item" onclick="startChatWithUser('${user._id}', '${user.nome}', '${user.cognome}')" style="display:flex; align-items:center; padding:1rem; border-radius:5px; cursor:pointer;">
                ${avatarHtml}
                <div class="user-info">
                    <div class="user-name" style="font-weight:bold; color:#2c3e50;">${user.nome || ''} ${user.cognome || ''}</div>
                    <div class="user-profession" style="font-size:0.85rem; color:#e67e22;">${user.professione || 'Artigiano'}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Inizia chat con utente
window.startChatWithUser = async function(userId, nome, cognome) {
    console.log('💬 Inizio chat con utente:', userId);
    
    try {
        closeNewChatModal();
        
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Token non trovato');
        
        const response = await fetch(`${API_URL}/chat/conversation/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }
        
        const conversation = await response.json();
        console.log('✅ Conversazione creata/ottenuta:', conversation._id);
        
        await loadConversations();
        
        setTimeout(() => {
            selectConversation(conversation._id, nome, cognome);
        }, 100);
        
    } catch (error) {
        console.error('❌ Errore creazione chat:', error);
        alert('Errore nella creazione della chat: ' + error.message);
    }
};

// Chiudi chat
window.closeChat = function() {
    console.log('👋 Chiusura chat corrente');
    
    if (currentConversation && socket) {
        socket.emit('leave-conversation', currentConversation._id);
    }
    
    currentConversation = null;
    
    document.getElementById('noChatSelected').style.display = 'flex';
    document.getElementById('chatActive').style.display = 'none';
    
    document.querySelectorAll('.conversation-item').forEach(el => {
        el.classList.remove('active');
    });
};

// Event listeners
function setupEventListeners() {
    const searchConversations = document.getElementById('searchConversations');
    if (searchConversations) {
        searchConversations.addEventListener('input', (e) => {
            filterConversations(e.target.value);
        });
    }
    
    const searchUsers = document.getElementById('searchUsers');
    if (searchUsers) {
        searchUsers.addEventListener('input', (e) => {
            filterUsers(e.target.value);
        });
    }
}

// Filtra conversazioni
function filterConversations(search) {
    const items = document.querySelectorAll('.conversation-item');
    search = search.toLowerCase();
    
    items.forEach(item => {
        const name = item.querySelector('.conversation-name')?.textContent.toLowerCase() || '';
        item.style.display = name.includes(search) ? 'flex' : 'none';
    });
}

// Filtra utenti
function filterUsers(search) {
    const items = document.querySelectorAll('.user-item');
    search = search.toLowerCase();
    
    items.forEach(item => {
        const name = item.querySelector('.user-name')?.textContent.toLowerCase() || '';
        item.style.display = name.includes(search) ? 'flex' : 'none';
    });
}

// Mostra errori
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="error">${message}</div>`;
    }
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
                <a href="${basePath}messages.html" class="active">Messaggi</a>
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
});
