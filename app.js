// --- 1. FIREBASE CONFIGURATION ---
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
let score = 0;
let selectedSem = null;

// --- 2. SIDEBAR & NAVIGATION ---
function openNav() { 
    document.getElementById("mySidebar").style.width = "280px"; 
    if (window.innerWidth > 480) {
        document.body.style.marginLeft = "280px";
    }
}

function closeNav() { 
    document.getElementById("mySidebar").style.width = "0"; 
    document.body.style.marginLeft = "0"; 
}

function showSection(id) {
    const sections = ['home-screen', 'login-screen', 'admin-screen', 'student-screen', 'important-msg', 'app-info'];
    sections.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById(id);
    if (target) target.style.display = 'block';
}

function selectSemester(sem) {
    selectedSem = sem;
    document.getElementById('login-title').innerText = `Semester ${sem} Login`;
    const studentInputs = document.getElementById('student-inputs');
    if (studentInputs) studentInputs.style.display = 'block'; 
    showSection('login-screen');
}

function showAdminLogin() {
    selectedSem = 'admin';
    document.getElementById('login-title').innerText = `Admin Login`;
    const studentInputs = document.getElementById('student-inputs');
    if (studentInputs) studentInputs.style.display = 'none'; 
    showSection('login-screen');
    closeNav();
}

// --- 3. LOGIN FUNCTION ---
async function login() {
    const nameInput = document.getElementById('student-name');
    const placeInput = document.getElementById('student-place');
    const phone = document.getElementById('email').value; 
    const pass = document.getElementById('password').value;

    const name = nameInput ? nameInput.value : "";
    const place = placeInput ? placeInput.value : "";

    if (selectedSem !== 'admin' && (!name || !place || !phone || !pass)) {
        alert("പേര്, സ്ഥലം, ഫോൺ നമ്പർ, പാസ്‌വേർഡ് എന്നിവ നിർബന്ധമാണ്");
        return;
    }

    let email;
    if (selectedSem === 'admin') {
        email = phone.includes("@") ? phone : phone + "@alrashida.com";
    } else {
        email = `${phone}@s${selectedSem}.com`;
    }

    try {
        await auth.signInWithEmailAndPassword(email, pass);
        if (selectedSem === 'admin') {
            showSection('admin-screen');
        } else {
            showSection('student-screen');
            initStudentApp();
        }
        document.getElementById('logout-btn').style.display = 'block';
        document.getElementById('logout-btn-sidebar').style.display = 'block';
    } catch (e) { 
        alert("ലോഗിൻ പരാജയപ്പെട്ടു: വിവരങ്ങൾ പരിശോധിക്കുക!"); 
    }
}

// --- 4. STUDENT & CONTENT LOGIC ---
function initStudentApp() {
    loadContents();
    // എക്സാം മോഡ് ചെക്ക് ചെയ്യുക
    db.collection("settings").doc(`examMode_${selectedSem}`).onSnapshot(doc => {
        const data = doc.data();
        if (data && data.active === true) {
            document.getElementById('class-list').style.display = 'none';
            document.getElementById('exam-box').style.display = 'block';
            startExam(); 
        } else {
            document.getElementById('class-list').style.display = 'block';
            document.getElementById('exam-box').style.display = 'none';
        }
    });
}

function loadContents() {
    db.collection("contents")
    .where("semester", "==", parseInt(selectedSem))
    .orderBy("timestamp", "desc")
    .onSnapshot(snap => {
        const display = document.getElementById('content-display');
        if (!display) return;
        
        display.innerHTML = snap.docs.map(doc => {
            const data = doc.data();
            const l = data.links || {};
            return `
            <div class="card" style="border-top: 5px solid var(--main);">
                <h3 style="color: var(--main);">${data.subject}</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top:10px;">
                    ${l.video ? `<a href="${l.video}" target="_blank" class="primary-btn" style="background:var(--danger); text-decoration:none; padding:10px; width:auto; font-size:0.9rem;">Video</a>` : ''}
                    ${l.audio ? `<a href="${l.audio}" target="_blank" class="primary-btn" style="background:#0288d1; text-decoration:none; padding:10px; width:auto; font-size:0.9rem;">Audio</a>` : ''}
                    ${l.pdf ? `<a href="${l.pdf}" target="_blank" class="primary-btn" style="background:#e64a19; text-decoration:none; padding:10px; width:auto; font-size:0.9rem;">PDF</a>` : ''}
                </div>
            </div>`;
        }).join('');
    });
}

// --- 5. ADMIN FUNCTIONS (നിങ്ങൾ ആവശ്യപ്പെട്ട മാറ്റങ്ങളോടെ) ---

async function addQuestionToDB() {
    const sem = prompt("ഈ ചോദ്യം ഏത് സെമസ്റ്ററിലേക്കാണ്? (1,2,3,4,5)", "1");
    if(!sem) return;
    const text = document.getElementById('q-text-input').value;
    const options = [
        document.getElementById('opt0').value, document.getElementById('opt1').value,
        document.getElementById('opt2').value, document.getElementById('opt3').value
    ];
    const correctIdx = parseInt(document.getElementById('correct-idx-input').value);

    if(!text || options.some(opt => !opt)) { alert("വിവരങ്ങൾ പൂർണ്ണമല്ല!"); return; }

    await db.collection("questions").add({
        semester: parseInt(sem),
        text, options, correctIndex: correctIdx, timestamp: Date.now()
    });
    alert("ചോദ്യം സേവ് ചെയ്തു!");
    // ഫോം ക്ലിയർ ചെയ്യുന്നു
    document.getElementById('q-text-input').value = "";
    document.getElementById('opt0').value = ""; document.getElementById('opt1').value = "";
    document.getElementById('opt2').value = ""; document.getElementById('opt3').value = "";
}

async function uploadDetailedContent() {
    const subject = document.getElementById('content-subject').value;
    const video = document.getElementById('link-video').value;
    const audio = document.getElementById('link-audio').value;
    const pdf = document.getElementById('link-pdf').value;

    const sem = prompt("ഏത് സെമസ്റ്ററിലേക്കാണ് ഈ ക്ലാസ്? (1,2,3,4,5)", "1");
    if(!sem || !subject) { alert("വിവരങ്ങൾ പൂർണ്ണമല്ല!"); return; }

    await db.collection("contents").add({
        semester: parseInt(sem),
        subject,
        links: { video, audio, pdf },
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("ക്ലാസ് അപ്‌ലോഡ് ചെയ്തു!");
    document.getElementById('content-subject').value = "";
    document.getElementById('link-video').value = "";
    document.getElementById('link-audio').value = "";
    document.getElementById('link-pdf').value = "";
}

async function deleteAllQuestions() {
    const sem = prompt("ഏത് സെമസ്റ്ററിലെ ചോദ്യങ്ങളാണ് ഡിലീറ്റ് ചെയ്യേണ്ടത്? (1,2,3,4,5)");
    if(!sem) return;
    if(confirm(`Semester ${sem}-ലെ എല്ലാ ചോദ്യങ്ങളും ഡിലീറ്റ് ചെയ്യട്ടെ?`)) {
        const snap = await db.collection("questions").where("semester", "==", parseInt(sem)).get();
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        alert("ചോദ്യങ്ങൾ ഡിലീറ്റ് ചെയ്തു.");
    }
}

async function clearAllResults() {
    const sem = prompt("ഏത് സെമസ്റ്ററിലെ റിസൾട്ടുകളാണ് നീക്കം ചെയ്യേണ്ടത്? (1,2,3,4,5)");
    if(!sem) return;
    if(confirm(`Semester ${sem}-ലെ എല്ലാ റിസൾട്ടുകളും നീക്കം ചെയ്യട്ടെ?`)) {
        const snap = await db.collection("results").where("semester", "==", sem).get();
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        alert("റിസൾട്ടുകൾ നീക്കം ചെയ്തു.");
        if(document.getElementById('admin-screen').style.display === 'block') fetchResults();
    }
}

async function fetchResults() {
    const sem = prompt("ഏത് സെമസ്റ്ററിലെ റിസൾട്ട് ആണ് കാണേണ്ടത്?", "1");
    if(!sem) return;
    const snap = await db.collection("results").where("semester", "==", sem).orderBy("timestamp", "desc").get();
    const body = document.getElementById('results-body');
    body.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        return `<tr>
            <td style="padding:10px; border-bottom:1px solid #eee;">${d.studentName}<br><small>${d.studentPlace}</small></td>
            <td style="padding:10px; border-bottom:1px solid #eee;"><b>${d.score}</b></td>
            <td style="padding:10px; border-bottom:1px solid #eee;"><button onclick="deleteSingleResult('${doc.id}')" style="background:var(--danger); color:white; border:none; padding:5px 8px; border-radius:4px;">Del</button></td>
        </tr>`;
    }).join('');
}

async function deleteSingleResult(id) {
    if(confirm("ഈ റിസൾട്ട് ഒഴിവാക്കട്ടെ?")) {
        await db.collection("results").doc(id).delete();
        alert("നീക്കം ചെയ്തു.");
        fetchResults();
    }
}

function toggleExam(status) {
    const sem = prompt("ഏത് സെമസ്റ്ററിലെ എക്സാം ആണ് തുടങ്ങേണ്ടത്/നിർത്തേണ്ടത്? (1,2,3,4,5)");
    if(!sem) return;
    db.collection("settings").doc(`examMode_${sem}`).set({ active: status })
    .then(() => alert(`Semester ${sem} പരീക്ഷാ മോഡ് മാറ്റി.`));
}

// --- 6. EXAM LOGIC ---
async function startExam() {
    const snap = await db.collection("questions")
    .where("semester", "==", parseInt(selectedSem))
    .orderBy("timestamp").get();
    
    questions = snap.docs.map(d => d.data());
    if(questions.length > 0) { 
        currentQIndex = 0; score = 0; 
        alert("പരീക്ഷ ആരംഭിക്കുന്നു!");
        // showQuestion(); -> പരീക്ഷാ ഹാൾ ഡിസൈൻ അനുസരിച്ച് ഇവിടെ ഫങ്ക്ഷൻ വിളിക്കാം
    } else {
        alert("ഈ സെമസ്റ്ററിൽ ചോദ്യങ്ങൾ ലഭ്യമല്ല.");
    }
}

function logout() { auth.signOut().then(() => location.reload()); }
