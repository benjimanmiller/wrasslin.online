let currentUserId = null;
let myPromotionId = null;

document.addEventListener("DOMContentLoaded", async () => {
    const authResp = await fetch('/auth/status');
    const authData = await authResp.json();
    if (!authData.logged_in || authData.user_type !== 'promoter') {
        window.location.href = '/myaccount.html';
        return;
    }
    currentUserId = authData.id;

    const pResp = await fetch(`/api/promotion?owner_id=${currentUserId}`);
    const promotions = await pResp.json();
    if (promotions.length > 0) {
        myPromotionId = promotions[0].id;
        loadEvents();
    } else {
        document.getElementById('eventsList').innerHTML = '<p>No promotion found.</p>';
    }
});

async function loadEvents() {
    const resp = await fetch(`/api/event?promotion_id=${myPromotionId}`);
    const events = await resp.json();
    const list = document.getElementById('eventsList');
    list.innerHTML = '';

    events.sort((a, b) => new Date(b.date_time) - new Date(a.date_time));

    events.forEach(event => {
        const div = document.createElement('div');
        div.className = 'title-list-item'; // Re-use style
        div.textContent = event.name;
        div.onclick = () => selectEvent(event, div);
        list.appendChild(div);
    });
}

async function selectEvent(event, element) {
    document.querySelectorAll('.title-list-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('eventDetails').style.display = 'block';

    // Populate event details form
    document.getElementById('selectedEventName').textContent = event.name;
    document.getElementById('selectedEventDate').textContent = new Date(event.date_time).toLocaleString();
    document.getElementById('eventId').value = event.id;
    
    const form = document.getElementById('editEventForm');
    form.name.value = event.name || '';
    form.date_time.value = event.date_time ? event.date_time.slice(0, 16) : ''; // Format for datetime-local
    form.venue.value = event.venue || '';
    form.city.value = event.city || '';
    form.description.value = event.description || '';

    // Load matches for this event
    loadMatches(event.id);
}

document.getElementById('editEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const eventId = form.event_id.value;
    const data = Object.fromEntries(new FormData(form).entries());
    delete data.event_id;

    const resp = await fetch(`/api/event/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (resp.ok) {
        alert('Event updated successfully!');
        loadEvents(); // Refresh the list
    } else {
        alert('Failed to update event.');
    }
});

async function loadMatches(eventId) {
    const container = document.getElementById('matchCardContainer');
    container.innerHTML = 'Loading matches...';

    const resp = await fetch(`/api/match_card?event_id=${eventId}`);
    const matches = await resp.json();

    if (!matches.length) {
        container.innerHTML = '<p>No matches have been added to this card yet.</p>';
        return;
    }
    
    container.innerHTML = '';
    matches.forEach(match => {
        const div = document.createElement('div');
        div.className = 'tool-card'; // Re-use style
        div.innerHTML = `
            <h5>${match.match_type}</h5>
            <p>${match.stipulation || 'Standard rules'}</p>
            <!-- TODO: Add participant and result management -->
        `;
        container.appendChild(div);
    });
}

document.getElementById('addMatchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const eventId = document.getElementById('eventId').value;
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.event_id = eventId;

    const resp = await fetch('/api/match_card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (resp.ok) {
        e.target.reset();
        loadMatches(eventId); // Refresh matches
    } else {
        alert('Failed to add match.');
    }
});
