(() => {
  "use strict";

  const button = document.getElementById("music-toggle");
  const status = document.getElementById("music-status");
  const Context = window.AudioContext || window.webkitAudioContext;
  const beatSeconds = 60 / 100;
  const notes = [
    [67, .5], [67, .5], [69, 1], [67, 1], [72, 1], [71, 2],
    [67, .5], [67, .5], [69, 1], [67, 1], [74, 1], [72, 2],
    [67, .5], [67, .5], [79, 1], [76, 1], [72, 1], [71, 1], [69, 1],
    [77, .5], [77, .5], [76, 1], [72, 1], [74, 1], [72, 2]
  ];
  // A locally synthesised birthday melody. Nothing is downloaded.
  const normalVolume = .32;
  const microphoneVolume = .018;
  const score = [];
  let melodyBeat = 0;
  notes.forEach(([note, beats]) => {
    score.push({ beat: melodyBeat, note, duration: Math.max(.25, beats * .83), level: .28, bell: true });
    melodyBeat += beats;
  });
  [
    [1, [48, 52, 55]], [4, [43, 50, 55]],
    [7, [43, 50, 55]], [10, [48, 52, 55]],
    [13, [48, 52, 55]], [16, [41, 48, 53]],
    [18, [41, 48, 53]], [20, [43, 50, 55]], [22, [48, 52, 55]]
  ].forEach(([beat, chord]) => {
    chord.forEach((note, index) => score.push({ beat: beat + index * .12, note, duration: 1.6, level: .035, bell: false }));
  });
  score.sort((a, b) => a.beat - b.beat);
  const cycleSeconds = (melodyBeat + 4) * beatSeconds;
  const voices = new Set();
  let context;
  let master;
  let playing = false;
  let userPaused = false;
  let microphoneActive = false;
  let pendingStart = null;
  let generation = 0;
  let timer = null;
  let cycleStart = 0;
  let scoreIndex = 0;

  function render(message) {
    if (button) {
      button.textContent = playing ? "暂停音乐" : /未能|无法/.test(message || "") ? "重试音乐" : "播放音乐";
      button.setAttribute("aria-pressed", String(playing));
      button.dataset.musicState = playing ? "playing" : "paused";
      button.dataset.musicVolume = microphoneActive ? "soft" : "normal";
    }
    if (status) status.textContent = message || (playing ? "生日音乐正在播放" : "生日音乐已暂停");
  }

  function removeVoice(voice) {
    if (!voices.delete(voice)) return;
    voice.oscillator.onended = null;
    voice.oscillator.disconnect();
    voice.gain.disconnect();
  }

  function tone(note, start, duration, level, harmonic = 1) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const end = start + duration;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440 * Math.pow(2, (note - 69) / 12) * harmonic, start);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + .015);
    gain.gain.exponentialRampToValueAtTime(level * .36, start + Math.min(.19, duration * .45));
    gain.gain.exponentialRampToValueAtTime(.0001, end);
    oscillator.connect(gain);
    gain.connect(master);
    const voice = { oscillator, gain };
    voices.add(voice);
    oscillator.onended = () => removeVoice(voice);
    oscillator.start(start);
    oscillator.stop(end + .03);
  }

  function schedule() {
    if (!playing || !context || context.state !== "running") return;
    const now = context.currentTime;
    // Avoid a burst of overdue notes if a mobile browser throttled the timer.
    if (cycleStart + cycleSeconds < now - .2) {
      cycleStart = now + .05;
      scoreIndex = 0;
    }
    const horizon = now + .25;
    while (cycleStart + score[scoreIndex].beat * beatSeconds < horizon) {
      const event = score[scoreIndex];
      const start = cycleStart + event.beat * beatSeconds;
      if (start >= now - .04) {
        const safeStart = Math.max(start, now + .005);
        const duration = event.duration * beatSeconds;
        tone(event.note, safeStart, duration, event.level);
        if (event.bell) tone(event.note, safeStart, duration * .62, event.level * .14, 2);
      }
      scoreIndex += 1;
      if (scoreIndex === score.length) {
        scoreIndex = 0;
        cycleStart += cycleSeconds;
      }
    }
  }

  function pause(explicit, message) {
    if (explicit) userPaused = true;
    generation += 1;
    pendingStart = null;
    playing = false;
    window.clearInterval(timer);
    timer = null;
    if (context) {
      const now = context.currentTime;
      voices.forEach(voice => {
        try {
          voice.gain.gain.cancelScheduledValues(now);
          voice.gain.gain.setValueAtTime(.0001, now);
          voice.oscillator.stop(now + .01);
        } catch (_) {
          // A voice may already have ended while the page was being hidden.
        } finally {
          // A suspended audio clock may never reach the scheduled stop time.
          removeVoice(voice);
        }
      });
      // Suspend on pause as well as when hidden, saving phone battery.
      if (context.state !== "closed") context.suspend().catch(() => {});
    }
    render(message);
  }

  function ensureContext() {
    if (context && context.state !== "closed") return;
    context = new Context();
    master = context.createGain();
    master.gain.value = microphoneActive ? microphoneVolume : normalVolume;
    master.connect(context.destination);
    context.addEventListener("statechange", () => {
      if (playing && context.state !== "running") pause(false, "音乐已暂停,点击播放音乐可继续");
    });
  }

  function setMicrophoneActive(active) {
    active = Boolean(active);
    if (microphoneActive === active) return;
    microphoneActive = active;
    if (master && context && context.state !== "closed") {
      const now = context.currentTime;
      const current = master.gain.value;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(current, now);
      // Keep the melody clock running; soften speaker sound during breath sensing.
      master.gain.linearRampToValueAtTime(active ? microphoneVolume : normalVolume, now + (active ? .12 : .9));
    }
    render();
  }

  function start(explicit) {
    if ((!explicit && userPaused) || document.hidden) return Promise.resolve(false);
    if (explicit) userPaused = false;
    if (playing) return Promise.resolve(true);
    if (pendingStart) return pendingStart;
    if (!Context) {
      render("暂时无法播放音乐,点击可再试");
      return Promise.resolve(false);
    }
    const attempt = ++generation;
    // Construct and resume synchronously inside the actual click handler.
    let resumed;
    try {
      ensureContext();
      resumed = context.resume();
    } catch (_) {
      render("音乐未能播放,点击播放音乐再试");
      return Promise.resolve(false);
    }
    const task = Promise.resolve(resumed).then(() => {
      if (attempt !== generation || userPaused || document.hidden) {
        if ((userPaused || document.hidden || (!playing && !pendingStart)) && context.state === "running") {
          context.suspend().catch(() => {});
        }
        return false;
      }
      if (context.state !== "running") throw new Error("Audio still paused");
      playing = true;
      cycleStart = context.currentTime + .05;
      scoreIndex = 0;
      schedule();
      timer = window.setInterval(schedule, 80);
      render();
      return true;
    }).catch(() => {
      if (attempt === generation) pause(false, "音乐未能播放,点击播放音乐再试");
      return false;
    }).finally(() => {
      if (pendingStart === task) pendingStart = null;
    });
    pendingStart = task;
    return task;
  }

  function toggle() {
    if (playing || pendingStart) {
      pause(true);
      return Promise.resolve(false);
    }
    return start(true);
  }

  if (button) {
    button.hidden = false;
    button.addEventListener("click", toggle);
  }
  function startOnInteraction(event) {
    if (button && button.contains(event.target)) return;
    if (event.type === "keydown" && (event.repeat || !["Enter", " ", "ArrowRight", "ArrowLeft"].includes(event.key))) return;
    start(false);
  }
  // Browsers require a gesture before audio. The first touch starts the opening music.
  document.addEventListener("pointerdown", startOnInteraction, { capture: true, passive: true });
  document.addEventListener("click", startOnInteraction, true);
  document.addEventListener("keydown", startOnInteraction, true);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && (playing || pendingStart)) pause(false, "音乐已暂停,点击播放音乐可继续");
  });
  window.addEventListener("pagehide", () => pause(false));
  window.BirthdayMusic = Object.freeze({
    startFromGesture: () => start(false),
    setMicrophoneActive,
    toggle,
    stop: () => pause(true)
  });
  render("点一下,一起听生日音乐");
})();
