document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        if (result.success) {
            alert('Registration successful! Please login.');
            window.location.href = '/login.html';
        } else {
            document.getElementById('message').textContent = result.error || 'Registration failed';
        }
    } catch (err) {
        document.getElementById('message').textContent = 'An error occurred. Please try again.';
    }
});