export interface UsageEvent {
  id: string;
  type: 'visit' | 'pdf_download' | 'excel_download' | 'eokul_copy';
  level: string;
  grade: number;
  subject: string;
  classBranch?: string; // e.g. "9-A"
  schoolName?: string;
  studentCount?: number;
  timestamp: string;
}

export interface AnalyticsSummary {
  totalVisits: number;
  totalPdfExports: number;
  totalExcelExports: number;
  totalEOkulCopies: number;
  totalExports: number;
  levelCounts: { ortaokul: number; lise: number };
  gradeCounts: { [grade: number]: number };
  subjectCounts: { [subject: string]: number };
  recentEvents: UsageEvent[];
  isGlobalLive?: boolean;
}

const GLOBAL_API_BASE = 'https://countapi.mileshilliard.com/api/v1';
const PREFIX = 'oyss_not_baremi_v1_';
const STORAGE_KEY = 'oyss_app_analytics';

// Default state
const defaultAnalytics: AnalyticsSummary = {
  totalVisits: 0,
  totalPdfExports: 0,
  totalExcelExports: 0,
  totalEOkulCopies: 0,
  totalExports: 0,
  levelCounts: { ortaokul: 0, lise: 0 },
  gradeCounts: { 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
  subjectCounts: { 'Matematik': 0 },
  recentEvents: [],
  isGlobalLive: false,
};

export function getLocalAnalytics(): AnalyticsSummary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultAnalytics,
        ...parsed,
        levelCounts: { ...defaultAnalytics.levelCounts, ...(parsed.levelCounts || {}) },
        gradeCounts: { ...defaultAnalytics.gradeCounts, ...(parsed.gradeCounts || {}) },
        subjectCounts: { ...defaultAnalytics.subjectCounts, ...(parsed.subjectCounts || {}) },
      };
    }
  } catch (e) {
    console.error(e);
  }
  return defaultAnalytics;
}

export function saveLocalAnalytics(data: AnalyticsSummary) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

/**
 * Hits a global counter key without blocking
 */
async function hitGlobalKey(key: string): Promise<number | null> {
  try {
    const res = await fetch(`${GLOBAL_API_BASE}/hit/${PREFIX}${key}`);
    if (res.ok) {
      const data = await res.json();
      return typeof data.value === 'number' ? data.value : null;
    }
  } catch (e) {
    // silently ignore network issues
  }
  return null;
}

/**
 * Gets a global counter key value
 */
async function getGlobalKey(key: string): Promise<number> {
  try {
    const res = await fetch(`${GLOBAL_API_BASE}/get/${PREFIX}${key}`);
    if (res.ok) {
      const data = await res.json();
      return typeof data.value === 'number' ? data.value : 0;
    }
  } catch (e) {
    // fallback
  }
  return 0;
}

export interface TrackEventMeta {
  level?: string;
  grade?: number;
  subject?: string;
  studentCount?: number;
  classBranch?: string;
  schoolName?: string;
}

/**
 * Tracks an event globally across all users (works on Vercel) and locally
 */
export async function trackEvent(
  type: UsageEvent['type'],
  meta?: TrackEventMeta
) {
  // 1. Update local storage
  const current = getLocalAnalytics();
  let level = meta?.level || 'ortaokul';
  let grade = meta?.grade || 6;
  const subject = meta?.subject || 'Matematik';
  const classBranch = meta?.classBranch;
  const schoolName = meta?.schoolName;

  // Intelligently infer grade from entered classBranch if user typed "9-A", "10-C", etc.
  if (classBranch) {
    const numMatch = classBranch.match(/^(\d+)/);
    if (numMatch && numMatch[1]) {
      const parsedG = parseInt(numMatch[1], 10);
      if (parsedG >= 5 && parsedG <= 12) {
        grade = parsedG;
        level = parsedG >= 9 ? 'lise' : 'ortaokul';
      }
    }
  }

  if (type === 'visit') {
    // prevent multiple visit increments in the same session
    try {
      if (sessionStorage.getItem('oyss_session_counted') === 'true') {
        return;
      }
      sessionStorage.setItem('oyss_session_counted', 'true');
    } catch (e) {}
    current.totalVisits += 1;
    hitGlobalKey('visits');
  }

  if (type === 'pdf_download') {
    current.totalPdfExports += 1;
    current.totalExports += 1;
    hitGlobalKey('pdf_exports');
    hitGlobalKey('total_exports');
    hitGlobalKey(`level_${level}`);
    hitGlobalKey(`grade_${grade}`);
  }

  if (type === 'excel_download') {
    current.totalExcelExports += 1;
    current.totalExports += 1;
    hitGlobalKey('excel_exports');
    hitGlobalKey('total_exports');
    hitGlobalKey(`level_${level}`);
    hitGlobalKey(`grade_${grade}`);
  }

  if (type === 'eokul_copy') {
    current.totalEOkulCopies += 1;
    current.totalExports += 1;
    hitGlobalKey('eokul_copies');
    hitGlobalKey('total_exports');
    hitGlobalKey(`level_${level}`);
    hitGlobalKey(`grade_${grade}`);
  }

  if (level === 'ortaokul' || level === 'lise') {
    current.levelCounts[level] = (current.levelCounts[level] || 0) + 1;
  }

  current.gradeCounts[grade] = (current.gradeCounts[grade] || 0) + 1;
  current.subjectCounts[subject] = (current.subjectCounts[subject] || 0) + 1;

  const newEvent: UsageEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    level,
    grade,
    subject,
    classBranch,
    schoolName,
    studentCount: meta?.studentCount,
    timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
  };

  current.recentEvents = [newEvent, ...(current.recentEvents || [])].slice(0, 30);
  saveLocalAnalytics(current);
}

/**
 * Fetches real-time global analytics from the cloud without needing to log in to Vercel!
 */
export async function fetchGlobalAnalytics(): Promise<AnalyticsSummary> {
  const local = getLocalAnalytics();

  try {
    const [
      visits,
      pdfExports,
      excelExports,
      eokulCopies,
      totalExports,
      ortaokul,
      lise,
      g5, g6, g7, g8, g9, g10, g11, g12,
    ] = await Promise.all([
      getGlobalKey('visits'),
      getGlobalKey('pdf_exports'),
      getGlobalKey('excel_exports'),
      getGlobalKey('eokul_copies'),
      getGlobalKey('total_exports'),
      getGlobalKey('level_ortaokul'),
      getGlobalKey('level_lise'),
      getGlobalKey('grade_5'),
      getGlobalKey('grade_6'),
      getGlobalKey('grade_7'),
      getGlobalKey('grade_8'),
      getGlobalKey('grade_9'),
      getGlobalKey('grade_10'),
      getGlobalKey('grade_11'),
      getGlobalKey('grade_12'),
    ]);

    // If global counts are returned, combine/use them
    const globalSummary: AnalyticsSummary = {
      totalVisits: Math.max(visits, local.totalVisits),
      totalPdfExports: Math.max(pdfExports, local.totalPdfExports),
      totalExcelExports: Math.max(excelExports, local.totalExcelExports),
      totalEOkulCopies: Math.max(eokulCopies, local.totalEOkulCopies),
      totalExports: Math.max(totalExports, local.totalExports),
      levelCounts: {
        ortaokul: Math.max(ortaokul, local.levelCounts.ortaokul || 0),
        lise: Math.max(lise, local.levelCounts.lise || 0),
      },
      gradeCounts: {
        5: Math.max(g5, local.gradeCounts[5] || 0),
        6: Math.max(g6, local.gradeCounts[6] || 0),
        7: Math.max(g7, local.gradeCounts[7] || 0),
        8: Math.max(g8, local.gradeCounts[8] || 0),
        9: Math.max(g9, local.gradeCounts[9] || 0),
        10: Math.max(g10, local.gradeCounts[10] || 0),
        11: Math.max(g11, local.gradeCounts[11] || 0),
        12: Math.max(g12, local.gradeCounts[12] || 0),
      },
      subjectCounts: local.subjectCounts,
      recentEvents: local.recentEvents,
      isGlobalLive: true,
    };

    saveLocalAnalytics(globalSummary);
    return globalSummary;
  } catch (err) {
    console.error('Error fetching global analytics:', err);
    return { ...local, isGlobalLive: false };
  }
}

export function resetAnalytics() {
  saveLocalAnalytics(defaultAnalytics);
}
