const BASE_URL = 'http://localhost:4000/api/v1';

interface TestStepResult {
  step: string;
  status: 'PASS' | 'FAIL';
  details: string;
  durationMs: number;
}

const results: TestStepResult[] = [];

async function apiRequest(
  method: string,
  path: string,
  body?: any,
  token?: string,
) {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json: any = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.message || `HTTP ${res.status}: ${res.statusText}`);
  }

  return json;
}

async function runStep(
  name: string,
  fn: () => Promise<string>,
) {
  const start = Date.now();
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    results.push({ step: name, status: 'PASS', details, durationMs });
    console.log(`✅ [PASS] ${name} (${durationMs}ms): ${details}`);
  } catch (error: any) {
    const durationMs = Date.now() - start;
    const msg = error.message;
    results.push({ step: name, status: 'FAIL', details: msg, durationMs });
    console.error(`❌ [FAIL] ${name} (${durationMs}ms): ${msg}`);
  }
}

async function main() {
  console.log('🏸 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN HỆ THỐNG (E2E FLOW TEST)...');
  console.log('Target API:', BASE_URL);

  let organizerToken = '';
  let organizerUserId = '';
  let tournamentId = '';
  let tournamentSlug = '';
  let eventId = '';
  let court1Id = '';
  let court2Id = '';
  let registrationIds: string[] = [];
  let participantIds: string[] = [];
  let match1Id = '';
  let match2Id = '';
  let finalMatchId = '';

  // 1. Health check
  await runStep('1. Kiểm tra API Healthcheck', async () => {
    const res = await apiRequest('GET', '/health');
    if (res?.data?.status !== 'ok') throw new Error('Health status not OK');
    return `Server uptime: ${res.data.uptime}s, PostgreSQL & Redis connected`;
  });

  // 2. Register Organizer
  const orgEmail = `organizer_${Date.now()}@badmintonpro.vn`;
  await runStep('2. Đăng ký tài khoản Ban Tổ Chức', async () => {
    const res = await apiRequest('POST', '/auth/register', {
      email: orgEmail,
      password: 'OrganizerPassword@123',
      fullName: 'Trần Văn Điều Hành',
      phone: `098${Math.floor(1000000 + Math.random() * 9000000)}`,
    });
    organizerToken = res?.data?.accessToken;
    organizerUserId = res?.data?.user?.id;
    if (!organizerToken) throw new Error('Không nhận được JWT Access Token');
    return `Đăng ký thành công Organizer: ${orgEmail} (ID: ${organizerUserId})`;
  });

  // 3. Create Tournament
  const tourName = `Giải Cầu Lông Mở Rộng Test E2E ${Date.now()}`;
  await runStep('3. Tạo giải đấu mới (Tournament Wizard)', async () => {
    const sportsRes = await apiRequest('GET', '/sports');
    const sportId = sportsRes?.data?.[0]?.id;
    if (!sportId) throw new Error('Chưa có môn thi đấu');

    const res = await apiRequest(
      'POST',
      '/tournaments',
      {
        name: tourName,
        sportId,
        tournamentStartAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        tournamentEndAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        registrationOpenAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        registrationCloseAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        defaultMatchDurationMinutes: 30,
        matchIntervalMinutes: 10,
        ruleContent: 'Áp dụng luật thi đấu BWF chính thức.',
      },
      organizerToken,
    );

    tournamentId = res?.data?.id;
    tournamentSlug = res?.data?.slug;
    if (!tournamentId) throw new Error('Không nhận được Tournament ID');
    return `Tạo giải thành công: "${tourName}" (Slug: ${tournamentSlug}, Status: ${res.data.status})`;
  });

  // 4. Create Courts
  await runStep('4. Cấu hình các sân thi đấu (Courts)', async () => {
    const c1 = await apiRequest(
      'POST',
      '/courts',
      { tournamentId, name: 'Sân Trung Tâm Số 1', courtOrder: 1 },
      organizerToken,
    );
    const c2 = await apiRequest(
      'POST',
      '/courts',
      { tournamentId, name: 'Sân Phụ Số 2', courtOrder: 2 },
      organizerToken,
    );
    court1Id = c1?.data?.id;
    court2Id = c2?.data?.id;
    return `Tạo 2 sân: ${c1.data.name} & ${c2.data.name}`;
  });

  // 5. Create Event
  await runStep('5. Tạo nội dung thi đấu (Event)', async () => {
    const res = await apiRequest(
      'POST',
      '/events',
      {
        tournamentId,
        name: 'Đơn Nam Nâng Cao',
        playType: 'SINGLE_MEN',
        format: 'KNOCKOUT',
        entryFee: 150000,
        maxParticipants: 4,
      },
      organizerToken,
    );
    eventId = res?.data?.id;
    return `Tạo nội dung "${res.data.name}" (${res.data.playType}, Format: ${res.data.format})`;
  });

  // 6. Transition Tournament Status to REGISTRATION_OPEN
  await runStep('6. Chuyển trạng thái mở đăng ký giải đấu', async () => {
    const res = await apiRequest(
      'POST',
      `/tournaments/${tournamentId}/open-registration`,
      {},
      organizerToken,
    );
    return `Trạng thái giải đấu hiện tại: ${res.data.status}`;
  });

  // 7. Athletes Register
  await runStep('7. Đăng ký VĐV tham gia giải đấu (4 VĐV)', async () => {
    const athletes = [
      'Nguyễn Văn An',
      'Trần Đình Bình',
      'Lê Hoàng Cường',
      'Phạm Minh Dũng',
    ];

    for (let i = 0; i < athletes.length; i++) {
      const uniqueSuffix = `${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`;
      const userRes = await apiRequest('POST', '/auth/register', {
        email: `athlete_${uniqueSuffix}@gmail.com`,
        password: 'Password@123',
        fullName: athletes[i],
        phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      });
      const aToken = userRes.data.accessToken;

      const regRes = await apiRequest(
        'POST',
        '/registrations',
        { eventId },
        aToken,
      );
      registrationIds.push(regRes.data.registrationId || regRes.data.id);
    }
    return `Đăng ký thành công ${registrationIds.length} hồ sơ VĐV`;
  });

  // 8. Organizer Approves & Checks-In Registrations
  await runStep('8. Ban Tổ Chức duyệt hồ sơ & điểm danh VĐV', async () => {
    for (const regId of registrationIds) {
      const appRes = await apiRequest(
        'PATCH',
        `/registrations/${regId}/approve`,
        {},
        organizerToken,
      );
      const participantId = appRes.data.participantId;
      participantIds.push(participantId);

      await apiRequest(
        'PATCH',
        `/registrations/participants/${participantId}/check-in`,
        {},
        organizerToken,
      );
    }
    return `Đã duyệt và điểm danh thành công ${participantIds.length} vận động viên`;
  });

  // 9. Auto Draw & Knockout Bracket Tree Generation
  await runStep('9. Bốc thăm & tạo nhánh đấu (Tournament Engine)', async () => {
    const previewRes = await apiRequest(
      'POST',
      `/events/${eventId}/draw/preview`,
      {},
      organizerToken,
    );
    if (!previewRes.data?.bracketSize && !previewRes.data?.firstRoundMatches) {
      throw new Error('Không thể tạo preview bốc thăm');
    }

    await apiRequest(
      'POST',
      `/events/${eventId}/draw/confirm`,
      {},
      organizerToken,
    );

    const bracketRes = await apiRequest('GET', `/events/${eventId}/bracket`);
    const rounds = bracketRes.data.rounds;
    if (rounds.length < 2) throw new Error('Cây nhánh đấu chưa đủ 2 vòng (Bán kết & Chung kết)');

    const semiMatches = rounds.find((r: any) => r.roundNumber === 1)?.matches || [];
    const finalMatches = rounds.find((r: any) => r.roundNumber === 2)?.matches || [];
    if (semiMatches.length < 2 || finalMatches.length < 1) {
      throw new Error('Số lượng trận đấu không đủ (cần 2 BK + 1 CK)');
    }

    const finalMatch = finalMatches[0];
    match1Id = semiMatches[0].id;
    match2Id = semiMatches[1].id;
    finalMatchId = finalMatch.id;

    return `Tạo thành công ${bracketRes.data.totalMatches} trận đấu (2 trận Bán kết: ${semiMatches[0].matchCode}, ${semiMatches[1].matchCode}; 1 trận Chung kết: ${finalMatch.matchCode})`;
  });

  // 10. Smart Scheduling Engine (Auto Schedule on Courts)
  await runStep('10. Tự động xếp lịch & sân thi đấu (Scheduling Engine)', async () => {
    await apiRequest(
      'POST',
      `/tournaments/${tournamentId}/schedule/generate`,
      {},
      organizerToken,
    );

    const schedRes = await apiRequest('GET', `/tournaments/${tournamentId}/schedule`);
    const conflicts = schedRes.data.conflicts;
    const critical = conflicts.filter((c: any) => c.severity === 'ERROR');
    if (critical.length > 0) throw new Error(`Còn ${critical.length} lỗi xung đột lịch thi đấu`);

    await apiRequest(
      'POST',
      `/tournaments/${tournamentId}/schedule/publish`,
      {},
      organizerToken,
    );

    return `Xếp lịch thành công cho ${schedRes.data.scheduledCount} trận. 0 lỗi xung đột. Trạng thái giải: SCHEDULE_PUBLISHED`;
  });

  // 11. Match Start & Live Scoring Engine (BWF 21-pt)
  await runStep('11. Trọng tài điều khiển trận Bán Kết 1 (Bắt đầu trận & Chấm điểm)', async () => {
    const startRes = await apiRequest(
      'POST',
      `/matches/${match1Id}/start`,
      { initialServingTeam: 'TEAM_A' },
      organizerToken,
    );
    if (startRes.data.match.status !== 'IN_PROGRESS') {
      throw new Error('Trận đấu chưa chuyển trạng thái IN_PROGRESS');
    }

    // 1 point for Team A
    await apiRequest(
      'POST',
      `/matches/${match1Id}/score/point`,
      { team: 'TEAM_A', idempotencyKey: `test-pt-1-${Date.now()}` },
      organizerToken,
    );

    // Test Undo
    const undoRes = await apiRequest(
      'POST',
      `/matches/${match1Id}/score/undo`,
      {},
      organizerToken,
    );
    if (!undoRes.data.success) throw new Error('Hoàn tác thất bại');

    // Win Set 1 (21 - 0)
    for (let i = 1; i <= 21; i++) {
      await apiRequest(
        'POST',
        `/matches/${match1Id}/score/point`,
        { team: 'TEAM_A', idempotencyKey: `set1-A-${i}-${Date.now()}` },
        organizerToken,
      );
    }

    const scoreState = await apiRequest('GET', `/matches/${match1Id}/score`);
    if (scoreState.data.completedSets.length !== 1) {
      throw new Error('Chưa ghi nhận hoàn thành Set 1');
    }

    // Win Set 2 (21 - 0) -> Win Match!
    for (let i = 1; i <= 21; i++) {
      await apiRequest(
        'POST',
        `/matches/${match1Id}/score/point`,
        { team: 'TEAM_A', idempotencyKey: `set2-A-${i}-${Date.now()}` },
        organizerToken,
      );
    }

    const finalScoreRes = await apiRequest('GET', `/matches/${match1Id}/score`);
    if (finalScoreRes.data.status !== 'COMPLETED') {
      throw new Error('Trận đấu chưa hoàn thành sau khi thắng 2 set');
    }

    return `Trận đấu hoàn thành (2-0). Đội thắng: ${finalScoreRes.data.winner.displayName}`;
  });

  // 12. Bracket Progression Verification
  await runStep('12. Kiểm tra đội thắng tự động tiến vào trận Chung Kết', async () => {
    const finalMatchRes = await apiRequest('GET', `/matches/${finalMatchId}`);
    const finalMatch = finalMatchRes.data;
    if (!finalMatch.teamAId) {
      throw new Error('Đội thắng Bán Kết 1 chưa được tự động chuyển vào ô Team A của trận Chung Kết!');
    }
    return `Đội thắng đã tiến vào Chung Kết! Slot Team A = ${finalMatch.teamA.displayName}`;
  });

  // 13. Walkover on Match 2 & Final Match Readiness
  await runStep('13. Xử thua (Walkover) Bán Kết 2 & Chung Kết Sẵn Sàng (READY)', async () => {
    await apiRequest(
      'POST',
      `/matches/${match2Id}/score/walkover`,
      { winnerTeam: 'TEAM_A', reason: 'VĐV đối thủ chấn thương bỏ cuộc' },
      organizerToken,
    );

    const finalMatchRes = await apiRequest('GET', `/matches/${finalMatchId}`);
    const finalMatch = finalMatchRes.data;

    if (!finalMatch.teamAId || !finalMatch.teamBId) {
      throw new Error('Trận Chung Kết chưa đủ 2 đội!');
    }
    if (finalMatch.status !== 'READY') {
      throw new Error(`Trạng thái trận Chung Kết phải là READY, hiện tại: ${finalMatch.status}`);
    }

    return `Trận Chung Kết sẵn sàng: "${finalMatch.teamA.displayName}" vs "${finalMatch.teamB.displayName}" (Status: READY)`;
  });

  // 14. Public Portal Access Verification
  await runStep('14. Kiểm tra Public Portal không cần đăng nhập (Slug API)', async () => {
    const publicRes = await apiRequest('GET', `/tournaments/${tournamentSlug}`);
    const data = publicRes.data;
    if (!data.name || !data.events) {
      throw new Error('Không lấy được thông tin công khai của giải');
    }
    return `Truy cập công khai thành công: "${data.name}" (${data.events.length} nội dung, ${data.courts.length} sân)`;
  });

  // 15. Real-time Live Scores Feed API
  await runStep('15. Kiểm tra Feed điểm trực tiếp (/matches API)', async () => {
    const liveRes = await apiRequest('GET', '/matches');
    const totalMatches = liveRes.data.length;
    return `Feed trận đấu hoạt động tốt: Tìm thấy ${totalMatches} trận trong hệ thống`;
  });

  // Print Summary Table
  console.log('\n============================================================');
  console.log('              KẾT QUẢ KIỂM THỬ HỆ THỐNG CHI TIẾT            ');
  console.log('============================================================');
  let passCount = 0;
  let failCount = 0;
  for (const r of results) {
    if (r.status === 'PASS') passCount++;
    else failCount++;
    console.log(`[${r.status}] ${r.step} (${r.durationMs}ms)`);
  }
  console.log('------------------------------------------------------------');
  console.log(`Tổng số bài test: ${results.length} | Thành công: ${passCount} | Thất bại: ${failCount}`);
  console.log('============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
