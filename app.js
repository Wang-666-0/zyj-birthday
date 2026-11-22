(() => {
  "use strict";

  const toggle = document.getElementById("note-toggle");
  const note = document.getElementById("letter-body");
  const heroButton = document.getElementById("open-note");
  const letterSection = document.getElementById("letter");
  const confetti = document.getElementById("confetti");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let hasCelebrated = false;

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
    toggle.addEventListener("click", () => setNoteOpen(note.hidden));
    heroButton.addEventListener("click", event => {
      event.preventDefault();
      setNoteOpen(true);
      letterSection.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
      note.focus({ preventScroll: true });
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
