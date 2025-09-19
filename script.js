const API_BASE = 'https://golf-scramble-backend.onrender.com';
const leaderboardEl = document.getElementById('leaderboard');

// -------------------- Leaderboard --------------------
function renderLeaderboard(data) {
  leaderboardEl.innerHTML = '';
  data.forEach(team => {
    const li = document.createElement('li');
    li.textContent = `${team.name} — ${team.score_relative_to_par}`;
    leaderboardEl.appendChild(li);
  });
}

// Fetch leaderboard on page load
fetch(`${API_BASE}/leaderboard`)
  .then(res => res.json())
  .then(data => renderLeaderboard(data))
  .catch(err => console.error('Error fetching leaderboard:', err));

// Connect to backend via Socket.IO
const socket = io(API_BASE);

// Listen for live leaderboard updates
socket.on('leaderboardUpdate', (data) => {
  console.log('Updated leaderboard:', data);
  renderLeaderboard(data);
});

// -------------------- Login --------------------
const loginForm = document.getElementById('login-form');
const loginSection = document.getElementById('login-section');
let authToken = null;

// Populate team dropdown
fetch(`${API_BASE}/teams`)
  .then(res => res.json())
  .then(teams => {
    const teamSelect = document.getElementById('team_name');
    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.name;
      option.textContent = team.name;
      teamSelect.appendChild(option);
    });
  })
  .catch(err => console.error('Error fetching teams:', err));

// Handle login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const team_name = document.getElementById('team_name').value;
  const pin = document.getElementById('pin').value;

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_name, pin })
    });

    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    authToken = data.token;

    loginSection.style.display = 'none';
    showScoreForm();
    alert(`Welcome, ${team_name}! You are now logged in.`);

  } catch (err) {
    console.error(err);
    alert('Invalid team name or PIN.');
  }
});

// -------------------- Score Submission --------------------
const scoreSection = document.getElementById('score-section');
const scoreForm = document.getElementById('score-form');
const holeSelect = document.getElementById('hole_id');

// Populate hole dropdown
for (let i = 1; i <= 18; i++) {
  const option = document.createElement('option');
  option.value = i;
  option.textContent = `Hole ${i}`;
  holeSelect.appendChild(option);
}

// Show score form after login
function showScoreForm() {
  scoreSection.style.display = 'block';
}

// Handle score submission
scoreForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const hole_id = parseInt(holeSelect.value);
  const strokes = parseInt(document.getElementById('strokes').value);

  try {
    const res = await fetch(`${API_BASE}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ hole_id, strokes })
    });

    if (!res.ok) throw new Error('Score submission failed');
    alert(`Score submitted for Hole ${hole_id}: ${strokes} strokes`);

    scoreForm.reset();

  } catch (err) {
    console.error(err);
    alert('Error submitting score.');
  }
});
