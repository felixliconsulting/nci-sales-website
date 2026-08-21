const nav = document.querySelector(".nav");
const toggle = document.querySelector(".menu-toggle");
const links = document.querySelectorAll('#site-nav a, .nav-cta');

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  links.forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function bindForm(formId, noteId) {
  const form = document.getElementById(formId);
  const note = document.getElementById(noteId);
  if (!form || !note) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    form.reset();
    note.hidden = false;
  });
}

bindForm("waitlist-form", "waitlist-note");
bindForm("contact-form", "contact-note");

function initCarousels() {
  const carousels = document.querySelectorAll("[data-carousel]");

  carousels.forEach((carousel) => {
    const track = carousel.querySelector(".carousel-track");
    const slides = [...carousel.querySelectorAll(".carousel-slide")];
    const prev = carousel.querySelector("[data-carousel-prev]");
    const next = carousel.querySelector("[data-carousel-next]");
    const dotsWrap = carousel.querySelector("[data-carousel-dots]");
    if (!track || slides.length === 0) return;

    let index = 0;

    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel-dot";
      dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
      dot.addEventListener("click", () => {
        index = i;
        render();
      });
      dotsWrap.appendChild(dot);
    });

    function perView() {
      if (window.innerWidth <= 760) return 1;
      if (window.innerWidth <= 980) return 2;
      return 3;
    }

    function maxIndex() {
      return Math.max(0, slides.length - perView());
    }

    function render() {
      index = Math.min(index, maxIndex());
      const slideWidth = slides[0].getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      track.style.transform = `translateX(-${index * (slideWidth + gap)}px)`;
      [...dotsWrap.children].forEach((dot, i) => {
        dot.classList.toggle("is-active", i === index);
      });
    }

    prev.addEventListener("click", () => {
      index = index <= 0 ? maxIndex() : index - 1;
      render();
    });

    next.addEventListener("click", () => {
      index = index >= maxIndex() ? 0 : index + 1;
      render();
    });

    window.addEventListener("resize", render);
    render();
  });
}

initCarousels();
