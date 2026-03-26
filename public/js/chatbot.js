const sendMessage = async () => {
    const input = document.getElementById('chatInput');
    const msg = input.value;
    if (!msg) return;

    appendMessage(msg, 'sent');
    input.value = '';

    // Show loading
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message msg-received';
    loadingDiv.innerText = 'L\'assistant réfléchit...';
    document.getElementById('chatHistory').appendChild(loadingDiv);
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ message: msg })
        });
        const data = await response.json();
        
        loadingDiv.remove();
        if (!response.ok) throw new Error(data.error);

        appendMessage(data.reply, 'received');
        
    } catch (error) {
        loadingDiv.innerText = 'Désolé, une erreur est survenue !';
    }
};

const appendMessage = (text, type) => {
    const chatHistory = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = `message msg-${type} animate-in`;
    div.innerText = text;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
};
