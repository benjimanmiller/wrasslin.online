let currentUserId = null;
let myPromotionId = null;

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Check Auth & Get ID
    const authResp = await fetch('/auth/status');
    const authData = await authResp.json();

    if (!authData.logged_in) {
        window.location.href = '/login.html';
        return;
    }

    currentUserId = authData.id;

    // 2. Fetch User Details
    loadUserProfile();

    // 3. Fetch Activity (XP Log)
    loadUserActivity();

    // 4. Load Management Tools
    loadManagementTools();
});

async function loadUserProfile() {
    try {
        const response = await fetch(`/api/user/${currentUserId}`);
        const user = await response.json();

        if (user.error) return;

        // Populate Header Stats
        document.getElementById('displayUsername').textContent = user.display_name || user.username;
        document.getElementById('displayType').textContent = user.user_type;
        document.getElementById('displayLevel').textContent = user.level || 1;
        document.getElementById('displayXP').textContent = user.xp || 0;
        
        // Simple XP Bar Logic (Assuming 100 XP per level for now)
        const xp = user.xp || 0;
        const xpInLevel = xp % 100; 
        document.getElementById('xpBar').style.width = `${xpInLevel}%`;

        // Avatar
        const avatar = document.getElementById('displayAvatar');
        avatar.src = user.avatar_url || 'https://placehold.co/150?text=No+Avatar';

        // Show/Hide Role Specific Sections
        if (user.user_type === 'wrestler') {
            document.getElementById('wrestlerSection').style.display = 'block';
        }

        // Populate Form Fields
        const form = document.getElementById('profileForm');
        Array.from(form.elements).forEach(field => {
            if (field.name && user[field.name] !== undefined) {
                if (field.type === 'checkbox') {
                    field.checked = !!user[field.name];
                } else if (field.type !== 'submit' && field.type !== 'button') {
                    // Handle 0 values correctly (don't turn them into empty strings)
                    field.value = (user[field.name] !== null) ? user[field.name] : '';
                }
            }
        });

    } catch (err) {
        console.error("Error loading profile:", err);
    }
}

async function loadUserActivity() {
    try {
        const response = await fetch(`/api/user_xp_log?user_id=${currentUserId}`);
        const logs = await response.json();
        const list = document.getElementById('activityList');
        list.innerHTML = '';

        if (logs.length === 0) {
            list.innerHTML = '<li>No recent activity.</li>';
            return;
        }

        // Show last 5 entries, reversed
        logs.slice(-5).reverse().forEach(log => {
            const li = document.createElement('li');
            li.innerHTML = `${log.action_key} <span class="xp-gain">+${log.xp_gained} XP</span>`;
            list.appendChild(li);
        });
    } catch (err) {
        console.error("Error loading activity:", err);
    }
}

async function loadManagementTools() {
    const authResp = await fetch('/auth/status');
    const user = await authResp.json();

    if (user.user_type === 'promoter') {
        document.getElementById('promoterTools').style.display = 'block';
        
        // Check if they have a promotion
        const pResp = await fetch(`/api/promotion?owner_id=${currentUserId}`);
        const promotions = await pResp.json();

        if (promotions.length > 0) {
            const promo = promotions[0];
            myPromotionId = promo.id;
            document.getElementById('createPromotionContainer').style.display = 'none';
            document.getElementById('managePromotionContainer').style.display = 'block';
            document.getElementById('myPromotionName').textContent = promo.name;
            loadRoster(myPromotionId);
        }
    } else if (user.user_type === 'wrestler') {
        document.getElementById('wrestlerTools').style.display = 'block';
        
        // Load Promotions for Dropdown
        const pResp = await fetch('/api/promotion');
        const promotions = await pResp.json();
        const select = document.getElementById('promotionSelect');
        select.innerHTML = '<option value="">Select Promotion...</option>';
        promotions.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            select.appendChild(opt);
        });
    }
}

async function loadRoster(promotionId) {
    const list = document.getElementById('rosterMemberList');
    list.innerHTML = '<li>Loading roster...</li>';

    const rosterResp = await fetch(`/api/roster_member?promotion_id=${promotionId}`);
    const roster = await rosterResp.json();

    if (!roster.length) {
        list.innerHTML = '<li>Your roster is empty.</li>';
        return;
    }

    const userPromises = roster.map(member => fetch(`/api/user/${member.user_id}`).then(res => res.json()));
    const users = await Promise.all(userPromises);

    list.innerHTML = '';
    roster.forEach((member, index) => {
        const user = users[index];
        const li = document.createElement('li');
        li.style = "display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #eee;";
        li.innerHTML = `
            <span>${user.display_name || user.username} (${member.role})</span>
            <button class="remove-btn" data-id="${member.id}" style="width: auto; padding: 2px 8px; font-size: 0.8rem;">Remove</button>
        `;
        list.appendChild(li);
    });

    list.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rosterMemberId = e.target.dataset.id;
            removeRosterMember(rosterMemberId);
        });
    });
}

async function removeRosterMember(rosterMemberId) {
    if (!confirm('Are you sure you want to remove this person from your roster?')) return;

    const resp = await fetch(`/api/roster_member/${rosterMemberId}`, {
        method: 'DELETE'
    });

    if (resp.ok) {
        alert('Roster member removed.');
        loadRoster(myPromotionId); // Refresh the list
    } else {
        alert('Failed to remove roster member.');
    }
}

// --- Promoter Actions ---

document.getElementById('createPromotionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const resp = await fetch('/api/promotion', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ owner_id: currentUserId, name: name })
    });
    if(resp.ok) {
        alert('Promotion Created!');
        loadManagementTools(); // Reload to show tools
    }
});

document.getElementById('recruitForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const role = e.target.role.value;

    // Resolve Username to ID
    const uResp = await fetch(`/api/user?username=${username}`);
    const users = await uResp.json();
    
    if (!users.length) {
        alert('User not found!');
        return;
    }

    const targetUserId = users[0].id;

    const resp = await fetch('/api/roster_member', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            user_id: targetUserId, 
            promotion_id: myPromotionId,
            role: role,
            active: 1
        })
    });

    if(resp.ok) { alert(`Added ${username} to roster!`); e.target.reset(); }
});

document.getElementById('createTitleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.promotion_id = myPromotionId;

    const resp = await fetch('/api/title', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if(resp.ok) { alert('Title Created!'); e.target.reset(); }
});

document.getElementById('createEventForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.promotion_id = myPromotionId;

    const resp = await fetch('/api/event', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if(resp.ok) { alert('Event Scheduled!'); e.target.reset(); }
});

// --- Wrestler Actions ---

document.getElementById('joinPromotionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const promotionId = e.target.promotion_id.value;
    
    const resp = await fetch('/api/roster_member', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            user_id: currentUserId, 
            promotion_id: promotionId,
            role: 'Wrestler',
            active: 1 // In future, set to 0 for pending approval
        })
    });

    if(resp.ok) { 
        alert('Joined Promotion!'); 
    }
});

// Handle Form Submit
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Handle checkboxes manually because FormData ignores unchecked ones
    // We need to explicitly send 0/false if unchecked
    const checkboxes = e.target.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        data[cb.name] = cb.checked ? 1 : 0;
    });

    try {
        const response = await fetch(`/api/user/${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const msg = document.getElementById('updateMessage');
            msg.textContent = "Profile updated successfully!";
            msg.style.display = 'block';
            loadUserProfile(); // Refresh display
            setTimeout(() => msg.style.display = 'none', 3000);
        } else {
            const err = await response.json();
            console.error("Update failed:", err);
            alert("Failed to update profile: " + (err.error || "Unknown error"));
        }
    } catch (err) {
        console.error(err);
        alert("Error updating profile. Check console.");
    }
});