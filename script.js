const API_BASE = 'https://golf-scramble-backend.onrender.com';
const leaderboardEl = document.getElementById('leaderboard');

// Function to render leaderboard data
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
