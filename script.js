// ================= GLOBAL =================

let timerInterval = null;
let timeLeft = 0;
let isRunning = false;

// ================= CREATE SUBJECT FIELDS =================

function createSubjectFields() {

    let count = parseInt(document.getElementById("subjectCount").value);
    let container = document.getElementById("subjectFields");
    container.innerHTML = "";

    if (!count || count < 1) return;

    for (let i = 0; i < count; i++) {
        container.innerHTML += `
            <div class="form-group">
                <label>Subject ${i + 1} Name</label>
                <input type="text" class="subjectName">

                <label>Exam Date</label>
                <input type="date" class="subjectDate">
            </div>
        `;
    }
}

// ================= GENERATE PLAN =================

function generatePlan() {

    let names = document.querySelectorAll(".subjectName");
    let dates = document.querySelectorAll(".subjectDate");
    let weakInput = document.getElementById("weak").value;
    let hours = parseInt(document.getElementById("hours").value);

    if (names.length === 0 || !hours) {
        alert("Fill all fields properly.");
        return;
    }

    let weakSubjects = weakInput.split(",").map(s => s.trim().toLowerCase());
    let today = new Date();
    let subjects = [];

    for (let i = 0; i < names.length; i++) {

        let name = names[i].value.trim();
        let examDateValue = dates[i].value;

        if (!name || !examDateValue) continue;

        let examDate = new Date(examDateValue);
        let daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

        if (daysLeft <= 0) continue;

        subjects.push({
            name,
            examDate,
            daysLeft,
            isWeak: weakSubjects.includes(name.toLowerCase())
        });
    }

    if (subjects.length === 0) {
        alert("Invalid subject data.");
        return;
    }

    subjects.sort((a, b) => a.examDate - b.examDate);

    let maxDays = Math.max(...subjects.map(s => s.daysLeft));
    let plan = [];

    subjects.forEach(s => {
        s.weight = (1 / s.daysLeft) * 100 + (s.isWeak ? 20 : 0);
        s.assigned = 0;
    });

    let totalWeight = subjects.reduce((sum, s) => sum + s.weight, 0);

    subjects.forEach(s => {
        s.targetDays = Math.round((s.weight / totalWeight) * maxDays);
    });

    for (let d = 0; d < maxDays; d++) {

        let available = subjects.filter(s => d < s.daysLeft);
        if (available.length === 0) continue;

        available.sort((a, b) =>
            (b.targetDays - b.assigned) - (a.targetDays - a.assigned)
        );

        let chosen = available[0];
        chosen.assigned++;

        plan.push({
            date: new Date(today.getTime() + d * 86400000),
            subject: chosen.name,
            hours: chosen.isWeak ? hours + 1 : hours
        });
    }

    renderPlan(plan);
    updateStats(subjects, plan);
}

// ================= RENDER PLAN =================

function renderPlan(plan) {

    let output = document.getElementById("output");
    output.innerHTML = "";

    plan.forEach(day => {
        output.innerHTML += `
            <div class="day-item">
                <input type="checkbox" class="dayCheck" onchange="updateCompletion()">
                ${day.date.toDateString()} → ${day.subject} (${day.hours} hrs)
            </div>
        `;
    });

    localStorage.setItem("savedPlan", output.innerHTML);
}

// ================= UPDATE STATS =================

function updateStats(subjects, plan) {

    document.getElementById("daysStat").innerText = plan.length;
    document.getElementById("subjectStat").innerText = subjects.length;
    document.getElementById("weakStat").innerText =
        subjects.filter(s => s.isWeak).length;

    let focusScore = Math.min(100, Math.round((plan.length / 30) * 100));
    document.getElementById("focusStat").innerText = focusScore + "%";

    let confidence = Math.max(50, 100 - subjects.length * 5);
    document.getElementById("confidenceStat").innerText = confidence + "%";

    let readiness = Math.round((focusScore * 0.6) + (confidence * 0.4));
    document.getElementById("readinessStat").innerText = readiness + "%";

    document.getElementById("burnoutStatus").innerText =
        "Balanced distribution with priority to earlier exams.";

    updateChart(focusScore);
}

// ================= PROGRESS + RETENTION =================

function updateCompletion() {

    let boxes = document.querySelectorAll(".dayCheck");
    let checked = 0;
    let states = [];

    boxes.forEach(b => {
        if (b.checked) checked++;
        states.push(b.checked);
    });

    let percent = Math.round((checked / boxes.length) * 100);

    localStorage.setItem("checkboxStates", JSON.stringify(states));
    localStorage.setItem("completionPercent", percent);

    let bar = document.getElementById("progressBar");
    bar.style.width = percent + "%";

    if (percent === 100) {
        bar.style.background = "#00ff88";
        bar.style.boxShadow = "0 0 20px #00ff88";
        setTimeout(() => bar.style.boxShadow = "", 600);
    }
    else if (percent >= 75) {
        bar.style.background = "#5b6cff";
    }
    else if (percent >= 50) {
        bar.style.background = "#ffc107";
    }
    else {
        bar.style.background = "#ff4d4d";
    }

    updateChart(percent);
}

// ================= CHART =================

function updateChart(value) {

    let canvas = document.getElementById("performanceChart");
    let ctx = canvas.getContext("2d");

    let history = JSON.parse(localStorage.getItem("history")) || [];
    history.push(value);
    if (history.length > 20) history.shift();

    localStorage.setItem("history", JSON.stringify(history));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.strokeStyle = "#5b6cff";
    ctx.lineWidth = 2;

    history.forEach((v, i) => {
        let x = (i / (history.length - 1 || 1)) * canvas.width;
        let y = canvas.height - (v / 100) * canvas.height;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.stroke();
}

// ================= RESTORE ON LOAD =================

window.onload = function () {

    let savedPlan = localStorage.getItem("savedPlan");
    let savedStates = JSON.parse(localStorage.getItem("checkboxStates")) || [];
    let savedPercent = localStorage.getItem("completionPercent");

    if (savedPlan) {

        document.getElementById("output").innerHTML = savedPlan;

        let boxes = document.querySelectorAll(".dayCheck");

        boxes.forEach((box, i) => {
            if (savedStates[i]) box.checked = true;
        });

        if (savedPercent) {
            let bar = document.getElementById("progressBar");
            bar.style.width = savedPercent + "%";
        }
    }
};

// ================= ADVANCED TIMER SYSTEM =================


let isStudyMode = true;

function startTimer() {

    if (isRunning) return;

    if (timeLeft === 0) {
        loadSessionTime();
    }

    isRunning = true;

    timerInterval = setInterval(() => {

        if (timeLeft > 0) {
            timeLeft--;
            updateDisplay();
        } else {
            switchMode();
        }

    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    isStudyMode = true;
    loadSessionTime();
    updateDisplay();
}

function loadSessionTime() {

    if (isStudyMode) {
        timeLeft = parseInt(document.getElementById("studyMinutes").value) * 60;
        document.getElementById("sessionLabel").innerText = "Study Mode";
    } else {
        timeLeft = parseInt(document.getElementById("breakMinutes").value) * 60;
        document.getElementById("sessionLabel").innerText = "Break Mode";
    }
}

function switchMode() {

    isStudyMode = !isStudyMode;
    loadSessionTime();
    updateDisplay();
}

function updateDisplay() {

    let m = Math.floor(timeLeft / 60);
    let s = timeLeft % 60;

    document.getElementById("timerDisplay").innerText =
        `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function toggleTheme() {
    document.body.classList.toggle("light");
}

function resetPlan() {
    localStorage.clear();
    location.reload();
}