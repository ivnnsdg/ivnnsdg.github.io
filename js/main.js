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
  if (lightboxLinks.length) {
    const MAX_ZOOM = 5;
    const MAX_FIT_UPSCALE = 2;
    const viewer = document.createElement("div");
    viewer.className = "viewer";
    viewer.hidden = true;
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");
    viewer.setAttribute("aria-label", "Image viewer");
    viewer.innerHTML = '<div class="viewer-stage"><img class="viewer-img" alt="" draggable="false"></div>'
      + '<button class="viewer-btn viewer-close" type="button" aria-label="Close viewer">×</button>'
      + '<button class="viewer-btn viewer-fullscreen" type="button">Fullscreen</button>'
      + '<button class="viewer-btn viewer-prev" type="button" aria-label="Previous image">←</button>'
      + '<button class="viewer-btn viewer-next" type="button" aria-label="Next image">→</button>'
      + '<div class="viewer-zoom"><button class="viewer-btn viewer-zoom-out" type="button" aria-label="Zoom out">−</button><button class="viewer-btn viewer-fit" type="button">Fit to Screen</button><button class="viewer-btn viewer-zoom-in" type="button" aria-label="Zoom in">+</button></div>';
    document.body.append(viewer);

    const stage = viewer.querySelector(".viewer-stage");
    const image = viewer.querySelector(".viewer-img");
    const closeButton = viewer.querySelector(".viewer-close");
    const fullscreenButton = viewer.querySelector(".viewer-fullscreen");
    const previousButton = viewer.querySelector(".viewer-prev");
    const nextButton = viewer.querySelector(".viewer-next");

    let items = [];
    let index = 0;
    let scale = 1;
    let tx = 0;
    let ty = 0;
    let baseWidth = 0;
    let baseHeight = 0;
    let trigger = null;
    let fallbackFullscreen = false;
    let inertedElements = [];
    let pinch = null;
    let gestureStartScale = 1;
    const pointers = new Map();

    const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
    const isFullscreen = () => fullscreenElement() === viewer || fallbackFullscreen;

    const applyTransform = (animate) => {
      image.style.transition = animate ? "transform .14s ease-out" : "none";
      image.style.transform = "translate(" + tx + "px, " + ty + "px) scale(" + scale + ")";
      stage.classList.toggle("is-zoomed", scale > 1.001);
    };

    // The image can never be panned past its own edges; when it fits the stage it stays centered.
    const clampPan = () => {
      const maxX = Math.max(0, (baseWidth * scale - stage.clientWidth) / 2);
      const maxY = Math.max(0, (baseHeight * scale - stage.clientHeight) / 2);
      tx = Math.min(maxX, Math.max(-maxX, tx));
      ty = Math.min(maxY, Math.max(-maxY, ty));
    };

    const resetView = (animate) => {
      scale = 1;
      tx = 0;
      ty = 0;
      applyTransform(animate);
    };

    // Scale 1 is the fit-to-stage size; the point under (clientX, clientY) stays fixed.
    const zoomAt = (clientX, clientY, nextScale, animate) => {
      const rect = stage.getBoundingClientRect();
      const px = clientX - (rect.left + rect.width / 2);
      const py = clientY - (rect.top + rect.height / 2);
      const target = Math.min(MAX_ZOOM, Math.max(1, nextScale));
      const ratio = target / scale;
      tx = px - (px - tx) * ratio;
      ty = py - (py - ty) * ratio;
      scale = target;
      if (scale === 1) {
        tx = 0;
        ty = 0;
      }
      clampPan();
      applyTransform(animate);
    };

    const zoomAtCenter = (factor) => {
      const rect = stage.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, scale * factor, true);
    };

    const fitImage = () => {
      if (!image.naturalWidth) return;
      const ratio = Math.min(stage.clientWidth / image.naturalWidth, stage.clientHeight / image.naturalHeight, MAX_FIT_UPSCALE);
      baseWidth = image.naturalWidth * ratio;
      baseHeight = image.naturalHeight * ratio;
      image.style.width = baseWidth + "px";
      image.style.height = baseHeight + "px";
      clampPan();
      applyTransform(false);
    };

    const showImage = (nextIndex) => {
      index = (nextIndex + items.length) % items.length;
      const link = items[index];
      resetView(false);
      image.style.visibility = "hidden";
      image.style.width = "";
      image.style.height = "";
      image.alt = link.dataset.alt || link.querySelector("img")?.alt || "Portfolio image";
      image.src = link.href;
      previousButton.hidden = items.length < 2;
      nextButton.hidden = items.length < 2;
    };

    image.addEventListener("load", () => {
      fitImage();
      resetView(false);
      image.style.visibility = "visible";
      if (items.length > 1) {
        [index - 1, index + 1].forEach((neighbor) => {
          new Image().src = items[(neighbor + items.length) % items.length].href;
        });
      }
    });
    image.addEventListener("error", () => { image.style.visibility = "visible"; });

    const syncFullscreen = () => {
      if (fullscreenElement() === viewer) fallbackFullscreen = false;
      const active = isFullscreen();
      viewer.classList.toggle("is-fullscreen", active);
      closeButton.setAttribute("aria-label", active ? "Exit fullscreen" : "Close viewer");
      fullscreenButton.setAttribute("aria-label", "View fullscreen");
    };

    const enterFullscreen = async () => {
      const request = viewer.requestFullscreen || viewer.webkitRequestFullscreen;
      if (request) {
        try {
          await request.call(viewer);
          syncFullscreen();
          fitImage();
          return;
        } catch (error) {
          // fall through to the in-page fullscreen mode
        }
      }
      fallbackFullscreen = true;
      syncFullscreen();
    };

    const exitFullscreen = async () => {
      if (fallbackFullscreen) {
        fallbackFullscreen = false;
        syncFullscreen();
      }
      if (fullscreenElement()) {
        try {
          await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
          syncFullscreen();
          fitImage();
        } catch (error) {
          // already left fullscreen
        }
      }
    };

    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(fitImage) : null;

    const onKeydown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key;
      if (key === "Escape") {
        event.preventDefault();
        if (isFullscreen()) exitFullscreen();
        else closeViewer();
      } else if (key === "ArrowLeft" && items.length > 1) {
        event.preventDefault();
        showImage(index - 1);
      } else if (key === "ArrowRight" && items.length > 1) {
        event.preventDefault();
        showImage(index + 1);
      } else if (key === "+" || key === "=") {
        event.preventDefault();
        zoomAtCenter(1.4);
      } else if (key === "-" || key === "_") {
        event.preventDefault();
        zoomAtCenter(1 / 1.4);
      } else if (key === "0") {
        event.preventDefault();
        resetView(true);
      } else if (key.toLowerCase() === "f") {
        event.preventDefault();
        if (isFullscreen()) exitFullscreen();
        else enterFullscreen();
      } else if (key === "Tab") {
        const focusable = [...viewer.querySelectorAll("button")].filter((button) => !button.hidden && getComputedStyle(button).display !== "none");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!viewer.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    const openViewer = (link) => {
      trigger = link;
      const group = link.dataset.lightboxGroup;
      items = group ? lightboxLinks.filter((item) => item.dataset.lightboxGroup === group) : [link];
      // Everything outside the viewer becomes inert so focus and assistive tech cannot reach the gallery.
      inertedElements = [...document.body.children].filter((element) => element !== viewer && element.tagName !== "SCRIPT" && !element.inert);
      inertedElements.forEach((element) => { element.inert = true; });
      document.documentElement.classList.add("viewer-open");
      viewer.hidden = false;
      resizeObserver?.observe(stage);
      document.addEventListener("keydown", onKeydown);
      showImage(items.indexOf(link));
      closeButton.focus();
    };

    function closeViewer() {
      if (viewer.hidden) return;
      viewer.hidden = true;
      fallbackFullscreen = false;
      if (fullscreenElement()) exitFullscreen();
      document.removeEventListener("keydown", onKeydown);
      resizeObserver?.disconnect();
      inertedElements.forEach((element) => { element.inert = false; });
      inertedElements = [];
      document.documentElement.classList.remove("viewer-open");
      pointers.clear();
      pinch = null;
      stage.classList.remove("is-dragging");
      image.removeAttribute("src");
      syncFullscreen();
      trigger?.focus({ preventScroll: true });
    }

    lightboxLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        openViewer(link);
      });
    });

    previousButton.addEventListener("click", () => showImage(index - 1));
    nextButton.addEventListener("click", () => showImage(index + 1));
    closeButton.addEventListener("click", () => (isFullscreen() ? exitFullscreen() : closeViewer()));
    fullscreenButton.addEventListener("click", enterFullscreen);
    viewer.querySelector(".viewer-zoom-in").addEventListener("click", () => zoomAtCenter(1.4));
    viewer.querySelector(".viewer-zoom-out").addEventListener("click", () => zoomAtCenter(1 / 1.4));
    viewer.querySelector(".viewer-fit").addEventListener("click", () => resetView(true));

    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);
    const onFullscreenError = () => {
      if (!viewer.hidden && !fullscreenElement()) {
        fallbackFullscreen = true;
        syncFullscreen();
      }
    };
    document.addEventListener("fullscreenerror", onFullscreenError);
    document.addEventListener("webkitfullscreenerror", onFullscreenError);

    // Wheel and trackpad pinch (delivered as ctrl+wheel) zoom the artwork, never the page.
    viewer.addEventListener("wheel", (event) => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      const speed = event.ctrlKey ? 0.01 : 0.0018;
      zoomAt(event.clientX, event.clientY, scale * Math.exp(-event.deltaY * unit * speed), true);
    }, { passive: false });

    // Safari desktop reports trackpad pinch as gesture events instead of wheel events.
    viewer.addEventListener("gesturestart", (event) => {
      event.preventDefault();
      gestureStartScale = scale;
    });
    viewer.addEventListener("gesturechange", (event) => {
      event.preventDefault();
      if (!pointers.size) zoomAt(event.clientX, event.clientY, gestureStartScale * event.scale, false);
    });
    viewer.addEventListener("gestureend", (event) => event.preventDefault());

    const pinchState = () => {
      const [a, b] = [...pointers.values()];
      return { distance: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };

    stage.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      try {
        stage.setPointerCapture(event.pointerId);
      } catch (error) {
        // pointer already released
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) pinch = pinchState();
      stage.classList.toggle("is-dragging", scale > 1.001 && pointers.size === 1);
    });

    stage.addEventListener("pointermove", (event) => {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (pointers.size === 2 && pinch && pinch.distance > 0) {
        const next = pinchState();
        zoomAt(next.x, next.y, scale * (next.distance / pinch.distance), false);
        tx += next.x - pinch.x;
        ty += next.y - pinch.y;
        clampPan();
        applyTransform(false);
        pinch = next;
      } else if (pointers.size === 1 && scale > 1.001) {
        tx += dx;
        ty += dy;
        clampPan();
        applyTransform(false);
      }
    });

    const endPointer = (event) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinch = null;
      if (!pointers.size) stage.classList.remove("is-dragging");
    };
    stage.addEventListener("pointerup", endPointer);
    stage.addEventListener("pointercancel", endPointer);

    stage.addEventListener("dblclick", (event) => {
      if (scale > 1.001) resetView(true);
      else zoomAt(event.clientX, event.clientY, 2.5, true);
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