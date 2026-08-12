export const INITIAL_LOCATIONS = [
  {
    id: 'pms',
    name: "Putra Mahkota–Southville Interchange",
    direction: "Northbound",
    status: 'active',
    mode: 'scheduled',
    phase: 2,
    phaseLabel: 'Activation',
    elapsedSeconds: 862,
    ps: '14:24:00',
    pe: '15:24:00',
    los: 'D',
    trafficFlow: 'Congested',
    incidents: 0,
    thresholdArmed: true,
    nextRun: '—',
    equipment: { cctv: [6, 7], avds: [5, 5], lcs: [6, 6], vms: [2, 2], miniVms: [3, 3] },
    gantries: [
      { km: 'KM1.95NB', type: 'CCTV', status: 'ok' },
      { km: 'ET1.72@STA', type: 'CCTV', status: 'ok' },
      { km: 'STA I/C', type: 'CCTV', status: 'ok' },
      { km: 'KM4.5SB', type: 'CCTV', status: 'ok' },
      { km: 'KM5.9NB', type: 'CCTV', status: 'ok' },
      { km: 'KM7.0NB', type: 'CCTV', status: 'ok' },
      { km: 'KM8.2NB', type: 'CCTV', status: 'fault' }
    ],
    lcs: [
      { km: 'KM3.8NB', open: true },
      { km: 'KM4.18NB', open: true },
      { km: 'KM5.35NB', open: true },
      { km: 'KM6.5NB', open: true },
      { km: 'KM7.5NB', open: true },
      { km: 'KM8.4NB', open: true }
    ],
    traffic: [
      { km: 'KM3.8NB', spd: 75, vol: 53, occ: 17 },
      { km: 'KM4.18NB', spd: 74, vol: 42, occ: 16 },
      { km: 'KM5.35NB', spd: 85, vol: 48, occ: 12 },
      { km: 'KM6.5NB', spd: 79, vol: 40, occ: 16 },
      { km: 'KM7.5NB', spd: 89, vol: 46, occ: 12 },
      { km: 'KM8.4NB', spd: 81, vol: 44, occ: 14 }
    ],
    // Standard Entry & Exit VMS (Buka / Tutup stretch)
    vms: [
      { id: 'vms-entry', type: 'Entry VMS (Buka)', km: 'KM3.5NB', position: 'Entry', status: 'Good', msg: 'SMARTLANE BERMULA', msg2: 'MULA GUNAKAN LORONG KECEMASAN' },
      { id: 'vms-exit', type: 'Exit VMS (Tutup)', km: 'KM8.6NB', position: 'Exit', status: 'Good', msg: 'SMARTLANE TAMAT', msg2: 'MASUK KEMBALI KE LORONG UTAMA' }
    ],
    // Mini VMS along intermediate main body intervals
    miniVms: [
      { id: 'mvms-1', type: 'Mini VMS', km: 'KM4.91NB', position: 'Intermediate', status: 'Good', msg: 'HATI-HATI', msg2: 'KETIKA MEMANDU' },
      { id: 'mvms-2', type: 'Mini VMS', km: 'KM6.0NB', position: 'Intermediate', status: 'Good', msg: 'JALUR KECEMASAN', msg2: 'DIBUKA SEMENTARA' },
      { id: 'mvms-3', type: 'Mini VMS', km: 'KM7.2NB', position: 'Intermediate', status: 'Warning', msg: 'PATUHI HAD LAJU', msg2: '60 KM/J DI LORONG KECEMASAN' }
    ],
    cctv: ['KM1.95NB', 'ET1.72@STA', 'STA I/C', 'KM4.5SB', 'KM5.9NB', 'KM7.0NB'],
    alarms: [
      { sev: 'warning', title: 'AVDS KM7.5NB — sensor signal degraded', time: '14:31:02' }
    ]
  },
  {
    id: 'dopg',
    name: "Dato' Onn–Pasir Gudang Interchange",
    direction: "Northbound",
    status: 'inactive',
    mode: 'scheduled',
    phase: 0,
    phaseLabel: 'Standby',
    elapsedSeconds: 0,
    ps: '—',
    pe: '—',
    los: 'A',
    trafficFlow: 'Normal',
    incidents: 0,
    thresholdArmed: true,
    nextRun: '10 Aug 2026, 22:00',
    equipment: { cctv: [7, 7], avds: [5, 5], lcs: [6, 6], vms: [2, 2], miniVms: [2, 2] },
    gantries: [
      { km: 'KM22.0NB', type: 'CCTV', status: 'ok' },
      { km: 'KM22.9NB', type: 'CCTV', status: 'ok' },
      { km: 'JBB I/C', type: 'CCTV', status: 'ok' },
      { km: 'KM25.1SB', type: 'CCTV', status: 'ok' },
      { km: 'KM26.4NB', type: 'CCTV', status: 'ok' },
      { km: 'KM27.8NB', type: 'CCTV', status: 'ok' },
      { km: 'KM28.6NB', type: 'CCTV', status: 'ok' }
    ],
    lcs: [
      { km: 'KM23.6NB', open: false },
      { km: 'KM24.1NB', open: false },
      { km: 'KM25.0NB', open: false },
      { km: 'KM26.2NB', open: false },
      { km: 'KM27.3NB', open: false },
      { km: 'KM28.4NB', open: false }
    ],
    traffic: [
      { km: 'KM23.6NB', spd: 98, vol: 21, occ: 5 },
      { km: 'KM24.1NB', spd: 101, vol: 19, occ: 4 },
      { km: 'KM25.0NB', spd: 97, vol: 24, occ: 6 },
      { km: 'KM26.2NB', spd: 99, vol: 20, occ: 5 },
      { km: 'KM27.3NB', spd: 100, vol: 18, occ: 4 },
      { km: 'KM28.4NB', spd: 96, vol: 22, occ: 5 }
    ],
    vms: [
      { id: 'vms-entry', type: 'Entry VMS (Buka)', km: 'KM23.0NB', position: 'Entry', status: 'Good', msg: 'SMARTLANE DITUTUP', msg2: 'LORONG KECEMASAN DIHUTANG' },
      { id: 'vms-exit', type: 'Exit VMS (Tutup)', km: 'KM28.8NB', position: 'Exit', status: 'Good', msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' }
    ],
    miniVms: [
      { id: 'mvms-1', type: 'Mini VMS', km: 'KM24.0NB', position: 'Intermediate', status: 'Good', msg: 'LALUAN LANCAR', msg2: 'PATUHI HAD LAJU' },
      { id: 'mvms-2', type: 'Mini VMS', km: 'KM27.0NB', position: 'Intermediate', status: 'Good', msg: 'MEMBANGUN MALAYSIA', msg2: 'MADANI' }
    ],
    cctv: ['KM22.0NB', 'KM22.9NB', 'JBB I/C', 'KM25.1SB', 'KM26.4NB', 'KM27.8NB'],
    alarms: []
  },
  {
    id: 'sbj',
    name: "Sungai Bakap Layby–Jawi Interchange",
    direction: "Northbound",
    status: 'inactive',
    mode: 'manual',
    phase: 0,
    phaseLabel: 'Standby',
    elapsedSeconds: 0,
    ps: '—',
    pe: '—',
    los: 'B',
    trafficFlow: 'Normal',
    incidents: 0,
    thresholdArmed: false,
    nextRun: '—',
    equipment: { cctv: [5, 6], avds: [5, 5], lcs: [5, 5], vms: [2, 2], miniVms: [2, 2] },
    gantries: [
      { km: 'KM45.0NB', type: 'CCTV', status: 'ok' },
      { km: 'KM46.2NB', type: 'CCTV', status: 'fault' },
      { km: 'LAYBY I/C', type: 'CCTV', status: 'ok' },
      { km: 'KM48.3SB', type: 'CCTV', status: 'ok' },
      { km: 'KM49.6NB', type: 'CCTV', status: 'ok' },
      { km: 'KM51.0NB', type: 'CCTV', status: 'ok' }
    ],
    lcs: [
      { km: 'KM46.5NB', open: false },
      { km: 'KM47.4NB', open: false },
      { km: 'KM48.6NB', open: false },
      { km: 'KM49.8NB', open: false },
      { km: 'KM50.9NB', open: false }
    ],
    traffic: [
      { km: 'KM46.5NB', spd: 92, vol: 28, occ: 8 },
      { km: 'KM47.4NB', spd: 90, vol: 31, occ: 9 },
      { km: 'KM48.6NB', spd: 88, vol: 33, occ: 10 },
      { km: 'KM49.8NB', spd: 91, vol: 27, occ: 8 },
      { km: 'KM50.9NB', spd: 93, vol: 25, occ: 7 }
    ],
    vms: [
      { id: 'vms-entry', type: 'Entry VMS (Buka)', km: 'KM46.0NB', position: 'Entry', status: 'Good', msg: 'SMARTLANE DITUTUP', msg2: 'STANDBY' },
      { id: 'vms-exit', type: 'Exit VMS (Tutup)', km: 'KM51.2NB', position: 'Exit', status: 'Good', msg: 'SMARTLANE DITUTUP', msg2: 'STANDBY' }
    ],
    miniVms: [
      { id: 'mvms-1', type: 'Mini VMS', km: 'KM47.0NB', position: 'Intermediate', status: 'Good', msg: 'JARAK SELAMAT', msg2: 'ELAK PEMANDUAN LARIAN' }
    ],
    cctv: ['KM45.0NB', 'KM46.2NB', 'LAYBY I/C', 'KM48.3SB', 'KM49.6NB', 'KM51.0NB'],
    alarms: [
      { sev: 'critical', title: 'CCTV KM46.2NB — camera offline', time: '13:58:41' }
    ]
  },
  {
    id: 'bsd',
    name: "Bertam–Sg. Dua Plaza",
    direction: "Northbound",
    status: 'pending',
    mode: 'automated',
    phase: 0,
    phaseLabel: 'Congestion threshold exceeded',
    elapsedSeconds: 0,
    ps: '—',
    pe: '—',
    los: 'C',
    trafficFlow: 'Building',
    incidents: 0,
    thresholdArmed: true,
    nextRun: 'Awaiting operator decision',
    equipment: { cctv: [6, 6], avds: [4, 4], lcs: [5, 5], vms: [2, 2], miniVms: [1, 1] },
    gantries: [
      { km: 'KM60.0NB', type: 'CCTV', status: 'ok' },
      { km: 'KM61.3NB', type: 'CCTV', status: 'ok' },
      { km: 'BERTAM I/C', type: 'CCTV', status: 'ok' },
      { km: 'KM63.5SB', type: 'CCTV', status: 'ok' },
      { km: 'KM64.9NB', type: 'CCTV', status: 'ok' },
      { km: 'KM66.0NB', type: 'CCTV', status: 'ok' }
    ],
    lcs: [
      { km: 'KM61.6NB', open: false },
      { km: 'KM62.5NB', open: false },
      { km: 'KM63.7NB', open: false },
      { km: 'KM64.9NB', open: false },
      { km: 'KM66.0NB', open: false }
    ],
    traffic: [
      { km: 'KM61.6NB', spd: 52, vol: 64, occ: 34 },
      { km: 'KM62.5NB', spd: 49, vol: 68, occ: 37 },
      { km: 'KM63.7NB', spd: 47, vol: 71, occ: 39 },
      { km: 'KM64.9NB', spd: 51, vol: 66, occ: 35 },
      { km: 'KM66.0NB', spd: 54, vol: 60, occ: 31 }
    ],
    vms: [
      { id: 'vms-entry', type: 'Entry VMS (Buka)', km: 'KM61.0NB', position: 'Entry', status: 'Good', msg: 'KESESAKAN DIKESAN', msg2: 'JALUR KECEMASAN BERSEDIA' },
      { id: 'vms-exit', type: 'Exit VMS (Tutup)', km: 'KM66.5NB', position: 'Exit', status: 'Good', msg: 'KESESAKAN DIKESAN', msg2: 'BERSEDIA MASUK' }
    ],
    miniVms: [
      { id: 'mvms-1', type: 'Mini VMS', km: 'KM62.0NB', position: 'Intermediate', status: 'Good', msg: 'KESESAKAN DIKESAN', msg2: 'PATUHI ARAHAN' }
    ],
    cctv: ['KM60.0NB', 'KM61.3NB', 'BERTAM I/C', 'KM63.5SB', 'KM64.9NB', 'KM66.0NB'],
    alarms: []
  }
];

export const SCHEDULE_ITEMS = [
  { time: 'Today 17:00 – 19:30', name: 'Peak Hours — Evening Northbound', mode: 'Scheduled', status: 'Upcoming' },
  { time: 'Today 07:00 – 09:30', name: 'Peak Hours — Morning Northbound', mode: 'Scheduled', status: 'Completed' },
  { time: 'Yesterday 17:00 – 19:30', name: 'Peak Hours — Evening Northbound', mode: 'Scheduled', status: 'Completed' }
];

export const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const LOG_ENTRIES = [
  { time: '14:31:02', sev: 'warning', mod: 'AVDS', event: 'Sensor signal degraded — KM7.5NB', user: 'system' },
  { time: '14:24:00', sev: 'operation', mod: 'SMARTLANE', event: 'Activated manually by operator', user: 'admin' },
  { time: '13:58:41', sev: 'critical', mod: 'CCTV', event: 'Camera offline — KM46.2NB', user: 'system' },
  { time: '12:10:15', sev: 'operation', mod: 'LCS', event: 'Bulk state updated to MATCH_LANE', user: 'admin' }
];

export const REPORT_TYPES = [
  { title: 'Activation Summary & Compliance', desc: 'Operating hours, manual overrides, LOS impact' },
  { title: 'Equipment Availability Log', desc: 'Uptime, CCTV/AVDS status & fault resolution times' },
  { title: 'Incident & Alarm History', desc: 'Detailed log of alarms, breakdown events and actions' }
];

export const RECENT_REPORTS = [
  { name: 'Smartlane_Weekly_PutraMahkota_W32.pdf' },
  { name: 'Smartlane_Monthly_Compliance_Jul2026.pdf' }
];

export function fmtElapsed(s) {
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}
