// Premium TikTok Feed Interface Logic
let currentPage = 1;
let loading = false;
let noMorePosts = false;

const loadFeed = async (reset = false) => {
    if (loading || (noMorePosts && !reset)) return;
    loading = true;
    
    const feedContainer = document.getElementById('feedList');
    if (reset) {
        currentPage = 1;
        noMorePosts = false;
        feedContainer.innerHTML = ''; // Clear for reload
        feedContainer.scrollTop = 0;
    }

    try {
        const response = await fetch(`/api/posts?page=${currentPage}&limit=5`, {
            headers: getAuthHeaders()
        });
        const posts = await response.json();
        if (!response.ok) throw new Error(posts.error || 'Erreur flux');

        if (posts.length === 0) {
            if (reset) feedContainer.innerHTML = '<div class="post-card-snap" style="background:#000; color:var(--text-muted); justify-content:center; align-items:center;">Plus rien à voir ! 🧊</div>';
            noMorePosts = true;
            loading = false;
            return;
        }

        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card-snap';
            card.id = `post-${post.id}`;
            
            let mediaHtml = '';
            if (post.mediaType === 'IMAGE' && post.mediaUrl) {
                mediaHtml = `<div style="position:absolute; width:100%; height:100%; top:0; left:0; z-index:0; background:url('${post.mediaUrl}') center/cover no-repeat; opacity:0.7;"></div>`;
            } else if (post.mediaType === 'VIDEO' && post.mediaUrl) {
                mediaHtml = `<video src="${post.mediaUrl}" autoplay muted loop playsinline style="position:absolute; width:100%; height:100%; top:0; left:0; object-fit:cover; z-index:0; opacity:0.7;"></video>`;
            } else {
                // Minimalist abstract gradient if no media
                mediaHtml = `<div style="position:absolute; width:100%; height:100%; top:0; left:0; z-index:0; background: radial-gradient(circle at top right, #1a1a2e, #000); opacity:0.5;"></div>`;
            }

            const pseudoLabel = post.isAnonymous ? 'Anonyme' : `@${post.user.pseudo}`;
            const isPro = !post.isAnonymous && post.user.role === 'PRO';

            card.innerHTML = `
                ${mediaHtml}
                <div style="position:relative; z-index:2; padding:40px; width:100%; text-align:left; font-size:1.4rem; font-weight:400; line-height:1.5; text-shadow: 2px 2px 10px rgba(0,0,0,0.9); margin-top: -20%;">
                    ${post.content}
                </div>
                
                <div class="post-overlay">
                    <div class="profile-tag" onclick="${!post.isAnonymous ? `window.location.href='/profile.html?pseudo=${post.user.pseudo}'` : ''}" style="${!post.isAnonymous ? 'cursor:pointer' : ''}">
                        <div style="width:32px; height:32px; background:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem;">
                            ${pseudoLabel[0].toUpperCase()}
                        </div>
                        <span style="font-weight:700; font-size:0.95rem;">${pseudoLabel}</span>
                        ${isPro ? '<span class="pro-verif-badge">✓</span>' : ''}
                    </div>
                </div>

                <div class="post-sidebar">
                    <div class="sidebar-icon" onclick="reactToPost('${post.id}')">
                        <span style="font-size:1.5rem">❤️</span>
                        <span id="react-count-${post.id}" class="sidebar-label">${post._count.reactions}</span>
                    </div>
                    <div class="sidebar-icon" onclick="openComments('${post.id}')">
                        <span style="font-size:1.5rem">💬</span>
                        <span id="comment-count-${post.id}" class="sidebar-label">${post._count.comments}</span>
                    </div>
                    <div class="sidebar-icon" onclick="openMessaging('${post.userId}', '${post.user.pseudo}')">
                        <span style="font-size:1.5rem">✉️</span>
                    </div>
                    <div class="sidebar-icon" onclick="reportPost('${post.id}')">
                        <span style="font-size:1.2rem">🚩</span>
                    </div>
                    ${canDelete(post) ? `
                        <div class="sidebar-icon" style="color:var(--danger)" onclick="deletePost('${post.id}')">
                            <span style="font-size:1.5rem">🗑️</span>
                        </div>
                    ` : ''}
                </div>
            `;
            feedContainer.appendChild(card);
        });

        currentPage++;
        loading = false;
    } catch (error) {
        console.error(error);
        loading = false;
    }
};

const reactToPost = async (postId) => {
    try {
        let res = await fetch(`/api/posts/${postId}/react`, { method: 'POST', headers: getAuthHeaders() });
        if (res.status === 409) {
            res = await fetch(`/api/posts/${postId}/react`, { method: 'DELETE', headers: getAuthHeaders() });
        }
        const data = await res.json();
        if (data.count !== undefined) {
            const countEl = document.getElementById(`react-count-${postId}`);
            countEl.innerText = data.count;
            countEl.parentElement.classList.add('heart-pop');
            setTimeout(() => countEl.parentElement.classList.remove('heart-pop'), 400);
        }
    } catch (e) { console.error(e); }
};

// Scroll listener for infinite scroll
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
    list.innerHTML = '<div style="color:var(--text-muted); padding:20px; text-align:center;">Chargement...</div>';
    try {
        const res = await fetch(`/api/comments/post/${postId}`, { headers: getAuthHeaders() });
        const comments = await res.json();
        list.innerHTML = '';
        if (comments.length === 0) {
            list.innerHTML = '<div style="color:var(--text-muted); padding:20px; text-align:center;">Aucun commentaire. Soyez le premier !</div>';
        }
        comments.forEach(c => {
            const div = document.createElement('div');
            div.style.padding = '15px 0';
            div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            div.innerHTML = `
                <div style="font-weight:700; color:var(--primary); font-size:0.85rem;">@${c.user.pseudo}</div>
                <div style="font-size:0.9rem; margin-top:3px;">${c.content}</div>
            `;
            list.appendChild(div);
        });
    } catch (e) { console.error(e); }
};

document.getElementById('submitCommentBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('commentInput');
    const content = input.value.trim();
    if (!content || !window.currentPostIdForComment) return;
    try {
        const res = await fetch('/api/comments', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ postId: window.currentPostIdForComment, content })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error);
        input.value = '';
        const counter = document.getElementById(`comment-count-${window.currentPostIdForComment}`);
        if(counter) counter.innerText = parseInt(counter.innerText) + 1;
        openComments(window.currentPostIdForComment);
    } catch (e) { alert(e.message); }
});

const publishPost = async (content, isAnonymous) => {
    const mediaUrl = document.getElementById('postMediaUrl').value.trim();
    const mediaType = document.getElementById('postMediaType').value;
    if(!content.trim()) return alert('Contenu requis.');

    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ content, isAnonymous, mediaUrl, mediaType })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erreur publication');
        
        document.getElementById('postModal').style.display = 'none';
        document.getElementById('postContent').value = '';
        loadFeed(true); // Full refresh
        showToast('Publication en ligne !', 'SUCCESS');
    } catch (error) { alert(error.message); }
};

const deletePost = async (postId) => {
    if (confirm('Supprimer définitivement ?')) {
        await fetch(`/api/posts/${postId}`, { method: 'DELETE', headers: getAuthHeaders() });
        loadFeed(true);
    }
};

const reportPost = async (postId) => {
    const reason = prompt('Pourquoi signalez-vous ce contenu ?');
    if (!reason) return;
    try {
        const res = await fetch('/api/reports', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ targetType: 'POST', postId, reason }) });
        if(res.ok) showToast('Signalement envoyé aux administrateurs.', 'SUCCESS');
    } catch (e) { alert(e.message); }
};

const canDelete = (post) => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user && (user.id === post.userId || user.role === 'ADMIN' || user.role === 'PRO');
};

const openMessaging = (id, name) => window.location.href = `/messages.html?to=${id}&name=${encodeURIComponent(name)}`;

// Global UI events
document.getElementById('showPublishBtn')?.addEventListener('click', () => { 
    document.getElementById('postModal').style.display = 'block'; 
});
document.getElementById('publishBtn')?.addEventListener('click', () => { 
    publishPost(document.getElementById('postContent').value, document.getElementById('isAnonymous').checked); 
});
