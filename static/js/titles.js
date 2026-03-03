let currentUserId = null;
let myPromotionId = null;

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Check Auth
    const authResp = await fetch('/auth/status');
    const authData = await authResp.json();
    if (!authData.logged_in || authData.user_type !== 'promoter') {
        window.location.href = '/myaccount.html';
        return;
    }
    currentUserId = authData.id;

    // 2. Get Promotion ID
    const pResp = await fetch(`/api/promotion?owner_id=${currentUserId}`);
    const promotions = await pResp.json();
    if (promotions.length > 0) {
        myPromotionId = promotions[0].id;
        loadTitles();
    } else {
        document.getElementById('titlesList').innerHTML = '<p>No promotion found.</p>';
    }
});

async function loadTitles() {
    const resp = await fetch(`/api/title?promotion_id=${myPromotionId}`);
    const titles = await resp.json();
    const list = document.getElementById('titlesList');
    list.innerHTML = '';

    titles.forEach(title => {
        const div = document.createElement('div');
        div.className = 'title-list-item';
        div.textContent = title.name;
        div.onclick = () => selectTitle(title, div);
        list.appendChild(div);
    });
}

async function selectTitle(title, element) {
    // Highlight active
    document.querySelectorAll('.title-list-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    // Show details
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('titleDetails').style.display = 'block';
    document.getElementById('selectedTitleName').textContent = title.name;
    document.getElementById('selectedTitleType').textContent = title.type;
    document.getElementById('historyTitleId').value = title.id;

    loadHistory(title.id);
}

async function loadHistory(titleId) {
    const resp = await fetch(`/api/title_history?title_id=${titleId}`);
    if (!resp.ok) {
        console.error("Failed to load history:", await resp.text());
        return;
    }
    const history = await resp.json();
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';

    // Sort by date desc
    history.sort((a, b) => new Date(b.won_date) - new Date(a.won_date));

    history.forEach(h => {
        const tr = document.createElement('tr');
        
        let champDisplay = h.champion_name || (h.wrestler_id ? `User #${h.wrestler_id}` : 'Unknown');

        tr.innerHTML = `
            <td>${new Date(h.won_date).toLocaleDateString()}</td>
            <td>${champDisplay}</td> 
            <td>${h.notes || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('addHistoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    
    if (!data.wrestler_id) delete data.wrestler_id; // Prevent sending empty string for ID
    
    const resp = await fetch('/api/title_history', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if(resp.ok) {
        e.target.reset();
        document.getElementById('historyTitleId').value = data.title_id; // Restore ID after reset
        loadHistory(data.title_id);
    } else {
        const err = await resp.json();
        alert('Failed to add history: ' + (err.error || 'Unknown error'));
    }
});