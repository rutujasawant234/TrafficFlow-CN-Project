
"use strict";

let simulationTimer = null;
let state = {};
let comparisonChart = null;

function getElement(id) {
    return document.getElementById(id);
}

function resetState() {
    state = {
        time: 0,
        generated: 0,
        sent: 0,
        dropped: 0,
        queue: 0,
        tokens: 0
    };
}

function showMessage(message) {
    const results = getElement("results");
    if (results) results.textContent = message;
}

function resetSimulation() {
    setPacketAnimation(false);

    if (simulationTimer !== null) {
        clearInterval(simulationTimer);
        simulationTimer = null;
    }

    resetState();

    const startButton = document.querySelector(
        'button[onclick="startSimulation()"]'
    );

    if (startButton) startButton.disabled = false;

    const status = getElement("simulationStatus");
    if (status) status.textContent = "";

    showMessage("Click Start to begin.");
    ["generatedCount", "sentCount", "droppedCount"].forEach(function (id) {
    const element = getElement(id);
    if (element) element.textContent = "0";
});
}


function startSimulation() {
    resetSimulation();

    const algorithmElement = getElement("algorithm");
    const arrivalElement = getElement("arrival");
    const capacityElement = getElement("capacity");

    if (!algorithmElement || !arrivalElement || !capacityElement) {
        showMessage("Error: Check the input IDs in index.html.");
        return;
    }

    const arrivalRate = Number(arrivalElement.value);
    const capacity = Number(capacityElement.value);
    const algorithm = algorithmElement.value;

    if (
        !Number.isFinite(arrivalRate) ||
        !Number.isFinite(capacity) ||
        arrivalRate < 1 ||
        capacity < 1
    ) {
        showMessage("Enter valid positive values.");
        return;
    }

    if (!Number.isInteger(arrivalRate) || !Number.isInteger(capacity)) {
        showMessage("Please enter whole numbers for both inputs.");
        return;
    }

    const startButton = document.querySelector(
        'button[onclick="startSimulation()"]'
    );

    setPacketAnimation(true);

    state.tokens = algorithm === "token" ? capacity : 0;

    // Save real results at each second for the graph.
    const history = {
        time: [],
        leakySent: [],
        leakyDropped: [],
        tokenSent: [],
        tokenDropped: []
    };

    // Compare Both runs both algorithms independently.
    let leaky = createBucketState("leaky", capacity);
    let token = createBucketState("token", capacity);

    simulationTimer = setInterval(function () {
        state.time++;

        if (algorithm === "both") {
            updateBucket(leaky, arrivalRate, capacity);
            updateBucket(token, arrivalRate, capacity);

            history.time.push(state.time);
            history.leakySent.push(leaky.sent);
            history.leakyDropped.push(leaky.dropped);
            history.tokenSent.push(token.sent);
            history.tokenDropped.push(token.dropped);

            renderComparisonResults(leaky, token, capacity);
            
function renderComparisonResults(leaky, token, capacity) {
    const results = getElement("results");
    if (!results) return;

    // Update the live counters using both algorithms' totals.
    const generatedCount = getElement("generatedCount");
    const sentCount = getElement("sentCount");
    const droppedCount = getElement("droppedCount");

    if (generatedCount) {
        generatedCount.textContent =
            leaky.generated + " / " + token.generated;
    }

    if (sentCount) {
        sentCount.textContent =
            leaky.sent + " / " + token.sent;
    }

    if (droppedCount) {
        droppedCount.textContent =
            leaky.dropped + " / " + token.dropped;
    }

    results.innerHTML = `
        <h4>Leaky Bucket</h4>
        <p>Generated: ${leaky.generated}</p>
        <p>Transmitted: ${leaky.sent}</p>
        <p>Dropped: ${leaky.dropped}</p>
        <p>Queue: ${leaky.queue} / ${capacity}</p>

        <h4>Token Bucket</h4>
        <p>Generated: ${token.generated}</p>
        <p>Transmitted: ${token.sent}</p>
        <p>Dropped: ${token.dropped}</p>
        <p>Queue: ${token.queue} / ${capacity}</p>

        <p><strong>Time:</strong> ${leaky.time} seconds</p>
    `;
}

        } else {
            updateBucket(state, arrivalRate, capacity, algorithm);

            history.time.push(state.time);

            if (algorithm === "leaky") {
                history.leakySent.push(state.sent);
                history.leakyDropped.push(state.dropped);
            } else {
                history.tokenSent.push(state.sent);
                history.tokenDropped.push(state.dropped);
            }

            renderResults(algorithm, capacity);
        }

        drawComparisonChart(history, algorithm);

        

if (state.time >= 20) {
    clearInterval(simulationTimer);
    simulationTimer = null;

    setPacketAnimation(false);

    if (startButton) startButton.disabled = false;

    const status = getElement("simulationStatus");
    if (status) status.textContent = "Simulation completed!";

    if (algorithm === "both") {
        showComparisonWinner(leaky, token);
    } else {
        showMessage(
            "Simulation completed! Check the final results above."
        );
    }
}


    }, 1000);
}

function createBucketState(algorithm, capacity) {
    return {
        time: 0,
        generated: 0,
        sent: 0,
        dropped: 0,
        queue: 0,
        tokens: algorithm === "token" ? capacity : 0,
        algorithm: algorithm
    };
}

function updateBucket(bucket, arrivalRate, capacity, algorithm) {
    bucket.time++;
    bucket.generated += arrivalRate;

    const freeSpace = Math.max(0, capacity - bucket.queue);
    const accepted = Math.min(arrivalRate, freeSpace);

    bucket.queue += accepted;
    bucket.dropped += arrivalRate - accepted;

    if (algorithm === "leaky" || bucket.algorithm === "leaky") {
        const transmitted = Math.min(bucket.queue, 2);
        bucket.queue -= transmitted;
        bucket.sent += transmitted;
    } else {
        bucket.tokens = Math.min(capacity, bucket.tokens + 3);

        const transmitted = Math.min(bucket.queue, bucket.tokens);
        bucket.queue -= transmitted;
        bucket.tokens -= transmitted;
        bucket.sent += transmitted;
    }
}

function renderResults(algorithm, capacity) {
    const results = getElement("results");
    if (!results) return;

    const throughput = state.time > 0 ? state.sent / state.time : 0;

    results.innerHTML = `
        <p><strong>Algorithm:</strong> ${algorithm === "leaky" ? "Leaky Bucket" : "Token Bucket"}</p>
        <p><strong>Time:</strong> ${state.time} seconds</p>
        <p><strong>Packets Generated:</strong> ${state.generated}</p>
        <p><strong>Packets Transmitted:</strong> ${state.sent}</p>
        <p><strong>Packets Dropped:</strong> ${state.dropped}</p>
        <p><strong>Current Queue:</strong> ${state.queue} / ${capacity}</p>
        <p><strong>Throughput:</strong> ${throughput.toFixed(2)} packets/second</p>
        ${algorithm === "token" ? `<p><strong>Available Tokens:</strong> ${state.tokens}</p>` : ""}
        <p><strong>Status:</strong> ${state.time >= 20 ? "Completed" : "Running"}</p>
    `;
    
    const generatedCount = getElement("generatedCount");
    const sentCount = getElement("sentCount");
    const droppedCount = getElement("droppedCount");

    if (generatedCount) {
        generatedCount.textContent = state.generated;
    }

    if (sentCount) {
        sentCount.textContent = state.sent;
    }

    if (droppedCount) {
        droppedCount.textContent = state.dropped;
    }

}

function renderComparisonResults(leaky, token, capacity) {
    const results = getElement("results");
    if (!results) return;

    results.innerHTML = `
        <h4>Leaky Bucket</h4>
        <p>Generated: ${leaky.generated} |
        Transmitted: ${leaky.sent} |
        Dropped: ${leaky.dropped} |
        Queue: ${leaky.queue}/${capacity}</p>

        <h4>Token Bucket</h4>
        <p>Generated: ${token.generated} |
        Transmitted: ${token.sent} |
        Dropped: ${token.dropped} |
        Queue: ${token.queue}/${capacity}</p>

        <p><strong>Time:</strong> ${leaky.time} seconds</p>
    `;
}

function drawComparisonChart(history, algorithm) {
    const canvas = getElement("comparisonChart");
    if (!canvas) return;

    // This version uses the canvas directly; no chart library is needed.
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#222222";
    ctx.font = "bold 16px Arial";
    ctx.fillText("Actual Packet Traffic Results", 15, 25);

    const isBoth = algorithm === "both";
    const maxValue = Math.max(
        1,
        ...history.leakySent,
        ...history.leakyDropped,
        ...history.tokenSent,
        ...history.tokenDropped
    );

    const left = 45;
    const right = 15;
    const top = 45;
    const bottom = 40;
    const graphWidth = width - left - right;
    const graphHeight = height - top - bottom;

    // Axes.
    ctx.strokeStyle = "#555555";
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, top + graphHeight);
    ctx.lineTo(left + graphWidth, top + graphHeight);
    ctx.stroke();

    ctx.font = "11px Arial";
    ctx.fillStyle = "#222222";
    ctx.fillText("Packets", 5, top + 5);
    ctx.fillText("Time (seconds)", width - 105, height - 8);

    // Plot cumulative packet totals across time.
    const datasets = isBoth
        ? [
            { values: history.leakySent, color: "#2878d0", label: "Leaky sent" },
            { values: history.leakyDropped, color: "#e65c5c", label: "Leaky dropped" },
            { values: history.tokenSent, color: "#279b67", label: "Token sent" },
            { values: history.tokenDropped, color: "#e6a23c", label: "Token dropped" }
        ]
        : [
            {
                values: algorithm === "leaky" ? history.leakySent : history.tokenSent,
                color: "#2878d0",
                label: "Transmitted"
            },
            {
                values: algorithm === "leaky" ? history.leakyDropped : history.tokenDropped,
                color: "#e65c5c",
                label: "Dropped"
            }
        ];

    datasets.forEach(function (dataset) {
        if (!dataset.values.length) return;

        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        dataset.values.forEach(function (value, index) {
            const x = left + (index / Math.max(1, 19)) * graphWidth;
            const y = top + graphHeight - (value / maxValue) * graphHeight;

            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.stroke();
    });

    // Legend.
    let legendX = left;
    let legendY = height - 20;

    datasets.forEach(function (dataset) {
        ctx.fillStyle = dataset.color;
        ctx.fillRect(legendX, legendY - 9, 10, 10);

        ctx.fillStyle = "#222222";
        ctx.font = "10px Arial";
        ctx.fillText(dataset.label, legendX + 14, legendY);

        legendX += isBoth ? 130 : 120;
    });
}

resetState();
console.log("TrafficFlow JavaScript loaded successfully.");

function setPacketAnimation(isRunning) {
    const packets = document.querySelectorAll(".packet");

    packets.forEach(function (packet) {
        packet.style.animationPlayState = isRunning
            ? "running"
            : "paused";
    });
}

// Keep animation stopped when the page first opens.
document.addEventListener("DOMContentLoaded", function () {
    setPacketAnimation(false);
});


function showComparisonWinner(leaky, token) {
    const results = getElement("results");
    if (!results) return;

    let winner;

    if (leaky.sent > token.sent) {
        winner = "Leaky Bucket transmitted more packets.";
    } else if (token.sent > leaky.sent) {
        winner = "Token Bucket transmitted more packets.";
    } else {
        winner = "Both algorithms transmitted the same number of packets.";
    }

    let dropSummary;

    if (leaky.dropped < token.dropped) {
        dropSummary = "Leaky Bucket dropped fewer packets.";
    } else if (token.dropped < leaky.dropped) {
        dropSummary = "Token Bucket dropped fewer packets.";
    } else {
        dropSummary = "Both algorithms dropped the same number of packets.";
    }

    results.innerHTML += `
        <hr>
        <h3>Final Comparison</h3>
        <p><strong>Transmission:</strong> ${winner}</p>
        <p><strong>Packet Loss:</strong> ${dropSummary}</p>
    `;
}
