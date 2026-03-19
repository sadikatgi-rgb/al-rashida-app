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
let timer;
let score = 0;
let selectedSem = null;

// --- 2. SIDEBAR & NAVIGATION ---
function openNav() { document.getElementById("mySidebar").style.width = "250px"; }
function closeNav() { document.getElementById("mySidebar").style.width = "0"; }

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
    showSection('login-screen');
}

function showAdminLogin() {
    selectedSem = 'admin';
    document.getElementById('login-title').innerText = `Admin Login`;
    showSection('login-screen');
    closeNav();
}

// --- 3. LOGIN FUNCTION (Phone Number & Custom Logic) ---
async function login() {
    const name = document.getElementById('student-name').value;
    const place = document.getElementById('student-place').value;
    const phone = document.getElementById('email').value; // ഇവിടെ ഫോൺ നമ്പർ/ഐഡി നൽകുന്നു
    const pass = document.getElementById('password').value;

    if (selectedSem !== 'admin' && (!name || !place || !phone || !pass)) {
        alert("പേര്, സ്ഥലം, ഫോൺ നമ്പർ, പാസ്‌വേർഡ് എന്നിവ നിർബന്ധമാണ്");
        return;
    }

    let email;
    if (selectedSem === 'admin') {
        // അഡ്മിൻ ലോഗിൻ പഴയത് പോലെ തന്നെ
        email = phone.includes("@") ? phone : phone + "@alrashida.com";
    } else {
        // കുട്ടികൾക്ക് ഫോൺ നമ്പർ + സെമസ്റ്റർ ഐഡി (ഉദാ: 9876543210@s1.com)
        email = `${phone}@s${selectedSem}.com`;
    }

    try {
        await auth.signInWithEmailAndPassword(email, pass);
        
        if (selectedSem === 'admin') {
            showSection('admin-screen');
            loadAdminQueries();
        } else {
            showSection('student-screen');
            initStudentApp();
        }
        document.getElementById('logout-btn').style.display = 'block';
        document.getElementById('logout-btn-sidebar').style.display = 'block';
    } catch (e) { 
        alert("ലോഗിൻ പരാജയപ്പെട്ടു: വിവരങ്ങൾ അല്ലെങ്കിൽ സെമസ്റ്റർ പരിശോധിക്കുക!"); 
    }
}

// --- 4. STUDENT & CONTENT LOGIC ---
function initStudentApp() {
    loadContents();
    
    // സെമസ്റ്റർ അനുസരിച്ചുള്ള എക്സാം മോഡ് പരിശോധിക്കുന്നു
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
        
        if (snap.empty) {
            display.innerHTML = "<p style='text-align:center; padding:20px;'>ഈ സെമസ്റ്ററിൽ ക്ലാസുകൾ ലഭ്യമല്ല.</p>";
            return;
        }
        
        display.innerHTML = snap.docs.map(doc => {
            const data = doc.data();
            const l = data.links || {};
            return `
            <div class="card" style="border-top: 5px solid #004d40; margin-bottom: 20px;">
                <h3 style="margin-bottom:5px; color:#004d40;">${data.subject}</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top:10px;">
                    ${l.video ? `<a href="${l.video}" target="_blank" class="part-btn" style="background:#d32f2f;">Video</a>` : ''}
                    ${l.audio ? `<a href="${l.audio}" target="_blank" class="part-btn" style="background:#0288d1;">Audio</a>` : ''}
                    ${l.pdf ? `<a href="${l.pdf}" target="_blank" class="part-btn" style="background:#e64a19;">PDF</a>` : ''}
                </div>
            </div>`;
        }).join('');
    });
}

// --- 5. ADMIN FUNCTIONS ---
async function uploadDetailedContent() {
    const subject = document.getElementById('content-subject').value;
    const video = document.getElementById('link-video').value;
    const audio = document.getElementById('link-audio').value;
    const pdf = document.getElementById('link-pdf').value;

    const sem = prompt("ഏത് സെമസ്റ്ററിലേക്കാണ് ഈ ക്ലാസ്? (1,2,3,4,5)", "1");
    if(!sem || !subject) { alert("വിവരങ്ങൾ പൂർണ്ണമല്ല!"); return; }

    try {
        await db.collection("contents").add({
            semester: parseInt(sem),
            subject,
            links: { video, audio, pdf },
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert(`Semester ${sem}-ലേക്ക് ക്ലാസ് വിജയകരമായി അപ്‌ലോഡ് ചെയ്തു!`);
        // ക്ലിയർ ഇൻപുട്ട്
        document.getElementById('content-subject').value = "";
        document.getElementById('link-video').value = "";
        document.getElementById('link-audio').value = "";
        document.getElementById('link-pdf').value = "";
    } catch (e) { alert("Error: " + e.message); }
}

async function addQuestionToDB() {
    const sem = prompt("ഈ ചോദ്യം ഏത് സെമസ്റ്ററിലേക്കാണ്? (1,2,3,4,5)", "1");
    if(!sem) return;

    const text = document.getElementById('q-text-input').value;
    const options = [
        document.getElementById('opt0').value, document.getElementById('opt1').value,
        document.getElementById('opt2').value, document.getElementById('opt3').value
    ];
    const correctIdx = parseInt(document.getElementById('correct-idx-input')?.value || 0);

    await db.collection("questions").add({
        semester: parseInt(sem),
        text, options, correctIndex: correctIdx, timestamp: Date.now()
    });
    alert("ചോദ്യം സേവ് ചെയ്തു!");
}

function toggleExam(status) {
    const sem = prompt("ഏത് സെമസ്റ്ററിലെ എക്സാം ആണ് തുടങ്ങേണ്ടത്/നിർത്തേണ്ടത്? (1,2,3,4,5)");
    if(!sem) return;
    db.collection("settings").doc(`examMode_${sem}`).set({ active: status })
    .then(() => alert(`Semester ${sem} പരീക്ഷാ മോഡ് മാറ്റി.`));
}

// --- 6. EXAM & RESULTS ---
async function startExam() {
    const snap = await db.collection("questions")
    .where("semester", "==", parseInt(selectedSem))
    .orderBy("timestamp").get();
    
    questions = snap.docs.map(d => d.data());
    if(questions.length > 0) { 
        currentQIndex = 0; score = 0; showQuestion(); 
    } else {
        alert("ഈ സെമസ്റ്ററിൽ ചോദ്യങ്ങൾ ലഭ്യമല്ല.");
        location.reload();
    }
}

async function finishExam() {
    const user = auth.currentUser;
    const name = document.getElementById('student-name').value;
    const place = document.getElementById('student-place').value;

    await db.collection("results").add({
        studentName: name,
        studentPlace: place,
        email: user.email,
        score: score,
        semester: selectedSem,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("പരീക്ഷ അവസാനിച്ചു. റിസൾട്ട് പിന്നീട് പ്രസിദ്ധീകരിക്കുന്നതാണ്.");
    location.reload();
}

// ലോഗൗട്ട്
function logout() { auth.signOut(); location.reload(); }

window.onload = () => { showSection('home-screen'); };
