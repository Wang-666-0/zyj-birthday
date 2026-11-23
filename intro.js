(() => {
  "use strict";

  const intro = document.getElementById("gift-intro");
  const page = document.querySelector(".page-shell");
  const title = document.getElementById("intro-title");
  const description = document.getElementById("intro-description");
  const cakeStep = document.getElementById("intro-cake-step");
  const cakeArt = document.getElementById("intro-cake-art");
  const cakeStatus = document.getElementById("intro-cake-status");
  const blowButton = document.getElementById("intro-blow");
  const microphoneButton = document.getElementById("intro-microphone");
  const giftStep = document.getElementById("intro-gift-step");
  const giftArt = document.getElementById("intro-gift-art");
  const giftStatus = document.getElementById("intro-gift-status");
  const tearTrack = document.getElementById("intro-tear-track");
  const unwrapButton = document.getElementById("intro-unwrap");
  const enterButton = document.getElementById("intro-enter");
  const skipButton = document.getElementById("intro-skip");
  const wishRoute = document.getElementById("intro-route-wish");
  const giftRoute = document.getElementById("intro-route-gift");
  const wishesRoute = document.getElementById("intro-route-wishes");
  const skipLink = document.querySelector(".skip-link");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (![intro, page, title, description, cakeStep, cakeArt, cakeStatus, blowButton, microphoneButton,
    giftStep, giftArt, giftStatus, tearTrack, unwrapButton, enterButton, skipButton, wishRoute, giftRoute, wishesRoute].every(Boolean)) return;

  let stage = "candle";
  let transitionTimer = null;
  let microphonePending = false;
  let microphoneGeneration = 0;
  let microphoneTimer = null;
  let microphoneFrame = null;
  let microphoneStream = null;
  let microphoneContext = null;
  let microphoneSource = null;
  let tearProgress = 0;
  let tearPointer = null;
  let tearStartX = 0;
  let tearStartProgress = 0;
  let tearDistance = 1;
  let tearTrackRect = null;
  let arrivalFrame = null;

  function music() {
    window.BirthdayMusic?.startFromGesture();
  }

  function stopMicrophone() {
    microphoneGeneration += 1;
    microphonePending = false;
    window.clearTimeout(microphoneTimer);
    window.cancelAnimationFrame(microphoneFrame);
    microphoneTimer = null;
    microphoneFrame = null;
    if (microphoneStream) microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
    if (microphoneSource) {
      try { microphoneSource.disconnect(); } catch (_) {}
    }
    microphoneSource = null;
    const oldContext = microphoneContext;
    microphoneContext = null;
    if (oldContext && oldContext.state !== "closed") oldContext.close().catch(() => {});
    microphoneButton.disabled = stage !== "candle";
    microphoneButton.textContent = "对着手机吹";
  }

  function positionFortune() {
    const fortune = document.getElementById("fortune");
    if (!fortune) return;
    const oldScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    fortune.scrollIntoView({ block: "start", behavior: "auto" });
    document.documentElement.style.scrollBehavior = oldScrollBehavior;
  }

  function prepareReveal() {
    page.hidden = false;
    page.classList.add("is-arriving");
    document.body.classList.add("intro-revealing");
    positionFortune();
    arrivalFrame = window.requestAnimationFrame(() => {
      arrivalFrame = null;
      if (stage === "opening") page.classList.add("is-visible");
    });
  }

  function enterPage() {
    if (stage === "entered") return;
    music();
    stage = "entered";
    window.clearTimeout(transitionTimer);
    window.cancelAnimationFrame(arrivalFrame);
    arrivalFrame = null;
    releaseTearPointer();
    stopMicrophone();
    page.hidden = false;
    intro.hidden = true;
    if (skipLink) skipLink.href = "#main";
    document.body.classList.remove("intro-active");
    document.body.classList.remove("intro-revealing");
    page.classList.remove("is-arriving", "is-visible");
    const drawButton = document.getElementById("draw-fortune");
    if (drawButton) {
      positionFortune();
      drawButton.focus({ preventScroll: true });
    }
  }

  function showGift() {
    if (stage !== "blown") return;
    stage = "gift";
    cakeStep.hidden = true;
    giftStep.hidden = false;
    title.textContent = "这份礼物,等你拆开.";
    description.textContent = "一点小惊喜,藏在里面.";
    giftStatus.textContent = "按住小爪印,沿虚线向右拖动.";
    setTearProgress(0);
    releaseTearPointer();
    wishRoute.removeAttribute("aria-current");
    wishRoute.classList.add("is-done");
    giftRoute.setAttribute("aria-current", "step");
    unwrapButton.focus({ preventScroll: true });
  }

  function extinguish(fromMicrophone = false) {
    if (stage !== "candle") return;
    stage = "blown";
    stopMicrophone();
    cakeArt.classList.add("is-blown");
    cakeStatus.textContent = "蜡烛吹灭啦.愿你许下的愿望,都慢慢实现.";
    blowButton.disabled = true;
    blowButton.setAttribute("aria-label", "愿望已收好");
    transitionTimer = window.setTimeout(showGift, reducedMotion.matches ? 100 : 1050);
  }

  function setTearProgress(value) {
    tearProgress = Math.max(0, Math.min(1, value));
    giftArt.style.setProperty("--tear", String(tearProgress));
    giftArt.style.setProperty("--tear-percent", `${tearProgress * 100}%`);
    unwrapButton.setAttribute("aria-label", `沿虚线拆开礼物,已拆开${Math.round(tearProgress * 100)}%.也可按回车或空格拆开.`);
  }

  function releaseTearPointer() {
    const pointer = tearPointer;
    tearPointer = null;
    giftArt.classList.remove("is-tearing");
    giftArt.style.setProperty("--view-x", "0deg");
    giftArt.style.setProperty("--view-y", "0deg");
    if (pointer !== null) {
      try {
        if (tearTrack.hasPointerCapture(pointer)) tearTrack.releasePointerCapture(pointer);
      } catch (_) {}
    }
  }

  function openGift() {
    if (stage !== "gift") return;
    // Unlock audio synchronously from the completing pointer/key gesture.
    music();
    stage = "opening";
    setTearProgress(1);
    releaseTearPointer();
    stopMicrophone();
    unwrapButton.disabled = true;
    giftStatus.textContent = "礼物拆开啦,生日好运马上送到.";
    giftArt.classList.add("is-open");
    prepareReveal();
    transitionTimer = window.setTimeout(() => {
      if (stage !== "opening") return;
      giftRoute.removeAttribute("aria-current");
      giftRoute.classList.add("is-done");
      wishesRoute.setAttribute("aria-current", "step");
      enterPage();
    }, reducedMotion.matches ? 80 : 850);
  }

  function startTear(event) {
    if (stage !== "gift" || tearPointer !== null || event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
    const handle = unwrapButton.getBoundingClientRect();
    // A tap on the right end must never skip the actual tear.
    if (event.clientX < handle.left - 14 || event.clientX > handle.right + 14 || event.clientY < handle.top - 14 || event.clientY > handle.bottom + 14) return;
    event.preventDefault();
    tearPointer = event.pointerId;
    tearStartX = event.clientX;
    tearStartProgress = tearProgress;
    // Freeze geometry before tilting the gift so the drag never feeds back into itself.
    tearTrackRect = tearTrack.getBoundingClientRect();
    tearDistance = Math.max(1, tearTrackRect.width);
    unwrapButton.focus({ preventScroll: true });
    giftArt.classList.add("is-tearing");
    try { tearTrack.setPointerCapture(event.pointerId); } catch (_) {}
  }

  function moveTear(event) {
    if (stage !== "gift" || event.pointerId !== tearPointer) return;
    event.preventDefault();
    setTearProgress(Math.max(tearProgress, tearStartProgress + (event.clientX - tearStartX) / tearDistance));
    const x = (event.clientX - tearTrackRect.left) / tearDistance - .5;
    const y = (event.clientY - tearTrackRect.top - tearTrackRect.height / 2) / Math.max(80, tearTrackRect.height);
    giftArt.style.setProperty("--view-x", `${Math.max(-4, Math.min(4, -y * 4))}deg`);
    giftArt.style.setProperty("--view-y", `${Math.max(-4, Math.min(4, x * 8))}deg`);
  }

  function finishTear(event) {
    if (stage !== "gift" || event.pointerId !== tearPointer) return;
    moveTear(event);
    releaseTearPointer();
    if (tearProgress >= .94) openGift();
    else giftStatus.textContent = tearProgress > 0 ? `已经拆开${Math.round(tearProgress * 100)}%,从小爪印继续.` : "按住小爪印,沿虚线向右拖动.";
  }

  function cancelTear(event) {
    if (event.pointerId !== tearPointer) return;
    releaseTearPointer();
    if (stage === "gift") giftStatus.textContent = "小爪印会停在这里,继续向右撕开就好.";
  }

  function tearWithKeyboard(event) {
    if (stage !== "gift") return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setTearProgress(tearProgress + .12);
      if (tearProgress >= .94) openGift();
    } else if (event.key === "End" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openGift();
    }
  }

  async function startMicrophone() {
    if (stage !== "candle" || microphonePending || microphoneStream) return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!navigator.mediaDevices?.getUserMedia || !Context) {
      cakeStatus.textContent = "这次用手指轻轻点一下,也能把蜡烛吹灭.";
      return;
    }
    microphonePending = true;
    const attempt = ++microphoneGeneration;
    microphoneButton.disabled = true;
    microphoneButton.textContent = "等待麦克风...";
    cakeStatus.textContent = "允许使用麦克风后,对着手机轻轻吹一口气.";
    microphoneTimer = window.setTimeout(() => {
      if (attempt !== microphoneGeneration) return;
      stopMicrophone();
      if (stage === "candle") cakeStatus.textContent = "也可以点一下吹灭蜡烛,愿望一样算数.";
    }, 12000);

    // Silence the birthday melody while sensing breath so speaker sound cannot trigger it.
    window.BirthdayMusic?.pauseForMic();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
      if (attempt !== microphoneGeneration || stage !== "candle" || document.hidden) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      microphoneStream = stream;
      const detectionContext = new Context();
      microphoneContext = detectionContext;
      await detectionContext.resume();
      if (attempt !== microphoneGeneration || stage !== "candle" || document.hidden) {
        stream.getTracks().forEach(track => track.stop());
        if (microphoneContext === detectionContext) stopMicrophone();
        else if (detectionContext.state !== "closed") detectionContext.close().catch(() => {});
        return;
      }
      const analyser = detectionContext.createAnalyser();
      analyser.fftSize = 1024;
      microphoneSource = detectionContext.createMediaStreamSource(stream);
      microphoneSource.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const calibrationStart = performance.now();
      let calibrationTotal = 0;
      let calibrationFrames = 0;
      let loudStart = null;
      microphoneButton.textContent = "正在听你的愿望...";
      cakeStatus.textContent = "现在对着手机轻轻吹一口气吧.";
      function listen(now) {
        if (attempt !== microphoneGeneration || stage !== "candle") return;
        analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((total, value) => total + ((value - 128) / 128) ** 2, 0) / samples.length);
        if (now - calibrationStart < 500) {
          calibrationTotal += rms;
          calibrationFrames += 1;
        } else {
          const baseline = calibrationFrames ? calibrationTotal / calibrationFrames : 0;
          const threshold = Math.max(.045, baseline * 2.4);
          if (rms > threshold) {
            if (loudStart === null) loudStart = now;
            if (now - loudStart >= 220) {
              extinguish(true);
              return;
            }
          } else loudStart = null;
        }
        microphoneFrame = window.requestAnimationFrame(listen);
      }
      microphoneFrame = window.requestAnimationFrame(listen);
    } catch (_) {
      if (attempt !== microphoneGeneration) return;
      stopMicrophone();
      if (stage === "candle") cakeStatus.textContent = "这次用手指轻轻点一下,也能把蜡烛吹灭.";
    }
  }

  blowButton.addEventListener("click", () => extinguish(false));
  microphoneButton.addEventListener("click", startMicrophone);
  tearTrack.addEventListener("pointerdown", startTear);
  tearTrack.addEventListener("pointermove", moveTear);
  tearTrack.addEventListener("pointerup", finishTear);
  tearTrack.addEventListener("pointercancel", cancelTear);
  tearTrack.addEventListener("lostpointercapture", cancelTear);
  unwrapButton.addEventListener("keydown", tearWithKeyboard);
  unwrapButton.addEventListener("click", event => {
    // Keyboard and assistive-technology activation has detail=0; touch/mouse taps do not.
    if (event.detail === 0) openGift();
  });
  skipButton.addEventListener("click", enterPage);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      releaseTearPointer();
      const wasListening = microphonePending || Boolean(microphoneStream);
      stopMicrophone();
      if (wasListening && stage === "candle") cakeStatus.textContent = "吹气感应已暂停,也可以点一下吹灭蜡烛.";
    }
  });
  window.addEventListener("pagehide", () => {
    releaseTearPointer();
    stopMicrophone();
  });

  // Activate only after all controls and handlers exist; without JS the greeting is readable.
  intro.hidden = false;
  enterButton.hidden = true;
  page.hidden = true;
  document.body.classList.add("intro-active");
  if (skipLink) skipLink.href = "#gift-intro";
})();
