// frontend/test-routes.mjs
const routes = [
  { path: '/', label: 'Home Page' },
  { path: '/live', label: 'Live Scores Hub' },
  { path: '/tournaments', label: 'Tournament Discovery' },
  { path: '/tournaments/giai-cau-long-vo-dich-mo-rong-toan-quoc-2026', label: 'Public Tournament Details' },
  { path: '/umpire', label: 'Referee Scoreboard Hub' },
  { path: '/login', label: 'Sign In Page' },
  { path: '/register', label: 'Sign Up Page' },
  { path: '/admin', label: 'System Admin Portal' },
  { path: '/organizer/tournaments/create', label: 'Organizer Tournament Wizard' },
];

async function checkRoutes() {
  console.log('🌐 KIỂM TRA TẤT CẢ CÁC TRANG FRONTEND NEXT.JS (PORT 3000)...');
  let pass = 0;
  let fail = 0;

  for (const r of routes) {
    const url = `http://localhost:3000${r.path}`;
    const start = Date.now();
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'E2E-Tester' } });
      const duration = Date.now() - start;
      if (res.status === 200 || res.status === 307 || res.status === 308) {
        console.log(`✅ [HTTP ${res.status}] ${r.label} (${r.path}) - ${duration}ms`);
        pass++;
      } else {
        console.log(`❌ [HTTP ${res.status}] ${r.label} (${r.path}) - ${duration}ms`);
        fail++;
      }
    } catch (err) {
      console.log(`❌ [ERROR] ${r.label} (${r.path}): ${err.message}`);
      fail++;
    }
  }

  console.log(`\nKết quả kiểm tra Frontend: ${pass}/${routes.length} trang phản hồi thành công.`);
  if (fail > 0) process.exit(1);
}

checkRoutes();

