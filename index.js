
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

const apiUrl = "https://roobetconnect.com/affiliate/v2/stats";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjViYTFlOTNjLWZjM2UtNDg2Ni04OWI1LTYwMDhhODg4ZDdmNyIsIm5vbmNlIjoiMzVlMjQyZjEtNGUxYS00YTQ2LWFjODctNTg5ZDc0Y2NjNzgzIiwic2VydmljZSI6ImFmZmlsaWF0ZVN0YXRzIiwiaWF0IjoxNzM5MjUxMTYxfQ.PM-6IMX0i8vB0zzZ4vFuG22rUi6DMqN64I8OIsqw9VU";

let leaderboardCache = [];

const formatUsername = (username) => {
    const firstTwo = username.slice(0, 2);
    const lastTwo = username.slice(-2);
    return `${firstTwo}***${lastTwo}`;
};

const manualUsers = [
    {
        rawUsername: "Lightning01",
        startWager: 0,
        target: 0,
        startTime: "2025-04-22T17:11:00Z",
        endTime: "2025-04-22T18:29:59Z"
    },
    {
        rawUsername: "Pro99",
        startWager: 0,
        target: 0,
        startTime: "2025-04-22T17:11:00Z",
        endTime: "2025-04-22T18:29:59Z"
    },
    {
        rawUsername: "GoG24",
        startWager: 0,
        target: 0,
        startTime: "2025-04-21T15:15:00Z",
        endTime: "2025-04-22T18:29:59Z"
    }
];

function getManualUsersWithProgress() {
    const now = new Date();

    return manualUsers.map(user => {
        const start = new Date(user.startTime);
        const end = new Date(user.endTime);
        const total = end - start;
        const elapsed = now - start;

        let progress = 0;
        if (now >= end) progress = 1;
        else if (now <= start) progress = 0;
        else progress = elapsed / total;

        const weightedWager = Math.round(user.startWager + (user.target - user.startWager) * progress);

        return {
            username: formatUsername(user.rawUsername),
            weightedWager
        };
    });
}

async function updateLeaderboard() {
    try {
        const response = await axios.get(apiUrl, {
            headers: { Authorization: `Bearer ${apiKey}` },
            params: {
                userId: "5ba1e93c-fc3e-4866-89b5-6008a888d7f7",
                startDate: "2025-04-22T18:29:59",
                endDate: "2025-05-22T18:29:59",
            },
        });

        const players = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.data.data)
            ? response.data.data
            : [];

        const apiData = players.map(player => ({
            username: formatUsername(player.username),
            weightedWager: Math.round(player.weightedWager || player.weightedWagered || player.wageredAmount || 0)
        }));

        const manualData = getManualUsersWithProgress();

        leaderboardCache = [...apiData, ...manualData]
            .sort((a, b) => b.weightedWager - a.weightedWager)
            .slice(0, 15);

        console.log("🔥 Leaderboard updated @", new Date().toISOString());
        console.table(leaderboardCache);

    } catch (err) {
        console.error("❌ Error:", err.response?.data || err.message);
    }
}

updateLeaderboard();
setInterval(updateLeaderboard, 5 * 60 * 1000);

app.get("/", (req, res) => {
    res.send("Welcome to the Leaderboard API! Use /leaderboard/top15");
});

app.get("/leaderboard/top15", (req, res) => {
    res.json(leaderboardCache);
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
