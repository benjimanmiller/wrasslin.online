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
    document.getElementById('defenseTitleId').value = title.id;

    loadHistory(title.id);
    loadDefenses(title.id);
}

async function loadHistory(titleId) {
    // Add timestamp to prevent caching
    const resp = await fetch(`/api/title_history?title_id=${titleId}&_=${Date.now()}`);
    if (!resp.ok) {
        console.error("Failed to load history:", await resp.text());
        return;
    }
    const history = await resp.json();
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';

    // Sort by date desc (handle nulls safely)
    history.sort((a, b) => {
        const da = a.won_date ? new Date(a.won_date) : new Date(0);
        const db = b.won_date ? new Date(b.won_date) : new Date(0);
        return db - da;
    });

    // Resolve Usernames for Wrestler IDs
    const wrestlerIds = [...new Set(history.map(h => h.wrestler_id).filter(id => id))];
    const userMap = {};
    
    await Promise.all(wrestlerIds.map(async (id) => {
        try {
            const uResp = await fetch(`/api/user/${id}`);
            if (uResp.ok) {
                const u = await uResp.json();
                userMap[id] = u.display_name || u.username;
            }
        } catch (e) { console.error(e); }
    }));

    history.forEach(h => {
        const tr = document.createElement('tr');
        
        let champDisplay = h.champion_name;
        if (!champDisplay && h.wrestler_id) {
            champDisplay = userMap[h.wrestler_id] || `User #${h.wrestler_id}`;
        }
        if (!champDisplay) champDisplay = 'Vacant';

        const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';

        tr.innerHTML = `
            <td>${formatDate(h.won_date)}</td>
            <td>${h.lost_date ? formatDate(h.lost_date) : 'Current'}</td>
            <td>${champDisplay}</td> 
            <td>${h.wrestling_group_id || '-'}</td>
            <td>${h.match_id || '-'}</td>
            <td>${h.notes || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('addHistoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    
    if (!data.wrestler_id) delete data.wrestler_id; // Prevent sending empty string for ID
    if (!data.wrestling_group_id) delete data.wrestling_group_id;
    if (!data.match_id) delete data.match_id;
    if (!data.won_date) delete data.won_date;
    if (!data.lost_date) delete data.lost_date;
    
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

async function loadDefenses(titleId) {
    const resp = await fetch(`/api/title_defense?title_id=${titleId}`);
    if (!resp.ok) return;
    
    const defenses = await resp.json();
    const tbody = document.getElementById('defenseBody');
    tbody.innerHTML = '';

    defenses.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${d.match_id}</td>
            <td>${d.result}</td>
            <td>${d.notes || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('addDefenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    
    const resp = await fetch('/api/title_defense', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if(resp.ok) {
        e.target.reset();
        document.getElementById('defenseTitleId').value = data.title_id;
        loadDefenses(data.title_id);
    } else {
        alert('Failed to add defense');
    }
});