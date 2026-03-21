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
    if (target) {
        target.style.display = 'block';
        window.scrollTo(0, 0); // പേജിന്റെ മുകളിലേക്ക് എത്തിക്കുന്നു
    }
}

// സെമസ്റ്റർ കാർഡ് ക്ലിക്ക് ചെയ്യുമ്പോൾ
function selectSemester(sem) {
    selectedSem = sem;
    const loginTitle = document.getElementById('login-title');
    if (loginTitle) loginTitle.innerText = `Semester ${sem} Login`;
    
    const studentInputs = document.getElementById('student-inputs');
    if (studentInputs) studentInputs.style.display = 'block'; // പേരും സ്ഥലവും കാണിക്കുന്നു
    
    showSection('login-screen');
}

// സൈഡ്ബാറിലെ അഡ്മിൻ ലോഗിൻ ക്ലിക്ക് ചെയ്യുമ്പോൾ
function showAdminLogin() {
    selectedSem = 'admin';
    const loginTitle = document.getElementById('login-title');
    if (loginTitle) loginTitle.innerText = `Admin Login`;
    
    const studentInputs = document.getElementById('student-inputs');
    if (studentInputs) studentInputs.style.display = 'none'; // അഡ്മിന് പേരും സ്ഥലവും വേണ്ട
    
    showSection('login-screen');
    closeNav();
}

// --- 3. LOGIN FUNCTION ---
// --- ഗ്ലോബൽ വേരിയബിളുകൾ (ഫങ്ക്ഷന് പുറത്ത് ഉണ്ടെന്ന് ഉറപ്പുവരുത്തുക) ---
let currentStudentName = "";
let currentStudentPlace = "";

async function login() {
    const nameInput = document.getElementById('student-name');
    const placeInput = document.getElementById('student-place');
    const phoneInput = document.getElementById('email');
    const passInput = document.getElementById('password');

    // വാല്യൂസ് എടുക്കുന്നു
    const phone = phoneInput.value;
    const pass = passInput.value;
    const name = nameInput ? nameInput.value : "";
    const place = placeInput ? placeInput.value : "";

    // 1. വാലിഡേഷൻ: അഡ്മിൻ അല്ലെങ്കിൽ മാത്രം പേരും സ്ഥലവും നിർബന്ധം
    if (selectedSem !== 'admin' && (!name || !place || !phone || !pass)) {
        alert("പേര്, സ്ഥലം, ഫോൺ നമ്പർ, പാസ്‌വേർഡ് എന്നിവ നിർബന്ധമാണ്");
        return;
    }

    // 2. ഇമെയിൽ ഫോർമാറ്റ് സെറ്റ് ചെയ്യുന്നു
    let email;
    if (selectedSem === 'admin') {
        email = phone.includes("@") ? phone : phone + "@alrashida.com";
    } else {
        // ഉദാഹരണത്തിന്: 9876543210@s1.com
        email = `${phone}@s${selectedSem}.com`;
    }

    try {
        // 3. ഫയർബേസ് ലോഗിൻ ശ്രമിക്കുന്നു
        await auth.signInWithEmailAndPassword(email, pass);

        // 4. ലോഗിൻ സക്സസ് ആയാൽ ഉടൻ ഫോം ഫീൽഡുകൾ ക്ലിയർ ചെയ്യുന്നു
        if (nameInput) nameInput.value = "";
        if (placeInput) placeInput.value = "";
        phoneInput.value = "";
        passInput.value = "";

        // 5. ലോഗിൻ സ്റ്റാറ്റസും പേരും സ്ഥലവും ലോക്കൽ സ്റ്റോറേജിൽ സേവ് ചെയ്യുന്നു
        // (ഇത് ആപ്പിൽ നിന്ന് എക്സിറ്റ് ആയി വന്നാലും ലോഗിൻ നിലനിർത്താൻ സഹായിക്കും)
        if (selectedSem !== 'admin') {
            localStorage.setItem(`isLoggedIn_S${selectedSem}`, "true");
            localStorage.setItem(`studentName`, name);
            localStorage.setItem(`studentPlace`, place);
            
            currentStudentName = name;
            currentStudentPlace = place;
        }

        // 6. സ്ക്രീൻ മാറ്റുന്നു
        if (selectedSem === 'admin') {
            showSection('admin-screen');
        } else {
            showSection('student-screen');
            // നിങ്ങളുടെ സ്റ്റുഡന്റ് ആപ്പ് ലോഡ് ചെയ്യുന്ന ഫങ്ക്ഷൻ
            if (typeof initStudentApp === 'function') initStudentApp();
            loadContents(); 
        }

        // 7. ലോഗ് ഔട്ട് ബട്ടണുകൾ കാണിക്കുന്നു
        document.getElementById('logout-btn').style.display = 'block';
        const logoutSidebar = document.getElementById('logout-btn-sidebar');
        if(logoutSidebar) logoutSidebar.style.display = 'block';

    } catch (e) { 
        console.error("Login Error:", e);
        alert("ലോഗിൻ പരാജയപ്പെട്ടു: നിങ്ങളുടെ സെമസ്റ്ററോ വിവരങ്ങളോ പരിശോധിക്കുക!"); 
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
// --- 5. പരിഷ്കരിച്ച അഡ്മിൻ ഫങ്ക്ഷനുകൾ (ADMIN FUNCTIONS) ---

// 1. ക്ലാസുകൾ അപ്‌ലോഡ് ചെയ്യുക (Detailed Content Upload)
async function uploadDetailedContent() {
    const sem = document.getElementById('upload-sem-select').value;
    const subject = document.getElementById('content-subject').value;
    const chapter = document.getElementById('content-chapter').value;
    const part = document.getElementById('content-part').value;
    const customTime = document.getElementById('content-datetime').value;
    
    const video = document.getElementById('link-video').value;
    const audio = document.getElementById('link-audio').value;
    const pdf = document.getElementById('link-pdf').value;

    if(!subject || !chapter) { 
        alert("വിഷയവും പാഠത്തിന്റെ പേരും നിർബന്ധമാണ്!"); 
        return; 
    }

    try {
        await db.collection("contents").add({
            semester: parseInt(sem),
            subject: subject,
            chapter: chapter,
            part: part || "",
            displayDate: customTime || new Date().toISOString(),
            links: {
                video: video || "",
                audio: audio || "",
                pdf: pdf || ""
            },
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`Semester ${sem}-ലേക്ക് ക്ലാസ് വിജയകരമായി അപ്‌ലോഡ് ചെയ്തു!`);
        
        // ഫോം ക്ലിയർ ചെയ്യുന്നു
        document.getElementById('content-subject').value = "";
        document.getElementById('content-chapter').value = "";
        document.getElementById('content-part').value = "";
        document.getElementById('content-datetime').value = "";
        document.getElementById('link-video').value = "";
        document.getElementById('link-audio').value = "";
        document.getElementById('link-pdf').value = "";
        
    } catch (error) {
        alert("അപ്‌ലോഡിംഗിൽ തകരാർ സംഭവിച്ചു!");
    }
}

// 2. ചോദ്യങ്ങൾ സേവ് ചെയ്യുക (Add Question)
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
    document.getElementById('q-text-input').value = "";
    document.getElementById('opt0').value = ""; document.getElementById('opt1').value = "";
    document.getElementById('opt2').value = ""; document.getElementById('opt3').value = "";
}

// 3. പരീക്ഷാ ഫലങ്ങൾ പരിശോധിക്കുക (Fetch Results)
async function fetchResults() {
    const sem = prompt("ഏത് സെമസ്റ്ററിലെ റിസൾട്ട് ആണ് കാണേണ്ടത്?", "1");
    if(!sem) return;
    
    const snap = await db.collection("results").where("semester", "==", sem).orderBy("timestamp", "desc").get();
    const body = document.getElementById('results-body');
    if(!body) return;

    if(snap.empty) {
        body.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px;'>റിസൾട്ടുകൾ ലഭ്യമല്ല.</td></tr>";
        return;
    }

    body.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        return `<tr>
            <td style="padding:10px; border-bottom:1px solid #eee;">
                <b>${d.studentName}</b><br>
                <small style="color:#666;">📍 ${d.studentPlace || ""}</small>
            </td>
            <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;"><b>${d.score}</b></td>
            <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">
                <button onclick="deleteSingleResult('${doc.id}')" style="background:var(--danger); color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer;">Del</button>
            </td>
        </tr>`;
    }).join('');
}

// 4. റിസൾട്ട് പബ്ലിഷ്/ഹൈഡ് ചെയ്യുക
function toggleResultStatus(status) {
    const sem = prompt("ഏത് സെമസ്റ്ററിലെ റിസൾട്ട് ആണ് പബ്ലിഷ്/ഹൈഡ് ചെയ്യേണ്ടത്? (1,2,3,4,5)");
    if(!sem) return;
    db.collection("settings").doc(`resultMode_${sem}`).set({ active: status })
    .then(() => alert(`Semester ${sem} റിസൾട്ട് മോഡ് മാറ്റി.`));
}

// 5. വിദ്യാർത്ഥികളുടെ സംശയങ്ങൾ ലോഡ് ചെയ്യുക (Doubt Management)
function loadDoubtsForAdmin() {
    db.collection("doubts").orderBy("timestamp", "desc").onSnapshot(snap => {
        const list = document.getElementById('admin-doubts-list');
        if (!list) return;

        if (snap.empty) {
            list.innerHTML = "<p style='text-align:center; padding:10px;'>പുതിയ സംശയങ്ങൾ ഒന്നുമില്ല.</p>";
            return;
        }

        list.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `
            <div style="border-bottom: 1px solid #ddd; padding: 12px; margin-bottom: 8px; background: white; border-radius: 8px; text-align:left;">
                <div style="font-size:0.8rem; color:#777; display:flex; justify-content:space-between;">
                    <span><b>${d.studentName}</b> (S${d.semester})</span>
                </div>
                <p style="margin: 5px 0; color: #333;"><b>❓ സംശയം:</b> ${d.question}</p>
                <div id="reply-box-${doc.id}">
                    ${d.reply ? 
                        `<p style="color: #2e7d32; margin:0; padding-top:5px;"><b>✅ മറുപടി:</b> ${d.reply}</p>` : 
                        `<textarea id="rep-text-${doc.id}" placeholder="മറുപടി ടൈപ്പ് ചെയ്യുക..." style="height:50px; margin-top:5px;"></textarea>
                         <button onclick="sendReply('${doc.id}')" class="primary-btn" style="padding:8px; font-size:0.8rem; background:var(--sec); width:auto;">Reply</button>`
                    }
                </div>
                <button onclick="deleteDoubt('${doc.id}')" style="background:none; border:none; color:red; font-size:0.7rem; cursor:pointer; margin-top:5px;">Delete Doubt</button>
            </div>`;
        }).join('');
    });
}

// സംശയത്തിന് മറുപടി അയക്കാൻ
async function sendReply(id) {
    const text = document.getElementById(`rep-text-${id}`).value;
    if(!text) return;
    await db.collection("doubts").doc(id).update({ reply: text, repliedAt: Date.now() });
    alert("മറുപടി അയച്ചു!");
}

// സംശയം ഡിലീറ്റ് ചെയ്യാൻ
async function deleteDoubt(id) {
    if(confirm("ഈ സംശയം ഒഴിവാക്കട്ടെ?")) await db.collection("doubts").doc(id).delete();
}

// 6. ഡിലീറ്റ് ഫങ്ക്ഷനുകൾ (Delete All Questions & Results)
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
        fetchResults(); 
    }
}

async function deleteSingleResult(id) {
    if(confirm("ഈ റിസൾട്ട് ഒഴിവാക്കട്ടെ?")) {
        await db.collection("results").doc(id).delete();
        fetchResults();
    }
}

// അഡ്മിൻ പാനലിൽ എത്തുമ്പോൾ സംശയങ്ങൾ ലോഡ് ചെയ്യാൻ
// showSection('admin-screen') ഫങ്ക്ഷനിൽ ഇത് കൂടി ചേർക്കുക:
// if(id === 'admin-screen') loadDoubtsForAdmin();


// --- 6. EXAM LOGIC ---
async function startExam() {
    const snap = await db.collection("questions")
    .where("semester", "==", parseInt(selectedSem))
    .orderBy("timestamp").get();
    
    questions = snap.docs.map(d => d.data());
    if(questions.length > 0) { 
        currentQIndex = 0; score = 0; 
        alert("പരീക്ഷ ആരംഭിക്കുന്നു!");
        // ഇവിടെ വേണമെങ്കിൽ പരീക്ഷാ ചോദ്യങ്ങൾ കാണിക്കുന്ന ഫങ്ക്ഷൻ ചേർക്കാം
    } else {
        alert("ഈ സെമസ്റ്ററിൽ ചോദ്യങ്ങൾ ലഭ്യമല്ല.");
    }
}

function logout() { auth.signOut().then(() => location.reload()); }
