// TikTok Feed Interface Logic with Infinite Scroll & Media Support
let currentPage = 1;
let loading = false;
let noMorePosts = false;

const loadFeed = async (reset = false) => {
    if (loading || (noMorePosts && !reset)) return;
    loading = true;
    
    if (reset) {
        currentPage = 1;
        noMorePosts = false;
        document.getElementById('feedList').innerHTML = '<div id="loader" style="height: 100vh; display:flex; align-items:center; justify-content:center;"><p>Chargement...</p></div>';
    }

    try {
        const response = await fetch(`/api/posts?page=${currentPage}&limit=5`, {
            headers: getAuthHeaders()
        });
        const posts = await response.json();
        if (!response.ok) throw new Error(posts.error);

        const feedContainer = document.getElementById('feedList');
        if (reset) feedContainer.innerHTML = '';
        else document.getElementById('loader')?.remove();

        if (posts.length === 0) {
            if (reset) feedContainer.innerHTML = '<div class="post-card-snap" style="justify-content:center; align-items:center;">Aucun post.</div>';
            noMorePosts = true;
            loading = false;
            return;
        }

        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card-snap';
            
            let mediaHtml = '';
            if (post.mediaType === 'IMAGE' && post.mediaUrl) {
                mediaHtml = `<img src="${post.mediaUrl}" style="position:absolute; width:100%; height:100%; object-fit:cover; opacity:0.6; z-index:0;">`;
            } else if (post.mediaType === 'VIDEO' && post.mediaUrl) {
                mediaHtml = `<video src="${post.mediaUrl}" autoplay muted loop style="position:absolute; width:100%; height:100%; object-fit:cover; opacity:0.6; z-index:0;"></video>`;
            }

            card.innerHTML = `
                ${mediaHtml}
                <div style="position:relative; z-index:1; padding:40px; text-align:center; font-size:1.5rem; line-height:1.4; max-width:600px; margin:0 auto; text-shadow: 0 2px 10px rgba(0,0,0,0.8);">
                    ${post.content}
                </div>
                <div class="post-overlay" style="z-index:2;">
                    <div style="font-weight:700;">@${post.user.pseudo} ${post.user.role === 'PRO' ? '✅' : ''}</div>
                    <div style="font-size:0.8rem; opacity:0.8;">${new Date(post.createdAt).toLocaleDateString()}</div>
                </div>
                <div class="post-sidebar" style="z-index:2;">
                    <div class="sidebar-icon" onclick="reactToPost('${post.id}')">❤️ <span class="sidebar-label">${post._count.reactions}</span></div>
                    <div class="sidebar-icon" onclick="openComments('${post.id}')">💬 <span class="sidebar-label">${post._count.comments}</span></div>
                    <div class="sidebar-icon" onclick="toggleChatbot()">🤖</div>
                    <div class="sidebar-icon" onclick="openMessaging('${post.userId}', '${post.user.pseudo}')">✉️</div>
                    <div class="sidebar-icon" onclick="reportPost('${post.id}')">🚩</div>
                    ${canDelete(post) ? `<div class="sidebar-icon" onclick="deletePost('${post.id}')" style="background:rgba(239,68,68,0.2);">🗑️</div>` : ''}
                </div>
            `;
            feedContainer.appendChild(card);
        });

        currentPage++;
        loading = false;
        if (reset) feedContainer.scrollTop = 0;
    } catch (error) {
        console.error(error);
        loading = false;
    }
};

// Scroll listener for Infinite Scroll
document.getElementById('feedList')?.addEventListener('scroll', (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 300) {
        loadFeed();
    }
});

const openComments = async (postId) => {
    const modal = document.getElementById('commentsModal');
    modal.style.display = 'flex';
    window.currentPostIdForComment = postId;
    const list = document.getElementById('commentsList');
    list.innerHTML = 'Chargement...';
    try {
        const res = await fetch(`/api/comments/post/${postId}`, { headers: getAuthHeaders() });
        const comments = await res.json();
        list.innerHTML = '';
        comments.forEach(c => {
            const div = document.createElement('div');
            div.style.padding = '10px 0';
            div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            div.innerHTML = `<span style="color:var(--primary); font-weight:600;">${c.user.pseudo}</span>: ${c.content}`;
            list.appendChild(div);
        });
    } catch (e) { console.error(e); }
};

document.getElementById('submitCommentBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('commentInput');
    const content = input.value;
    if (!content || !window.currentPostIdForComment) return;
    try {
        await fetch('/api/comments', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ postId: window.currentPostIdForComment, content })
        });
        input.value = '';
        openComments(window.currentPostIdForComment);
    } catch (e) { alert(e.message); }
});

const reportPost = async (postId) => {
    const reason = prompt('Pourquoi signalez-vous ce post ?');
    if (!reason) return;
    try {
        await fetch('/api/reports', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ targetType: 'POST', postId, reason })
        });
        alert('Signalement envoyé.');
    } catch (e) { alert(e.message); }
};

const canDelete = (post) => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user && (user.id === post.userId || user.role === 'ADMIN');
};

const publishPost = async (content, isAnonymous) => {
    const mediaUrl = document.getElementById('postMediaUrl').value;
    const mediaType = document.getElementById('postMediaType').value;

    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ content, isAnonymous, mediaUrl, mediaType })
        });
        if (!response.ok) throw new Error('Erreur publication');
        
        // Reset and reload
        document.getElementById('postContent').value = '';
        document.getElementById('postMediaUrl').value = '';
        document.getElementById('postModal').style.display = 'none';
        loadFeed(true);
    } catch (error) { alert(error.message); }
};

const deletePost = async (postId) => {
    if (confirm('Supprimer ?')) {
        await fetch(`/api/posts/${postId}`, { method: 'DELETE', headers: getAuthHeaders() });
        loadFeed(true);
    }
};

const reactToPost = async (postId) => {
    const res = await fetch(`/api/posts/${postId}/react`, { method: 'POST', headers: getAuthHeaders() });
    if (res.status === 409) await fetch(`/api/posts/${postId}/react`, { method: 'DELETE', headers: getAuthHeaders() });
};

const toggleChatbot = () => window.location.href = '/chatbot.html';
const openMessaging = (id, name) => window.location.href = `/messages.html?to=${id}&name=${encodeURIComponent(name)}`;

document.getElementById('showPublishBtn')?.addEventListener('click', () => {
    document.getElementById('postModal').style.display = 'block';
});

// Listener for Publish Button (needs global handler now)
document.getElementById('publishBtn')?.addEventListener('click', () => {
    const content = document.getElementById('postContent').value;
    const isAnonymous = document.getElementById('isAnonymous').checked;
    publishPost(content, isAnonymous);
});
