// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC_3sUPqvJufOVAtQtefW0eZnIfVUhj-KE",
    authDomain: "sjm-chettippadi.firebaseapp.com",
    projectId: "sjm-chettippadi",
    storageBucket: "sjm-chettippadi.firebasestorage.app",
    messagingSenderId: "950539718846",
    appId: "1:950539718846:web:5aa95755e1fa3a47100eef"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentQIndex = 0;
let questions = [];
let timer;
let score = 0;

// 1. LOGIN FUNCTION
async function login() {
    const inputVal = document.getElementById('email').value;
    const pass = document.getElementById('password').value;

    if (!inputVal || !pass) {
        alert("യൂസർനെയിമും പാസ്‌വേർഡും നൽകുക");
        return;
    }

    const email = inputVal.includes("@") ? inputVal : inputVal + "@alrashida.com";

    try {
        await auth.signInWithEmailAndPassword(email, pass);
        
        // അഡ്മിൻ ചെക്കിംഗ് (admin111 അല്ലെങ്കിൽ 313456)
        if (inputVal === "admin111" || inputVal === "313456") {
            showSection('admin-screen');
        } else {
            showSection('student-screen');
            initStudentApp();
        }
        document.getElementById('logout-btn').style.display = 'block';
    } catch (e) { 
        alert("ലോഗിൻ പരാജയപ്പെട്ടു: വിവരങ്ങൾ പരിശോധിക്കുക!"); 
    }
}

function showSection(id) {
    const sections = ['login-screen', 'admin-screen', 'student-screen'];
    sections.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById(id);
    if (target) target.style.display = 'block';
}

// 2. ADMIN: ചോദ്യങ്ങൾ ചേർക്കുക
async function addQuestionToDB() {
    const text = document.getElementById('q-text-input').value;
    const options = [
        document.getElementById('opt0').value,
        document.getElementById('opt1').value,
        document.getElementById('opt2').value,
        document.getElementById('opt3').value
    ];
    const correctIdx = parseInt(document.getElementById('correct-idx-input').value);

    if(!text || options.includes("")) { 
        alert("എല്ലാ കോളങ്ങളും പൂരിപ്പിക്കുക!"); 
        return; 
    }

    try {
        await db.collection("questions").add({
            text, options, correctIndex: correctIdx, timestamp: Date.now()
        });
        alert("ചോദ്യം ഡਾറ്റാബേസിൽ സേവ് ചെയ്തു!");
        document.getElementById('q-text-input').value = "";
        options.forEach((_, i) => document.getElementById('opt'+i).value = "");
    } catch (e) { alert("Error: ചോദ്യം ചേർക്കാൻ കഴിഞ്ഞില്ല."); }
}

// 3. ADMIN: ക്ലാസുകൾ/ലിങ്കുകൾ അപ്‌ലോഡ് ചെയ്യുക
async function uploadContent() {
    const title = document.getElementById('content-title').value;
    const url = document.getElementById('content-url').value;
    const type = document.getElementById('content-type').value;

    if (!title || !url) {
        alert("ദയവായി ടൈറ്റിലും ലിങ്കും നൽകുക!");
        return;
    }

    try {
        await db.collection("contents").add({
            title: title,
            url: url,
            type: type,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("വിജയകരമായി അപ്‌ലോഡ് ചെയ്തു!");
        document.getElementById('content-title').value = "";
        document.getElementById('content-url').value = "";
    } catch (e) {
        alert("Error: " + e.message);
    }
}

// 4. ADMIN: പരീക്ഷാ നിയന്ത്രണം
function toggleExam(status) {
    db.collection("settings").doc("examMode").set({ active: status })
    .then(() => alert("പരീക്ഷാ മോഡ്: " + (status ? "തുടങ്ങി" : "അവസാനിപ്പിച്ചു")));
}

function publishResult(status) {
    db.collection("settings").doc("resultSettings").set({ published: status })
    .then(() => alert(status ? "റിസൾട്ട് പബ്ലിഷ് ചെയ്തു." : "റിസൾട്ട് ഹൈഡ് ചെയ്തു."));
}

async function fetchResults() {
    const body = document.getElementById('results-body');
    if(!body) return;
    body.innerHTML = "Loading...";
    const snap = await db.collection("results").orderBy("timestamp", "desc").get();
    body.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        const time = d.timestamp ? new Date(d.timestamp.seconds*1000).toLocaleDateString() : '-';
        return `<tr><td>${d.email}</td><td>${d.score}</td><td>${time}</td></tr>`;
    }).join('');
}

// 5. STUDENT: ആപ്പ് ഇനീഷ്യലൈസേഷൻ
function initStudentApp() {
    loadContents(); // ക്ലാസുകൾ ലോഡ് ചെയ്യുന്നു
    
    db.collection("settings").doc("examMode").onSnapshot(doc => {
        const data = doc.data();
        if (data && data.active === true) {
            document.getElementById('class-list').style.display = 'none';
            document.getElementById('exam-box').style.display = 'block';
            startExam(); 
        } else {
            document.getElementById('class-list').style.display = 'block';
            document.getElementById('exam-box').style.display = 'none';
            questions = [];
            checkResultPublished();
        }
    });
}

// ഡ്രൈവ് ഫോൾഡറിന് പുറമെ അഡ്മിൻ നൽകുന്ന ലിങ്കുകൾ കാണിക്കാൻ
function loadContents() {
    db.collection("contents").orderBy("timestamp", "desc").onSnapshot(snap => {
        const display = document.getElementById('content-display');
        if (!display) return;
        if (snap.empty) {
            display.innerHTML = "മറ്റ് ക്ലാസുകൾ ലഭ്യമല്ല.";
            return;
        }
        display.innerHTML = snap.docs.map(doc => {
            const data = doc.data();
            let icon = data.type === 'video' ? '📺' : (data.type === 'audio' ? '🎵' : '📄');
            return `
                <div class="card" style="margin-bottom:10px; border-left: 5px solid #00796b; padding: 15px;">
                    <h4 style="margin:0 0 10px 0;">${icon} ${data.title}</h4>
                    <a href="${data.url}" target="_blank" class="primary-btn" style="text-decoration:none; display:inline-block; width:auto; padding:8px 20px; font-size: 0.9rem;">Open Link</a>
                </div>`;
        }).join('');
    });
}

// 6. STUDENT: എക്സാം ലോജിക്
async function startExam() {
    const snap = await db.collection("questions").orderBy("timestamp").get();
    questions = snap.docs.map(d => d.data());
    if(questions.length > 0) {
        currentQIndex = 0;
        score = 0;
        showQuestion();
    }
}

function showQuestion() {
    if (currentQIndex >= questions.length) { finishExam(); return; }
    const q = questions[currentQIndex];
    document.getElementById('q-progress').innerText = `ചോദ്യം: ${currentQIndex + 1}/${questions.length}`;
    document.getElementById('question-text').innerText = q.text;
    const container = document.getElementById('options-list');
    container.innerHTML = '';
    
    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => { 
            if(idx === q.correctIndex) score++; 
            nextQuestion(); 
        };
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
    alert("പരീക്ഷ അവസാനിച്ചു. ഉത്തരങ്ങൾ സേവ് ചെയ്തു.");
    location.reload();
}

function checkResultPublished() {
    db.collection("settings").doc("resultSettings").onSnapshot(async doc => {
        const data = doc.data();
        const resultCard = document.getElementById('student-result-card');
        if (data && data.published) {
            const res = await db.collection("results").doc(auth.currentUser.uid).get();
            if (res.exists) {
                resultCard.style.display = 'block';
                document.getElementById('user-score').innerText = `${res.data().score} / ${questions.length || 100}`;
            }
        } else {
            if (resultCard) resultCard.style.display = 'none';
        }
    });
}

function logout() { auth.signOut(); location.reload(); }
