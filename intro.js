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
  const breathMeter = document.getElementById("intro-breath-meter");
  const breathLevel = document.getElementById("intro-breath-level");
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
  let microphoneStartupTimer = null;
  let microphoneResumeCancel = null;
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
    const wasActive = microphonePending || Boolean(microphoneStream) || Boolean(microphoneContext);
    microphoneGeneration += 1;
    microphonePending = false;
    window.clearTimeout(microphoneTimer);
    window.clearTimeout(microphoneStartupTimer);
    if (microphoneResumeCancel) microphoneResumeCancel();
    microphoneResumeCancel = null;
    window.cancelAnimationFrame(microphoneFrame);
    microphoneTimer = null;
    microphoneStartupTimer = null;
    microphoneFrame = null;
    if (microphoneStream) microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
    if (microphoneSource) {
      try { microphoneSource.disconnect(); } catch (_) {}
    }
    microphoneSource = null;
    const oldContext = microphoneContext;
    microphoneContext = null;
    closeMicrophoneContext(oldContext);
    microphoneButton.disabled = stage !== "candle";
    if (wasActive || stage !== "candle") {
      microphoneButton.textContent = "许好愿望,开始吹蜡烛";
      cakeStatus.removeAttribute("data-mic-state");
    }
    if (breathMeter) breathMeter.hidden = true;
    updateBreathMeter(0);
    window.BirthdayMusic?.setMicrophoneActive(false);
  }

  function closeMicrophoneContext(context) {
    if (!context || context.state === "closed") return;
    try { Promise.resolve(context.close()).catch(() => {}); } catch (_) {}
  }

  function updateBreathMeter(value) {
    const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
    if (breathMeter) {
      breathMeter.setAttribute("aria-valuenow", String(percent));
      breathMeter.style.setProperty("--breath-level", String(percent / 100));
    }
    if (breathLevel) breathLevel.style.width = `${percent}%`;
    cakeArt.style.setProperty("--breath-level", String(percent / 100));
  }

  function microphoneStatus(state, message, buttonLabel) {
    cakeStatus.setAttribute("data-mic-state", state);
    if (cakeStatus.textContent !== message) cakeStatus.textContent = message;
    if (buttonLabel) microphoneButton.textContent = buttonLabel;
  }

  function microphoneFailure(message, buttonLabel = "重新尝试") {
    stopMicrophone();
    if (stage === "candle") microphoneStatus("error", message, buttonLabel);
  }

  function waitForMicrophoneContext(context, ready) {
    if (context.state === "running") return Promise.resolve(true);
    return new Promise(resolve => {
      let settled = false;
      let timeout = null;
      const finish = running => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        if (microphoneResumeCancel === cancel) microphoneResumeCancel = null;
        resolve(running);
      };
      const cancel = () => finish(false);
      microphoneResumeCancel = cancel;
      timeout = window.setTimeout(cancel, 1800);
      ready.then(running => finish(running && context.state === "running"));
    });
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
    intro.classList.remove("is-wish-complete");
    intro.classList.add("is-gift-visible");
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
    intro.classList.add("is-wish-complete");
    cakeStatus.textContent = "蜡烛吹灭啦.愿你许下的愿望,都慢慢实现.";
    blowButton.disabled = true;
    blowButton.setAttribute("aria-label", "愿望已收好");
    transitionTimer = window.setTimeout(showGift, reducedMotion.matches ? 100 : 1800);
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
    }, reducedMotion.matches ? 80 : 2400);
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
    music();
    blowButton.disabled = false;
    microphoneStatus("waiting", "请在弹窗中允许麦克风,随后轻轻吹气.", "正在开启...");
    const Context = window.AudioContext || window.webkitAudioContext;
    const modernMedia = navigator.mediaDevices?.getUserMedia;
    const legacyMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    if ((!modernMedia && !legacyMedia) || !Context) {
      const inWeChat = /MicroMessenger/i.test(navigator.userAgent || "");
      microphoneStatus("unsupported", inWeChat
        ? "当前微信未开放吹气感应,可以点蜡烛吹灭."
        : "当前浏览器暂不支持吹气感应,可以点蜡烛吹灭.", "吹气暂不可用");
      return;
    }
    microphonePending = true;
    const attempt = ++microphoneGeneration;
    microphoneButton.disabled = true;
    microphoneStartupTimer = window.setTimeout(() => {
      if (attempt !== microphoneGeneration) return;
      microphoneFailure("麦克风还没准备好,可以重新尝试,或点蜡烛吹灭.");
    }, 20000);

    // Keep music continuous at a low level so speaker sound is less likely to trigger sensing.
    window.BirthdayMusic?.setMicrophoneActive(true);
    let detectionContext;
    let localStream = null;
    try {
      // Both calls happen synchronously in the original click, before any permission await.
      detectionContext = new Context();
      microphoneContext = detectionContext;
      const resumed = typeof detectionContext.resume === "function" ? detectionContext.resume() : undefined;
      const contextReady = Promise.resolve(resumed).then(
        () => detectionContext.state === "running", () => false
      );
      const constraints = { audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } };
      const permission = modernMedia
        ? modernMedia.call(navigator.mediaDevices, constraints)
        : new Promise((resolve, reject) => legacyMedia.call(navigator, constraints, resolve, reject));
      const stream = await permission;
      localStream = stream;
      if (attempt !== microphoneGeneration || stage !== "candle" || document.hidden) {
        stream.getTracks().forEach(track => track.stop());
        closeMicrophoneContext(detectionContext);
        return;
      }
      microphoneStream = stream;
      const running = await waitForMicrophoneContext(detectionContext, contextReady);
      if (attempt !== microphoneGeneration || stage !== "candle" || document.hidden) {
        stream.getTracks().forEach(track => track.stop());
        if (microphoneContext === detectionContext) stopMicrophone();
        else closeMicrophoneContext(detectionContext);
        return;
      }
      if (!running || detectionContext.state !== "running") {
        microphoneFailure("声音感应还没启动,请再点一下.也可以点蜡烛吹灭.", "再点一下启动");
        return;
      }
      if (typeof stream.getAudioTracks === "function" && stream.getAudioTracks().length === 0) {
        microphoneFailure("没找到可用的麦克风,可以点蜡烛吹灭.");
        return;
      }
      const analyser = detectionContext.createAnalyser();
      analyser.fftSize = 1024;
      microphoneSource = detectionContext.createMediaStreamSource(stream);
      microphoneSource.connect(analyser);
      // A silent output keeps the capture graph active in WebViews without microphone feedback.
      if (typeof detectionContext.createGain === "function" && typeof analyser.connect === "function") {
        const silentOutput = detectionContext.createGain();
        silentOutput.gain.value = 0;
        analyser.connect(silentOutput);
        silentOutput.connect(detectionContext.destination);
      }
      const useFloatSamples = typeof analyser.getFloatTimeDomainData === "function";
      const samples = useFloatSamples ? new Float32Array(analyser.fftSize) : new Uint8Array(analyser.fftSize);
      let noiseFloor = .003;
      let evidenceMs = 0;
      let previousFrame = null;
      let receivedSound = false;
      const listeningStart = performance.now();
      window.clearTimeout(microphoneStartupTimer);
      microphoneStartupTimer = null;
      microphoneTimer = window.setTimeout(() => {
        if (attempt !== microphoneGeneration) return;
        microphoneFailure("还没听到足够的声音,靠近手机再试一次,或点蜡烛吹灭.");
      }, 12000);
      microphoneButton.textContent = "正在听你的愿望...";
      microphoneStatus("listening", "吹气感应已准备好,对着手机轻轻吹一口气.");
      if (breathMeter) breathMeter.hidden = false;
      updateBreathMeter(0);
      function listen(now) {
        if (attempt !== microphoneGeneration || stage !== "candle") return;
        if (detectionContext.state !== "running") {
          microphoneFailure("声音感应暂停了,请再点一下.也可以点蜡烛吹灭.", "再点一下启动");
          return;
        }
        if (useFloatSamples) analyser.getFloatTimeDomainData(samples);
        else analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((total, value) => {
          const amplitude = useFloatSamples ? value : (value - 128) / 128;
          return total + amplitude * amplitude;
        }, 0) / samples.length);
        const elapsed = previousFrame === null ? 16 : Math.max(0, Math.min(60, now - previousFrame));
        previousFrame = now;
        // Learn low-energy input immediately; high-energy frames cannot raise the baseline.
        if (rms <= .02) noiseFloor = Math.min(.01, noiseFloor * .65 + rms * .35);
        const threshold = Math.max(.012, noiseFloor * 1.8 + .004);
        evidenceMs = Math.max(0, evidenceMs + (rms > threshold ? elapsed : -elapsed * .7));
        updateBreathMeter(rms / .065);
        if (rms > .004 && !receivedSound) {
          receivedSound = true;
          microphoneStatus("listening", "已收到声音,继续对着手机轻轻吹一口气.");
        } else if (!receivedSound && now - listeningStart > 1500) {
          microphoneStatus("listening", "还没听到声音,靠近手机的麦克风轻轻吹一口气.");
        }
        if (evidenceMs >= 180) {
          extinguish(true);
          return;
        }
        microphoneFrame = window.requestAnimationFrame(listen);
      }
      microphoneFrame = window.requestAnimationFrame(listen);
    } catch (error) {
      if (attempt !== microphoneGeneration) {
        if (localStream) localStream.getTracks().forEach(track => track.stop());
        closeMicrophoneContext(detectionContext);
        return;
      }
      const message = error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError"
        ? "没有获得麦克风权限,请允许后重新尝试,也可以点蜡烛吹灭."
        : error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError"
          ? "没找到可用的麦克风,可以点蜡烛吹灭."
          : "麦克风暂时没有准备好,可以重新尝试,或点蜡烛吹灭.";
      microphoneFailure(message);
    }
  }

  blowButton.addEventListener("click", () => {
    if (!blowButton.disabled) extinguish(false);
  });
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
      if (wasListening && stage === "candle") microphoneStatus("error", "吹气感应已暂停,可以重新尝试,或点蜡烛吹灭.", "重新尝试");
    }
  });
  window.addEventListener("pagehide", () => {
    releaseTearPointer();
    stopMicrophone();
  });

  // Activate only after all controls and handlers exist; without JS the greeting is readable.
  intro.hidden = false;
  blowButton.disabled = true;
  enterButton.hidden = true;
  page.hidden = true;
  document.body.classList.add("intro-active");
  if (skipLink) skipLink.href = "#gift-intro";
})();
