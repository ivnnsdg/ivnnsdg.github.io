(() => {
  const dropdown = document.querySelector(".nav-dropdown");
  const subToggle = dropdown && dropdown.querySelector(".submenu-toggle");
  if (dropdown && subToggle) {
    const setOpen = (open) => {
      subToggle.setAttribute("aria-expanded", String(open));
      dropdown.classList.toggle("is-open", open);
    };
    const hoverCapable = window.matchMedia("(hover: hover) and (min-width: 851px)");
    let openedByHover = false;
    subToggle.addEventListener("click", () => {
      if (openedByHover) { openedByHover = false; return; }
      setOpen(subToggle.getAttribute("aria-expanded") !== "true");
    });
    subToggle.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true);
        const first = dropdown.querySelector(".submenu a");
        if (first) first.focus();
      }
    });
    dropdown.addEventListener("mouseenter", () => { if (hoverCapable.matches) { openedByHover = subToggle.getAttribute("aria-expanded") !== "true"; setOpen(true); } });
    dropdown.addEventListener("mouseleave", () => { if (hoverCapable.matches) { openedByHover = false; setOpen(false); } });
    dropdown.addEventListener("focusout", (event) => {
      if (!dropdown.contains(event.relatedTarget)) setOpen(false);
    });
    dropdown.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && dropdown.classList.contains("is-open")) {
        setOpen(false);
        subToggle.focus();
      }
    });
    document.addEventListener("click", (event) => {
      if (!dropdown.contains(event.target)) setOpen(false);
    });
    dropdown.querySelectorAll(".submenu a").forEach((link) => link.addEventListener("click", () => setOpen(false)));
  }

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
    dialog.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close image">×</button><button class="lightbox-previous" type="button" aria-label="Previous image">←</button><figure><img alt=""></figure><button class="lightbox-next" type="button" aria-label="Next image">→</button><button class="lightbox-fullscreen" type="button" aria-label="View fullscreen">Fullscreen</button>';
    document.body.append(dialog);
    const image = dialog.querySelector("img");
    const previousButton = dialog.querySelector(".lightbox-previous");
    const root = document.documentElement;
    const requestFs = root.requestFullscreen || root.webkitRequestFullscreen;
    const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
    const nextButton = dialog.querySelector(".lightbox-next");
    let activeImages = [];
    let activeIndex = 0;

    const showImage = (index) => {
      activeIndex = (index + activeImages.length) % activeImages.length;
      const link = activeImages[activeIndex];
      image.src = link.href;
      image.alt = link.dataset.alt || link.querySelector("img")?.alt || "Portfolio image";
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
      if (fullscreenElement()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else if (requestFs) await requestFs.call(root);
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
      if (event.key.toLowerCase() === "f" && requestFs && !fullscreenElement()) requestFs.call(root);
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (fullscreenElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      image.removeAttribute("src");
    });

    const fullscreenButton = dialog.querySelector(".lightbox-fullscreen");
    if (!requestFs) fullscreenButton.hidden = true;
    const syncFullscreenLabel = () => {
      const active = Boolean(fullscreenElement());
      fullscreenButton.textContent = active ? "Exit fullscreen" : "Fullscreen";
      fullscreenButton.setAttribute("aria-label", active ? "Exit fullscreen" : "View fullscreen");
    };
    document.addEventListener("fullscreenchange", syncFullscreenLabel);
    document.addEventListener("webkitfullscreenchange", syncFullscreenLabel);

    // Fill the available area, upscaling small sources at most 2x
    const figure = dialog.querySelector("figure");
    const fitImage = () => {
      if (!image.naturalWidth) return;
      const box = figure.getBoundingClientRect();
      const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight, 2);
      image.style.width = Math.floor(image.naturalWidth * scale) + "px";
      image.style.height = Math.floor(image.naturalHeight * scale) + "px";
    };
    image.addEventListener("load", fitImage);
    if ("ResizeObserver" in window) new ResizeObserver(fitImage).observe(figure);
    else window.addEventListener("resize", fitImage);
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