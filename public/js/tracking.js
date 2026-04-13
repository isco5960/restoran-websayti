document.addEventListener("DOMContentLoaded", () => {
  const steps = Array.from(document.querySelectorAll(".status-step"));
  const btn = document.getElementById("demoTrackBtn");
  let idx = 0;

  btn?.addEventListener("click", () => {
    if (idx < steps.length - 1) {
      steps[idx].classList.remove("active");
      idx += 1;
      steps[idx].classList.add("active");
    }
  });
});
