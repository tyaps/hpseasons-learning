<template>
  <div class="site-backdrop" aria-hidden="true">
    <span class="backdrop-shape backdrop-shape--blob backdrop-shape--1" />
    <span class="backdrop-shape backdrop-shape--ring" />
    <span class="backdrop-shape backdrop-shape--blob backdrop-shape--2" />

    <svg class="hw hw--pumpkin" viewBox="0 0 80 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M40 14c-2-8-10-12-10-12s4 6 2 14c-14 4-22 18-22 34 0 18 13.5 30 30 30s30-12 30-30c0-16-8-30-22-34 2-6-2-12-2-12s-8 4-10 12Z"
        fill="#f3c9a6"
      />
      <path d="M38 6c0-4 2-6 4-6 2 0 3 2 3 5" stroke="#c9a882" stroke-width="2.5" stroke-linecap="round" />
      <path
        d="M28 44c0-4 3-7 6-7 2 0 4 2 4 5m14-5c3 0 6 3 6 7m-22 10c2 3 5 5 8 5s6-2 8-5"
        stroke="#d9a07a"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.85"
      />
    </svg>

    <svg class="hw hw--bat hw--bat-1" viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M32 12c-2-6-8-10-8-10 2 5 1 9-4 11-8 4-12 12-12 17 4-2 8-2 12 0 3-6 7-10 12-10 5 0 9 4 12 10 4-2 8-2 12 0 0-5-4-13-12-17-5-2-6-6-4-11 0 0-6 4-8 10Z"
        fill="#b8a4c8"
      />
    </svg>

    <svg class="hw hw--bat hw--bat-2" viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M32 12c-2-6-8-10-8-10 2 5 1 9-4 11-8 4-12 12-12 17 4-2 8-2 12 0 3-6 7-10 12-10 5 0 9 4 12 10 4-2 8-2 12 0 0-5-4-13-12-17-5-2-6-6-4-11 0 0-6 4-8 10Z"
        fill="#9eb5a8"
      />
    </svg>

    <svg class="hw hw--broom" viewBox="0 0 56 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M26 4v78" stroke="#c4a57a" stroke-width="4" stroke-linecap="round" />
      <path
        d="M8 82c6 24 18 34 34 34 8 0 14-4 14-10 0-8-10-14-22-16-8-1-18 2-26-8Z"
        fill="#e8d4b8"
        stroke="#c9b08e"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path d="M12 78 26 70l14 8" stroke="#d4bc9a" stroke-width="2" stroke-linecap="round" />
    </svg>

    <svg class="hw hw--hat" viewBox="0 0 72 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 44h48l-6-22c-2-8-10-14-18-14s-16 6-18 14l-6 22Z" fill="#c5b4d6" />
      <ellipse cx="36" cy="44" rx="28" ry="6" fill="#b8a4c8" opacity="0.9" />
      <path d="M30 24c4-4 8-4 12 0" stroke="#a892bc" stroke-width="2" stroke-linecap="round" opacity="0.6" />
    </svg>

    <svg class="hw hw--moon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M30 8a20 20 0 1 0 10 36 16 16 0 1 1 0-36Z"
        fill="#f4e6c8"
        stroke="#e8d4b0"
        stroke-width="1.5"
      />
    </svg>
  </div>
</template>

<style scoped>
.site-backdrop {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.backdrop-shape {
  position: absolute;
  display: block;
}

.backdrop-shape--blob {
  width: 220px;
  height: 220px;
  border-radius: 42% 58% 70% 30% / 45% 35% 65% 55%;
  background: linear-gradient(135deg, rgba(232, 168, 124, 0.28), rgba(166, 124, 82, 0.1));
}

.backdrop-shape--1 {
  top: -40px;
  right: -60px;
}

.backdrop-shape--2 {
  bottom: -80px;
  left: -40px;
  width: 180px;
  height: 180px;
}

.backdrop-shape--ring {
  width: 120px;
  height: 120px;
  border: 14px solid rgba(90, 143, 123, 0.2);
  border-radius: 50%;
  top: 38%;
  left: 4%;
}

.hw {
  position: absolute;
  opacity: 0.28;
  filter: saturate(0.85);
}

.hw--pumpkin {
  width: 76px;
  top: 6%;
  right: 6%;
  transform: rotate(8deg);
}

.hw--bat-1 {
  width: 52px;
  top: 22%;
  left: 5%;
  transform: rotate(-6deg);
}

.hw--bat-2 {
  width: 40px;
  bottom: 28%;
  right: 8%;
  transform: rotate(12deg) scaleX(-1);
  opacity: 0.22;
}

.hw--broom {
  width: 48px;
  bottom: 8%;
  left: 7%;
  transform: rotate(-22deg);
  opacity: 0.26;
}

.hw--hat {
  width: 62px;
  top: 58%;
  right: 4%;
  transform: rotate(14deg);
  opacity: 0.24;
}

.hw--moon {
  width: 44px;
  top: 10%;
  left: 12%;
  opacity: 0.32;
}

@media (min-width: 640px) {
  .hw--pumpkin {
    width: 92px;
    right: max(12%, calc(50% - 420px));
  }

  .hw--broom {
    width: 56px;
    left: max(7%, calc(50% - 460px));
  }

  .hw--moon {
    left: max(10%, calc(50% - 400px));
  }

  .hw--bat-1 {
    left: max(5%, calc(50% - 440px));
  }
}

@media (max-width: 420px) {
  .hw--hat,
  .hw--bat-2 {
    display: none;
  }
}
</style>
