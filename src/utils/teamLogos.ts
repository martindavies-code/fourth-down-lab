export interface TeamInfo {
  abbreviation: string;
  name: string;
  city: string;
  primaryColor: string;
  secondaryColor: string;
}

export const NFL_TEAMS: Record<string, TeamInfo> = {
  ARI: { abbreviation: 'ARI', name: 'Cardinals', city: 'Arizona', primaryColor: '#97233F', secondaryColor: '#000000' },
  ATL: { abbreviation: 'ATL', name: 'Falcons', city: 'Atlanta', primaryColor: '#A71930', secondaryColor: '#000000' },
  BAL: { abbreviation: 'BAL', name: 'Ravens', city: 'Baltimore', primaryColor: '#241773', secondaryColor: '#9E7C0C' },
  BUF: { abbreviation: 'BUF', name: 'Bills', city: 'Buffalo', primaryColor: '#00338D', secondaryColor: '#C60C30' },
  CAR: { abbreviation: 'CAR', name: 'Panthers', city: 'Carolina', primaryColor: '#0085CA', secondaryColor: '#101820' },
  CHI: { abbreviation: 'CHI', name: 'Bears', city: 'Chicago', primaryColor: '#0B162A', secondaryColor: '#C83803' },
  CIN: { abbreviation: 'CIN', name: 'Bengals', city: 'Cincinnati', primaryColor: '#FB4F14', secondaryColor: '#000000' },
  CLE: { abbreviation: 'CLE', name: 'Browns', city: 'Cleveland', primaryColor: '#311D00', secondaryColor: '#FF3C00' },
  DAL: { abbreviation: 'DAL', name: 'Cowboys', city: 'Dallas', primaryColor: '#003594', secondaryColor: '#041E42' },
  DEN: { abbreviation: 'DEN', name: 'Broncos', city: 'Denver', primaryColor: '#FB4F14', secondaryColor: '#002244' },
  DET: { abbreviation: 'DET', name: 'Lions', city: 'Detroit', primaryColor: '#0076B6', secondaryColor: '#B0B7BC' },
  GB:  { abbreviation: 'GB',  name: 'Packers', city: 'Green Bay', primaryColor: '#203731', secondaryColor: '#FFB612' },
  HOU: { abbreviation: 'HOU', name: 'Texans', city: 'Houston', primaryColor: '#03202F', secondaryColor: '#A71930' },
  IND: { abbreviation: 'IND', name: 'Colts', city: 'Indianapolis', primaryColor: '#002C5F', secondaryColor: '#A2AAAD' },
  JAX: { abbreviation: 'JAX', name: 'Jaguars', city: 'Jacksonville', primaryColor: '#006778', secondaryColor: '#D7A22A' },
  KC:  { abbreviation: 'KC',  name: 'Chiefs', city: 'Kansas City', primaryColor: '#E31837', secondaryColor: '#FFB81C' },
  LV:  { abbreviation: 'LV',  name: 'Raiders', city: 'Las Vegas', primaryColor: '#000000', secondaryColor: '#A5ACAF' },
  LAC: { abbreviation: 'LAC', name: 'Chargers', city: 'Los Angeles', primaryColor: '#0080C6', secondaryColor: '#FFC20E' },
  LAR: { abbreviation: 'LAR', name: 'Rams', city: 'Los Angeles', primaryColor: '#003594', secondaryColor: '#FFA300' },
  MIA: { abbreviation: 'MIA', name: 'Dolphins', city: 'Miami', primaryColor: '#008E97', secondaryColor: '#FC4C02' },
  MIN: { abbreviation: 'MIN', name: 'Vikings', city: 'Minnesota', primaryColor: '#4F2683', secondaryColor: '#FFC62F' },
  NE:  { abbreviation: 'NE',  name: 'Patriots', city: 'New England', primaryColor: '#002244', secondaryColor: '#C60C30' },
  NO:  { abbreviation: 'NO',  name: 'Saints', city: 'New Orleans', primaryColor: '#D3BC8D', secondaryColor: '#101820' },
  NYG: { abbreviation: 'NYG', name: 'Giants', city: 'New York', primaryColor: '#0B2265', secondaryColor: '#A71930' },
  NYJ: { abbreviation: 'NYJ', name: 'Jets', city: 'New York', primaryColor: '#125740', secondaryColor: '#000000' },
  PHI: { abbreviation: 'PHI', name: 'Eagles', city: 'Philadelphia', primaryColor: '#004C54', secondaryColor: '#A5ACAF' },
  PIT: { abbreviation: 'PIT', name: 'Steelers', city: 'Pittsburgh', primaryColor: '#FFB612', secondaryColor: '#101820' },
  SF:  { abbreviation: 'SF',  name: '49ers', city: 'San Francisco', primaryColor: '#AA0000', secondaryColor: '#B3995D' },
  SEA: { abbreviation: 'SEA', name: 'Seahawks', city: 'Seattle', primaryColor: '#002244', secondaryColor: '#69BE28' },
  TB:  { abbreviation: 'TB',  name: 'Buccaneers', city: 'Tampa Bay', primaryColor: '#D50A0A', secondaryColor: '#0A0A08' },
  TEN: { abbreviation: 'TEN', name: 'Titans', city: 'Tennessee', primaryColor: '#0C2340', secondaryColor: '#4B92DB' },
  WAS: { abbreviation: 'WAS', name: 'Commanders', city: 'Washington', primaryColor: '#5A1414', secondaryColor: '#FFB612' },
};

const DARK_LOGOS = new Set(['NYJ', 'NYG', 'LAR', 'LA', 'PIT', 'CHI']);

export function getTeamLogoUrl(abbr: string): string {
  const clean = abbr?.toUpperCase().trim() || 'NFL';
  if (clean === 'NFL') {
    return 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/nfl.png';
  }
  // ESPN uses 'wsh' for Washington
  const espnSlug = clean === 'WAS' ? 'wsh' : clean.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${espnSlug}.png`;
}

export function getTeamFallbackSvg(abbr: string): string {
  const clean = abbr?.toUpperCase().trim() || 'NFL';
  const team = NFL_TEAMS[clean] || { primaryColor: '#1e293b', secondaryColor: '#94a3b8' };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <circle cx="50" cy="50" r="46" fill="${team.primaryColor}" stroke="${team.secondaryColor}" stroke-width="4"/>
    <text x="50" y="58" font-family="system-ui, -apple-system, sans-serif" font-size="${clean.length > 3 ? '22' : '28'}" font-weight="900" fill="#ffffff" text-anchor="middle">${clean}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function isDarkLogo(abbr: string): boolean {
  return DARK_LOGOS.has(abbr?.toUpperCase().trim());
}

export function getTeamName(abbr: string): string {
  const team = NFL_TEAMS[abbr?.toUpperCase().trim()];
  if (team) {
    return `${team.city} ${team.name}`;
  }
  return abbr || 'Unknown Team';
}
