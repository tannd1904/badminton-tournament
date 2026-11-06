import {
  PrismaClient,
  UserRole,
  UserStatus,
  StaffRole,
  CheckInStatus,
  RegistrationStatus,
  TournamentStatus,
  PlayType,
  EventFormat,
  MatchStatus,
  NextMatchSlot,
  ScoreEventType,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BadmintonPro Database Seeding...');

  // 1. Sport
  const badminton = await prisma.sport.upsert({
    where: { code: 'BADMINTON' },
    update: {},
    create: {
      name: 'Cầu Lông',
      code: 'BADMINTON',
      description: 'Môn cầu lông thi đấu theo luật BWF tiêu chuẩn quốc tế.',
    },
  });
  console.log('✅ Sport seeded:', badminton.name);

  // 2. Users
  const passwordHash = await argon2.hash('Password@123');
  const userPasswordHash = await argon2.hash('Password@123');

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@badmintonpro.vn' },
    update: { passwordHash },
    create: {
      email: 'admin@badmintonpro.vn',
      passwordHash,
      fullName: 'Nguyễn Văn Quản Trị',
      phone: '0901234567',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const organizer1 = await prisma.user.upsert({
    where: { email: 'organizer1@badmintonpro.vn' },
    update: { passwordHash: userPasswordHash },
    create: {
      email: 'organizer1@badmintonpro.vn',
      passwordHash: userPasswordHash,
      fullName: 'Trần Ban Tổ Chức',
      phone: '0912345678',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.upsert({
    where: { email: 'organizer@badmintonpro.vn' },
    update: { passwordHash: userPasswordHash },
    create: {
      email: 'organizer@badmintonpro.vn',
      passwordHash: userPasswordHash,
      fullName: 'Trần Ban Tổ Chức',
      phone: '0912345679',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
  });

  const referees = [];
  for (let i = 1; i <= 4; i++) {
    const ref = await prisma.user.upsert({
      where: { email: `referee${i}@badmintonpro.vn` },
      update: {},
      create: {
        email: `referee${i}@badmintonpro.vn`,
        passwordHash: userPasswordHash,
        fullName: `Trọng Tài ${i} - Lê Văn ${String.fromCharCode(64 + i)}`,
        phone: `092233445${i}`,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      },
    });
    referees.push(ref);
  }

  const athleteNames = [
    'Nguyễn Tiến Minh', 'Nguyễn Hải Đăng', 'Lê Đức Phát', 'Phạm Cao Cường',
    'Vũ Thị Trang', 'Nguyễn Thùy Linh', 'Đỗ Tuấn Đức', 'Phạm Như Thảo',
    'Trần Hoàng Nam', 'Lê Quốc Bảo', 'Phan Văn Phong', 'Đinh Quang Huy',
    'Hoàng Thế Anh', 'Bùi Minh Trí', 'Võ Trọng Tín', 'Đặng Xuân Trường'
  ];

  const athletes = [];
  for (let i = 0; i < athleteNames.length; i++) {
    const athlete = await prisma.user.upsert({
      where: { email: `athlete${i + 1}@gmail.com` },
      update: {},
      create: {
        email: `athlete${i + 1}@gmail.com`,
        passwordHash: userPasswordHash,
        fullName: athleteNames[i],
        phone: `09334455${(i + 10).toString().padStart(2, '0')}`,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      },
    });
    athletes.push(athlete);
  }
  console.log(`✅ Seeded Super Admin, Organizer, ${referees.length} Referees, ${athletes.length} Athletes`);

  // 3. Clubs
  const clubData = [
    { name: 'CLB Cầu Lông Hà Nội Master', code: 'HN-MASTER' },
    { name: 'CLB Cầu Lông Red Star', code: 'RED-STAR' },
    { name: 'CLB Cầu Lông Sài Gòn Open', code: 'SG-OPEN' },
    { name: 'CLB Cầu Lông Kỳ Hòa', code: 'KY-HOA' },
  ];

  const clubs = [];
  for (const c of clubData) {
    let club = await prisma.club.findFirst({ where: { name: c.name } });
    if (!club) {
      club = await prisma.club.create({
        data: {
          name: c.name,
          code: c.code,
        },
      });
    }
    clubs.push(club);
  }
  console.log(`✅ Seeded ${clubs.length} Clubs`);

  // 4. Venues & Courts
  let venue1 = await prisma.venue.findFirst({ where: { name: 'Nhà Thi Đấu Cầu Giấy' } });
  if (!venue1) {
    venue1 = await prisma.venue.create({
      data: {
        name: 'Nhà Thi Đấu Cầu Giấy',
        address: '35 Trần Quý Kiên, Cầu Giấy, Hà Nội',
        city: 'Hà Nội',
      },
    });
  }

  // 5. Tournament 1 (Live & Scheduled)
  const tour1Slug = 'giai-cau-long-vo-dich-mo-rong-toan-quoc-2026';
  let tour1 = await prisma.tournament.findUnique({ where: { slug: tour1Slug } });

  const now = new Date();
  const startDay = new Date(now.getTime() - 24 * 3600 * 1000);
  const endDay = new Date(now.getTime() + 48 * 3600 * 1000);

  if (!tour1) {
    tour1 = await prisma.tournament.create({
      data: {
        name: 'Giải Cầu Lông Vô Địch Mở Rộng Toàn Quốc 2026',
        slug: tour1Slug,
        sportId: badminton.id,
        venueId: venue1.id,
        totalCourts: 4,
        status: TournamentStatus.IN_PROGRESS,
        createdBy: organizer1.id,
        registrationOpenAt: new Date(now.getTime() - 14 * 24 * 3600 * 1000),
        registrationCloseAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
        tournamentStartAt: startDay,
        tournamentEndAt: endDay,
        defaultMatchDurationMinutes: 35,
        matchIntervalMinutes: 15,
        ruleContent: 'Giải đấu áp dụng luật thi đấu cầu lông hiện hành của BWF. Mỗi trận đấu thi đấu 3 ván thắng 2 (21 điểm).',
      },
    });

    // Courts for Tournament 1
    const courtRecords = [];
    for (let c = 1; c <= 4; c++) {
      const court = await prisma.court.create({
        data: {
          tournamentId: tour1.id,
          venueId: venue1.id,
          name: `Sân Thi Đấu Số ${c}`,
          courtOrder: c,
        },
      });
      courtRecords.push(court);
    }

    // Staff for Tournament 1
    await prisma.tournamentStaff.createMany({
      data: [
        { tournamentId: tour1.id, userId: organizer1.id, role: StaffRole.ORGANIZER },
        { tournamentId: tour1.id, userId: referees[0].id, role: StaffRole.REFEREE },
        { tournamentId: tour1.id, userId: referees[1].id, role: StaffRole.REFEREE },
        { tournamentId: tour1.id, userId: referees[2].id, role: StaffRole.REFEREE },
      ],
    });

    // Events for Tournament 1
    const eventSingles = await prisma.event.create({
      data: {
        tournamentId: tour1.id,
        name: 'Đơn Nam Nâng Cao',
        playType: PlayType.SINGLE_MEN,
        format: EventFormat.KNOCKOUT,
        entryFee: 300000,
        maxParticipants: 8,
      },
    });

    // Seed 8 participants for Singles
    const participants = [];
    for (let p = 0; p < 8; p++) {
      const athlete = athletes[p];
      const club = clubs[p % clubs.length];
      const participant = await prisma.participant.create({
        data: {
          eventId: eventSingles.id,
          displayName: athlete.fullName,
          clubId: club.id,
          isSeeded: p < 2,
          seedNumber: p < 2 ? p + 1 : null,
          registrationStatus: RegistrationStatus.APPROVED,
          checkInStatus: CheckInStatus.CHECKED_IN,
          members: {
            create: {
              userId: athlete.id,
              playerNameSnapshot: athlete.fullName,
              memberOrder: 1,
            },
          },
        },
      });
      participants.push(participant);
    }

    // Seed Knockout Matches
    const finalMatch = await prisma.match.create({
      data: {
        eventId: eventSingles.id,
        matchCode: 'MS-F-01',
        roundName: 'Chung Kết',
        roundNumber: 3,
        bracketPosition: 1,
        courtId: courtRecords[0].id,
        status: MatchStatus.SCHEDULED,
        scheduledStartTime: new Date(now.getTime() + 24 * 3600 * 1000),
      },
    });

    const semi1 = await prisma.match.create({
      data: {
        eventId: eventSingles.id,
        matchCode: 'MS-SF-01',
        roundName: 'Bán Kết 1',
        roundNumber: 2,
        bracketPosition: 1,
        courtId: courtRecords[0].id,
        status: MatchStatus.SCHEDULED,
        nextMatchId: finalMatch.id,
        nextMatchSlot: NextMatchSlot.TEAM_A,
        scheduledStartTime: new Date(now.getTime() + 12 * 3600 * 1000),
      },
    });

    const semi2 = await prisma.match.create({
      data: {
        eventId: eventSingles.id,
        matchCode: 'MS-SF-02',
        roundName: 'Bán Kết 2',
        roundNumber: 2,
        bracketPosition: 2,
        courtId: courtRecords[1].id,
        status: MatchStatus.SCHEDULED,
        nextMatchId: finalMatch.id,
        nextMatchSlot: NextMatchSlot.TEAM_B,
        scheduledStartTime: new Date(now.getTime() + 13 * 3600 * 1000),
      },
    });

    // Match 1: Completed
    const match1 = await prisma.match.create({
      data: {
        eventId: eventSingles.id,
        matchCode: 'MS-QF-01',
        roundName: 'Tứ Kết 1',
        roundNumber: 1,
        bracketPosition: 1,
        courtId: courtRecords[0].id,
        teamAId: participants[0].id,
        teamBId: participants[1].id,
        winnerId: participants[0].id,
        status: MatchStatus.COMPLETED,
        refereeUserId: referees[0].id,
        nextMatchId: semi1.id,
        nextMatchSlot: NextMatchSlot.TEAM_A,
        scheduledStartTime: new Date(now.getTime() - 2 * 3600 * 1000),
        actualStartTime: new Date(now.getTime() - 2 * 3600 * 1000),
        actualEndTime: new Date(now.getTime() - 1 * 3600 * 1000),
        sets: {
          create: [
            {
              setNumber: 1,
              scoreTeamA: 21,
              scoreTeamB: 17,
              servingTeam: 'TEAM_A',
              winningTeamId: participants[0].id,
              completedAt: new Date(now.getTime() - 100 * 60 * 1000),
            },
            {
              setNumber: 2,
              scoreTeamA: 21,
              scoreTeamB: 18,
              servingTeam: 'TEAM_A',
              winningTeamId: participants[0].id,
              completedAt: new Date(now.getTime() - 65 * 60 * 1000),
            },
          ],
        },
      },
    });

    await prisma.match.update({
      where: { id: semi1.id },
      data: { teamAId: participants[0].id },
    });

    // Match 2: LIVE NOW on Court 1!
    await prisma.match.create({
      data: {
        eventId: eventSingles.id,
        matchCode: 'MS-QF-02',
        roundName: 'Tứ Kết 2',
        roundNumber: 1,
        bracketPosition: 2,
        courtId: courtRecords[0].id,
        teamAId: participants[2].id,
        teamBId: participants[3].id,
        status: MatchStatus.IN_PROGRESS,
        refereeUserId: referees[0].id,
        nextMatchId: semi1.id,
        nextMatchSlot: NextMatchSlot.TEAM_B,
        scheduledStartTime: new Date(now.getTime() - 20 * 60 * 1000),
        actualStartTime: new Date(now.getTime() - 20 * 60 * 1000),
        sets: {
          create: [
            {
              setNumber: 1,
              scoreTeamA: 19,
              scoreTeamB: 18,
              servingTeam: 'TEAM_A',
            },
          ],
        },
        scoreEvents: {
          create: [
            {
              setNumber: 1,
              eventType: ScoreEventType.POINT_ADDED,
              team: 'TEAM_A',
              scoreTeamA: 19,
              scoreTeamB: 18,
              servingTeam: 'TEAM_A',
              createdBy: referees[0].id,
              idempotencyKey: `seed-pt-${match1.id}-19-18`,
            },
          ],
        },
      },
    });

    // Match 3 & 4 (READY)
    await prisma.match.create({
      data: {
        eventId: eventSingles.id,
        matchCode: 'MS-QF-03',
        roundName: 'Tứ Kết 3',
        roundNumber: 1,
        bracketPosition: 3,
        courtId: courtRecords[1].id,
        teamAId: participants[4].id,
        teamBId: participants[5].id,
        status: MatchStatus.READY,
        refereeUserId: referees[1].id,
        nextMatchId: semi2.id,
        nextMatchSlot: NextMatchSlot.TEAM_A,
        scheduledStartTime: new Date(now.getTime() + 60 * 60 * 1000),
      },
    });

    await prisma.match.create({
      data: {
        eventId: eventSingles.id,
        matchCode: 'MS-QF-04',
        roundName: 'Tứ Kết 4',
        roundNumber: 1,
        bracketPosition: 4,
        courtId: courtRecords[1].id,
        teamAId: participants[6].id,
        teamBId: participants[7].id,
        status: MatchStatus.READY,
        refereeUserId: referees[2].id,
        nextMatchId: semi2.id,
        nextMatchSlot: NextMatchSlot.TEAM_B,
        scheduledStartTime: new Date(now.getTime() + 120 * 60 * 1000),
      },
    });

    console.log(`✅ Tournament 1 (Live & Scheduled) created with matches!`);
  }

  // 6. Tournament 2 (Registration Open)
  const tour2Slug = 'giai-cau-long-tre-toan-quoc-mua-he-2026';
  let tour2 = await prisma.tournament.findUnique({ where: { slug: tour2Slug } });

  if (!tour2) {
    tour2 = await prisma.tournament.create({
      data: {
        name: 'Giải Cầu Lông Trẻ Toàn Quốc Mùa Hè 2026',
        slug: tour2Slug,
        sportId: badminton.id,
        totalCourts: 4,
        status: TournamentStatus.REGISTRATION_OPEN,
        createdBy: organizer1.id,
        registrationOpenAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
        registrationCloseAt: new Date(now.getTime() + 14 * 24 * 3600 * 1000),
        tournamentStartAt: new Date(now.getTime() + 20 * 24 * 3600 * 1000),
        tournamentEndAt: new Date(now.getTime() + 25 * 24 * 3600 * 1000),
        defaultMatchDurationMinutes: 30,
        matchIntervalMinutes: 15,
        ruleContent: 'Giải đấu phong trào dành cho các tay vợt U15 - U19 toàn quốc.',
        events: {
          create: [
            {
              name: 'Đơn Nam U17',
              playType: PlayType.SINGLE_MEN,
              format: EventFormat.KNOCKOUT,
              entryFee: 200000,
              maxParticipants: 16,
            },
            {
              name: 'Đôi Nam Nữ U19',
              playType: PlayType.DOUBLE_MIXED,
              format: EventFormat.KNOCKOUT,
              entryFee: 350000,
              maxParticipants: 16,
            },
          ],
        },
      },
    });
    console.log(`✅ Tournament 2 (Registration Open) created!`);
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
