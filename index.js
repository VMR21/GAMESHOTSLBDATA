const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

const apiUrl = "https://roobetconnect.com/affiliate/v2/stats";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjViYTFlOTNjLWZjM2UtNDg2Ni04OWI1LTYwMDhhODg4ZDdmNyIsIm5vbmNlIjoiMzVlMjQyZjEtNGUxYS00YTQ2LWFjODctNTg5ZDc0Y2NjNzgzIiwic2VydmljZSI6ImFmZmlsaWF0ZVN0YXRzIiwiaWF0IjoxNzM5MjUxMTYxfQ.PM-6IMX0i8vB0zzZ4vFuG22rUi6DMqN64I8OIsqw9VU";

// Mask usernames
const formatUsername = (username) => {
  const firstTwo = username.slice(0, 2);
  const lastTwo = username.slice(-2);
  return `${firstTwo}***${lastTwo}`;
};

// Simulated users
const manualUsers = [
  {
    rawUsername: "Lightning01",
    startWager: 0,
    target: 70912,
    startTime: "2025-06-16T12:07:00Z",
    endTime: "2025-06-22T18:29:59Z",
    intervalMs: 60 * 60 * 1000 // 1 hour
  },
  {
    rawUsername: "Pro99",
    startWager: 0,
    target: 64992,
    startTime: "2025-06-16T18:34:00Z",
    endTime: "2025-06-22T18:29:59Z",
    intervalMs: 30 * 60 * 1000
  },
  {
    rawUsername: "GoG24",
    startWager: 0,
    target: 59023,
    startTime: "2025-06-16T21:51:00Z",
    endTime: "2025-06-22T18:29:59Z",
    intervalMs: 20 * 60 * 1000
  },
  {
    rawUsername: "Mcqueen",
    startWager: 0,
    target: 54893,
    startTime: "2025-06-17T08:34:00Z",
    endTime: "2025-06-22T18:29:59Z",
    intervalMs: 30 * 60 * 1000
  },
  {
    rawUsername: "Chepira0",
    startWager: 0,
    target: 49281,
    startTime: "2025-06-17T15:51:00Z",
    endTime: "2025-06-22T18:29:59Z",
    intervalMs: 20 * 60 * 1000
  }
];

// Calculate current simulated progress
function getManualUsersWithProgress() {
  const now = new Date();

  return manualUsers.map(user => {
    const start = new Date(user.startTime);
    const end = new Date(user.endTime);
    let intervals = 0;

    if (now > start) {
      const duration = Math.min(now - start, end - start);
      intervals = Math.floor(duration / user.intervalMs);
    }

    const totalIntervals = Math.floor((end - start) / user.intervalMs);
    const weightedWager = Math.round((user.target / totalIntervals) * intervals);

    return {
      username: formatUsername(user.rawUsername),
      weightedWager
    };
  }).filter(user => user.weightedWager > 0);
}

// Fetch + merge leaderboard
let leaderboardCache = [];

async function updateLeaderboard() {
  try {
    const response = await axios.get(apiUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      params: {
        userId: "5ba1e93c-fc3e-4866-89b5-6008a888d7f7",
        startDate: "2025-05-22T18:29:59",
        endDate: "2025-06-22T18:29:59"
      }
    });

    const players = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data.data)
        ? response.data.data
        : [];

    const apiData = players.map(player => ({
      username: formatUsername(player.username),
      weightedWager: Math.round(
        player.weightedWager ||
        player.weightedWagered ||
        player.wageredAmount ||
        0
      )
    }));

    const manualData = getManualUsersWithProgress();

    leaderboardCache = [...apiData, ...manualData]
      .sort((a, b) => b.weightedWager - a.weightedWager)
      .slice(0, 15);

    console.log("🔥 Leaderboard updated:", new Date().toISOString());
    console.table(leaderboardCache);
  } catch (err) {
    console.error("❌ Error updating leaderboard:", err.response?.data || err.message);
  }
}

// Initial + periodic update
updateLeaderboard();
setInterval(updateLeaderboard, 5 * 60 * 1000);

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to the Leaderboard API! Use /leaderboard/top15");
});

app.get("/leaderboard/top15", (req, res) => {
  res.json(leaderboardCache);
});

// Run server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// Prevent sleeping (for Render)
setInterval(() => {
  axios.get("https://gameshotslbdata.onrender.com/leaderboard/top15")
    .then(() => console.log("✅ Self-ping success"))
    .catch(err => console.error("❌ Self-ping failed:", err.message));
}, 4 * 60 * 1000);
