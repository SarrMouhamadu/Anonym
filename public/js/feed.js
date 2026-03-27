const feedContainer = document.getElementById('feed-container');

const fetchPosts = async () => {
    try {
        const response = await fetch(`${API_URL}/posts`, {
            headers: getAuthHeaders()
        });
        const posts = await response.json();
        if (!response.ok) throw new Error(posts.error);
        
        feedContainer.innerHTML = '';
        posts.forEach(post => renderPost(post));
    } catch (e) {
        console.error('Fetch feed error:', e);
    }
};

const publishPost = async (content, isAnonymous) => {
    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ content, isAnonymous })
        });
        const newPost = await response.json();
        if (!response.ok) throw new Error(newPost.error);
        
        // Prepend to feed
        const tempDiv = document.createElement('div');
        tempDiv.className = 'animate-fade-up';
        feedContainer.prepend(tempDiv);
        renderPost(newPost, tempDiv);
        
        return newPost;
    } catch (e) {
        alert(e.message);
        throw e;
    }
};

const reactToPost = async (postId, heartIcon, counterEl) => {
    const isLiked = heartIcon.classList.contains('active');
    const method = isLiked ? 'DELETE' : 'POST';
    
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/react`, {
            method,
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        counterEl.innerText = data.count;
        heartIcon.classList.toggle('active');
        if (!isLiked) {
             heartIcon.classList.add('animate-ping');
             setTimeout(() => heartIcon.classList.remove('animate-ping'), 500);
        }
    } catch (e) {
        alert(e.message);
    }
};

const renderPost = (post, target = null) => {
    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'À l\'instant';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Il y a ${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Il y a ${hours}h`;
        return new Date(date).toLocaleDateString();
    };

    const postHtml = `
      <div class="glass-card p-4 md:p-6 mb-4 md:mb-6 animate-fade-up border border-[#E2EAF2] rounded-[14px] bg-white">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${post.isAnonymous ? 'bg-[#F0F4F8] text-[#7A92A8]' : 'bg-[--color-primary-pale] text-[--color-primary]'}">
              ${post.isAnonymous ? 'A' : (post.user.pseudo[0].toUpperCase())}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-[--color-text-primary]">${post.isAnonymous ? 'Anonyme' : post.user.pseudo}</span>
                ${post.user.role === 'PRO' ? '<span class="bg-[#1A56A0] text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">PRO</span>' : ''}
              </div>
              <span class="text-[11px] text-[--color-text-muted]">${timeAgo(post.createdAt)}</span>
            </div>
          </div>
          ${post.isAnonymous ? '<span class="bg-[--color-primary-pale] text-[--color-primary] text-[10px] font-bold px-2.5 py-1 rounded-full tracking-tight">ANONYME</span>' : ''}
        </div>
        <p class="text-[--color-text-body] text-[14px] leading-relaxed mb-4">${post.content}</p>
        <div class="flex items-center gap-6 pt-3 border-t border-[#F7FAFD]">
          <button class="flex items-center gap-2 text-[#CBD5E1] hover:text-[--color-heart] transition-all group heart-btn" data-id="${post.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" class="heart-svg" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            <span class="text-[13px] font-bold reaction-count">${post._count.reactions || 0}</span>
          </button>
          <button class="flex items-center gap-2 text-[#CBD5E1] hover:text-[--color-primary] transition-all group">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            <span class="text-[13px] font-bold">${post._count.comments || 0}</span>
          </button>
          <button class="ml-auto text-[11px] font-bold text-[#CBD5E1] hover:text-[--color-danger] transition-all">SIGNALER</button>
        </div>
      </div>
    `;

    if (target) {
        target.innerHTML = postHtml;
    } else {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = postHtml;
        feedContainer.appendChild(wrapper.firstElementChild);
    }
};

// Event Delegation for Reactions
document.addEventListener('click', (e) => {
    const heartBtn = e.target.closest('.heart-btn');
    if (heartBtn) {
        const postId = heartBtn.dataset.id;
        const heartSvg = heartBtn.querySelector('.heart-svg');
        const countEl = heartBtn.querySelector('.reaction-count');
        reactToPost(postId, heartBtn, countEl);
    }
});

// Initial load
if (feedContainer) {
    fetchPosts();
}
