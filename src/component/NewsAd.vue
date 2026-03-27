<template>
  <div class="news-ad" :class="[ad.style || randomStyle]">
    <div class="news-ad-chrome">
      <span class="news-ad-stars">★ ★ ★</span>
      <span class="news-ad-label">SPONSORED CONTENT</span>
      <span class="news-ad-stars">★ ★ ★</span>
    </div>
    <pre v-if="ad.art" class="news-ad-art" :style="ad.artColor ? {color: ad.artColor} : {}">{{ad.art}}</pre>
    <div class="news-ad-text" :style="ad.color ? {color: ad.color} : {}">
      <span v-html="ad.text"></span>
    </div>
    <div v-if="ad.fine" class="news-ad-fine">
      <span class="news-ad-marquee">{{ad.fine}}</span>
    </div>
    <div class="news-ad-cta">
      <span class="news-ad-cta-btn">▶ LEARN MORE ◀</span>
      <span class="news-ad-x" title="lol no">✕</span>
    </div>
  </div>
</template>

<script>
import * as util from '../util';

const styles = ['news-ad-hot', 'news-ad-neon', 'news-ad-retro', 'news-ad-loud', 'news-ad-cyber'];

const ads = [
  {
    art: `   ☁  PERRI-AIR  ☁\n   ┌─────────────┐\n   │  ░░░░░░░░░  │\n   │  ░ FRESH ░  │\n   │  ░░░░░░░░░  │\n   └──────┬──────┘\n          │`,
    text: `<b>PERRI-AIR™</b> — The Last Breath of Fresh Air You'll Ever Need!<br>Now available in <span class="text-success">Pine</span>, <span class="text-info">Ocean Breeze</span>, and <span class="text-warning">Old Earth</span>.`,
    fine: '⚠ Not responsible for vacuum exposure. Canned air is non-refundable. Perri-Air is a registered trademark of Planet Spaceball.',
    artColor: '#8cf',
    style: 'news-ad-neon',
  },
  {
    art: `  ╔══════════════════╗\n  ║  ★ RYLOS WANTS  ★ ║\n  ║     Y O U !       ║\n  ╚══════════════════╝`,
    text: `Join the fight against <span class="text-danger">Xur</span> and the <span class="text-danger">Ko-Dan Armada</span>!<br>Enlist today at your nearest Starfighter Command recruiting station.`,
    fine: '⚠ Prior experience with Gunstar navigation a plus but not required. Survival not guaranteed.',
    artColor: '#fc4',
    style: 'news-ad-hot',
  },
  {
    text: `<b>SOYLENT CLEAR™</b> — The refreshing new meal replacement from Soylent Corp!<br>"It's got everything your body needs!"<br>New <span class="text-success">Soylent Green</span> flavor — <i>now with that unmistakable taste of home.</i>`,
    fine: '⚠ Soylent Corp: Feeding the future, one citizen at a time. Ingredients may vary by region. Do not investigate ingredients.',
    style: 'news-ad-retro',
  },
  {
    art: `  ◆ WEYLAND-YUTANI ◆`,
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
    art: `  ◈ TYRELL CORPORATION ◈`,
    text: `<i>"More human than human"</i> — that's our motto.<br>New Nexus-7 personal assistant models now shipping.<br>Compliance guaranteed for <span class="text-success">full 4-year lifespan</span>.`,
    fine: '⚠ Voight-Kampff testing not included. Do not expose to existential philosophy. Tears in rain not covered by warranty.',
    artColor: '#fa6',
    style: 'news-ad-neon',
  },
  {
    text: `<b>BRAWNDO</b> <span class="text-success">THE THIRST MUTILATOR™</span><br>It's got <i>electrolytes!</i> It's what spacers crave!<br>Now the official drink of the Outer Planets League.`,
    fine: '⚠ Brawndo Corp is not responsible for what Brawndo does to your insides. Do not use to water plants. Or do. We don\'t care.',
    color: '#4f4',
    style: 'news-ad-hot',
  },
  {
    art: `  ┌──────────────────┐\n  │ SHARE AND ENJOY! │\n  └──────────────────┘`,
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
    art: `    ╱╲\n   ╱  ╲\n  ╱ OCP ╲\n ╱──────╲`,
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
    fine: '⚠ Please note: you may be asked to come in on Saturday. And Sunday. We\'re also going to need you to go ahead and...',
    style: 'news-ad-retro',
  },
  {
    text: `<b>PAN AM ORBITAL™</b> — The Galaxy's Favorite Spaceline<br>Luna shuttles departing hourly. First class includes <span class="text-info">zero-G champagne service</span>.<br><i>"The sky is no longer the limit."</i>`,
    fine: '⚠ Pan Am Orbital is a registered trademark. Service to Jupiter suspended pending investigation. Monolith not included.',
    style: 'news-ad-loud',
  },
];

export default {
  data() {
    return {
      ad: ads[util.getRandomInt(0, ads.length)],
      randomStyle: styles[util.getRandomInt(0, styles.length)],
    };
  },
};
</script>

<style>
/* Base ad container */
.news-ad {
  padding: 0.6rem 0.75rem;
  margin: 1rem 0;
  position: relative;
  overflow: hidden;
}

/* Top chrome with animated stars */
.news-ad-chrome {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  font: bold 0.65rem monospace;
  letter-spacing: 0.15em;
}

.news-ad-label {
  color: #888;
}

.news-ad-stars {
  animation: ad-twinkle 1.5s ease-in-out infinite alternate;
}

@keyframes ad-twinkle {
  0%   { opacity: 0.3; }
  100% { opacity: 1.0; }
}

.news-ad-art {
  font: 0.7rem monospace;
  line-height: 1.1;
  margin: 0.4rem 0;
  text-align: center;
  color: #888;
}

.news-ad-text {
  font-size: 0.85rem;
  line-height: 1.4;
  color: #ccc;
}

/* Fine print: slow horizontal scroll like a disclaimer ticker */
.news-ad-fine {
  overflow: hidden;
  margin-top: 0.4rem;
  border-top: 1px solid #222;
  padding-top: 0.3rem;
}

.news-ad-marquee {
  display: inline-block;
  font: italic 0.6rem monospace;
  color: #444;
  white-space: nowrap;
  animation: ad-scroll 20s linear infinite;
}

@keyframes ad-scroll {
  0%   { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

/* CTA button row */
.news-ad-cta {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 0.5rem;
  gap: 1rem;
}

.news-ad-cta-btn {
  font: bold 0.7rem monospace;
  padding: 0.2rem 1rem;
  border: 1px solid;
  animation: ad-cta-pulse 2s ease-in-out infinite;
  letter-spacing: 0.1em;
  cursor: default;
}

@keyframes ad-cta-pulse {
  0%, 100% { opacity: 0.7; }
  50%      { opacity: 1.0; }
}

/* Fake close button that does nothing */
.news-ad-x {
  font-size: 0.7rem;
  color: #333;
  cursor: default;
}

.news-ad-x:hover {
  color: #555;
}

/* ═══ Ad style variants ═══ */

/* Hot: red/orange flashing border, urgent feel */
.news-ad-hot {
  border: 2px solid #c33;
  background: linear-gradient(135deg, #1a0000 0%, #0a0a0a 50%, #1a0800 100%);
  animation: ad-border-flash 2s ease-in-out infinite;
}

.news-ad-hot .news-ad-stars { color: #f44; }
.news-ad-hot .news-ad-cta-btn { color: #f64; border-color: #f64; }

@keyframes ad-border-flash {
  0%, 100% { border-color: #c33; }
  50%      { border-color: #f64; }
}

/* Neon: cyan/magenta glow, cyberpunk feel */
.news-ad-neon {
  border: 1px solid #0ff;
  background: #050510;
  box-shadow: inset 0 0 30px rgba(0, 255, 255, 0.03);
}

.news-ad-neon .news-ad-stars { color: #0ff; }
.news-ad-neon .news-ad-cta-btn { color: #0ff; border-color: #0ff; }
.news-ad-neon .news-ad-label { color: #088; }

/* Retro: green phosphor terminal */
.news-ad-retro {
  border: 1px solid #0a0;
  background: #000800;
  box-shadow: inset 0 0 20px rgba(0, 170, 0, 0.04);
}

.news-ad-retro .news-ad-stars { color: #0c0; }
.news-ad-retro .news-ad-text { color: #0d0; }
.news-ad-retro .news-ad-cta-btn { color: #0c0; border-color: #0c0; }
.news-ad-retro .news-ad-art { color: #0a0; }
.news-ad-retro .news-ad-label { color: #070; }

/* Loud: yellow/black warning stripes energy */
.news-ad-loud {
  border: 2px solid #cc0;
  background: linear-gradient(135deg, #0a0a00 0%, #0a0a0a 50%, #0a0800 100%);
}

.news-ad-loud .news-ad-stars { color: #ff0; animation: ad-twinkle 0.8s ease-in-out infinite alternate; }
.news-ad-loud .news-ad-cta-btn { color: #ff0; border-color: #ff0; }
.news-ad-loud .news-ad-label { color: #880; }

/* Cyber: purple/blue, sleek corporate */
.news-ad-cyber {
  border: 1px solid #639;
  background: linear-gradient(135deg, #08001a 0%, #0a0a0a 100%);
}

.news-ad-cyber .news-ad-stars { color: #a6f; }
.news-ad-cyber .news-ad-cta-btn { color: #a6f; border-color: #a6f; }
.news-ad-cyber .news-ad-label { color: #648; }
</style>
