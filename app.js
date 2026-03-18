// ഫയർബേസ് കോൺഫിഗറേഷൻ (നിങ്ങളുടെ സ്വന്തം കീ ഇവിടെ നൽകുക)
const firebaseConfig = {
    apiKey: "AIzaSyC_3sUPqvJufOVAtQtefW0eZnIfVUhj-KE",
    authDomain: "sjm-chettippadi.firebaseapp.com",
    projectId: "sjm-chettippadi",
    storageBucket: "sjm-chettippadi.firebasestorage.app",
    messagingSenderId: "950539718846",
    appId: "1:950539718846:web:5aa95755e1fa3a47100eef"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentQIndex = 0;
let questions = [];
let timer;
let score = 0;

// LOGIN
async function login() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
        const userCred = await auth.signInWithEmailAndPassword(email, pass);
        if (email === "admin@alrashida.com") {
            showSection('admin-panel');
        } else {
            showSection('student-section');
            initStudentApp();
        }
        document.getElementById('logout-btn').style.display = 'block';
    } catch (e) { alert("Error: " + e.message); }
}

function showSection(id) {
    ['login-section', 'admin-panel', 'student-section'].forEach(s => document.getElementById(s).style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

// ADMIN FUNCTIONS
function setExamMode(status) {
    db.collection("settings").doc("examMode").set({ active: status });
}

function publishResult(status) {
    db.collection("settings").doc("resultSettings").set({ published: status });
}

// STUDENT FUNCTIONS
function initStudentApp() {
    // പരീക്ഷ തുടങ്ങുന്നോ എന്ന് ശ്രദ്ധിക്കുക
    db.collection("settings").doc("examMode").onSnapshot(doc => {
        if (doc.data().active) {
            document.getElementById('class-area').style.display = 'none';
            document.getElementById('exam-area').style.display = 'block';
            startExam();
        } else {
            document.getElementById('class-area').style.display = 'block';
            document.getElementById('exam-area').style.display = 'none';
            checkResultPublished();
        }
    });
}

async function startExam() {
    const snap = await db.collection("questions").limit(100).get();
    questions = snap.docs.map(d => d.data());
    showQuestion();
}

function showQuestion() {
    if (currentQIndex >= questions.length) { finishExam(); return; }
    const q = questions[currentQIndex];
    document.getElementById('q-count').innerText = `ചോദ്യം: ${currentQIndex + 1}/100`;
    document.getElementById('question-text').innerText = q.text;
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => { if(idx === q.correctIndex) score++; nextQuestion(); };
        container.appendChild(btn);
    });
    startTimer();
}

function startTimer() {
    clearInterval(timer);
    let time = 30;
    timer = setInterval(() => {
        time--;
        document.getElementById('timer').innerText = `00:${time < 10 ? '0'+time : time}`;
        if (time <= 0) nextQuestion();
    }, 1000);
}

function nextQuestion() { currentQIndex++; showQuestion(); }

async function finishExam() {
    clearInterval(timer);
    const user = auth.currentUser;
    await db.collection("results").doc(user.uid).set({
        email: user.email,
        score: score,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("പരീക്ഷ പൂർത്തിയായി. റിസൾട്ട് പിന്നീട് അറിയിക്കുന്നതാണ്.");
    location.reload();
}

function checkResultPublished() {
    db.collection("settings").doc("resultSettings").onSnapshot(async doc => {
        if (doc.data() && doc.data().published) {
            const res = await db.collection("results").doc(auth.currentUser.uid).get();
            if (res.exists) {
                document.getElementById('student-result-card').style.display = 'block';
                document.getElementById('user-score').innerText = `${res.data().score} / 100`;
            }
        }
    });
}

function logout() { auth.signOut(); location.reload(); }
