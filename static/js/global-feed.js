document.addEventListener("DOMContentLoaded", async () => {
    // This runs on the index page
    loadGlobalFeed();
});

async function loadGlobalFeed() {
    const main = document.querySelector('main');
    main.innerHTML = '<h2>Global Feed</h2><div id="feedPosts">Loading...</div>';
    const feedContainer = document.getElementById('feedPosts');

    try {
        // 1. Fetch all posts
        const postsResp = await fetch('/api/post');
        const allPosts = await postsResp.json();
        
        if (allPosts.error) {
            console.error("API Error fetching posts:", allPosts.error);
            // This is where the generic API error will likely appear
            if (allPosts.error.includes("unpack")) {
                 feedContainer.innerHTML = `<p class="error">A known bug in the API is preventing feeds from loading. We are working on it!</p>`;
                 return;
            }
            feedContainer.innerHTML = `<p class="error">Could not load the global feed due to an API error.</p>`;
            return;
        }

        // 2. Sort posts by date
        allPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (allPosts.length === 0) {
            feedContainer.innerHTML = '<p>The ring is quiet... No posts yet.</p>';
            return;
        }

        // 3. Fetch author details for the posts
        const authorIds = [...new Set(allPosts.map(p => p.author_id))];
        const authors = {};

        const authorPromises = authorIds.map(id => 
            fetch(`/api/user/${id}`).then(res => res.json())
        );

        const authorResults = await Promise.all(authorPromises);
        authorResults.forEach(author => {
            authors[author.id] = author;
        });

        // 4. Render posts
        feedContainer.innerHTML = '';
        // Only show latest 20 posts for the global feed
        allPosts.slice(0, 20).forEach(post => {
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
        console.error("Error loading global feed:", err);
        feedContainer.innerHTML = '<p class="error">A critical error occurred while loading the global feed.</p>';
    }
}
