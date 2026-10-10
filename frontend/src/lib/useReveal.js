import { useEffect } from "react";

export default function useReveal(container) {
  useEffect(() => {
    if (
      !window.IntersectionObserver ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const sections = container.current?.querySelectorAll("[data-reveal]") || [];
    const reveal = (section) => section.classList.add("is-revealed");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    const onFocus = (event) => reveal(event.currentTarget);
    sections.forEach((section) => {
      section.classList.add("reveal-ready");
      section.addEventListener("focusin", onFocus);
      observer.observe(section);
    });
    // Nothing is hidden when motion is reduced or IntersectionObserver is absent.
    return () => {
      observer.disconnect();
      sections.forEach((section) => {
        section.removeEventListener("focusin", onFocus);
        section.classList.remove("reveal-ready", "is-revealed");
      });
    };
  }, [container]);
}
