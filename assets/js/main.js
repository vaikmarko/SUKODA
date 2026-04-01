import Alpine from 'alpinejs';
import '../css/main.css';

const TALLINN_TIME_ZONE = 'Europe/Tallinn';

function getDatePartsInTimeZone(dateLike, timeZone = TALLINN_TIME_ZONE) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = {};
  for (const { type, value } of formatter.formatToParts(date)) {
    if (type !== 'literal') parts[type] = value;
  }

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? '0' : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function parseOffsetMinutes(offsetLabel) {
  const match = /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(offsetLabel || '');
  if (!match) return null;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || '0');
  return sign * ((hours * 60) + minutes);
}

function getTimeZoneOffsetMinutes(dateLike, timeZone = TALLINN_TIME_ZONE) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const timeZoneName = offsetFormatter.formatToParts(date).find((part) => part.type === 'timeZoneName')?.value;
  const parsedOffset = parseOffsetMinutes(timeZoneName);
  if (parsedOffset !== null) return parsedOffset;

  const parts = getDatePartsInTimeZone(date, timeZone);
  const asUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtcMs - date.getTime()) / 60000);
}

function resolveLocalDateTimeToIso(dateStr, timeStr, timeZone = TALLINN_TIME_ZONE) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeStr || '');
  if (!dateMatch || !timeMatch) {
    throw new Error('Invalid date or time');
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const wallClockUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);

  let resolvedMs = wallClockUtcMs;
  for (let i = 0; i < 4; i += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(new Date(resolvedMs), timeZone);
    const nextMs = wallClockUtcMs - (offsetMinutes * 60 * 1000);
    if (nextMs === resolvedMs) break;
    resolvedMs = nextMs;
  }

  const candidates = Array.from(new Set([
    resolvedMs,
    resolvedMs - (60 * 60 * 1000),
    resolvedMs + (60 * 60 * 1000),
  ])).filter((candidateMs) => {
    const candidateParts = getDatePartsInTimeZone(new Date(candidateMs), timeZone);
    return (
      candidateParts.year === year &&
      candidateParts.month === month &&
      candidateParts.day === day &&
      candidateParts.hour === hour &&
      candidateParts.minute === minute
    );
  }).sort((a, b) => a - b);

  if (candidates.length === 0) {
    throw new Error('Invalid Tallinn local time');
  }

  return new Date(candidates[0]).toISOString();
}

function formatDateInTimeZone(dateLike, locale, options = {}, timeZone = TALLINN_TIME_ZONE) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return date.toLocaleDateString(locale, { ...options, timeZone });
}

function formatTimeInTimeZone(dateLike, locale, options = {}, timeZone = TALLINN_TIME_ZONE) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return date.toLocaleTimeString(locale, { ...options, timeZone });
}

function getDateStringInTimeZone(dateLike = new Date(), timeZone = TALLINN_TIME_ZONE) {
  const parts = getDatePartsInTimeZone(dateLike, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function shiftDateString(dateStr, days) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getYearMonthInTimeZone(dateLike = new Date(), timeZone = TALLINN_TIME_ZONE) {
  return getDateStringInTimeZone(dateLike, timeZone).slice(0, 7);
}

window.SUKODA_TIME = {
  timeZone: TALLINN_TIME_ZONE,
  getDateParts: getDatePartsInTimeZone,
  getDateString: getDateStringInTimeZone,
  getYearMonth: getYearMonthInTimeZone,
  shiftDateString,
  formatDate: formatDateInTimeZone,
  formatTime: formatTimeInTimeZone,
  tallinnDateTimeToIso: (dateStr, timeStr) => resolveLocalDateTimeToIso(dateStr, timeStr, TALLINN_TIME_ZONE),
};

window.Alpine = Alpine;
Alpine.start();

let ticking = false;
function updateScrollProgress() {
  const scrollTop = document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const el = document.getElementById('scrollProgress');
  if (el) el.style.width = (scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0) + '%';
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(updateScrollProgress);
    ticking = true;
  }
}, { passive: true });

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.15,
  rootMargin: '0px 0px -60px 0px',
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});

window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;
  if (sessionStorage.getItem('sukoda_visited')) {
    preloader.classList.add('hidden');
  } else {
    sessionStorage.setItem('sukoda_visited', '1');
    setTimeout(() => preloader.classList.add('hidden'), 400);
  }
});
