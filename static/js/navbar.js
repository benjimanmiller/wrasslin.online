document.addEventListener("DOMContentLoaded", () => {
    fetch('/auth/status')
        .then(r => r.json())
        .then(data => {
            if (data.logged_in) {
                const loginLink = document.querySelector('a[href="login.html"]');
                if (loginLink) {
                    // Change Login to Logout
                    loginLink.textContent = 'Logout';
                    loginLink.href = '/auth/logout';

                    // Add My Feed link
                    const li = document.createElement('li');
                    li.innerHTML = '<a href="feed.html">My Feed</a>';
                    const ul = document.querySelector('nav ul');
                    ul.insertBefore(li, ul.firstChild);

                    // Add My Account link
                    const accountLi = document.createElement('li');
                    accountLi.innerHTML = '<a href="myaccount.html">My Account</a>';
                    ul.insertBefore(accountLi, loginLink.closest('li'));
                }
            }
        });
});