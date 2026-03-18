// Firebase Configuration (നിങ്ങളുടെ പഴയ കോഡ് മാറ്റമില്ലാതെ നിലനിർത്തുക)
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

// Global Variables
let currentQIndex = 0;
let questions = [];
let timer;
let score = 0;
let selectedSem = null; // പുതിയ മാറ്റം: സെലക്ട് ചെയ്ത സെമസ്റ്റർ അറിയാൻ

// --- 1. SIDEBAR & NAVIGATION ---
function openNav() { document.getElementById("mySidebar").style.width = "250px"; }
function closeNav() { document.getElementById("mySidebar").style.width = "0"; }

function showSection(id) {
    const sections = ['home-screen', 'login-screen', 'admin-screen', 'student-screen'];
    sections.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById(id);
    if (target) target.style.display = 'block';
}

// സെമസ്റ്റർ കാർഡ് ക്ലിക്ക് ചെയ്യുമ്പോൾ
function selectSemester(sem) {
    selectedSem = sem;
    document.getElementById('login-title').innerText = `Semester ${sem} Login`;
    showSection('login-screen');
}

// സൈഡ് ബാറിൽ നിന്ന് അഡ്മിൻ ലോഗിൻ ക്ലിക്ക് ചെയ്യുമ്പോൾ
function showAdminLogin() {
    selectedSem = 'admin';
    document.getElementById('login-title').innerText = `Admin Login`;
    showSection('login-screen');
    closeNav();
}

// --- 2. LOGIN FUNCTION ---
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
        
        if (selectedSem === 'admin') {
            if (inputVal === "admin111" || inputVal === "313456") {
                showSection('admin-screen');
                loadAdminQueries();
            } else {
                alert("നിങ്ങൾക്ക് അഡ്മിൻ അനുമതിയില്ല!");
                logout();
            }
        } else {
            // വിദ്യാർത്ഥി ലോഗിൻ
            showSection('student-screen');
            initStudentApp();
        }
        document.getElementById('logout-btn').style.display = 'block';
    } catch (e) { 
        alert("ലോഗിൻ പരാജയപ്പെട്ടു: വിവരങ്ങൾ പരിശോധിക്കുക!"); 
    }
}

// --- 3. STUDENT LOGIC (Semester Based) ---
function initStudentApp() {
    loadContents(); // സെമസ്റ്റർ അനുസരിച്ചുള്ള ക്ലാസുകൾ
    
    // പരീക്ഷാ മോഡ് ഓരോ സെമസ്റ്ററിനും പ്രത്യേകം നൽകണമെങ്കിൽ 'examMode_1' എന്നിങ്ങനെ നൽകാം
    db.collection("settings").doc(`examMode_${selectedSem}`).onSnapshot(doc => {
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
    // തിരഞ്ഞെടുത്ത സെമസ്റ്ററിലെ ക്ലാസുകൾ മാത്രം ഫിൽട്ടർ ചെയ്യുന്നു
    db.collection("contents")
    .where("semester", "==", selectedSem)
    .orderBy("timestamp", "desc")
    .onSnapshot(snap => {
        const display = document.getElementById('content-display');
        if (!display) return;
        if (snap.empty) { display.innerHTML = "<p>ഈ സെമസ്റ്ററിൽ ക്ലാസുകൾ ലഭ്യമല്ല.</p>"; return; }
        
        display.innerHTML = snap.docs.map(doc => {
            const data = doc.data();
            const l = data.links;
            return `<div class="card" style="border-top: 5px solid #004d40; margin-bottom: 20px;">
                <h3 style="margin-bottom:5px;">${data.subject}</h3>
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

// --- 4. ADMIN FUNCTIONS (Semester Data Adding) ---
async function uploadDetailedContent() {
    const sem = prompt("ഏത് സെമസ്റ്ററിലേക്കാണ് ഈ ക്ലാസ്? (1,2,3,4,5)", selectedSem || "1");
    if(!sem) return;

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
            semester: parseInt(sem),
            subject, date, time, instructions: instr,
            links: { video, audio, pdf },
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert(`Semester ${sem}-ലേക്ക് ക്ലാസ് വിജയകരമായി അപ്‌ലോഡ് ചെയ്തു!`);
        document.querySelectorAll('.admin-form input, .admin-form textarea').forEach(i => i.value = "");
    } catch (e) { alert("Error: " + e.message); }
}

// --- 5. EXAM LOGIC (Semester Based) ---
async function startExam() {
    // ആ സെമസ്റ്ററിലെ ചോദ്യങ്ങൾ മാത്രം ലോഡ് ചെയ്യുന്നു
    const snap = await db.collection("questions")
    .where("semester", "==", selectedSem)
    .orderBy("timestamp").get();
    
    questions = snap.docs.map(d => d.data());
    if(questions.length > 0) { 
        currentQIndex = 0; score = 0; showQuestion(); 
    } else {
        alert("ഈ സെമസ്റ്ററിൽ ചോദ്യങ്ങൾ ചേർത്തിട്ടില്ല.");
        location.reload();
    }
}

// പരീക്ഷാ മോഡ് മാറ്റുമ്പോൾ സെമസ്റ്റർ ചോദിക്കുന്നു
function toggleExam(status) {
    const sem = prompt("ഏത് സെമസ്റ്ററിലെ എക്സാം ആണ് തുടങ്ങേണ്ടത്/നിർത്തേണ്ടത്? (1,2,3,4,5)");
    if(!sem) return;
    db.collection("settings").doc(`examMode_${sem}`).set({ active: status })
    .then(() => alert(`Semester ${sem} പരീക്ഷാ മോഡ് മാറ്റി.`));
}

// പരീക്ഷാ ചോദ്യം ചേർക്കുമ്പോൾ സെമസ്റ്റർ കൂടി ചേർക്കുന്നു
async function addQuestionToDB() {
    const sem = prompt("ഈ ചോദ്യം ഏത് സെമസ്റ്ററിലേക്കാണ്? (1,2,3,4,5)");
    if(!sem) return;

    const text = document.getElementById('q-text-input').value;
    const options = [
        document.getElementById('opt0').value, document.getElementById('opt1').value,
        document.getElementById('opt2').value, document.getElementById('opt3').value
    ];
    const correctIdx = parseInt(document.getElementById('correct-idx-input').value);

    await db.collection("questions").add({
        semester: parseInt(sem),
        text, options, correctIndex: correctIdx, timestamp: Date.now()
    });
    alert("ചോദ്യം സേവ് ചെയ്തു!");
}

// ബാക്കി എല്ലാ ഫങ്ക്ഷനുകളും (fetchResults, deleteQuestion, askQuery, etc.) പഴയതുപോലെ തന്നെ തുടരും.
// ലോഗൗട്ട് ചെയ്യുമ്പോൾ
function logout() { auth.signOut(); location.reload(); }

// തുടക്കത്തിൽ ഹോം സ്ക്രീൻ കാണിക്കുന്നു
window.onload = () => { showSection('home-screen'); };

