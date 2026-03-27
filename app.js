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
// ആപ്പ് തുറക്കുമ്പോൾ പഴയ പേരും സ്ഥലവും ഉണ്ടെങ്കിൽ അത് എടുക്കുന്നു
let currentStudentName = localStorage.getItem('studentName') || "";
let currentStudentPlace = localStorage.getItem('studentPlace') || "";

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
    
    // UI അപ്ഡേറ്റ് - സെമസ്റ്റർ നമ്പർ സ്ക്രീനിൽ കാണിക്കാൻ
    if(document.getElementById('current-sem-display')) {
        document.getElementById('current-sem-display').innerText = sem;
    }
    if(document.getElementById('current-upload-sem')) {
        document.getElementById('current-upload-sem').innerText = sem;
    }

    const isAdmin = auth.currentUser && auth.currentUser.email && auth.currentUser.email.includes('admin');

    // 1. അഡ്മിൻ ആണെങ്കിൽ
    if (isAdmin) {
        if (sem === 'admin') {
            showSection('admin-screen');
            loadDoubtsForAdmin();
        } else {
            showSection('student-screen');
            // അഡ്മിൻ ആണെന്ന് കാണിക്കാൻ ബാഡ്ജ് ഉണ്ടെങ്കിൽ അത് കാണിക്കുക
            const badge = document.getElementById('admin-badge');
            if(badge) badge.style.display = 'block';
            
            loadContents();
        }
        return;
    }

    // 2. സാധാരണ വിദ്യാർത്ഥി ലോഗിൻ ചെയ്തിട്ടുണ്ടോ എന്ന് നോക്കുന്നു
    const isLogged = localStorage.getItem(`isLoggedIn_S${sem}`);
    if (isLogged === "true") {
        currentStudentName = localStorage.getItem(`studentName`) || "";
        currentStudentPlace = localStorage.getItem(`studentPlace`) || "";
        
        showSection('student-screen');
        
        // ഇത് പ്രധാനമാണ്: ക്ലാസ്സ് ലിസ്റ്റ് ലോഡ് ചെയ്യാനും പരീക്ഷ ഉണ്ടോ എന്ന് നോക്കാനും
        initStudentApp(); 
    } else {
        // ലോഗിൻ ചെയ്തിട്ടില്ലെങ്കിൽ ലോഗിൻ സ്ക്രീൻ കാണിക്കുന്നു
        const loginTitle = document.getElementById('login-title');
        if (loginTitle) loginTitle.innerText = `Semester ${sem} Login`;
        
        const studentInputs = document.getElementById('student-inputs');
        if (studentInputs) studentInputs.style.display = 'block'; 
        
        showSection('login-screen');
    }
}

function showAdminLogin() {
    selectedSem = 'admin';
    const loginTitle = document.getElementById('login-title');
    if (loginTitle) loginTitle.innerText = `Admin Login`;
    
    const studentInputs = document.getElementById('student-inputs');
    if (studentInputs) studentInputs.style.display = 'none'; 

    // അധികമായി ചേർക്കാവുന്നവ (ഓപ്ഷണൽ):
    // അഡ്മിൻ ലോഗിൻ ക്ലിക്ക് ചെയ്യുമ്പോൾ പഴയ വിവരങ്ങൾ ഉണ്ടെങ്കിൽ അത് മായ്ച്ചു കളയാൻ
    if(document.getElementById('email')) document.getElementById('email').value = "";
    if(document.getElementById('password')) document.getElementById('password').value = "";
    
    showSection('login-screen');
    closeNav();
}

// --- 3. LOGIN FUNCTION ---

async function login() {
    const nameInput = document.getElementById('student-name');
    const placeInput = document.getElementById('student-place');
    const phoneInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const studentInputs = document.getElementById('student-inputs'); // Container div

    const phone = phoneInput.value.trim();
    const pass = passInput.value.trim();
    
    // പേരും സ്ഥലവും ഉള്ള ബോക്സ് നിലവിൽ കാണുന്നുണ്ടോ എന്ന് നോക്കുന്നു
    const isNewUser = studentInputs.style.display !== "none";
    
    let name = isNewUser ? nameInput.value.trim() : "";
    let place = isNewUser ? placeInput.value.trim() : "";

    // 1. വാലിഡേഷൻ
    if (selectedSem !== 'admin') {
        if (!phone || !pass) {
            alert("ഫോൺ നമ്പറും പാസ്‌വേർഡും നൽകുക");
            return;
        }
        // പുതിയ കുട്ടിയാണെങ്കിൽ മാത്രം പേരും സ്ഥലവും നിർബന്ധമാക്കുന്നു
        if (isNewUser && (!name || !place)) {
            alert("പേരും സ്ഥലവും നൽകുക");
            return;
        }
    }

    // 2. ഇമെയിൽ ഫോർമാറ്റ് സെറ്റ് ചെയ്യുന്നു
    let email = (selectedSem === 'admin') ? 
                (phone.includes("@") ? phone : phone + "@alrashida.com") : 
                `${phone}@s${selectedSem}.com`;

    try {
        if (isNewUser && selectedSem !== 'admin') {
            // --- പുതിയ വിദ്യാർത്ഥി: അക്കൗണ്ട് ഉണ്ടാക്കുന്നു (Registration) ---
            await auth.createUserWithEmailAndPassword(email, pass);
            
            // Firestore-ൽ വിവരങ്ങൾ സേവ് ചെയ്യുന്നു
            await db.collection("students").doc(phone).set({
                name: name,
                place: place,
                phone: phone,
                semester: parseInt(selectedSem),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // --- പഴയ വിദ്യാർത്ഥി അല്ലെങ്കിൽ അഡ്മിൻ: ലോഗിൻ ചെയ്യുന്നു ---
            await auth.signInWithEmailAndPassword(email, pass);
            
            // പഴയ കുട്ടിയാണെങ്കിൽ ഡാറ്റാബേസിൽ നിന്ന് പേരും സ്ഥലവും എടുക്കുന്നു
            if (selectedSem !== 'admin') {
                const doc = await db.collection("students").doc(phone).get();
                if (doc.exists) {
                    name = doc.data().name;
                    place = doc.data().place;
                }
            }
        }

        // 4. ലോഗിൻ സക്സസ് ആയാൽ ഫീൽഡുകൾ ക്ലിയർ ചെയ്യുന്നു
        if (nameInput) nameInput.value = "";
        if (placeInput) placeInput.value = "";
        phoneInput.value = "";
        passInput.value = "";

        // 5. ലോക്കൽ സ്റ്റോറേജിൽ സേവ് ചെയ്യുന്നു
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
            if (typeof initStudentApp === 'function') initStudentApp();
            loadContents(); 
        }

        document.getElementById('logout-btn').style.display = 'block';

    } catch (e) { 
        console.error("Login Error:", e);
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
    const display = document.getElementById('content-display');
    const adminPanel = document.getElementById('admin-semester-tools');
    const isAdmin = auth.currentUser && auth.currentUser.email && auth.currentUser.email.includes('admin');
    
    if (adminPanel) adminPanel.style.display = isAdmin ? 'block' : 'none';

    db.collection("contents")
    .where("semester", "==", parseInt(selectedSem))
    .orderBy("timestamp", "desc")
    .onSnapshot(snap => {
        if (!display) return;
        if (snap.empty) {
            display.innerHTML = "<p style='text-align:center; padding:20px;'>ക്ലാസുകൾ ലഭ്യമല്ല.</p>";
            return;
        }

        display.innerHTML = snap.docs.map(doc => {
            const data = doc.data();
            
            // 1. വീഡിയോ ബട്ടണുകൾ
            let videoHTML = "";
            if (data.videoLinks) {
                data.videoLinks.split(',').forEach((link, i) => {
                    if(link.trim()) videoHTML += `<a href="${link.trim()}" target="_blank" class="media-btn btn-video">📺 Video ${i+1}</a>`;
                });
            }

            // 2. PDF ബട്ടണുകൾ
            let pdfHTML = "";
            if (data.pdfLinks) {
                data.pdfLinks.split(',').forEach((link, i) => {
                    if(link.trim()) pdfHTML += `<a href="${link.trim()}" target="_blank" class="media-btn btn-pdf">📄 PDF ${i+1}</a>`;
                });
            }

            // 3. ഓഡിയോ പ്ലെയറുകൾ (Google Drive Support ഉൾപ്പെടെ)
// 1. ഓഡിയോ പ്ലെയർ ഭാഗം
let audioHTML = "";
if (data.audioLinks) {
    // കോമ വഴിയോ സ്പേസ് വഴിയോ ലിങ്കുകളെ വേർതിരിക്കുന്നു
    const links = data.audioLinks.match(/https?:\/\/[^\s,]+/g) || [];

    links.forEach((link, i) => {
        let cleanLink = link.trim();
        if (cleanLink.includes("drive.google.com")) {
            // ഐഡി എടുക്കുമ്പോൾ വരാൻ സാധ്യതയുള്ള എല്ലാ തടസ്സങ്ങളും (usp, authuser) Regex വഴി ഒഴിവാക്കുന്നു
            const match = cleanLink.match(/\/d\/(.+?)\/|id=(.+?)(&|$|\?)/);
            const fileId = match ? (match[1] || match[2]) : null;

            if (fileId) {
                // പ്ലെയർ സപ്പോർട്ട് ചെയ്യുന്ന ഏറ്റവും ലളിതമായ ലിങ്ക് ഫോർമാറ്റ്
                cleanLink = `https://docs.google.com/uc?id=${fileId}`;
            }
        }

        if(cleanLink) {
            audioHTML += `
                <div style="background:#f9f9f9; padding:10px; border-radius:12px; margin-top:10px; border:1px solid #eee;">
                    <small style="font-size:12px; color:#2e7d32; font-weight:bold;">🎧 Voice Part ${i+1}</small>
                    <audio controls preload="metadata" style="width:100%; height:40px; margin-top:5px;">
                        <source src="${cleanLink}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                </div>`;
        }
    });
}

// 2. സംശയം ചോദിക്കാനുള്ള ബോക്സ് (ഇത് ആഡ് ചെയ്യുക)
let doubtHTML = `
    <div style="margin-top:15px; padding:10px; background:#fff3e0; border-radius:12px; border:1px dashed #ff9800;">
        <p style="margin:0 0 5px 0; font-size:0.8rem; font-weight:bold; color:#e65100;">❓ സംശയങ്ങൾ ചോദിക്കാൻ:</p>
        <textarea id="doubt-text-${doc.id}" placeholder="സംശയം ഇവിടെ ടൈപ്പ് ചെയ്യുക..." style="width:100%; height:50px; border-radius:8px; border:1px solid #ccc; padding:8px; font-size:0.8rem;"></textarea>
        <button onclick="submitDoubt('${doc.id}', '${data.chapter}')" style="background:#ff9800; color:white; border:none; border-radius:8px; padding:8px; margin-top:5px; width:100%; cursor:pointer; font-weight:bold;">Send Doubt</button>
    </div>
`;

// മറുപടികൾ കാണിക്കാനുള്ള വേരിയബിൾ
let repliesHTML = "";

// ശ്രദ്ധിക്കുക: loadContents-നുള്ളിൽ ഒരു async/await സ്ട്രക്ചർ ഇല്ലാത്തതിനാൽ 
// ഓരോ കാർഡിനും ഉള്ളിൽ സംശയങ്ങൾ കാണിക്കാൻ താഴെ പറയുന്ന രീതി പരീക്ഷിക്കാം:

const studentPhone = document.getElementById('email').value.trim(); // ലോഗിൻ ചെയ്ത നമ്പർ

// ഈ ഭാഗം നിങ്ങളുടെ 'return' HTML-ന്റെ ഉള്ളിൽ ഒരു div ആയി നൽകാം.
// അത് ലോഡ് ചെയ്യാൻ മറ്റൊരു ചെറിയ ഫങ്ക്ഷൻ താഴെ നൽകുന്നു.

return `
<div class="card" ...>
    ... (നിങ്ങളുടെ പഴയ ഹെഡർ, വീഡിയോ, ഓഡിയോ ഭാഗങ്ങൾ) ...

    <div id="replies-${doc.id}" style="margin-top:10px;">
        <small style="color:#666;">സംശയങ്ങൾ ലോഡ് ചെയ്യുന്നു...</small>
    </div>

    ${!isAdmin ? doubtHTML : ''} 
    ...
</div>
<script>
    // ഈ കാർഡ് റെൻഡർ ചെയ്ത ഉടൻ ആ ക്ലാസിലെ സംശയങ്ങൾ ലോഡ് ചെയ്യാൻ
    setTimeout(() => loadMyDoubts('${doc.id}', '${studentPhone}'), 500);
</script>
`;

            // 4. തീയതി ഭംഗിയായി കാണിക്കാൻ (Date formatting)
            const dateObj = data.displayDate ? new Date(data.displayDate) : null;
            const formattedDate = dateObj ? dateObj.toLocaleString('en-GB', { 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit', hour12: true 
            }) : 'No Date';

            // ... (മുകളിലെ വീഡിയോ, പിഡിഎഫ് ഭാഗങ്ങൾ അങ്ങനെ തന്നെ വെക്കുക)

            // 5. ഫൈനൽ ഔട്ട്പുട്ട് (HTML Card)
            return `
            <div class="card" style="border-left: 5px solid ${isAdmin ? '#4caf50' : 'var(--main)'}; margin-bottom:15px; padding:15px; background:white; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <small style="color:#666; font-weight: 500;">📅 ${formattedDate}</small>
                    ${data.part ? `<span style="background:#e8f5e9; color:#2e7d32; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold;">${data.part}</span>` : ''}
                </div>
                
                <h4 style="margin:10px 0; color:var(--main); font-size:1.1rem; line-height:1.4;">
                    ${data.subject}: <span style="font-weight:normal;">${data.chapter}</span>
                </h4>

                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top:12px;">
                    ${videoHTML} ${pdfHTML}
                </div>

                <div style="margin-top:12px;">${audioHTML}</div>

                ${!isAdmin ? doubtHTML : ''} 

                ${isAdmin ? `
                    <div style="margin-top:15px; border-top:1px solid #eee; padding-top:12px; display:flex; gap:8px; flex-wrap: wrap;">
                        <button onclick="viewTracking('${doc.id}', '${data.chapter}')" style="background:#1976d2; color:white; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; font-size:0.75rem; flex:1; display:flex; align-items:center; justify-content:center; gap:5px;">📊 Track</button>
                        <button onclick="openEditContent('${doc.id}')" style="background:#ffd600; color:#333; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; font-size:0.75rem; flex:1; display:flex; align-items:center; justify-content:center; gap:5px; font-weight:bold;">📝 Edit</button>
                        <button onclick="deleteContent('${doc.id}')" style="background:#f44336; color:white; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; font-size:0.75rem; flex:1; display:flex; align-items:center; justify-content:center; gap:5px;">🗑️ Delete</button>
                    </div>
                ` : ''}          
            </div>`;
        }).join('');
    });
}

// --- 5. അഡ്മിൻ ഫങ്ക്ഷനുകൾ (ADMIN FUNCTIONS) ---

// 1. ക്ലാസുകൾ അപ്‌ലോഡ് ചെയ്യുക
async function uploadDetailedContent() {
    const sem = selectedSem; 
    const subject = document.getElementById('content-subject').value;
    const chapter = document.getElementById('content-chapter').value;
    const part = document.getElementById('content-part').value;
    const customTime = document.getElementById('content-datetime').value;
    
    // ഒന്നിലധികം ലിങ്കുകൾ കോമ ഇട്ട് ഇവിടെ വരും
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
            // മാറ്റം വരുത്തിയത് ഇവിടെയാണ്:
            videoLinks: video || "", 
            audioLinks: audio || "", 
            pdfLinks: pdf || "",
            timestamp: new Date().getTime() 
        });
        alert(`Semester ${sem}-ലേക്ക് ക്ലാസ് അപ്‌ലോഡ് ചെയ്തു!`);
        
        // ഫോം ക്ലിയർ ചെയ്യാൻ
        document.getElementById('content-subject').value = "";
        document.getElementById('content-chapter').value = "";
        document.getElementById('link-video').value = "";
        document.getElementById('link-audio').value = "";
        document.getElementById('link-pdf').value = "";
    } catch (error) { 
        alert("അപ്‌ലോഡിംഗിൽ തകരാർ: " + error.message); 
    }
}

// 2. ചോദ്യങ്ങൾ അപ്‌ലോഡ് ചെയ്യുക
async function addQuestionToDB() {
    const sem = selectedSem; 
    
    // 1. സെമസ്റ്റർ ഉണ്ടോ എന്ന് പരിശോധിക്കുന്നു
    if(!sem || sem === 'admin') {
        alert("ദയവായി ഒരു സെമസ്റ്റർ തിരഞ്ഞെടുത്ത ശേഷം ചോദ്യം ചേർക്കുക.");
        return;
    }

    // ഇൻപുട്ട് എലമെന്റുകൾ എടുക്കുന്നു
    const qInput = document.getElementById('q-text-input');
    const opt0 = document.getElementById('opt0');
    const opt1 = document.getElementById('opt1');
    const opt2 = document.getElementById('opt2');
    const opt3 = document.getElementById('opt3');
    const idxElem = document.getElementById('correct-idx-input');

    // 2. വാലിഡേഷൻ: ചോദ്യവും ഓപ്ഷനുകളും ഉണ്ടോ എന്ന് നോക്കുന്നു
    if(!qInput.value.trim() || !opt0.value.trim() || !opt1.value.trim()) { 
        alert("ചോദ്യവും ചുരുങ്ങിയത് രണ്ട് ഓപ്ഷനുകളും നിർബന്ധമായും നൽകണം!"); 
        return; 
    }

    try {
        // 3. ഫയർബേസിലേക്ക് ഡാറ്റ അയക്കുന്നു
        await db.collection("questions").add({
            semester: parseInt(sem),
            text: qInput.value,
            options: [opt0.value, opt1.value, opt2.value, opt3.value],
            correctIndex: parseInt(idxElem.value),
            timestamp: new Date().getTime() 
        });

        alert("ചോദ്യം വിജയകരമായി സേവ് ചെയ്തു!");
        
        // 4. ഫോം പൂർണ്ണമായും ക്ലിയർ ചെയ്യുന്നു (ഇതാണ് നിങ്ങൾ ചോദിച്ച മാറ്റം)
        qInput.value = "";
        opt0.value = "";
        opt1.value = "";
        opt2.value = "";
        opt3.value = "";
        idxElem.selectedIndex = 0; // ഡ്രോപ്പ് ഡൗൺ ആദ്യത്തെ ഓപ്ഷനിലേക്ക് മാറ്റുന്നു

    } catch (error) { 
        console.error("Error adding question:", error);
        alert("Error: " + error.message); 
    }
}

async function fetchResults() {
    // ഗ്ലോബൽ വേരിയബിളായ selectedSem നേരിട്ട് ഉപയോഗിക്കുന്നു
    const sem = selectedSem; 
    
    // സെമസ്റ്റർ തിരഞ്ഞെടുത്തിട്ടില്ലെങ്കിൽ ഒന്നും ചെയ്യേണ്ടതില്ല
    if(!sem || sem === 'admin') {
        alert("ദയവായി ഒരു സെമസ്റ്റർ തിരഞ്ഞെടുക്കുക.");
        return;
    }

    const body = document.getElementById('results-body');
    if(!body) return;

    // ഡാറ്റ വരുന്നത് വരെ ലോഡിംഗ് കാണിക്കാൻ
    body.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px;'>വിവരങ്ങൾ ശേഖരിക്കുന്നു...</td></tr>";

    try {
        // നിലവിലെ സെമസ്റ്ററിലെ റിസൾട്ടുകൾ മാത്രം എടുക്കുന്നു
        const snap = await db.collection("results")
            .where("semester", "==", sem)
            .orderBy("timestamp", "desc")
            .get();

        if(snap.empty) { 
            body.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px;'>ഈ സെമസ്റ്ററിൽ റിസൾട്ടുകൾ ലഭ്യമല്ല.</td></tr>"; 
            return; 
        }

        // ടേബിൾ ബോഡിയിലേക്ക് ഡാറ്റ പ്രിന്റ് ചെയ്യുന്നു
        body.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:10px;">
                    <b style="color:#2c3e50;">${d.studentName}</b><br>
                    <small style="color:#7f8c8d;">📍 ${d.studentPlace || "Unknown"}</small>
                </td>
                <td style="text-align:center; font-weight:bold; color:#27ae60; font-size:1.1rem;">
                    ${d.score}
                </td>
                <td style="text-align:center;">
                    <button onclick="deleteSingleResult('${doc.id}')" 
                        style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:0.8rem;">
                        Delete
                    </button>
                </td>
            </tr>`;
        }).join('');

    } catch (error) {
        console.error("Error fetching results:", error);
        body.innerHTML = "<tr><td colspan='3' style='color:red; text-align:center; padding:20px;'>റിസൾട്ട് ലോഡ് ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു.</td></tr>";
    }
}

// 4. റിസൾട്ട് പബ്ലിഷ്/ഹൈഡ് ചെയ്യുക
function toggleResultStatus(status) {
    // വീണ്ടും prompt ചോദിക്കാതെ നിലവിലെ സെമസ്റ്റർ (selectedSem) എടുക്കുന്നു
    const sem = selectedSem; 
    
    if(!sem || sem === 'admin') {
        alert("ദയവായി ഒരു സെമസ്റ്റർ തിരഞ്ഞെടുത്ത ശേഷം റിസൾട്ട് കൺട്രോൾ ചെയ്യുക.");
        return;
    }

    // ഫയർബേസിൽ ആ സെമസ്റ്ററിലെ റിസൾട്ട് മോഡ് മാറ്റുന്നു
    db.collection("settings").doc(`resultMode_${sem}`).set({ active: status })
    .then(() => {
        const msg = status ? "പബ്ലിഷ് ചെയ്തു" : "ഹൈഡ് ചെയ്തു";
        alert(`Semester ${sem} റിസൾട്ട് ഇപ്പോൾ ${msg}.`);
    })
    .catch(error => {
        alert("Error: " + error.message);
    });
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

// തിരഞ്ഞെടുത്ത സെമസ്റ്ററിലെ എല്ലാ ചോദ്യങ്ങളും ഡിലീറ്റ് ചെയ്യാൻ
async function deleteAllQuestions() {
    const sem = selectedSem; // സെലക്ട് ചെയ്ത സെമസ്റ്റർ തനിയെ എടുക്കുന്നു
    if(!sem || sem === 'admin') {
        alert("ദയവായി ഒരു സെമസ്റ്റർ തിരഞ്ഞെടുത്ത ശേഷം ശ്രമിക്കുക.");
        return;
    }

    if(confirm(`Semester ${sem}-ലെ എല്ലാ ചോദ്യങ്ങളും സ്ഥിരമായി ഡിലീറ്റ് ചെയ്യട്ടെ?`)) {
        try {
            const snap = await db.collection("questions").where("semester", "==", parseInt(sem)).get();
            if(snap.empty) {
                alert("ഈ സെമസ്റ്ററിൽ ചോദ്യങ്ങൾ ഒന്നും തന്നെയില്ല.");
                return;
            }
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            alert(`Semester ${sem}-ലെ എല്ലാ ചോദ്യങ്ങളും ഡിലീറ്റ് ചെയ്തു.`);
            loadAdminQuestions(); // ലിസ്റ്റ് പുതുക്കുന്നു
        } catch (e) {
            alert("Error: " + e.message);
        }
    }
}

// തിരഞ്ഞെടുത്ത സെമസ്റ്ററിലെ എല്ലാ റിസൾട്ടുകളും നീക്കം ചെയ്യാൻ
async function clearAllResults() {
    const sem = selectedSem;
    if(!sem || sem === 'admin') {
        alert("സെമസ്റ്റർ തിരഞ്ഞെടുത്തിട്ടില്ല.");
        return;
    }

    if(confirm(`Semester ${sem}-ലെ എല്ലാ റിസൾട്ടുകളും നീക്കം ചെയ്യട്ടെ?`)) {
        try {
            // String ആണെങ്കിൽ sem എന്നും Number ആണെങ്കിൽ parseInt(sem) എന്നും നൽകുക.
            const snap = await db.collection("results").where("semester", "==", sem).get();
            
            if(snap.empty) {
                alert("ഈ സെമസ്റ്ററിൽ റിസൾട്ടുകൾ ഒന്നും തന്നെയില്ല.");
                return;
            }

            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            alert(`Semester ${sem}-ലെ റിസൾട്ടുകൾ നീക്കം ചെയ്തു.`);
            fetchResults(); // ടേബിൾ പുതുക്കുന്നു
        } catch (e) {
            alert("Error: " + e.message);
        }
    }
}

// ഒരു പ്രത്യേക റിസൾട്ട് മാത്രം ഒഴിവാക്കാൻ (മാറ്റമില്ല)
async function deleteSingleResult(id) {
    if(confirm("ഈ കുട്ടിയുടെ റിസൾട്ട് ഒഴിവാക്കട്ടെ?")) {
        try {
            await db.collection("results").doc(id).delete();
            fetchResults();
        } catch (e) {
            alert("Error: " + e.message);
        }
    }
}
// showSection('admin-screen') ഫങ്ക്ഷനിൽ ഇത് കൂടി ചേർക്കുക:
// if(id === 'admin-screen') loadDoubtsForAdmin();

// --- 6. EXAM LOGIC ---
async function startExam() {
    try {
        const snap = await db.collection("questions")
            .where("semester", "==", parseInt(selectedSem))
            .orderBy("timestamp").get();
        
        questions = snap.docs.map(d => d.data());

        if(questions.length > 0) { 
            currentQIndex = 0; 
            score = 0; 
            alert("പരീക്ഷ ആരംഭിക്കുന്നു!");
            
            // 1. എക്സാം സെക്ഷൻ കാണിക്കുക
            showSection('quiz-area'); 

            // 2. ആദ്യത്തെ ചോദ്യം സ്ക്രീനിൽ കാണിക്കാൻ ഈ ഫങ്ക്ഷൻ വിളിക്കുക
            renderQuestion(); 
            
        } else {
            alert("ഈ സെമസ്റ്ററിൽ ചോദ്യങ്ങൾ ലഭ്യമല്ല.");
        }
    } catch (e) {
        console.error("Exam Error:", e);
        alert("പരീക്ഷ ലോഡ് ചെയ്യുന്നതിൽ പിശക് സംഭവിച്ചു.");
    }
}

// --- 7. പുതിയ ട്രാക്കിംഗ് & അഡ്മിൻ ഫീച്ചറുകൾ
// അഡ്മിന് ആ സെമസ്റ്ററിലെ മുഴുവൻ കുട്ടികളുടെയും അറ്റൻഡൻസ് ലിസ്റ്റ് കാണാൻ
async function viewSemesterAttendance() {
    const sem = selectedSem;
    if(!sem || sem === 'admin') {
        alert("ദയവായി ഒരു സെമസ്റ്റർ തിരഞ്ഞെടുത്ത ശേഷം ഈ ബട്ടൺ ക്ലിക്ക് ചെയ്യുക.");
        return;
    }

    const modal = document.getElementById('tracking-modal');
    const list = document.getElementById('tracking-list-content');
    
    if(!modal || !list) { 
        alert("ട്രാക്കിംഗ് മോഡൽ (HTML Modal) നിങ്ങളുടെ പേജിൽ കണ്ടെത്തിയില്ല!"); 
        return; 
    }

    modal.style.display = 'flex'; 
    list.innerHTML = "<p style='text-align:center;'>വിവരങ്ങൾ ശേഖരിക്കുന്നു...</p>";

    try {
        const snap = await db.collection("activity")
            .where("semester", "==", sem) // ആ സെമസ്റ്ററിലെ എല്ലാ ആക്ടിവിറ്റിയും എടുക്കുന്നു
            .orderBy("timestamp", "desc")
            .get();

        if(snap.empty) {
            list.innerHTML = "<p style='text-align:center; padding:20px; color:red;'>ഈ സെമസ്റ്ററിൽ കുട്ടികളുടെ വിവരങ്ങൾ ഒന്നും ലഭ്യമല്ല.</p>";
            return;
        }

        let html = `<h3 style="color:var(--main); border-bottom:2px solid #ddd; padding-bottom:10px;">Semester ${sem} - Attendance Tracker</h3>`;
        html += `<table style='width:100%; border-collapse:collapse; font-size:0.85rem; margin-top:15px;'>
                    <tr style='background:#f1f1f1;'>
                        <th style='padding:8px; text-align:left; border:1px solid #ddd;'>വിദ്യാർത്ഥി / സ്ഥലം</th>
                        <th style='padding:8px; text-align:center; border:1px solid #ddd;'>വിഭാഗം</th>
                    </tr>`;
        
        snap.forEach(doc => {
            const d = doc.data();
            html += `<tr>
                        <td style='padding:8px; border:1px solid #ddd;'>
                            <b>${d.studentName}</b><br>
                            <small>📍 ${d.studentPlace}</small>
                        </td>
                        <td style='padding:8px; text-align:center; border:1px solid #ddd; color:green;'>✅ ${d.type}</td>
                     </tr>`;
        });
        
        list.innerHTML = html + "</table>";
    } catch (error) {
        list.innerHTML = "<p style='color:red;'>Error: " + error.message + "</p>";
        console.error(error);
    }
}

// 1. കുട്ടികൾ ഓരോ ക്ലാസ്സും കാണുന്നത് രേഖപ്പെടുത്താൻ
async function trackActivity(contentId, type) {
    // അഡ്മിൻ ലോഗിൻ ചെയ്തിരിക്കുകയാണെങ്കിൽ ട്രാക്കിംഗ് വേണ്ട
    if (auth.currentUser && auth.currentUser.email && auth.currentUser.email.includes('admin')) return;

    try {
        await db.collection("activity").add({
            studentName: currentStudentName || "Unknown",
            studentPlace: currentStudentPlace || "Unknown",
            contentId: contentId,
            type: type, // Video, PDF, or Audio
            semester: selectedSem,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Activity tracked:", type);
    } catch (error) {
        console.error("Tracking Error:", error);
    }
}

// 2. അഡ്മിന് ഓരോ ക്ലാസ്സിനും നേരെ കുട്ടികളുടെ ലിസ്റ്റ് കാണാൻ
async function viewTracking(contentId, title) {
    const modal = document.getElementById('tracking-modal');
    const list = document.getElementById('tracking-list-content');
    
    if(!modal || !list) { 
        alert("ട്രാക്കിംഗ് മോഡൽ കണ്ടെത്തിയില്ല!"); 
        return; 
    }

    modal.style.display = 'flex';
    list.innerHTML = "<p style='text-align:center;'>വിവരങ്ങൾ ശേഖരിക്കുന്നു...</p>";

    try {
        // Query അല്പം കൂടി ലളിതമാക്കി (എറർ വരാതിരിക്കാൻ)
        const snap = await db.collection("activity")
            .where("contentId", "==", contentId)
            .get();

        if(snap.empty) {
            list.innerHTML = "<p style='text-align:center; padding:20px;'>ഈ ക്ലാസ്സ് ഇതുവരെ ആരും കണ്ടിട്ടില്ല.</p>";
            return;
        }

        // ഡാറ്റ ലഭിച്ച ശേഷം ജാവാസ്ക്രിപ്റ്റ് ഉപയോഗിച്ച് സോർട്ട് ചെയ്യുന്നു (Index Error ഒഴിവാക്കാൻ)
        const docs = snap.docs.map(doc => doc.data()).sort((a, b) => b.timestamp - a.timestamp);

        let html = `<p style='font-size:0.8rem; color:#555; margin-bottom:10px;'><b>ക്ലാസ്സ്:</b> ${title}</p>`;
        html += `<table style='width:100%; border-collapse:collapse; font-size:0.85rem;'>
                    <tr style='background:#f1f1f1;'>
                        <th style='padding:8px; text-align:left; border:1px solid #ddd;'>വിദ്യാർത്ഥി / സമയം</th>
                        <th style='padding:8px; text-align:center; border:1px solid #ddd;'>വിഭാഗം</th>
                    </tr>`;
        
        docs.forEach(d => {
            // സമയം ഫോർമാറ്റ് ചെയ്യുന്നു
            const timeStr = d.timestamp ? new Date(d.timestamp.toDate()).toLocaleString('en-GB', { 
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true 
            }) : '---';

            html += `<tr>
                        <td style='padding:8px; border:1px solid #ddd;'>
                            <b style="color:#1976d2;">${d.studentName}</b><br>
                            <small>📅 ${timeStr}</small><br>
                            <small>📍 ${d.studentPlace}</small>
                        </td>
                        <td style='padding:8px; text-align:center; border:1px solid #ddd;'>
                            <span style="background:#e8f5e9; color:green; padding:2px 5px; border-radius:4px; font-size:10px;">✅ ${d.type}</span>
                        </td>
                     </tr>`;
        });
        
        list.innerHTML = html + "</table>";
    } catch (error) {
        // യഥാർത്ഥ എറർ എന്താണെന്ന് അഡ്മിന് കാണിച്ചു കൊടുക്കുന്നു
        list.innerHTML = `<p style='color:red; padding:10px;'>Error: ${error.message}</p>`;
        console.error(error);
    }
}

// 3. അഡ്മിന് സെമസ്റ്റർ പേജിൽ നിന്ന് നേരിട്ട് ക്ലാസ്സ് ഡിലീറ്റ് ചെയ്യാൻ
async function deleteContent(id) {
    if(confirm("ഈ ക്ലാസ്സ് സ്ഥിരമായി ഒഴിവാക്കട്ടെ?")) {
        try {
            await db.collection("contents").doc(id).delete();
            alert("ക്ലാസ്സ് ഒഴിവാക്കി.");
            // loadContents() വഴി ലിസ്റ്റ് പുതുക്കുന്നു
        } catch (error) {
            alert("ഡിലീറ്റ് ചെയ്യുന്നതിൽ പരാജയം സംഭവിച്ചു.");
        }
    }
}
// 1. എഡിറ്റ് ഫോം തുറക്കാനുള്ള ഫങ്ക്ഷൻ
async function openEditContent(docId) {
    try {
        const doc = await db.collection("contents").doc(docId).get();
        if(!doc.exists) { alert("ഈ ക്ലാസ്സ് കണ്ടെത്താനായില്ല!"); return; }
        
        const d = doc.data();

        // എഡിറ്റ് ചെയ്യാനുള്ള പോപ്പ്അപ്പ് (Modal) ഉണ്ടാക്കുന്നു
        const html = `
            <div id="edit-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center;">
                <div style="background:white; padding:20px; border-radius:15px; width:90%; max-width:400px; max-height:90%; overflow-y:auto; box-shadow:0 5px 15px rgba(0,0,0,0.2);">
                    <h3 style="color:var(--main); margin-top:0;">Edit Class</h3>
                    
                    <input type="text" id="edit-subject" value="${d.subject || ''}" placeholder="വിഷയം">
                    <input type="text" id="edit-chapter" value="${d.chapter || ''}" placeholder="പാഠം">
                    <input type="text" id="edit-part" value="${d.part || ''}" placeholder="ഭാഗം (Optional)">
                    
                    <p style="margin:10px 0 0; font-size:0.8rem; color:#666;">ക്ലാസ്സ് തിയതി (ISO):</p>
                    <input type="datetime-local" id="edit-datetime" value="${d.displayDate ? d.displayDate.substring(0,16) : ''}">

                    <p style="margin:10px 0 0; font-size:0.75rem; color:#2e7d32; font-weight:bold;">വീഡിയോ ലിങ്കുകൾ (കോമ ഇട്ട് നൽകുക):</p>
                    <textarea id="edit-video" style="width:100%; min-height:60px;">${d.videoLinks || ''}</textarea>

                    <p style="margin:5px 0 0; font-size:0.75rem; color:#2e7d32; font-weight:bold;">ഓഡിയോ ലിങ്കുകൾ (കോമ ഇട്ട് നൽകുക):</p>
                    <textarea id="edit-audio" style="width:100%; min-height:60px;">${d.audioLinks || ''}</textarea>

                    <p style="margin:5px 0 0; font-size:0.75rem; color:#2e7d32; font-weight:bold;">PDF ലിങ്കുകൾ (കോമ ഇട്ട് നൽകുക):</p>
                    <textarea id="edit-pdf" style="width:100%; min-height:60px;">${d.pdfLinks || ''}</textarea>

                    <div style="display:flex; gap:10px; margin-top:15px;">
                        <button onclick="saveEditContent('${docId}')" class="primary-btn" style="background:#2e7d32; flex:1;">Save</button>
                        <button onclick="closeEditModal()" class="back-home-btn" style="flex:1; margin-top:0;">Cancel</button>
                    </div>
                </div>
            </div>`;

        // മോഡൽ ബോഡിയിലേക്ക് ചേർക്കുന്നു
        document.body.insertAdjacentHTML('beforeend', html);
    } catch (e) { alert("Error: " + e.message); }
}

// 2. മാറ്റങ്ങൾ സേവ് ചെയ്യാനുള്ള ഫങ്ക്ഷൻ
async function saveEditContent(docId) {
    const btn = event.target;
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        await db.collection("contents").doc(docId).update({
            subject: document.getElementById('edit-subject').value,
            chapter: document.getElementById('edit-chapter').value,
            part: document.getElementById('edit-part').value,
            displayDate: document.getElementById('edit-datetime').value,
            videoLinks: document.getElementById('edit-video').value,
            audioLinks: document.getElementById('edit-audio').value,
            pdfLinks: document.getElementById('edit-pdf').value,
            lastEdited: firebase.firestore.FieldValue.serverTimestamp() // എഡിറ്റ് ചെയ്ത സമയം രേഖപ്പെടുത്തുന്നു
        });
        alert("ക്ലാസ്സ് വിജയകരമായി പുതുക്കി!");
        closeEditModal();
        // loadContents() വഴിയോ loadAdminQuestions() വഴിയോ ലിസ്റ്റ് പുതുക്കുക
        if(typeof loadContents === 'function') loadContents();
    } catch (e) { alert("Error: " + e.message); btn.innerText = "Save"; btn.disabled = false; }
}

// 3. മോഡൽ അടയ്ക്കാനുള്ള ഫങ്ക്ഷൻ
function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if(modal) modal.remove();
}

// 4. അഡ്മിന് ആ സെമസ്റ്ററിലെ സംശയങ്ങൾ നേരിട്ട് കാണാൻ
function fetchDoubtsForCurrentSem() {
    alert(`സെമസ്റ്റർ ${selectedSem}-ലെ സംശയങ്ങൾ പരിശോധിക്കുന്നു...`);
    showSection('admin-screen'); // അഡ്മിൻ സ്ക്രീനിലേക്ക് കൊണ്ടുപോകുന്നു
    loadDoubtsForAdmin(); // അവിടെ സംശയങ്ങൾ ലോഡ് ചെയ്യുന്നു
}
// അഡ്മിന് ചോദ്യങ്ങൾ ലിസ്റ്റ് ചെയ്ത് കാണാൻ
// 1. ചോദ്യങ്ങൾ ലിസ്റ്റ് ചെയ്യാൻ
async function loadAdminQuestions() {
    const sem = selectedSem; 
    if(!sem || sem === 'admin') return;

    const listArea = document.getElementById('tracking-list-content');
    const modal = document.getElementById('tracking-modal');
    listArea.innerHTML = "<p style='text-align:center;'>ചോദ്യങ്ങൾ ലോഡ് ചെയ്യുന്നു...</p>";
    modal.style.display = 'flex';

    try {
        const snap = await db.collection("questions").where("semester", "==", parseInt(sem)).get();
        if(snap.empty) {
            listArea.innerHTML = "<p style='text-align:center; color:red; padding:20px;'>ഈ സെമസ്റ്ററിൽ ചോദ്യങ്ങൾ ഒന്നും കണ്ടെത്തിയില്ല.</p>";
            return;
        }

        let html = `<h3 style="color:#2e7d32; border-bottom:2px solid #eee; padding-bottom:10px; margin-bottom:20px;">Semester ${sem} - (${snap.size} Questions)</h3>`;
        
        snap.forEach(doc => {
            const d = doc.data();
            const qId = doc.id;
            html += `
            <div id="q-card-${qId}" style="border:1px solid #ddd; padding:15px; margin-bottom:15px; border-radius:12px; background:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                
                <div id="edit-form-${qId}" style="display:none; background:#f1f8e9; padding:15px; border-radius:8px;">
                    <label style="font-size:12px; font-weight:bold;">ചോദ്യം:</label>
                    <textarea id="edit-q-${qId}" style="width:100%; height:60px; margin:5px 0 15px 0; border-radius:5px; border:1px solid #ccc; padding:8px;">${d.text}</textarea>
                    
                    <label style="font-size:12px; font-weight:bold;">ഓപ്ഷനുകൾ:</label>
                    <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:5px;">
                        <input type="text" id="edit-opt0-${qId}" value="${d.options[0]}" style="flex:1; min-width:45%; padding:8px; border-radius:5px; border:1px solid #ccc;">
                        <input type="text" id="edit-opt1-${qId}" value="${d.options[1]}" style="flex:1; min-width:45%; padding:8px; border-radius:5px; border:1px solid #ccc;">
                        <input type="text" id="edit-opt2-${qId}" value="${d.options[2]}" style="flex:1; min-width:45%; padding:8px; border-radius:5px; border:1px solid #ccc;">
                        <input type="text" id="edit-opt3-${qId}" value="${d.options[3]}" style="flex:1; min-width:45%; padding:8px; border-radius:5px; border:1px solid #ccc;">
                    </div>

                    <label style="font-size:12px; font-weight:bold; display:block; margin-top:15px;">ശരിയായ ഉത്തരം:</label>
                    <select id="edit-idx-${qId}" style="width:100%; margin:5px 0 15px 0; padding:10px; border-radius:5px; border:1px solid #ccc;">
                        <option value="0" ${d.correctIndex === 0 ? 'selected' : ''}>Option 1 Correct</option>
                        <option value="1" ${d.correctIndex === 1 ? 'selected' : ''}>Option 2 Correct</option>
                        <option value="2" ${d.correctIndex === 2 ? 'selected' : ''}>Option 3 Correct</option>
                        <option value="3" ${d.correctIndex === 3 ? 'selected' : ''}>Option 4 Correct</option>
                    </select>

                    <button onclick="saveUpdatedQuestion('${qId}')" style="background:#2e7d32; color:white; border:none; padding:12px; width:100%; border-radius:8px; cursor:pointer; font-weight:bold;">Save Changes</button>
                    <button onclick="toggleEditDiv('${qId}')" style="background:none; color:gray; border:none; width:100%; margin-top:10px; cursor:pointer;">Cancel</button>
                </div>

                <div id="display-info-${qId}">
                    <p style="margin:0 0 12px 0; font-weight:bold; color:#333; font-size:1.1rem;">Q: ${d.text}</p>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                        <div style="padding:8px; border-radius:5px; background:${d.correctIndex === 0 ? '#e8f5e9' : '#f5f5f5'}; color:${d.correctIndex === 0 ? '#2e7d32' : '#666'}; font-weight:${d.correctIndex === 0 ? 'bold' : 'normal'}">1. ${d.options[0]}</div>
                        <div style="padding:8px; border-radius:5px; background:${d.correctIndex === 1 ? '#e8f5e9' : '#f5f5f5'}; color:${d.correctIndex === 1 ? '#2e7d32' : '#666'}; font-weight:${d.correctIndex === 1 ? 'bold' : 'normal'}">2. ${d.options[1]}</div>
                        <div style="padding:8px; border-radius:5px; background:${d.correctIndex === 2 ? '#e8f5e9' : '#f5f5f5'}; color:${d.correctIndex === 2 ? '#2e7d32' : '#666'}; font-weight:${d.correctIndex === 2 ? 'bold' : 'normal'}">3. ${d.options[2]}</div>
                        <div style="padding:8px; border-radius:5px; background:${d.correctIndex === 3 ? '#e8f5e9' : '#f5f5f5'}; color:${d.correctIndex === 3 ? '#2e7d32' : '#666'}; font-weight:${d.correctIndex === 3 ? 'bold' : 'normal'}">4. ${d.options[3]}</div>
                    </div>
                    <div style="margin-top:15px; display:flex; gap:10px;">
                        <button onclick="toggleEditDiv('${qId}')" style="background:#1976d2; color:white; border:none; padding:8px 20px; border-radius:6px; cursor:pointer;">Edit</button>
                        <button onclick="deleteSingleQuestion('${qId}')" style="background:#d32f2f; color:white; border:none; padding:8px 20px; border-radius:6px; cursor:pointer;">Delete</button>
                    </div>
                </div>
            </div>`;
        });
        listArea.innerHTML = html;
    } catch (e) { alert("Error: " + e.message); }
}

// 2. എഡിറ്റ് ബോക്സ് ടോഗിൾ ചെയ്യാൻ
function toggleEditDiv(id) {
    const form = document.getElementById(`edit-form-${id}`);
    const info = document.getElementById(`display-info-${id}`);
    const isHidden = form.style.display === 'none';
    form.style.display = isHidden ? 'block' : 'none';
    info.style.display = isHidden ? 'none' : 'block';
}

// 3. മാറ്റങ്ങൾ സേവ് ചെയ്യാൻ
async function saveUpdatedQuestion(id) {
    const btn = event.target;
    btn.disabled = true;
    btn.innerText = "Updating...";

    const text = document.getElementById(`edit-q-${id}`).value;
    const options = [
        document.getElementById(`edit-opt0-${id}`).value,
        document.getElementById(`edit-opt1-${id}`).value,
        document.getElementById(`edit-opt2-${id}`).value,
        document.getElementById(`edit-opt3-${id}`).value
    ];
    const correctIndex = parseInt(document.getElementById(`edit-idx-${id}`).value);

    try {
        await db.collection("questions").doc(id).update({
            text: text,
            options: options,
            correctIndex: correctIndex
        });
        alert("വിജയകരമായി പുതുക്കി!");
        loadAdminQuestions(); 
    } catch (e) { 
        alert("Error: " + e.message); 
        btn.disabled = false;
        btn.innerText = "Save Changes";
    }
}

// 4. ഡിലീറ്റ് ചെയ്യാൻ
async function deleteSingleQuestion(id) {
    if(!confirm("ഈ ചോദ്യം ഡിലീറ്റ് ചെയ്യണോ?")) return;
    try {
        await db.collection("questions").doc(id).delete();
        alert("ചോദ്യം ഡിലീറ്റ് ചെയ്തു.");
        loadAdminQuestions();
    } catch (e) { alert("Error: " + e.message); }
}

// പരീക്ഷ തുടങ്ങാനും നിർത്താനും (Exam Control)
function openExamManager() {
    const sem = selectedSem;
    if(!sem || sem === 'admin') return;

    const action = confirm(`Semester ${sem} പരീക്ഷ ആരംഭിക്കണോ? \n\n(ശ്രദ്ധിക്കുക: പരീക്ഷ തുടങ്ങിയാൽ കുട്ടികൾക്ക് വീഡിയോകൾ കാണാൻ കഴിയില്ല)`);
    
    if(action) {
        db.collection("settings").doc(`examMode_${sem}`).set({ active: true });
        alert("പരീക്ഷ ലൈവ് ആയി!");
    } else {
        if(confirm("പരീക്ഷ അവസാനിപ്പിക്കണോ?")) {
            db.collection("settings").doc(`examMode_${sem}`).set({ active: false });
            alert("പരീക്ഷ നിർത്തിവെച്ചു.");
        }
    }
}

function logout() {
    if(confirm("ലോഗൗട്ട് ചെയ്യട്ടെ?")) {
        // ഫോണിൽ സേവ് ചെയ്ത വിവരങ്ങൾ ഒഴിവാക്കുന്നു
        for(let i=1; i<=5; i++) {
            localStorage.removeItem(`isLoggedIn_S${i}`);
        }
        localStorage.removeItem('studentName');
        localStorage.removeItem('studentPlace');

        // ഫയർബേസിൽ നിന്ന് സൈൻ ഔട്ട് ചെയ്യുന്നു
        auth.signOut().then(() => {
            location.reload(); 
        });
    }
}

// ലോഗിൻ സ്റ്റാറ്റസ് എപ്പോഴും നിരീക്ഷിക്കാൻ (Auth Listener)
auth.onAuthStateChanged(user => {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutSidebar = document.getElementById('logout-btn-sidebar');
    
    if (user) {
        // ലോഗിൻ ചെയ്തിട്ടുണ്ടെങ്കിൽ ഏത് സ്ക്രീനിലായാലും ബട്ടൺ കാണിക്കും
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (logoutSidebar) logoutSidebar.style.display = 'block';
    } else {
        // ലോഗൗട്ട് ആണെങ്കിൽ ബട്ടൺ മറയ്ക്കും
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (logoutSidebar) logoutSidebar.style.display = 'none';
    }
});
// ചോദ്യങ്ങൾ സ്ക്രീനിൽ ഓരോന്നായി കാണിക്കാൻ
function renderQuestion() {
    const container = document.getElementById('question-container');
    if (!container) return;

    // എല്ലാ ചോദ്യങ്ങളും കഴിഞ്ഞോ എന്ന് നോക്കുന്നു
    if (currentQIndex >= questions.length) {
        finishExam();
        return;
    }

    const q = questions[currentQIndex];
    
    let html = `
        <div class="question-box" style="text-align:left; padding:15px;">
            <p style="font-weight:bold; font-size:1.1rem; margin-bottom:15px;">
                ${currentQIndex + 1}. ${q.text}
            </p>
            <div class="options-grid" style="display:grid; gap:10px;">
    `;

    q.options.forEach((opt, idx) => {
        if(opt) { // ഓപ്ഷൻ ഉണ്ടെങ്കിൽ മാത്രം ബട്ടൺ കാണിക്കുക
            html += `
                <button onclick="checkAnswer(${idx})" 
                    style="padding:12px; border:1px solid #ddd; border-radius:8px; background:white; cursor:pointer; text-align:left; font-size:1rem;">
                    ${opt}
                </button>`;
        }
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

// ഉത്തരം ശരിയാണോ എന്ന് നോക്കാൻ
function checkAnswer(selectedIdx) {
    const correct = questions[currentQIndex].correctIndex;
    if (selectedIdx === correct) {
        score++;
    }
    
    currentQIndex++;
    renderQuestion(); // അടുത്ത ചോദ്യത്തിലേക്ക് പോകുന്നു
}

// പരീക്ഷ അവസാനിക്കുമ്പോൾ റിസൾട്ട് സേവ് ചെയ്യാൻ
async function finishExam() {
    alert(`പരീക്ഷ അവസാനിച്ചു! നിങ്ങളുടെ സ്കോർ: ${score}/${questions.length}`);
    
    try {
        await db.collection("results").add({
            studentName: currentStudentName || "Unknown",
            studentPlace: currentStudentPlace || "Unknown",
            score: score,
            total: questions.length,
            semester: selectedSem,
            timestamp: new Date().getTime()
        });
        alert("നിങ്ങളുടെ മാർക്ക് വിജയകരമായി സേവ് ചെയ്തിട്ടുണ്ട്.");
        showSection('home-screen');
    } catch (e) {
        alert("റിസൾട്ട് സേവ് ചെയ്യുന്നതിൽ തകരാർ!");
    }
}
async function submitDoubt(docId, chapter) {
    const text = document.getElementById(`doubt-text-${docId}`).value;
    if(!text) return alert("സംശയം ടൈപ്പ് ചെയ്യുക!");

    try {
        await db.collection("doubts").add({
            studentName: localStorage.getItem('studentName') || "Unknown",
            semester: selectedSem,
            chapter: chapter,
            question: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            reply: ""
        });
        alert("നിങ്ങളുടെ സംശയം അയച്ചു!");
        document.getElementById(`doubt-text-${docId}`).value = "";
    } catch (e) { alert("Error: " + e.message); }
}

