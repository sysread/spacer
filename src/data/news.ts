/* News organization names and sponsored ad content for the news feeds
 * page. Org names are allusions to classic science fiction — Schmitz,
 * Brackett, Moore, Vance, Norton, Cordwainer Smith, and others. */

/* Inline SVG art for ads. Uses currentColor so the parent's CSS color
 * (set via artColor) cascades into fills and strokes. */

const svgPerriAir = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="200" height="120">
  <text x="30" y="18" font-family="monospace" font-size="14" fill="currentColor">☁</text>
  <text x="155" y="18" font-family="monospace" font-size="14" fill="currentColor">☁</text>
  <rect x="50" y="22" width="100" height="65" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <rect x="62" y="38" width="76" height="32" rx="2" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="0.75"/>
  <text x="100" y="34" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="currentColor" letter-spacing="0.5">PERRI-AIR</text>
  <text x="100" y="59" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="currentColor" letter-spacing="2">FRESH</text>
  <line x1="100" y1="87" x2="100" y2="112" stroke="currentColor" stroke-width="1.5"/>
  <ellipse cx="100" cy="22" rx="12" ry="4" fill="none" stroke="currentColor" stroke-width="1"/>
</svg>`;

const svgRylos = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80" width="200" height="80">
  <rect x="10" y="5" width="180" height="70" rx="0" fill="none" stroke="currentColor" stroke-width="2.5"/>
  <rect x="14" y="9" width="172" height="62" rx="0" fill="none" stroke="currentColor" stroke-width="0.75"/>
  <text x="38" y="32" text-anchor="middle" font-family="monospace" font-size="12" fill="currentColor">★</text>
  <text x="162" y="32" text-anchor="middle" font-family="monospace" font-size="12" fill="currentColor">★</text>
  <text x="100" y="33" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="currentColor" letter-spacing="1">RYLOS WANTS</text>
  <text x="100" y="55" text-anchor="middle" font-family="monospace" font-size="16" font-weight="bold" fill="currentColor" letter-spacing="4">YOU!</text>
</svg>`;

const svgWeylandYutani = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" width="200" height="40">
  <text x="28" y="25" text-anchor="middle" font-family="monospace" font-size="10" fill="currentColor">◆</text>
  <text x="100" y="25" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="currentColor" letter-spacing="2">WEYLAND-YUTANI</text>
  <text x="172" y="25" text-anchor="middle" font-family="monospace" font-size="10" fill="currentColor">◆</text>
</svg>`;

const svgTyrell = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" width="200" height="40">
  <text x="28" y="25" text-anchor="middle" font-family="monospace" font-size="10" fill="currentColor">◈</text>
  <text x="100" y="25" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="currentColor" letter-spacing="2">TYRELL CORPORATION</text>
  <text x="172" y="25" text-anchor="middle" font-family="monospace" font-size="10" fill="currentColor">◈</text>
</svg>`;

const svgSiriusCybernetics = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="200" height="50">
  <rect x="25" y="8" width="150" height="34" rx="0" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="100" y="30" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="currentColor" letter-spacing="1">SHARE AND ENJOY!</text>
</svg>`;

const svgSoylentClear = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 80" width="220" height="80">
  <!-- Crystal/diamond shapes flanking the logo — 90s "clear = pure" aesthetic -->
  <polygon points="30,40 42,28 54,40 42,52" fill="none" stroke="currentColor" stroke-width="1" opacity="0.6"/>
  <polygon points="166,40 178,28 190,40 178,52" fill="none" stroke="currentColor" stroke-width="1" opacity="0.6"/>
  <!-- Inner diamonds -->
  <polygon points="34,40 42,33 50,40 42,47" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="0.5" opacity="0.8"/>
  <polygon points="170,40 178,33 186,40 178,47" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="0.5" opacity="0.8"/>
  <!-- Brand name -->
  <text x="110" y="30" text-anchor="middle" font-family="monospace" font-size="9" fill="currentColor" letter-spacing="4" opacity="0.7">S O Y L E N T</text>
  <text x="110" y="50" text-anchor="middle" font-family="monospace" font-size="16" font-weight="bold" fill="currentColor" letter-spacing="3">C L E A R</text>
  <!-- Tagline underline -->
  <line x1="70" y1="58" x2="150" y2="58" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
  <text x="110" y="70" text-anchor="middle" font-family="monospace" font-size="7" fill="currentColor" letter-spacing="2" opacity="0.5">YOU ARE WHAT YOU EAT</text>
</svg>`;

const svgOcp = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 70" width="200" height="70">
  <polygon points="100,8 60,58 140,58" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter"/>
  <text x="100" y="48" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="currentColor" letter-spacing="3">OCP</text>
</svg>`;

/* News outlets per body, randomly selected at render time. Each entry
 * has a name and a tagline displayed in italics beneath a flourish. */
export interface NewsOrg {
  name: string;
  tagline: string;
}

export const newsOrgs: Record<string, NewsOrg[]> = {
  mercury: [
    { name: 'The Shambleau Courier',        tagline: 'All the news that\'s fit to mesmerize' },            // C.L. Moore
    { name: 'Vulcan Ledger',                tagline: 'Reporting on a world that never was' },              // pre-spaceflight myth
    { name: 'Quicksilver Sunside Herald',   tagline: 'Fast news for fast orbits' },
  ],
  earth: [
    { name: 'The Instrumentality Monitor',  tagline: 'Watching over mankind since the Rediscovery' },     // Cordwainer Smith
    { name: 'Terra Norstrilia Wire',        tagline: 'Worth its weight in stroon' },                      // Cordwainer Smith
    { name: 'Old Earth Examiner',           tagline: 'Mother of worlds, mother of news' },                // Cordwainer Smith
    { name: 'Pandora\'s Post',             tagline: 'You can\'t put it back in the box' },                // Christopher Anvil — Pandora's Planet
    { name: 'The Unisphere',               tagline: 'Every world, one network' },                         // Peter Hamilton — Commonwealth Saga
  ],
  moon: [
    { name: 'Luna Free Press',             tagline: 'TANSTAAFL' },                                       // Heinlein
    { name: 'The Selenite Dispatch',       tagline: 'First in news beneath the surface' },                // H.G. Wells
    { name: 'Tycho Under Tribune',         tagline: 'The voice from below' },
  ],
  mars: [
    { name: 'The Domir Gazette',           tagline: 'Agent-verified reporting' },                         // James Schmitz
    { name: 'Barsoom Helium Herald',       tagline: 'Two moons, one truth' },                             // Burroughs
    { name: 'Red Sands Intelligencer',     tagline: 'Sifting truth from the dust' },
    { name: 'The Underhill Register',      tagline: 'First settlement, first paper' },                    // Kim Stanley Robinson — Red Mars
    { name: 'The Zodangan Post',           tagline: 'News worth fighting for' },                          // Burroughs — city of Zodanga
  ],
  phobos: [
    { name: 'The Stickney Sentinel',       tagline: 'Standing watch in the crater' },
    { name: 'Phobos High Ground Observer', tagline: 'The tactical advantage in journalism' },
    { name: 'Deimos Relay',               tagline: 'Signal through the noise' },
  ],
  ceres: [
    { name: 'The Canterbury Tales',        tagline: 'The truth shall make ye fret' },                     // Expanse + Discworld
    { name: 'The Serene Gazette',          tagline: 'Most serene. Most informed.' },                      // Venice / Ceres
    { name: 'Dohr Station Ledger',         tagline: 'We keep the books balanced' },                       // James Schmitz
  ],
  trojans: [
    { name: 'Dorlian Signal',             tagline: 'Clear transmissions from the Atoll' },                // James Schmitz
    { name: 'The G\'bserver',             tagline: 'All the news that isn\'t g\'babble' },                // David Weber — Safehold
    { name: 'Tycho Manufacturing Bulletin', tagline: 'Building tomorrow\'s headlines today' },             // Expanse
  ],
  europa: [
    { name: 'Europa Undercurrent',         tagline: 'Beneath the ice, above the noise' },
    { name: 'Conamara Dispatch',           tagline: 'Cracking the story wide open' },
    { name: 'The Ice Listener',            tagline: 'We hear everything' },
  ],
  callisto: [
    { name: 'Valhalla Sentinel',           tagline: 'Eternal vigilance at the basin' },
    { name: 'The Argus',                   tagline: 'A hundred eyes on the truth' },                      // Hera's watchman
    { name: 'The Jovian Free Press',       tagline: 'Free press for free traders' },
  ],
  ganymede: [
    { name: 'The Hub Central Standard',    tagline: 'The standard by which all news is measured' },        // James Schmitz
    { name: 'Ganymede Tribune',            tagline: 'Voice of the capital moon' },
    { name: 'Solar Queen Press',           tagline: 'News from port to port' },                            // Andre Norton
  ],
  enceladus: [
    { name: 'The Geyser Signal',           tagline: 'Erupting with the latest' },
    { name: 'The Midway Dispatch',         tagline: 'For the people. From the front.' },                   // Jack Campbell
    { name: 'Ringlight Dispatch',          tagline: 'News by Saturn\'s light' },
    { name: 'Central Bureau of Information', tagline: 'Authorized. Verified. Distributed.' },              // Soviet state media
  ],
  rhea: [
    { name: 'Karres Chronicle',            tagline: 'You never know what we\'ll report next' },            // James Schmitz
    { name: 'Rhea Lab Monitor',            tagline: 'Observing the observers' },
    { name: 'Inktomi Post',               tagline: 'Delivering to the edge of the rings' },
  ],
  titan: [
    { name: 'Kraken Mare Herald',          tagline: 'From the depths of the methane sea' },
    { name: 'Titan Atmospheric',           tagline: 'Thick coverage, guaranteed' },
    { name: 'The Syndic Standard',         tagline: 'The standard the CEOs trust' },                       // Jack Campbell; also Kornbluth
    { name: 'Central Bureau of Information', tagline: 'Authorized. Verified. Distributed.' },              // Soviet state media
  ],
  titania: [
    { name: 'The People\'s Lantern',       tagline: 'Lighting the way for the workers' },                  // Jack Campbell
    { name: 'The Uranian Standard',        tagline: 'Setting the standard at the edge' },
    { name: 'Outpost Lantern',            tagline: 'A light in the darkness' },
    { name: 'Central Bureau of Information', tagline: 'Authorized. Verified. Distributed.' },              // Soviet state media
  ],
  triton: [
    { name: 'The Retrograde Sentinel',    tagline: 'Going against the grain since day one' },
    { name: 'Widdershins Tribune',         tagline: 'Counter to the current, ahead of the curve' },
    { name: 'The Mobile Forces Herald',    tagline: 'Strength. Vigilance. Information.' },                  // Jack Campbell
    { name: 'Central Bureau of Information', tagline: 'Authorized. Verified. Distributed.' },              // Soviet state media
  ],
  pluto: [
    { name: 'Tombaugh Examiner',           tagline: 'Still a planet. Still news.' },
    { name: 'The Charon Beacon',           tagline: 'A light at the edge of the dark' },
    { name: 'The Iceni Record',            tagline: 'For the people, by the authority' },                   // Jack Campbell
    { name: 'Central Bureau of Information', tagline: 'Authorized. Verified. Distributed.' },              // Soviet state media
  ],
};

/* Ad style variants applied to the container element. */
export const adStyles = [
  'news-ad-hot',
  'news-ad-neon',
  'news-ad-retro',
  'news-ad-loud',
  'news-ad-cyber',
];

/* Sponsored ad content. Each ad may specify ascii art, body text,
 * fine print, and color overrides. A `style` key pins the ad to a
 * specific visual variant; omitted means one is chosen at random. */
export const ads = [
  {
    svg: svgPerriAir,
    text: `<b>PERRI-AIR™</b> — The Last Breath of Fresh Air You'll Ever Need!<br>Now available in <span class="text-success">Pine</span>, <span class="text-info">Ocean Breeze</span>, and <span class="text-warning">Old Earth</span>.`,
    fine: '⚠ Not responsible for vacuum exposure. Canned air is non-refundable. Perri-Air is a registered trademark of Planet Spaceball.',
    artColor: '#8cf',
    style: 'news-ad-neon',
  },
  {
    svg: svgRylos,
    text: `Join the fight against <span class="text-danger">Xur</span> and the <span class="text-danger">Ko-Dan Armada</span>!<br>Enlist today at your nearest Starfighter Command recruiting station.`,
    fine: '⚠ Prior experience with Gunstar navigation a plus but not required. Survival not guaranteed.',
    artColor: '#fc4',
    style: 'news-ad-hot',
  },
  {
    svg: svgSoylentClear,
    text: `<b>SOYLENT CLEAR™</b> — The refreshing new meal replacement from Soylent Corp!<br>"It's got everything your body needs!"<br>New <span class="text-success">Soylent Green</span> flavor — <i>now with that unmistakable taste of home.</i>`,
    fine: '⚠ Soylent Corp: Feeding the future, one citizen at a time. Ingredients may vary by region. Do not investigate ingredients.',
    artColor: '#cce8cc',
    style: 'news-ad-retro',
  },
  {
    svg: svgWeylandYutani,
    text: `<b>BUILDING BETTER WORLDS™</b><br>Terraforming. Biotech. Synthetics. Ordnance.<br>Your future is our business.`,
    fine: '⚠ Weyland-Yutani Corp accepts no liability for xenobiological incidents. Special Order 937 is classified.',
    artColor: '#4af',
    style: 'news-ad-cyber',
  },
  {
    text: `Tired of your life? <b>REKALL™</b> can give you a new one!<br>Memory implants starting at just <span class="text-warning">2,500 credits</span>.<br><i>"Don't let reality hold you back."</i>`,
    fine: '⚠ Side effects may include identity crisis, paranoid delusions, sudden vacations to Mars, and discovering you are a secret agent.',
    style: 'news-ad-loud',
  },
  {
    svg: svgTyrell,
    text: `<i>"More human than human"</i> — that's our motto.<br>New Nexus-7 personal assistant models now shipping.<br>Compliance guaranteed for <span class="text-success">full 4-year lifespan</span>.`,
    fine: '⚠ Voight-Kampff testing not included. Do not expose to existential philosophy. Tears in rain not covered by warranty.',
    artColor: '#fa6',
    style: 'news-ad-neon',
  },
  {
    text: `<b>BRAWNDO</b> <span class="text-success">THE THIRST MUTILATOR™</span><br>It's got <i>electrolytes!</i> It's what spacers crave!<br>Now the official drink of the Outer Planets League.`,
    fine: `⚠ Brawndo Corp is not responsible for what Brawndo does to your insides. Do not use to water plants. Or do. We don't care.`,
    color: '#4f4',
    style: 'news-ad-hot',
  },
  {
    svg: svgSiriusCybernetics,
    text: `<b>Sirius Cybernetics Corporation</b><br>Our new line of <span class="text-info">Genuine People Personalities™</span> will make your ship feel like home!<br><i>"Go stick your head in a pig."</i> — Marvin, satisfied customer`,
    fine: '⚠ Complaints department located just past the fires of eternal damnation, second door on the left.',
    artColor: '#f8f',
    style: 'news-ad-retro',
  },
  {
    text: `<b>LUNAR INDUSTRIES</b> — Helium-3: Powering Earth's Future<br>Now hiring! 3-year contracts with <span class="text-warning">generous completion bonus</span>.<br>Housing and GERTY companion unit provided.`,
    fine: '⚠ Clone disclosure policy available upon request. Ask about our loyalty program. You look familiar.',
    style: 'news-ad-cyber',
  },
  {
    text: `Do YOUR part! <b>SERVICE GUARANTEES CITIZENSHIP.</b><br>Join the Mobile Infantry today!<br><i>"The only good bug is a dead bug!"</i>`,
    fine: '⚠ Federal service may include but is not limited to death. Would you like to know more?',
    color: '#fc4',
    style: 'news-ad-loud',
  },
  {
    svg: svgOcp,
    text: `<b>Omni Consumer Products</b> proudly presents <span class="text-info">ED-209</span>.<br>The future of law enforcement. Now available for private security contracts.<br><i>"You have 20 seconds to comply."</i>`,
    fine: '⚠ OCP is not liable for staircase-related deployment failures. Please drop your weapon.',
    artColor: '#aaa',
    style: 'news-ad-hot',
  },
  {
    text: `<b>BUY N LARGE</b> — Everything you need. Everything you want. <i>Everything.</i><br>Why go outside when <span class="text-info">BnL</span> delivers right to your pod?<br>New customers get <span class="text-success">free hover-chair upgrade</span>!`,
    fine: '⚠ Earth cleanup estimated completion: 2805. Give or take. Mostly give.',
    style: 'news-ad-neon',
  },
  {
    text: `<b>NUKA-COLA QUANTUM</b> — Take the leap... <span class="text-info">into refreshment!</span><br>Now with 18% more isotope flavor!<br>Collect bottle caps for <span class="text-warning">exciting prizes</span>.`,
    fine: '⚠ Mild radiation is a feature, not a bug. Nuka-Corp: Zap that thirst! Geiger counter sold separately.',
    color: '#4df',
    style: 'news-ad-cyber',
  },
  {
    text: `Lost your drive? <b>INITECH</b> can help.<br>We're looking for motivated individuals to help us move forward with our <span class="text-muted">new cover sheet policy for TPS reports</span>.<br><i>"That would be great."</i>`,
    fine: `⚠ Please note: you may be asked to come in on Saturday. And Sunday. We're also going to need you to go ahead and...`,
    style: 'news-ad-retro',
  },
  {
    text: `<b>PAN AM ORBITAL™</b> — The Galaxy's Favorite Spaceline<br>Luna shuttles departing hourly. First class includes <span class="text-info">zero-G champagne service</span>.<br><i>"The sky is no longer the limit."</i>`,
    fine: '⚠ Pan Am Orbital is a registered trademark. Service to Jupiter suspended pending investigation. Monolith not included.',
    style: 'news-ad-loud',
  },
];
