document.addEventListener("DOMContentLoaded", async () => {
    // 1. Check Auth & Get ID
    const authResp = await fetch('/auth/status');
    const authData = await authResp.json();

    if (!authData.logged_in) {
        window.location.href = '/login.html';
        return;
    }

    const currentUserId = authData.id;
    loadFeed(currentUserId);
});

async function loadFeed(userId) {
    const main = document.querySelector('main');
    main.innerHTML = '<h2>Your Personal Feed</h2><div id="feedPosts">Loading...</div>';
    const feedContainer = document.getElementById('feedPosts');

    try {
        // 1. Get followed users and promotions
        const followResp = await fetch(`/api/follower?follower_id=${userId}`);
        const follows = await followResp.json();

        if (follows.error) {
            console.error("API Error fetching follows:", follows.error);
            // This is where the generic API error will likely appear
            if (follows.error.includes("unpack")) {
                 feedContainer.innerHTML = `<p class="error">A known bug in the API is preventing feeds from loading. We are working on it!</p>`;
                 return;
            }
            feedContainer.innerHTML = `<p class="error">Could not load your feed due to an API error.</p>`;
            return;
        }

        const followedUserIds = follows.map(f => f.followed_user_id).filter(id => id);
        const followedPromoIds = follows.map(f => f.followed_promotion_id).filter(id => id);

        if (followedUserIds.length === 0 && followedPromoIds.length === 0) {
            feedContainer.innerHTML = '<p>You are not following anyone yet. Find some wrestlers or promotions to follow!</p>';
            return;
        }

        // 2. Fetch all posts
        const postsResp = await fetch('/api/post');
        const allPosts = await postsResp.json();

        // 3. Filter posts based on followed authors/promotions
        const feedPosts = allPosts.filter(post => 
            followedUserIds.includes(post.author_id) || 
            followedPromoIds.includes(post.promotion_id)
        );

        // 4. Sort posts by date
        feedPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (feedPosts.length === 0) {
            feedContainer.innerHTML = '<p>Nothing new to see here. The people and promotions you follow have not posted anything recently.</p>';
            return;
        }

        // 5. Fetch author details for the posts
        const authorIds = [...new Set(feedPosts.map(p => p.author_id))];
        const authors = {};

        const authorPromises = authorIds.map(id => 
            fetch(`/api/user/${id}`).then(res => res.json())
        );

        const authorResults = await Promise.all(authorPromises);
        authorResults.forEach(author => {
            authors[author.id] = author;
        });

        // 6. Render posts
        feedContainer.innerHTML = '';
        feedPosts.forEach(post => {
            const author = authors[post.author_id];
            const postElement = document.createElement('div');
            postElement.className = 'post-card';
            
            const authorName = author ? (author.display_name || author.username) : "Unknown";
            const authorAvatar = author ? (author.avatar_url || 'https://placehold.co/50?text=N/A') : 'https://placehold.co/50?text=N/A';

            postElement.innerHTML = `
                <div class="post-header">
                    <img src="${authorAvatar}" alt="${authorName}" class="post-avatar">
                    <div>
                        <span class="post-author">${authorName}</span>
                        <span class="post-date">${new Date(post.created_at).toLocaleString()}</span>
                    </div>
                </div>
                <div class="post-content">
                    <p>${post.content}</p>
                </div>
            `;
            feedContainer.appendChild(postElement);
        });

    } catch (err) {
        console.error("Error loading feed:", err);
        feedContainer.innerHTML = '<p class="error">A critical error occurred while loading your feed.</p>';
    }
}
