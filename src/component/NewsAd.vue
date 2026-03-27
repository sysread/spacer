<template>
  <div class="news-ad" :class="[ad.style || randomStyle]">
    <div class="news-ad-chrome">
      <span class="news-ad-stars">★ ★ ★</span>
      <span class="news-ad-label">SPONSORED CONTENT</span>
      <span class="news-ad-stars">★ ★ ★</span>
    </div>
    <div v-if="ad.svg" class="news-ad-art" :style="ad.artColor ? {color: ad.artColor} : {}" v-html="ad.svg"></div>
    <pre v-else-if="ad.art" class="news-ad-art" :style="ad.artColor ? {color: ad.artColor} : {}">{{ad.art}}</pre>
    <div class="news-ad-text" :style="ad.color ? {color: ad.color} : {}">
      <span v-html="ad.text"></span>
    </div>
    <div v-if="ad.fine" class="news-ad-fine">
      <span class="news-ad-marquee">{{ad.fine}}</span>
    </div>
    <div class="news-ad-cta">
      <span class="news-ad-cta-btn">▶ LEARN MORE ◀</span>
      <span class="news-ad-x" :style="xStyle" @click.stop="dodgeX" title="Close ad">✕</span>
    </div>
  </div>
</template>

<script>
import * as util from '../util';
import { ads, adStyles } from '../data/news';

export default {
  data() {
    return {
      ad: ads[util.getRandomInt(0, ads.length)],
      randomStyle: adStyles[util.getRandomInt(0, adStyles.length)],
      xStyle: {},
    };
  },

  methods: {
    dodgeX() {
      this.xStyle = {
        position: 'absolute',
        top:  util.getRandomInt(5, 85) + '%',
        left: util.getRandomInt(5, 90) + '%',
      };
    },
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

/* Inline SVG art: inherit color from artColor, constrain size */
.news-ad-art :deep(svg) {
  max-width: 80%;
  height: auto;
  display: inline-block;
}

.news-ad-text {
  font-size: 0.85rem;
  line-height: 1.4;
  color: #ccc;
  text-align: center;
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

/* Close button that dodges your clicks */
.news-ad-x {
  font-size: 0.75rem;
  color: #c33;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  border: 1px solid #c33;
  border-radius: 2px;
  transition: top 0.15s, left 0.15s;
  z-index: 1;
}

.news-ad-x:hover {
  color: #f44;
  border-color: #f44;
  background: #200;
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
