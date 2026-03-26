let socket;
const currentUser = JSON.parse(localStorage.getItem('user'));

const initChat = () => {
    const token = localStorage.getItem('anonyme_token');
    if (!token) return;

    socket = io({
        auth: { token }
    });

    socket.on('connect', () => {
        console.log('Connecté au serveur temps réel');
        socket.emit('join', currentUser.id);
    });

    socket.on('message', (data) => {
        // Only if we are currently viewing this specific conversation
        if (window.currentChatPartnerId === data.senderId || window.currentChatPartnerId === data.receiverId) {
            appendMessageToUI(data);
        } else {
            notifyNewMessage(data);
        }
    });

    socket.on('connect_error', (err) => {
        console.error('Socket error:', err.message);
    });
};

const loadConversations = async (partnerId) => {
    window.currentChatPartnerId = partnerId;
    try {
        const response = await fetch(`/api/messages/${partnerId}`, {
            headers: getAuthHeaders()
        });
        const messages = await response.json();
        
        const list = document.getElementById('chatHistory');
        list.innerHTML = '';
        
        messages.forEach(m => appendMessageToUI(m));
        list.scrollTop = list.scrollHeight;
    } catch (error) {
        console.error(error);
    }
};

const sendMessageToPartner = async (partnerId, content) => {
    if (!content) return;
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ receiverId: partnerId, content })
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error);

        // Emit via socket if needed or let the server broadcast
        // Our server broadcasting emits to receiverId
        // We append locally
        appendMessageToUI(data);
        document.getElementById('chatInput').value = '';
    } catch (error) {
        alert(error.message);
    }
};

const appendMessageToUI = (data) => {
    const list = document.getElementById('chatHistory');
    if (!list) return;

    const div = document.createElement('div');
    const isMe = data.senderId === currentUser.id;
    div.className = `message ${isMe ? 'msg-sent' : 'msg-received'} animate-in`;
    
    // US-011 Logic: If external message, show name if revealed
    const senderName = isMe ? 'Moi' : (data.sender.fullName || data.sender.pseudo);
    
    div.innerHTML = `
        <div style="font-size: 0.7rem; font-weight: 700; opacity: 0.8; margin-bottom: 4px;">${senderName}</div>
        <div>${data.content}</div>
    `;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
};

const notifyNewMessage = (data) => {
    console.log('Nouveau message de:', data.sender.pseudo);
    // Logic for notification dot or similar
};
