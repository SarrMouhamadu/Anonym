// TikTok Feed Interface Logic
const loadFeed = async () => {
    try {
        const response = await fetch('/api/posts', {
            headers: getAuthHeaders()
        });
        const posts = await response.json();
        
        if (!response.ok) throw new Error(posts.error || 'Erreur chargement fil');

        const feedContainer = document.getElementById('feedList');
        feedContainer.innerHTML = '';

        if (posts.length === 0) {
            feedContainer.innerHTML = `
                <div class="post-card-snap" style="justify-content: center; align-items: center; color: var(--text-muted);">
                    <p>Aucun post pour le moment. Soyez le premier !</p>
                </div>
            `;
            return;
        }

        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card-snap';
            card.innerHTML = `
                <div style="padding: 40px; text-align: center; font-size: 1.5rem; line-height: 1.4; max-width: 600px; margin: 0 auto;">
                    ${post.content}
                </div>
                
                <div class="post-overlay">
                    <div style="font-weight: 700; margin-bottom: 5px; font-size: 1.1rem;">
                        @${post.user.pseudo} ${post.user.role === 'PRO' ? '✅' : ''}
                    </div>
                </div>

                <div class="post-sidebar">
                    <div class="sidebar-icon" onclick="reactToPost('${post.id}')">
                        ❤️
                        <span class="sidebar-label" style="position: absolute; bottom: -20px;">${post._count.reactions}</span>
                    </div>
                    <div class="sidebar-icon" onclick="openComments('${post.id}')">
                        💬
                        <span class="sidebar-label" style="position: absolute; bottom: -20px;">${post._count.comments}</span>
                    </div>
                    <div class="sidebar-icon" onclick="toggleChatbot()">
                        🤖
                    </div>
                    <div class="sidebar-icon" onclick="openMessaging('${post.userId}', '${post.user.pseudo}')">
                        ✉️
                    </div>
                    <div class="sidebar-icon" onclick="reportPost('${post.id}')">
                        🚩
                    </div>
                    ${canDelete(post) ? `
                    <div class="sidebar-icon" onclick="deletePost('${post.id}')" style="background: rgba(239, 68, 68, 0.2);">
                        🗑️
                    </div>` : ''}
                </div>
            `;
            feedContainer.appendChild(card);
        });

    } catch (error) {
        console.error('Feed error:', error);
    }
};

const openComments = async (postId) => {
    const modal = document.getElementById('commentsModal');
    modal.style.display = 'flex';
    window.currentPostIdForComment = postId;
    
    // Load existing
    const list = document.getElementById('commentsList');
    list.innerHTML = '<p style="color: grey;">Chargement...</p>';
    
    try {
        const res = await fetch(`/api/comments/post/${postId}`, { headers: getAuthHeaders() });
        const comments = await res.json();
        list.innerHTML = '';
        comments.forEach(c => {
            const div = document.createElement('div');
            div.style.padding = '10px 0';
            div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            div.innerHTML = `<span style="color: var(--primary); font-weight: 600;">${c.user.pseudo}</span>: <span>${c.content}</span>`;
            list.appendChild(div);
        });
    } catch (e) { console.error(e); }
};

document.getElementById('submitCommentBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('commentInput');
    const content = input.value;
    const postId = window.currentPostIdForComment;
    if (!content || !postId) return;

    try {
        await fetch('/api/comments', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ postId, content })
        });
        input.value = '';
        openComments(postId);
        loadFeed(); // Refresh count
    } catch (e) { alert(e.message); }
});

const reportPost = async (postId) => {
    const reason = prompt('Pourquoi signalez-vous ce post ? (ex: contenu inapproprié)');
    if (!reason) return;
    try {
        const res = await fetch('/api/reports', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ targetType: 'POST', postId, reason })
        });
        if (!res.ok) throw new Error('Erreur signalement');
        alert('Merci, votre signalement a été envoyé à l\'équipe de modération.');
    } catch (e) {
        alert(e.message);
    }
};

const canDelete = (post) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return false;
    return user.id === post.userId || user.role === 'ADMIN';
};

const publishPost = async (content, isAnonymous) => {
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ content, isAnonymous })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        document.getElementById('postContent').value = '';
        document.getElementById('postModal').style.display = 'none';
        loadFeed();
    } catch (error) {
        alert(error.message);
    }
};

const deletePost = async (postId) => {
    if (!confirm('Supprimer ce post définitivement ?')) return;
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Erreur suppression');
        loadFeed();
    } catch (error) {
        alert(error.message);
    }
};

const reactToPost = async (postId) => {
    try {
        const res = await fetch(`/api/posts/${postId}/react`, { 
            method: 'POST', 
            headers: getAuthHeaders() 
        });
        if (res.status === 409) {
            await fetch(`/api/posts/${postId}/react`, { method: 'DELETE', headers: getAuthHeaders() });
        }
        loadFeed();
    } catch (e) { console.error(e); }
};

const toggleChatbot = () => window.location.href = '/chatbot.html';
const openMessaging = (id, name) => window.location.href = `/messages.html?to=${id}&name=${encodeURIComponent(name)}`;

// UI Listeners
document.getElementById('showPublishBtn')?.addEventListener('click', () => {
    document.getElementById('postModal').style.display = 'block';
});
