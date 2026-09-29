(() => {
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".site-nav");

  if (menuButton && navigation) {
    const closeMenu = () => {
      menuButton.setAttribute("aria-expanded", "false");
      navigation.classList.remove("is-open");
    };

    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!isOpen));
      navigation.classList.toggle("is-open", !isOpen);
    });

    navigation.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 851px)").matches) closeMenu();
    });
  }

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  document.querySelectorAll("a[data-lightbox][data-image-src]").forEach((link) => {
    link.href = link.dataset.imageSrc;
    const image = link.querySelector("img[data-src]");
    if (image) {
      image.src = image.dataset.src;
      image.removeAttribute("data-src");
    }
  });

  const lightboxLinks = [...document.querySelectorAll("a[data-lightbox]")];
  if (lightboxLinks.length && "HTMLDialogElement" in window) {
    const dialog = document.createElement("dialog");
    dialog.className = "lightbox";
    dialog.setAttribute("aria-label", "Image preview");
    dialog.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close image">×</button><button class="lightbox-previous" type="button" aria-label="Previous image">←</button><figure><img alt=""><figcaption></figcaption></figure><button class="lightbox-next" type="button" aria-label="Next image">→</button><button class="lightbox-fullscreen" type="button" aria-label="View fullscreen">Fullscreen</button>';
    document.body.append(dialog);
    const image = dialog.querySelector("img");
    const caption = dialog.querySelector("figcaption");
    const previousButton = dialog.querySelector(".lightbox-previous");
    const nextButton = dialog.querySelector(".lightbox-next");
    let activeImages = [];
    let activeIndex = 0;

    const showImage = (index) => {
      activeIndex = (index + activeImages.length) % activeImages.length;
      const link = activeImages[activeIndex];
      image.src = link.href;
      image.alt = link.dataset.alt || link.querySelector("img")?.alt || "Portfolio image";
      caption.textContent = link.dataset.caption || "";
      previousButton.hidden = activeImages.length < 2;
      nextButton.hidden = activeImages.length < 2;
    };

    lightboxLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const group = link.dataset.lightboxGroup;
        activeImages = group
          ? lightboxLinks.filter((item) => item.dataset.lightboxGroup === group)
          : [link];
        showImage(activeImages.indexOf(link));
        dialog.showModal();
      });
    });

    previousButton.addEventListener("click", () => showImage(activeIndex - 1));
    nextButton.addEventListener("click", () => showImage(activeIndex + 1));
    dialog.querySelector(".lightbox-close").addEventListener("click", () => dialog.close());
    dialog.querySelector(".lightbox-fullscreen").addEventListener("click", async () => {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (dialog.requestFullscreen) await dialog.requestFullscreen();
    });
    document.addEventListener("keydown", (event) => {
      if (!dialog.open) return;
      if (event.key === "Escape") dialog.close();
      if (event.key === "ArrowLeft" && activeImages.length > 1) {
        event.preventDefault();
        showImage(activeIndex - 1);
      }
      if (event.key === "ArrowRight" && activeImages.length > 1) {
        event.preventDefault();
        showImage(activeIndex + 1);
      }
      if (event.key.toLowerCase() === "f" && dialog.requestFullscreen) dialog.requestFullscreen();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (document.fullscreenElement === dialog) document.exitFullscreen();
      image.removeAttribute("src");
    });
  }

  const lazyVideos = document.querySelectorAll("video[data-lazy-video]");
  const loadVideo = (video) => {
    if (video.dataset.poster) {
      video.poster = video.dataset.poster;
      delete video.dataset.poster;
    }
    video.querySelectorAll("source[data-src]").forEach((source) => {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
    });
    video.load();
  };
  if ("IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadVideo(entry.target);
          currentObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "160px" });
    lazyVideos.forEach((video) => videoObserver.observe(video));
  } else {
    lazyVideos.forEach(loadVideo);
  }
})();