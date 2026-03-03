// Check if already logged in
fetch('/auth/status').then(r => r.json()).then(data => {
    if(data.logged_in) window.location.href = '/';
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        if (result.success) {
            window.location.href = '/';
        } else {
            document.getElementById('message').textContent = result.error || 'Login failed';
        }
    } catch (err) {
        document.getElementById('message').textContent = 'An error occurred. Please try again.';
    }
});