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

// 1. LOGIN FUNCTION (യൂസർനെയിം മാത്രം നൽകിയാൽ മതി)
async function login() {
    const inputVal = document.getElementById('email').value; // 'admin111' or 'Aslam313'
    const pass = document.getElementById('password').value;

    if (!inputVal || !pass) {
        alert("യൂസർനെയിമും പാസ്‌വേർഡും നൽകുക");
        return;
    }

    // യൂസർനെയിമിനെ ഇമെയിൽ രൂപത്തിലേക്ക് മാറ്റുന്നു
    const email = inputVal.includes("@") ? inputVal : inputVal + "@alrashida.com";

    try {
        await auth.signInWithEmailAndPassword(email, pass);
        
        // അഡ്മിൻ ലോഗിൻ പരിശോധന
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

// സെക്ഷനുകൾ മാറ്റാനുള്ള ഫങ്ക്ഷൻ
function showSection(id) {
    const sections = ['login-screen', 'admin-screen', 'student-screen'];
    sections.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById(id);
    if (target) target.style.display = 'block';
}

// 2. ADMIN: പുതിയ ചോദ്യം ചേർക്കാൻ
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
            text, 
            options, 
            correctIndex: correctIdx, 
            timestamp: Date.now()
        });
        alert("ചോദ്യം ഡാറ്റാബേസിൽ സേവ് ചെയ്തു!");
        // ഫോം ക്ലിയർ ചെയ്യാൻ
        document.getElementById('q-text-input').value = "";
        options.forEach((_, i) => document.getElementById('opt'+i).value = "");
    } catch (e) { alert("Error: ചോദ്യം ചേർക്കാൻ കഴിഞ്ഞില്ല."); }
}

// 3. ADMIN: പരീക്ഷാ നിയന്ത്രണം
function toggleExam(status) {
    db.collection("settings").doc("examMode").set({ active: status })
    .then(() => alert("പരീക്ഷാ മോഡ്: " + (status ? "തുടങ്ങി" : "അവസാനിപ്പിച്ചു")));
}

function publishResult(status) {
    db.collection("settings").doc("resultSettings").set({ published: status })
    .then(() => alert("റിസൾട്ട് പബ്ലിഷ് ചെയ്തു."));
}

// 4. STUDENT: പരീക്ഷാ സുരക്ഷാ ക്രമീകരണം
function initStudentApp() {
    // പരീക്ഷ തുടങ്ങുന്നോ എന്ന് ലൈവ് ആയി ശ്രദ്ധിക്കുന്നു
    db.collection("settings").doc("examMode").onSnapshot(doc => {
        const data = doc.data();
        
        if (data && data.active === true) {
            // പരീക്ഷ തുടങ്ങിയാൽ ചോദ്യങ്ങൾ ലോഡ് ചെയ്യുക
            document.getElementById('class-list').style.display = 'none';
            document.getElementById('exam-box').style.display = 'block';
            startExam(); 
        } else {
            // പരീക്ഷാ സമയമല്ലെങ്കിൽ ചോദ്യങ്ങൾ ഡിലീറ്റ് ചെയ്യുക
            document.getElementById('class-list').style.display = 'block';
            document.getElementById('exam-box').style.display = 'none';
            questions = []; // മെമ്മറി ക്ലിയർ ചെയ്യുന്നു
            checkResultPublished();
        }
    });
}

async function startExam() {
    // പരീക്ഷാ മോഡ് ON ആകുമ്പോൾ മാത്രം ചോദ്യങ്ങൾ ഡൗൺലോഡ് ചെയ്യുന്നു
    const snap = await db.collection("questions").orderBy("timestamp").get();
    questions = snap.docs.map(d => d.data());
    if(questions.length > 0) {
        currentQIndex = 0;
        score = 0;
        showQuestion();
    } else {
        alert("ചോദ്യങ്ങൾ തയ്യാറായിട്ടില്ല!");
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
    alert("നിങ്ങളുടെ ഉത്തരങ്ങൾ സേവ് ചെയ്തു. പരീക്ഷ അവസാനിച്ചു.");
    location.reload();
}

function checkResultPublished() {
    db.collection("settings").doc("resultSettings").onSnapshot(async doc => {
        const data = doc.data();
        if (data && data.published) {
            const res = await db.collection("results").doc(auth.currentUser.uid).get();
            if (res.exists) {
                document.getElementById('student-result-card').style.display = 'block';
                document.getElementById('user-score').innerText = `${res.data().score} / ${questions.length || 100}`;
            }
        }
    });
}

function logout() { auth.signOut(); location.reload(); }
