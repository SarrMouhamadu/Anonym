// Feed functions logic
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
            feedContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Soyez le premier à poster !</p>';
            return;
        }

        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'glass-card post-card animate-in';
            card.innerHTML = `
                <div class="post-header">
                    <span class="post-author">${post.user.pseudo} ${post.user.role === 'PRO' ? '<span class="pro-badge">Vérifié</span>' : ''}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="post-content">${post.content}</div>
                <div class="post-actions">
                    <button class="action-btn" onclick="reactToPost('${post.id}')">❤️ ${post._count.reactions}</button>
                    <button class="action-btn" onclick="toggleComments('${post.id}')">💬 ${post._count.comments}</button>
                    ${canDelete(post) ? `<button class="action-btn" onclick="deletePost('${post.id}')" style="color: var(--danger);">Supprimer</button>` : ''}
                </div>
                <div id="comments-${post.id}" class="comments-section" style="display: none; margin-top: 20px; border-top: 1px solid var(--border); padding-top: 15px;">
                    <div id="comments-list-${post.id}"></div>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <input type="text" id="input-comment-${post.id}" placeholder="Ajouter un commentaire..." style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--glass); color: white;">
                        <button class="btn btn-primary" style="width: auto; padding: 0 20px;" onclick="addComment('${post.id}')">Poster</button>
                    </div>
                </div>
            `;
            feedContainer.appendChild(card);
        });

    } catch (error) {
        console.error('Feed error:', error);
    }
};

const canDelete = (post) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return false;
    return user.id === post.userId || user.role === 'ADMIN' || (user.role === 'PRO' && post.user.role === 'MEMBER');
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
        loadFeed();
    } catch (error) {
        alert(error.message);
    }
};

const deletePost = async (postId) => {
    if (!confirm('Souhaitez-vous supprimer ce post ?')) return;
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        loadFeed();
    } catch (error) {
        alert(error.message);
    }
};

const reactToPost = async (postId) => {
    try {
        const response = await fetch(`/api/posts/${postId}/react`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (response.status === 409) {
            // Unreact if already reacted
            await fetch(`/api/posts/${postId}/react`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
        }
        loadFeed();
    } catch (error) {
        console.error(error);
    }
};

const toggleComments = async (postId) => {
    const section = document.getElementById(`comments-${postId}`);
    if (section.style.display === 'none') {
        section.style.display = 'block';
        loadComments(postId);
    } else {
        section.style.display = 'none';
    }
};

const loadComments = async (postId) => {
    const list = document.getElementById(`comments-list-${postId}`);
    list.innerHTML = '<p style="color: grey; font-size: 0.8rem;">Chargement des commentaires...</p>';
    
    try {
        const response = await fetch(`/api/comments/post/${postId}`, {
            headers: getAuthHeaders()
        });
        const comments = await response.json();
        list.innerHTML = '';
        
        comments.forEach(c => {
            const div = document.createElement('div');
            div.style.padding = '8px 0';
            div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            div.innerHTML = `<span style="color: var(--primary); font-size: 0.8rem; font-weight: 600;">${c.user.pseudo}</span>: 
                             <span style="font-size: 0.8rem;">${c.content}</span>`;
            list.appendChild(div);
        });
    } catch (error) {
        console.error(error);
    }
};

const addComment = async (postId) => {
    const input = document.getElementById(`input-comment-${postId}`);
    const content = input.value;
    if (!content) return;

    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ postId, content })
        });
        input.value = '';
        loadComments(postId);
        loadFeed(); // To update comment count
    } catch (error) {
        alert(error.message);
    }
};
