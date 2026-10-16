const SEASONS = {
  winter: { icons: ['snow', 'snow', 'snow'], colors: ['#60A5FA', '#93C5FD', '#38BDF8'] },
  spring: { icons: ['flower', 'flower-outline', 'leaf'], colors: ['#EC4899', '#F472B6', '#86B868'] },
  summer: { icons: ['sparkles', 'sunny', 'sparkles'], colors: ['#D4A017', '#FBBF24', '#A3B84C'] },
  autumn: { icons: ['leaf', 'leaf-outline', 'leaf'], colors: ['#D97706', '#C75B39', '#B88727'] },
};

const HOLIDAYS = {
  'new-year': ['sparkles', 'snow', 'star'],
  'student-day': ['school', 'star', 'school'],
  'valentines-day': ['heart', 'heart-outline', 'heart'],
  'defender-day': ['shield', 'star', 'shield'],
  'womens-day': ['flower', 'heart', 'flower'],
  'cosmonautics-day': ['rocket', 'star', 'planet'],
  'may-day': ['sunny', 'flower', 'sunny'],
  'victory-day': ['star', 'ribbon', 'star'],
  'children-day': ['balloon', 'happy', 'balloon'],
  'knowledge-day': ['book', 'pencil', 'book'],
  'september-3': ['musical-notes', 'calendar', 'musical-notes'],
  'programmer-day': ['code-slash', 'terminal', 'code-slash'],
  'sysadmin-day': ['server', 'construct', 'server'],
  'teacher-day': ['easel', 'book', 'easel'],
  'unity-day': ['people', 'flag', 'people'],
  'intl-student-day': ['earth', 'school', 'earth'],
};

export const getSplashSeason = (date = new Date()) => {
  const month = date instanceof Date ? date.getMonth() : NaN;
  if (!Number.isFinite(month)) return 'winter';
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
};

export const getSplashDecoration = ({ date = new Date(), holidayInfo, theme, legendUnlocked = false } = {}) => {
  if (theme === 'matrix' || legendUnlocked) return null;
  const season = getSplashSeason(date);
  if (holidayInfo && typeof holidayInfo.type === 'string') {
    return {
      kind: 'holiday',
      key: holidayInfo.type,
      icons: Object.prototype.hasOwnProperty.call(HOLIDAYS, holidayInfo.type)
        ? HOLIDAYS[holidayInfo.type]
        : ['sparkles', 'star', 'sparkles'],
      colors: ['#D49B28', '#D66B83', '#629CCA'],
    };
  }
  return { kind: 'season', key: season, ...SEASONS[season] };
};

export const SPLASH_PARTICLE_COUNT = 12;

export const createSplashParticles = (decoration) => {
  if (!decoration) return [];
  return Array.from({ length: SPLASH_PARTICLE_COUNT }, (_, index) => ({
    id: index,
    icon: decoration.icons[index % decoration.icons.length],
    color: decoration.colors[index % decoration.colors.length],
    // Keep the center clear for the university logo and greeting.
    x: index % 2 === 0 ? 0.04 + (index % 3) * 0.065 : 0.80 + (index % 3) * 0.065,
    y: ((index * 7) % 12) / 12,
    size: decoration.key === 'summer' ? 10 + index % 3 * 2 : 14 + index % 3 * 3,
    duration: 6500 + index % 4 * 900,
    drift: index % 2 === 0 ? 16 : -16,
  }));
};
