const API_BASE = 'https://golf-scramble-backend.onrender.com';

// -------------------- Leaderboard --------------------
const leaderboardEl = document.getElementById('leaderboard');
const leaderboardContainer = document.getElementById('main-container');
const prevBtn = document.getElementById('leaderboard-prev');
const nextBtn = document.getElementById('leaderboard-next');
const indicatorsEl = document.getElementById('leaderboard-indicators');

let currentPage = 0;
let itemsPerPage = 4; // how many teams per page

function renderLeaderboard(data) {
  leaderboardEl.innerHTML = '';
  data.forEach((team, index) => {
    const score = team.score_relative_to_par;
    const formattedScore = score > 0 ? `+${score}` : score;

    // Position string
    let position;
    if (index === 0) position = '1st';
    else if (index === 1) position = '2nd';
    else if (index === 2) position = '3rd';
    else position = `${index + 1}th`;

    const li = document.createElement('li');
    const nameText = document.createTextNode(`${position} — ${team.name} `);

    const scoreSpan = document.createElement('span');
    scoreSpan.textContent = formattedScore;
    if (score > 0) scoreSpan.classList.add('score-positive');
    else if (score < 0) scoreSpan.classList.add('score-negative');
    else scoreSpan.classList.add('score-zero');

    li.appendChild(nameText);
    li.appendChild(scoreSpan);

    if (index === 0) li.classList.add('first-place');
    else if (index === 1) li.classList.add('second-place');
    else if (index === 2) li.classList.add('third-place');

    leaderboardEl.appendChild(li);
  });

  currentPage = 0;
  updateLeaderboardPage();
  buildIndicators();
}

function updateLeaderboardPage() {
  const offset = -currentPage * (leaderboardContainer.clientHeight);
  leaderboardEl.style.transform = `translateY(${offset}px)`;
  updateIndicators();
}



// Fetch leaderboard on page load
fetch(`${API_BASE}/leaderboard`)
  .then(res => res.json())
  .then(data => renderLeaderboard(data))
  .catch(err => console.error('Error fetching leaderboard:', err));

// Connect to backend via Socket.IO
const socket = io(API_BASE);
socket.on('leaderboardUpdate', (data) => {
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
    teamSelect.innerHTML = '<option value="">Select your team</option>';
    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.name.trim();
      option.textContent = team.name.trim();
      teamSelect.appendChild(option);
    });
  })
  .catch(err => console.error('Error fetching teams:', err));

// Handle login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const team_name = document.getElementById('team_name').value.trim();
  const pin = document.getElementById('pin').value.trim();

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
    await loadSavedScores(data.team_id);
    await loadHoles();
    displayHole();
    alert(`Welcome, ${team_name}! You are now logged in.`);
  } catch (err) {
    console.error(err);
    alert('Invalid team name or PIN.');
  }
});

async function loadSavedScores(team_id) {
  try {
    const res = await fetch(`${API_BASE}/scores/${team_id}`);
    const scores = await res.json();
    savedScores = {};
    scores.forEach(s => {
      if (s.strokes) {
        savedScores[s.hole_id] = s.strokes;
      }
    });
  } catch (err) {
    console.error('Error fetching saved scores:', err);
  }
}

// -------------------- Score Submission --------------------
const scoreSection = document.getElementById('score-section');
const strokesValueEl = document.getElementById('strokes-value');
let holes = [];
let currentHoleIndex = 0;

function showScoreForm() {
  scoreSection.style.display = 'block';
}

async function loadHoles() {
  try {
    const res = await fetch(`${API_BASE}/holes`);
    holes = await res.json();

    if (!Array.isArray(holes) || holes.length === 0) {
      console.error('No holes returned from backend');
      return;
    }

    currentHoleIndex = 0;
    displayHole();
  } catch (err) {
    console.error('Error fetching holes:', err);
  }
}

function displayHole() {
  const hole = holes[currentHoleIndex];
  if (!hole) {
    console.error('No hole data for index', currentHoleIndex);
    return;
  }
  document.getElementById('hole-number').textContent = hole.hole_number;
  document.getElementById('hole-par').textContent = hole.par;
  document.getElementById('hole-distance').textContent = hole.distance || 'N/A';
  document.getElementById('hole-special').textContent = hole.special_label || '';

  const startingStrokes = savedScores[hole.id] || hole.par;
  strokesValueEl.textContent = startingStrokes;
}

// Increment/decrement buttons
document.getElementById('increment-strokes').addEventListener('click', () => {
  let current = parseInt(strokesValueEl.textContent, 10);
  strokesValueEl.textContent = current + 1;
});

document.getElementById('decrement-strokes').addEventListener('click', () => {
  let current = parseInt(strokesValueEl.textContent, 10);
  if (current > 1) {
    strokesValueEl.textContent = current - 1;
  }
});

async function submitScore() {
  const hole = holes[currentHoleIndex];
  if (!hole) return;

  const strokes = parseInt(strokesValueEl.textContent, 10);
  if (!strokes) return;

  try {
    const res = await fetch(`${API_BASE}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ hole_id: hole.id, strokes })
    });

    if (!res.ok) throw new Error('Score submission failed');
    savedScores[hole.id] = strokes;
    console.log(`Score submitted for Hole ${hole.hole_number}: ${strokes} strokes`);
  } catch (err) {
    console.error(err);
    alert('Error submitting score.');
  }
}

// Prev button: wrap-around
document.getElementById('prev-hole').addEventListener('click', async () => {
  await submitScore();
  if (currentHoleIndex > 0) {
    currentHoleIndex--;
  } else {
    currentHoleIndex = holes.length - 1;
  }
  displayHole();
});

// Next button: wrap-around
document.getElementById('next-hole').addEventListener('click', async () => {
  await submitScore();
  if (currentHoleIndex < holes.length - 1) {
    currentHoleIndex++;
  } else {
    currentHoleIndex = 0;
  }
  displayHole();
});

