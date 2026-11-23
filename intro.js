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
  const unwrapButton = document.getElementById("intro-unwrap");
  const enterButton = document.getElementById("intro-enter");
  const skipButton = document.getElementById("intro-skip");
  const wishRoute = document.getElementById("intro-route-wish");
  const giftRoute = document.getElementById("intro-route-gift");
  const wishesRoute = document.getElementById("intro-route-wishes");
  const skipLink = document.querySelector(".skip-link");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (![intro, page, title, description, cakeStep, cakeArt, cakeStatus, blowButton, microphoneButton,
    giftStep, giftArt, giftStatus, unwrapButton, enterButton, skipButton, wishRoute, giftRoute, wishesRoute].every(Boolean)) return;

  let stage = "candle";
  let transitionTimer = null;
  let microphonePending = false;
  let microphoneGeneration = 0;
  let microphoneTimer = null;
  let microphoneFrame = null;
  let microphoneStream = null;
  let microphoneContext = null;
  let microphoneSource = null;

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

  function enterPage() {
    if (stage === "entered") return;
    music();
    stage = "entered";
    window.clearTimeout(transitionTimer);
    stopMicrophone();
    page.hidden = false;
    intro.hidden = true;
    if (skipLink) skipLink.href = "#main";
    document.body.classList.remove("intro-active");
    const birthdayTitle = document.getElementById("birthday-title");
    if (birthdayTitle) {
      birthdayTitle.tabIndex = -1;
      birthdayTitle.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function showGift() {
    if (stage !== "blown") return;
    stage = "gift";
    cakeStep.hidden = true;
    giftStep.hidden = false;
    title.textContent = "还有一份礼物,等你拆开.";
    description.textContent = "愿望交给蜡烛,接下来的惊喜交给你.";
    wishRoute.removeAttribute("aria-current");
    wishRoute.classList.add("is-done");
    giftRoute.setAttribute("aria-current", "step");
    unwrapButton.focus({ preventScroll: true });
  }

  function extinguish(fromMicrophone = false) {
    if (stage !== "candle") return;
    if (!fromMicrophone) music();
    stage = "blown";
    stopMicrophone();
    cakeArt.classList.add("is-blown");
    cakeStatus.textContent = "蜡烛吹灭啦.愿你许下的愿望,都慢慢实现.";
    blowButton.disabled = true;
    blowButton.textContent = "愿望已收好";
    transitionTimer = window.setTimeout(showGift, reducedMotion.matches ? 100 : 1050);
  }

  function unwrap() {
    if (stage !== "gift") return;
    music();
    stage = "opening";
    stopMicrophone();
    unwrapButton.disabled = true;
    unwrapButton.textContent = "礼物正在打开...";
    giftArt.classList.add("is-open");
    transitionTimer = window.setTimeout(() => {
      if (stage !== "opening") return;
      stage = "opened";
      giftStatus.textContent = "礼物里装着生日好运,还有我想送给你的几句话.";
      unwrapButton.hidden = true;
      enterButton.hidden = false;
      giftRoute.removeAttribute("aria-current");
      giftRoute.classList.add("is-done");
      wishesRoute.setAttribute("aria-current", "step");
      enterButton.focus({ preventScroll: true });
    }, reducedMotion.matches ? 100 : 800);
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
      cakeStatus.textContent = "生日旋律已暂停.现在对着手机轻轻吹一口气吧.";
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
  unwrapButton.addEventListener("click", unwrap);
  enterButton.addEventListener("click", enterPage);
  skipButton.addEventListener("click", enterPage);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      const wasListening = microphonePending || Boolean(microphoneStream);
      stopMicrophone();
      if (wasListening && stage === "candle") cakeStatus.textContent = "吹气感应已暂停,也可以点一下吹灭蜡烛.";
    }
  });
  window.addEventListener("pagehide", stopMicrophone);

  // Activate only after all controls and handlers exist; without JS the greeting is readable.
  intro.hidden = false;
  page.hidden = true;
  document.body.classList.add("intro-active");
  if (skipLink) skipLink.href = "#gift-intro";
})();
