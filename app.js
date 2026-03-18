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
        if (inputVal === "admin111" || inputVal === "313456") {
            showSection('admin-screen');
            loadAdminQueries(); // അഡ്മിൻ ലോഡ് ചെയ്യുമ്പോൾ സംശയങ്ങൾ ലോഡ് ചെയ്യുന്നു
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

// 2. ADMIN: ചോദ്യങ്ങൾ മാനേജ് ചെയ്യാൻ
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
        alert("ചോദ്യം സേവ് ചെയ്തു!");
        document.getElementById('q-text-input').value = "";
        options.forEach((_, i) => document.getElementById('opt'+i).value = "");
    } catch (e) { alert("Error: ചോദ്യം ചേർക്കാൻ കഴിഞ്ഞില്ല."); }
}

async function loadAdminQuestions() {
    const listDiv = document.getElementById('admin-questions-list');
    listDiv.innerHTML = "Loading Questions...";
    const snap = await db.collection("questions").orderBy("timestamp", "asc").get();
    if (snap.empty) { listDiv.innerHTML = "ചോദ്യങ്ങൾ ഒന്നും ലഭ്യമല്ല."; return; }

    listDiv.innerHTML = snap.docs.map(doc => {
        const q = doc.data();
        return `<div class="card" style="margin-bottom:10px; border-left: 5px solid #ffd700; padding:10px;">
            <p><strong>Q: ${q.text}</strong></p>
            <div style="display:flex; gap:10px;">
                <button onclick="deleteQuestion('${doc.id}')" class="btn-off" style="padding:5px 10px;">Delete</button>
                <button onclick="editQuestionPrompt('${doc.id}', \`${q.text}\`)" class="primary-btn" style="padding:5px 10px; width:auto;">Edit</button>
            </div>
        </div>`;
    }).join('');
}

async function deleteQuestion(id) {
    if(confirm("ഈ ചോദ്യം ഡിലീറ്റ് ചെയ്യട്ടെ?")) {
        await db.collection("questions").doc(id).delete();
        loadAdminQuestions();
    }
}

async function editQuestionPrompt(id, oldText) {
    const newText = prompt("പുതിയ ചോദ്യം ടൈപ്പ് ചെയ്യുക:", oldText);
    if (newText && newText !== oldText) {
        await db.collection("questions").doc(id).update({ text: newText });
        loadAdminQuestions();
    }
}

async function deleteAllQuestions() {
    if(confirm("മൊത്തം ചോദ്യങ്ങളും ഡിലീറ്റ് ചെയ്യട്ടെ?")) {
        const snap = await db.collection("questions").get();
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        alert("എല്ലാ ചോദ്യങ്ങളും നീക്കം ചെയ്തു.");
    }
}

// 3. ADMIN: ക്ലാസുകൾ അപ്‌ലോഡ് ചെയ്യാൻ
async function uploadDetailedContent() {
    const subject = document.getElementById('content-subject').value;
    const date = document.getElementById('content-date').value;
    const time = document.getElementById('content-time').value;
    const instr = document.getElementById('content-instructions').value;
    const video = document.getElementById('link-video').value;
    const audio = document.getElementById('link-audio').value;
    const pdf = document.getElementById('link-pdf').value;

    if (!subject || !date) { alert("വിഷയവും തീയതിയും നിർബന്ധമാണ്!"); return; }

    try {
        await db.collection("contents").add({
            subject, date, time, instructions: instr,
            links: { video, audio, pdf },
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("ക്ലാസ് വിജയകരമായി അപ്‌ലോഡ് ചെയ്തു!");
        document.querySelectorAll('.admin-form input, .admin-form textarea').forEach(i => i.value = "");
    } catch (e) { alert("Error: " + e.message); }
}

// 4. ADMIN: റിസൾട്ട് മാനേജ്‌മെന്റ്
async function fetchResults() {
    const body = document.getElementById('results-body');
    if(!body) return;
    body.innerHTML = "Loading...";
    const snap = await db.collection("results").orderBy("timestamp", "desc").get();
    body.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        return `<tr>
            <td>${d.email}</td>
            <td>${d.score}</td>
            <td><button onclick="viewUserDetail('${doc.id}')" class="primary-btn" style="padding:5px; font-size:12px;">Details</button></td>
        </tr>`;
    }).join('');
}

async function viewUserDetail(id) {
    const doc = await db.collection("results").doc(id).get();
    const data = doc.data();
    let report = `വിദ്യാർത്ഥി: ${data.email}\n\n`;
    if(data.details) {
        data.details.forEach((item, i) => {
            report += `${i+1}. ${item.question}\n Ans: ${item.selected} ${item.isCorrect ? '✅' : '❌'}\n`;
        });
    } else { report += "വിശദാംശങ്ങൾ ലഭ്യമല്ല."; }
    alert(report);
}

async function clearAllResults() {
    if(confirm("എല്ലാ റിസൾട്ടുകളും ഡിലീറ്റ് ചെയ്യട്ടെ?")) {
        const snap = await db.collection("results").get();
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        fetchResults();
    }
}

// 5. STUDENT & ADMIN: സംശയങ്ങൾ (Queries)
async function askQuery(contentId, subject) {
    const text = prompt(`${subject} - എന്ന വിഷയത്തിലെ സംശയം ടൈപ്പ് ചെയ്യുക:`);
    if(!text) return;
    await db.collection("queries").add({
        contentId, studentEmail: auth.currentUser.email,
        question: text, reply: "", timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("സംശയം അയച്ചു.");
}

function loadAdminQueries() {
    const list = document.getElementById('admin-queries-list');
    if(!list) return;
    db.collection("queries").orderBy("timestamp", "desc").onSnapshot(snap => {
        list.innerHTML = snap.docs.map(doc => {
            const q = doc.data();
            return `<div class="card" style="font-size:0.9rem;">
                <p><strong>From:</strong> ${q.studentEmail}</p>
                <p><strong>Q:</strong> ${q.question}</p>
                <p><strong>Reply:</strong> ${q.reply || 'Pending'}</p>
                <input type="text" id="rep-${doc.id}" placeholder="മറുപടി നൽകുക">
                <button onclick="sendReply('${doc.id}')" class="primary-btn" style="padding:5px; margin-top:5px; width:auto;">Reply</button>
            </div>`;
        }).join('');
    });
}

async function sendReply(id) {
    const replyText = document.getElementById(`rep-${id}`).value;
    if(!replyText) return;
    await db.collection("queries").doc(id).update({ reply: replyText });
    alert("മറുപടി അയച്ചു!");
}

// 6. STUDENT: ആപ്പ് ലോജിക്
function initStudentApp() {
    loadContents();
    db.collection("settings").doc("examMode").onSnapshot(doc => {
        const data = doc.data();
        if (data && data.active === true) {
            document.getElementById('class-list').style.display = 'none';
            document.getElementById('exam-box').style.display = 'block';
            startExam(); 
        } else {
            document.getElementById('class-list').style.display = 'block';
            document.getElementById('exam-box').style.display = 'none';
            checkResultPublished();
        }
    });
}

function loadContents() {
    db.collection("contents").orderBy("date", "desc").onSnapshot(snap => {
        const display = document.getElementById('content-display');
        if (!display) return;
        display.innerHTML = snap.docs.map(doc => {
            const data = doc.data();
            const l = data.links;
            return `<div class="card" style="border-top: 5px solid #004d40; margin-bottom: 20px;">
                <h3>${data.subject}</h3>
                <p style="font-size:0.8rem; color:gray;">${data.date} | ${data.time || ''}</p>
                <p><i>${data.instructions || ''}</i></p>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top:10px;">
                    ${l.video ? `<a href="${l.video}" target="_blank" class="part-btn" style="background:#d32f2f;">Video</a>` : ''}
                    ${l.audio ? `<a href="${l.audio}" target="_blank" class="part-btn" style="background:#0288d1;">Audio</a>` : ''}
                    ${l.pdf ? `<a href="${l.pdf}" target="_blank" class="part-btn" style="background:#e64a19;">PDF</a>` : ''}
                </div>
                <button onclick="askQuery('${doc.id}', '${data.subject}')" class="primary-btn" style="margin-top:15px; background:#607d8b;">സംശയങ്ങൾ ചോദിക്കാൻ</button>
            </div>`;
        }).join('');
    });
}

// 7. EXAM LOGIC
async function startExam() {
    const snap = await db.collection("questions").orderBy("timestamp").get();
    questions = snap.docs.map(d => d.data());
    if(questions.length > 0) { currentQIndex = 0; score = 0; showQuestion(); }
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
            q.userSelectedOption = opt; // മറുപടി സേവ് ചെയ്യുന്നു
            if(idx === q.correctIndex) score++; 
            currentQIndex++; showQuestion(); 
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
        if (time <= 0) { currentQIndex++; showQuestion(); }
    }, 1000);
}

async function finishExam() {
    clearInterval(timer);
    const user = auth.currentUser;
    const userAnswers = questions.map(q => ({
        question: q.text, selected: q.userSelectedOption || "No Answer",
        correct: q.options[q.correctIndex], isCorrect: q.userSelectedOption === q.options[q.correctIndex]
    }));

    await db.collection("results").doc(user.uid).set({
        email: user.email, score: score, details: userAnswers,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("പരീക്ഷ അവസാനിച്ചു.");
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
        }
    });
}

function toggleExam(status) {
    db.collection("settings").doc("examMode").set({ active: status })
    .then(() => alert("പരീക്ഷാ മോഡ് മാറ്റി."));
}

function publishResult(status) {
    db.collection("settings").doc("resultSettings").set({ published: status })
    .then(() => alert("റിസൾട്ട് പബ്ലിഷ് സെറ്റിംഗ്സ് മാറ്റി."));
}

function logout() { auth.signOut(); location.reload(); }
