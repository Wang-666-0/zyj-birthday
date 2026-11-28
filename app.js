(() => {
  "use strict";

  const toggle = document.getElementById("note-toggle");
  const note = document.getElementById("letter-body");
  const heroButton = document.getElementById("open-note");
  const letterSection = document.getElementById("letter");
  const confetti = document.getElementById("confetti");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fortuneSection = document.getElementById("fortune");
  const drawButton = document.getElementById("draw-fortune");
  const resetButton = document.getElementById("reset-fortunes");
  const illustration = document.getElementById("fortune-illustration");
  const fortuneResult = document.getElementById("fortune-result");
  const resultTitle = document.getElementById("fortune-result-title");
  const resultText = document.getElementById("fortune-result-text");
  const resultAside = document.getElementById("fortune-result-aside");
  const stamp = document.getElementById("fortune-stamp");
  const progress = document.getElementById("fortune-progress");
  const collection = document.getElementById("fortune-collection");
  const heroLabel = document.getElementById("hero-action-label");
  let hasCelebrated = false;
  let drawCount = 0;
  let drawing = false;
  let drawTimer = null;
  let round = 0;
  const totalDraws = 5;
  const noodleWish = {
    title: "螺蛳粉自由签",
    text: "吃再多螺蛳粉也不上火!",
    aside: "生日限定愿望,今天替你许下.",
    stamp: "快乐加料"
  };
  const midLaneWish = {
    title: "顶级中路签",
    text: "王者小乔,把把拿下顶级中路!",
    aside: "这一局,风都站在你这边.",
    stamp: "峡谷高光"
  };
  const wishes = [
    { title: "快乐加倍签", text: "好吃的,好玩的,还有让你嘴角上扬的小事,今天都多来一点.", aside: "宜:开开心心,收下祝福.", stamp: "快乐加倍" },
    { title: "橘猫守护签", text: "愿路上遇到的小猫,都愿意多陪你一会儿.", aside: "宜:收集可爱,也被可爱治愈.", stamp: "喵运满满" },
    { title: "慢慢来签", text: "不急着赶路也没关系,吹吹风,晒晒太阳,按自己舒服的节奏往前走.", aside: "宜:偶尔放空,也不用愧疚.", stamp: "自在一点" },
    { title: "好事发生签", text: "在最寻常的一天里,也会突然撞见一份刚刚好的惊喜.", aside: "宜:期待下一件小小的好事.", stamp: "好事将近" },
    { title: "愿望靠近签", text: "你认真投入过心意的事,都会在某一天悄悄开花.", aside: "宜:继续喜欢,继续向前.", stamp: "心愿靠近" },
    { title: "元气满格签", text: "愿你每天睡个好觉,醒来就有迎接新一天的好心情.", aside: "宜:吃好睡好,元气满满.", stamp: "元气满格" },
    { title: "顺顺利利签", text: "愿计划里的事如约而至,计划之外的,也悄悄变成惊喜.", aside: "宜:带着好运,轻轻松松向前.", stamp: "顺心如意" }
  ];

  function shuffled(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // Nine good-luck slips plus the final letter make ten distinct slips in total.
  // Each round draws four different good-luck slips, then the guaranteed letter.
  const makeSlips = () => shuffled([noodleWish, midLaneWish, ...wishes]).slice(0, totalDraws - 1);
  let slips = makeSlips();

  function startMusic() {
    window.BirthdayMusic?.startFromGesture();
  }

  function scrollTo(element) {
    element.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
  }

  function celebrate() {
    if (hasCelebrated || reducedMotion.matches) return;
    hasCelebrated = true;
    const palette = ["#f2a04b", "#bd6026", "#ffd6a0", "#fff3dc", "#845338"];
    for (let i = 0; i < 28; i += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.setProperty("--x", `${6 + Math.random() * 88}%`);
      piece.style.setProperty("--color", palette[i % palette.length]);
      piece.style.setProperty("--delay", `${Math.random() * 0.5}s`);
      piece.style.setProperty("--drift", `${-70 + Math.random() * 140}px`);
      piece.style.setProperty("--r", `${Math.random() * 180}deg`);
      piece.style.setProperty("--spin", `${300 + Math.random() * 600}deg`);
      piece.addEventListener("animationend", () => piece.remove(), { once: true });
      confetti.append(piece);
    }
    window.setTimeout(() => confetti.replaceChildren(), 4000);
  }

  function setNoteOpen(open) {
    note.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "把小纸条收好" : "打开小纸条";
    if (open) celebrate();
  }

  if (toggle && note && heroButton && letterSection) {
    // Without JavaScript, the complete letter remains readable.
    toggle.hidden = false;
    setNoteOpen(false);
    toggle.addEventListener("click", () => {
      startMusic();
      setNoteOpen(note.hidden);
    });
    heroButton.addEventListener("click", event => {
      event.preventDefault();
      startMusic();
      scrollTo(fortuneSection);
      drawButton.focus({ preventScroll: true });
    });
  }

  function revealLetter() {
    letterSection.hidden = false;
    setNoteOpen(true);
    scrollTo(letterSection);
    note.focus({ preventScroll: true });
  }

  function resetRound() {
    window.clearTimeout(drawTimer);
    round += 1;
    drawing = false;
    drawCount = 0;
    hasCelebrated = false;
    slips = makeSlips();
    illustration.classList.remove("is-drawing");
    fortuneResult.classList.remove("is-revealed", "is-final");
    fortuneResult.removeAttribute("aria-busy");
    stamp.textContent = "生日限定";
    resultTitle.textContent = "今天的第一份好运";
    resultText.textContent = "轻轻摇一摇签筒,看看小橘猫为你准备了什么.";
    resultAside.textContent = "每一支,都是送给你的祝福.";
    progress.textContent = `已收下 0 / ${totalDraws} 份祝福`;
    collection.replaceChildren();
    drawButton.disabled = false;
    drawButton.textContent = "抽一支生日签";
    resetButton.hidden = true;
    setNoteOpen(false);
    letterSection.hidden = true;
    scrollTo(fortuneSection);
    drawButton.focus({ preventScroll: true });
  }

  if (fortuneSection && drawButton && resetButton && letterSection && note && toggle) {
    fortuneSection.hidden = false;
    letterSection.hidden = true;
    heroButton.href = "#fortune";
    heroLabel.textContent = "抽一份生日好运";
    resetButton.addEventListener("click", resetRound);
    drawButton.addEventListener("click", () => {
      if (drawing) return;
      startMusic();
      if (drawCount === totalDraws) {
        revealLetter();
        return;
      }
      drawing = true;
      drawButton.disabled = true;
      drawButton.textContent = "小橘猫正在挑选...";
      fortuneResult.setAttribute("aria-busy", "true");
      illustration.classList.add("is-drawing");
      fortuneResult.classList.remove("is-revealed");
      const currentRound = round;
      drawTimer = window.setTimeout(() => {
        if (currentRound !== round) return;
        const last = drawCount === totalDraws - 1;
        const slip = last ? {
          title: "藏起来的小纸条",
          text: "前面都是小橘猫替你攒的好运,最后这一支,留给我亲口对你说.",
          aside: "生日快乐,ZYJ.请收下这张小纸条.",
          stamp: "专属祝福"
        } : slips[drawCount];
        drawCount += 1;
        drawing = false;
        illustration.classList.remove("is-drawing");
        fortuneResult.removeAttribute("aria-busy");
        fortuneResult.classList.add("is-revealed");
        fortuneResult.classList.toggle("is-final", last);
        stamp.textContent = slip.stamp;
        resultTitle.textContent = slip.title;
        resultText.textContent = slip.text;
        resultAside.textContent = slip.aside;
        progress.textContent = `已收下 ${drawCount} / ${totalDraws} 份祝福`;
        const item = document.createElement("li");
        item.textContent = slip.title;
        collection.append(item);
        resetButton.hidden = false;
        drawButton.disabled = false;
        drawButton.textContent = last ? "再看看小纸条" : drawCount === totalDraws - 1 ? "抽最后一支签" : "再抽一支";
        if (last) revealLetter();
      }, reducedMotion.matches ? 80 : 1050);
    });
  }

  function nonEmptyText(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function applyContent(content) {
    if (!content || typeof content !== "object") return;
    const recipient = nonEmptyText(content.recipient);
    if (recipient) {
      document.querySelectorAll("[data-recipient]").forEach(element => {
        element.textContent = recipient;
      });
      document.title = `生日快乐 ${recipient}. | 一只橘猫的小惊喜`;
    }
    const opening = nonEmptyText(content.opening);
    if (opening) document.querySelector("[data-opening]").textContent = opening;
    const signoff = nonEmptyText(content.signoff);
    if (signoff) document.querySelector("[data-signoff]").textContent = signoff;

    if (typeof content.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(content.date)) {
      document.querySelectorAll("[data-date]").forEach(element => {
        element.dateTime = content.date;
        element.textContent = content.date.replaceAll("-", ".");
      });
    }

    const message = Array.isArray(content.message)
      ? content.message.map(nonEmptyText).filter(Boolean)
      : typeof content.message === "string"
        ? content.message.split(/\n\s*\n/).map(nonEmptyText).filter(Boolean)
        : [];
    if (message.length) {
      const paragraphs = message.map(text => {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        return paragraph;
      });
      document.getElementById("message-paragraphs").replaceChildren(...paragraphs);
    }

    const photoGrid = document.getElementById("photo-grid");
    const photoSection = document.getElementById("photo-section");
    photoGrid.replaceChildren();
    const photos = Array.isArray(content.photos) ? content.photos : [];
    photos.forEach((photo, index) => {
      if (!photo || typeof photo !== "object" || !nonEmptyText(photo.src)) return;
      let url;
      try {
        url = new URL(photo.src, document.baseURI);
      } catch {
        return;
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      const figure = document.createElement("figure");
      figure.className = "photo-frame";
      const image = document.createElement("img");
      image.src = url.href;
      image.alt = nonEmptyText(photo.alt) || `生日照片 ${index + 1}`;
      image.loading = "lazy";
      image.decoding = "async";
      if (photo.fit === "contain") image.style.objectFit = "contain";
      figure.append(image);
      const caption = nonEmptyText(photo.caption);
      if (caption) {
        const element = document.createElement("figcaption");
        element.textContent = caption;
        figure.append(element);
      }
      photoGrid.append(figure);
    });
    photoSection.hidden = photoGrid.childElementCount === 0;
  }

  fetch("content.json", { cache: "no-cache", credentials: "same-origin" })
    .then(response => {
      if (!response.ok) throw new Error("Content unavailable");
      return response.json();
    })
    .then(applyContent)
    .catch(() => {
      // The complete default greeting is already present in the HTML.
    });
})();
