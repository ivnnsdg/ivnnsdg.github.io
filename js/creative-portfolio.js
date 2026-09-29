(() => {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  document.querySelectorAll("[data-creative-slideshow]").forEach((slideshow) => {
    const imageSlots = [...slideshow.querySelectorAll("[data-slide-image]")];
    const previousButton = slideshow.querySelector("[data-slide-previous]");
    const nextButton = slideshow.querySelector("[data-slide-next]");
    const counter = slideshow.querySelector("[data-slide-count]");
    let slides = [];
    let activeIndex = 0;
    let activeSlot = 0;
    let timer = null;
    let touchStartX = null;
    let requestId = 0;
    let pointerInside = false;

    const showSlide = (index) => {
      if (!slides.length || !imageSlots.length) return;
      const nextIndex = (index + slides.length) % slides.length;
      const nextSlot = slides.length === 1 ? activeSlot : 1 - activeSlot;
      const image = imageSlots[nextSlot];
      const slide = slides[nextIndex];
      const currentRequest = ++requestId;
      const activate = () => {
        if (currentRequest !== requestId) return;
        const previous = imageSlots[activeSlot];
        image.src = slide.src;
        image.alt = slide.alt;
        image.setAttribute("aria-hidden", "false");
        requestAnimationFrame(() => {
          image.classList.add("is-active");
          if (previous !== image) {
            previous.classList.remove("is-active");
            previous.setAttribute("aria-hidden", "true");
          }
        });
        activeSlot = nextSlot;
        activeIndex = nextIndex;
        if (counter) counter.textContent = `${activeIndex + 1} / ${slides.length}`;
      };

      if (image.src === slide.src && image.complete) {
        activate();
        return;
      }
      const preload = new Image();
      preload.onload = activate;
      preload.onerror = activate;
      preload.src = slide.src;
    };

    const stopSlideshow = () => {
      window.clearInterval(timer);
      timer = null;
      pointerInside = false;
      showSlide(0);
    };

    const startSlideshow = () => {
      pointerInside = true;
      if (!finePointer || timer || slides.length < 2) return;
      timer = window.setInterval(() => showSlide(activeIndex + 1), 1350);
    };

    previousButton?.addEventListener("click", () => showSlide(activeIndex - 1));
    nextButton?.addEventListener("click", () => showSlide(activeIndex + 1));
    if (finePointer) {
      slideshow.addEventListener("pointerenter", startSlideshow);
      slideshow.addEventListener("pointerleave", stopSlideshow);
    }
    slideshow.addEventListener("focusin", startSlideshow);
    slideshow.addEventListener("focusout", (event) => {
      if (finePointer && !slideshow.contains(event.relatedTarget)) stopSlideshow();
    });
    slideshow.addEventListener("touchstart", (event) => {
      touchStartX = event.changedTouches[0]?.clientX ?? null;
    }, { passive: true });
    slideshow.addEventListener("touchend", (event) => {
      if (touchStartX === null) return;
      const distance = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(distance) > 40) showSlide(activeIndex + (distance < 0 ? 1 : -1));
      touchStartX = null;
    }, { passive: true });

    const sourceUrl = new URL(slideshow.dataset.slideSource, location.href);
    fetch(sourceUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load ${sourceUrl.pathname}`);
        return response.text();
      })
      .then((markup) => {
        const documentCopy = new DOMParser().parseFromString(markup, "text/html");
        const selector = slideshow.dataset.slideSelector;
        slides = [...documentCopy.querySelectorAll(selector)].map((link) => ({
          src: new URL(link.getAttribute("href"), sourceUrl).href,
          alt: link.querySelector("img")?.alt || "Creative work",
        }));
        if (counter) counter.textContent = slides.length ? `1 / ${slides.length}` : "0 / 0";
        if (slides.length && imageSlots[0]) {
          imageSlots[0].alt = slides[0].alt;
          imageSlots[0].setAttribute("aria-hidden", "false");
          imageSlots[0].classList.add("is-active");
          imageSlots[1]?.setAttribute("aria-hidden", "true");
        }
        if (pointerInside) startSlideshow();
      })
      .catch((error) => console.error("Unable to load Creative slideshow", error));
  });

  const previewVideos = [...document.querySelectorAll("[data-creative-video]")];
  if (!previewVideos.length) return;

  const playPreviewIfVisible = (video) => {
    if (video.dataset.creativeVisible !== "true") return;
    video.muted = true;
    video.play().catch(() => {});
  };

  previewVideos.forEach((video) => {
    video.addEventListener("loadedmetadata", () => playPreviewIfVisible(video));
    video.addEventListener("canplay", () => playPreviewIfVisible(video));
  });

  const videoDialog = document.createElement("dialog");
  videoDialog.className = "creative-video-dialog";
  videoDialog.setAttribute("aria-label", "Animation player");
  videoDialog.innerHTML = '<button class="creative-video-dialog-close" type="button" aria-label="Close video">×</button><video controls playsinline muted></video>';
  document.body.append(videoDialog);
  const dialogVideo = videoDialog.querySelector("video");

  previewVideos.forEach((video) => {
    const openButton = video.closest(".creative-video-stage")?.querySelector(".creative-video-open");
    const openPlayer = async () => {
      const source = video.querySelector("source");
      const sourcePath = source?.getAttribute("src") || source?.dataset.src;
      if (!sourcePath) return;

      dialogVideo.pause();
      dialogVideo.replaceChildren();
      const fullSource = document.createElement("source");
      fullSource.src = sourcePath;
      fullSource.type = source.type;
      dialogVideo.append(fullSource);
      dialogVideo.muted = true;
      videoDialog.showModal();
      dialogVideo.load();
      dialogVideo.play().catch(() => {});
    };

    openButton?.addEventListener("click", openPlayer);
  });

  videoDialog.querySelector(".creative-video-dialog-close").addEventListener("click", () => videoDialog.close());
  videoDialog.addEventListener("click", (event) => {
    if (event.target === videoDialog) videoDialog.close();
  });
  videoDialog.addEventListener("close", () => {
    dialogVideo.pause();
    dialogVideo.replaceChildren();
    dialogVideo.load();
  });

  if ("IntersectionObserver" in window) {
    const playbackObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.dataset.creativeVisible = "true";
          video.muted = true;
          if (video.readyState >= 2) playPreviewIfVisible(video);
        } else {
          video.dataset.creativeVisible = "false";
          video.pause();
        }
      });
    }, { threshold: 0.35 });
    previewVideos.forEach((video) => playbackObserver.observe(video));
  }
})();
