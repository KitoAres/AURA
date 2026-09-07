// --- 1. BASE DE DATOS LOCAL ---
const DEFAULT_DB = {
  "sudo": { id: "sudo", pass: "sudo123", role: "sudo", name: "Super Admin" },
  "admin1": { id: "admin1", pass: "123", role: "admin", name: "Instructor GACIP" },
  "1001": { 
    id: "1001", pass: "123", role: "user", name: "Cadete 1001", stars: 0, asistencia: [],
    test: { iia: 0, iic: 0, mi: 0, ei: 0, ci: 0 }, feedback: "Aún no hay feedback."
  }
};

let db = JSON.parse(localStorage.getItem('gacip_db')) || DEFAULT_DB;
let currentUser = null;
let html5QrcodeScanner = null;
let radarChart = null;

function saveDB() { localStorage.setItem('gacip_db', JSON.stringify(db)); }

// --- 2. SISTEMA DE LOGIN Y RUTAS ---
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('login-id').value.trim();
  const pass = document.getElementById('login-pass').value;
  
  if (db[id] && db[id].pass === pass) {
    currentUser = db[id];
    document.getElementById('login-view').classList.remove('active');
    document.getElementById('dashboard-view').classList.add('active');
    setupDashboard();
  } else {
    const err = document.getElementById('login-error');
    err.classList.remove('hidden');
    setTimeout(() => err.classList.add('hidden'), 3000);
  }
});

document.getElementById('btn-logout').addEventListener('click', () => {
  currentUser = null;
  document.getElementById('dashboard-view').classList.remove('active');
  document.getElementById('login-view').classList.add('active');
  if(html5QrcodeScanner) html5QrcodeScanner.clear();
});

// --- 3. DASHBOARD Y MENÚS SEGÚN ROL ---
function setupDashboard() {
  document.getElementById('nav-name').innerText = currentUser.name;
  document.getElementById('nav-role').innerText = currentUser.role.toUpperCase();
  const navLinks = document.getElementById('nav-links');
  navLinks.innerHTML = '';

  if (currentUser.role === 'sudo') {
    navLinks.innerHTML = `<li onclick="loadView('sudo-users')">👥 Gestionar Usuarios</li>`;
    loadView('sudo-users');
  } else if (currentUser.role === 'admin') {
    navLinks.innerHTML = `
      <li onclick="loadView('admin-scan')">📷 Escanear Asistencia</li>
      <li onclick="loadView('admin-test')">📊 Evaluar Test MLQ</li>
      <li onclick="loadView('admin-feedback')">📝 Escribir Feedback</li>
      <li onclick="loadView('ranking')">🏆 Ranking General</li>`;
    loadView('admin-scan');
  } else if (currentUser.role === 'user') {
    navLinks.innerHTML = `
      <li onclick="loadView('user-profile')">🧠 Mi Perfil y Test</li>
      <li onclick="loadView('ranking')">🏆 Ranking General</li>`;
    loadView('user-profile');
  }
}

// --- 4. RENDERIZADO DE VISTAS ---
function loadView(view) {
  const main = document.getElementById('main-content');
  if(html5QrcodeScanner) { html5QrcodeScanner.clear(); html5QrcodeScanner = null; }

  if (view === 'sudo-users') {
    let trs = Object.values(db).filter(u => u.role !== 'sudo').map(u => `
      <tr>
        <td>${u.id}</td><td>${u.name}</td><td>${u.role}</td>
        <td><button onclick="deleteUser('${u.id}')" class="btn-outline">Borrar</button></td>
      </tr>`).join('');
    
    main.innerHTML = `
      <h2 class="section-title">Control de Usuarios (SUDO)</h2>
      <div class="glass-card">
        <h3>Añadir Nuevo</h3><br>
        <div class="grid-2">
          <input type="text" id="new-id" placeholder="ID (Ej. 1002)">
          <select id="new-role"><option value="user">Cadete (Usuario)</option><option value="admin">Instructor (Admin)</option></select>
          <input type="text" id="new-name" placeholder="Nombre (Opcional)">
          <button onclick="addUser()" class="btn-glow">Crear Usuario</button>
        </div>
      </div>
      <table><tr><th>ID</th><th>Nombre</th><th>Rol</th><th>Acción</th></tr>${trs}</table>`;
  }

  if (view === 'admin-scan') {
    main.innerHTML = `
      <h2 class="section-title">Asistencia y Estrellas</h2>
      <div class="grid-2">
        <div class="glass-card">
          <h3>Escanear QR</h3>
          <div id="reader"></div>
          <button onclick="startScanner()" class="btn-glow" style="margin-top:1rem;">Activar Cámara</button>
        </div>
        <div class="glass-card">
          <h3>Asignar Estrella Manual</h3>
          <p>Por participación o destacar en la sesión.</p><br>
          <input type="text" id="manual-id" placeholder="ID del Cadete"><br><br>
          <button onclick="addStar()" class="btn-glow">Dar 1 Estrella ⭐</button>
        </div>
      </div>`;
  }

  if (view === 'admin-test') {
    let options = Object.values(db).filter(u => u.role === 'user').map(u => `<option value="${u.id}">${u.id} - ${u.name}</option>`).join('');
    main.innerHTML = `
      <h2 class="section-title">Evaluación Liderazgo Transformacional</h2>
      <div class="glass-card">
        <select id="test-user">${options}</select><br><br>
        <div class="grid-2">
          <div class="input-group"><label>1. Inf. Idealizada (Atributos) [0-10]</label><input type="number" id="t-iia" max="10"></div>
          <div class="input-group"><label>2. Inf. Idealizada (Conductas) [0-10]</label><input type="number" id="t-iic" max="10"></div>
          <div class="input-group"><label>3. Motivación Inspiracional [0-10]</label><input type="number" id="t-mi" max="10"></div>
          <div class="input-group"><label>4. Estimulación Intelectual [0-10]</label><input type="number" id="t-ei" max="10"></div>
          <div class="input-group"><label>5. Consideración Individualizada [0-10]</label><input type="number" id="t-ci" max="10"></div>
        </div>
        <button onclick="saveTest()" class="btn-glow">Guardar Resultados</button>
      </div>`;
  }

  if (view === 'admin-feedback') {
    let options = Object.values(db).filter(u => u.role === 'user').map(u => `<option value="${u.id}">${u.id} - ${u.name}</option>`).join('');
    main.innerHTML = `
      <h2 class="section-title">Feedback Final</h2>
      <div class="glass-card">
        <select id="feed-user">${options}</select><br><br>
        <textarea id="feed-text" rows="5" placeholder="Escribe el progreso, áreas de mejora tras las 8 sesiones..."></textarea><br><br>
        <button onclick="saveFeedback()" class="btn-glow">Guardar Feedback</button>
      </div>`;
  }

  if (view === 'user-profile') {
    main.innerHTML = `
      <h2 class="section-title">Análisis de Perfil</h2>
      <div class="grid-2">
        <div class="chart-container">
          <canvas id="radarChart"></canvas>
        </div>
        <div class="glass-card">
          <h3>Tus Logros</h3>
          <h1 style="font-size:4rem; color:var(--gold)">${currentUser.stars} ⭐</h1>
          <p>Asistencias registradas: ${currentUser.asistencia.length}</p>
          <hr style="border-color:var(--border); margin: 2rem 0;">
          <h3>Feedback del Instructor</h3>
          <p style="color:var(--primary); font-style:italic; margin-top:1rem;">"${currentUser.feedback}"</p>
        </div>
      </div>`;
    renderChart(currentUser.test);
  }

  if (view === 'ranking') {
    let users = Object.values(db).filter(u => u.role === 'user').sort((a,b) => b.stars - a.stars);
    let trs = users.map((u, i) => `
      <tr>
        <td><h1>${i+1}</h1></td>
        <td>${u.name || u.id}</td>
        <td style="color:var(--gold); font-size:1.5rem; font-weight:bold;">${u.stars} ⭐</td>
      </tr>`).join('');
    main.innerHTML = `<h2 class="section-title">Ranking de Liderazgo</h2><table>${trs}</table>`;
  }
}

// --- 5. FUNCIONES LÓGICAS ---
function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function addUser() {
  const id = document.getElementById('new-id').value.trim();
  const role = document.getElementById('new-role').value;
  const name = document.getElementById('new-name').value || `Cadete ${id}`;
  if(!id) return;
  db[id] = { id, pass: "123", role, name, stars: 0, asistencia: [], test: {iia:0, iic:0, mi:0, ei:0, ci:0}, feedback: "" };
  saveDB(); showToast("Usuario añadido"); loadView('sudo-users');
}

function deleteUser(id) {
  delete db[id]; saveDB(); loadView('sudo-users'); showToast("Usuario eliminado");
}

function startScanner() {
  html5QrcodeScanner = new Html5Qrcode("reader");
  html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, 
    (txt) => {
      let id = txt.trim();
      if(db[id] && db[id].role === 'user') {
        const hoy = new Date().toLocaleDateString();
        if(!db[id].asistencia.includes(hoy)) {
          db[id].asistencia.push(hoy);
          db[id].stars += 1;
          saveDB();
          showToast(`✅ Asistencia y 1⭐ para ${db[id].name}`);
        } else {
          showToast(`⚠️ ${db[id].name} ya fue registrado hoy.`);
        }
      } else { showToast("❌ QR no reconocido."); }
      html5QrcodeScanner.stop();
    }
  );
}

function addStar() {
  let id = document.getElementById('manual-id').value.trim();
  if(db[id] && db[id].role === 'user') {
    db[id].stars += 1; saveDB(); showToast(`⭐ Estrella otorgada a ${db[id].name}`);
  } else { showToast("Usuario no encontrado."); }
}

function saveTest() {
  let id = document.getElementById('test-user').value;
  db[id].test = {
    iia: Number(document.getElementById('t-iia').value) || 0,
    iic: Number(document.getElementById('t-iic').value) || 0,
    mi: Number(document.getElementById('t-mi').value) || 0,
    ei: Number(document.getElementById('t-ei').value) || 0,
    ci: Number(document.getElementById('t-ci').value) || 0
  };
  saveDB(); showToast("Test Guardado");
}

function saveFeedback() {
  let id = document.getElementById('feed-user').value;
  db[id].feedback = document.getElementById('feed-text').value;
  saveDB(); showToast("Feedback Guardado");
}

function renderChart(testScores) {
  if (radarChart) radarChart.destroy();
  const ctx = document.getElementById('radarChart').getContext('2d');
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Inf. Idealizada (Atributos)', 'Inf. Idealizada (Conductas)', 'Motivación Inspiracional', 'Estimulación Intelectual', 'Consideración Individualizada'],
      datasets: [{
        label: 'Perfil de Liderazgo',
        data: [testScores.iia, testScores.iic, testScores.mi, testScores.ei, testScores.ci],
        backgroundColor: 'rgba(56, 189, 248, 0.4)', borderColor: '#38bdf8', pointBackgroundColor: '#fbbf24', pointBorderColor: '#fff', borderWidth: 2
      }]
    },
    options: {
      scales: { r: { angleLines: { color: 'rgba(255,255,255,0.2)' }, grid: { color: 'rgba(255,255,255,0.2)' }, pointLabels: { color: '#f8fafc', font: {size: 12} }, suggestedMin: 0, suggestedMax: 10 } },
      plugins: { legend: { labels: { color: '#fff' } } }
    }
  });
}
