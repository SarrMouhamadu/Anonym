// TikTok Feed Interface Logic with Infinite Scroll & Media Support
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
        feedContainer.innerHTML = showSkeletons();
        feedContainer.scrollTop = 0;
    } else {
        const loader = document.createElement('div');
        loader.id = 'loader';
        loader.innerHTML = showSkeletons(1);
        feedContainer.appendChild(loader);
    }

    try {
        const response = await fetch(`/api/posts?page=${currentPage}&limit=5`, {
            headers: getAuthHeaders()
        });
        const posts = await response.json();
        if (!response.ok) throw new Error(posts.error);

        if (reset) feedContainer.innerHTML = '';
        else document.getElementById('loader')?.remove();

        if (posts.length === 0) {
            if (reset) feedContainer.innerHTML = '<div class="post-card-snap" style="justify-content:center; align-items:center;">Plus rien à voir !</div>';
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
                    <button class="sidebar-icon" style="background:none; border:none;" onclick="reactToPost('${post.id}')">❤️ <span class="sidebar-label">${post._count.reactions}</span></button>
                    <button class="sidebar-icon" style="background:none; border:none;" onclick="openComments('${post.id}')">💬 <span class="sidebar-label">${post._count.comments}</span></button>
                    <button class="sidebar-icon" style="background:none; border:none;" onclick="toggleChatbot()">🤖</button>
                    <button class="sidebar-icon" style="background:none; border:none;" onclick="openMessaging('${post.userId}', '${post.user.pseudo}')">✉️</button>
                    <button class="sidebar-icon" style="background:none; border:none;" onclick="reportPost('${post.id}')">🚩</button>
                    ${canDelete(post) ? `<button class="sidebar-icon" style="background:none; border:none; color:var(--danger)" onclick="deletePost('${post.id}')">🗑️</button>` : ''}
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

const showSkeletons = (count = 3) => {
    let html = '';
    for(let i=0; i<count; i++) {
        html += `
            <div class="post-card-snap" style="padding:40px;">
                <div class="skeleton" style="height:30%; width:80%; margin:0 auto; border-radius:15px;"></div>
                <div class="post-overlay">
                    <div class="skeleton skeleton-text" style="width:120px;"></div>
                    <div class="skeleton skeleton-text" style="width:80px;"></div>
                </div>
                <div class="post-sidebar">
                    <div class="skeleton skeleton-circle"></div>
                    <div class="skeleton skeleton-circle"></div>
                    <div class="skeleton skeleton-circle"></div>
                </div>
            </div>
        `;
    }
    return html;
};

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
    list.innerHTML = '<div class="skeleton-text"></div>'.repeat(3);
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
    const reason = prompt('Motif ?');
    if (!reason) return;
    try {
        await fetch('/api/reports', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ targetType: 'POST', postId, reason }) });
        showToast('Merci, votre signalement a été reçu !', 'SUCCESS');
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
        if (!response.ok) throw new Error('Erreur');
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
    // Emit notification manually if needed or await server broadcast
};

const toggleChatbot = () => window.location.href = '/chatbot.html';
const openMessaging = (id, name) => window.location.href = `/messages.html?to=${id}&name=${encodeURIComponent(name)}`;

document.getElementById('showPublishBtn')?.addEventListener('click', () => { document.getElementById('postModal').style.display = 'block'; });
document.getElementById('publishBtn')?.addEventListener('click', () => { publishPost(document.getElementById('postContent').value, document.getElementById('isAnonymous').checked); });
