import { computePosition, flip, shift } from "@floating-ui/dom";
import { createFocusTrap } from "focus-trap";

import { formHTML } from "./form-html";
import formCSS from "./form.css";

export type FeedbackFinConfig = {
  url: string;
  user: Record<any, any>;
  disableErrorAlert: boolean;
  closeOnClickOutside: boolean;
};
const config: FeedbackFinConfig = {
  url: "",
  user: {},
  disableErrorAlert: false,
  closeOnClickOutside: false,
  // Spread user config when loaded
  ...(window as any).feedbackfin?.config,
};

function init() {
  const styleElement = document.createElement("style");
  styleElement.id = "feedbackfin__css";
  styleElement.innerHTML = formCSS;

  document.head.insertBefore(styleElement, document.head.firstChild);

  document
    .querySelector("[data-feedbackfin-button]")
    ?.addEventListener("click", open);
}
window.addEventListener("load", init);

const containerElement = document.createElement("div");
containerElement.id = "feedbackfin__container";

const optionalBackdrop = document.createElement("div");
optionalBackdrop.id = "feedbackfin__backdrop";

const trap = createFocusTrap(containerElement, {
  initialFocus: "#feedbackfin__input_field",
  allowOutsideClick: true,
});

function open(e: Event) {
  if (config.closeOnClickOutside) {
    document.body.appendChild(optionalBackdrop);
  }

  document.body.appendChild(containerElement);
  containerElement.innerHTML = formHTML;
  containerElement.style.display = "block";

  const target = (e?.target as HTMLElement) || document.body;
  computePosition(target, containerElement, {
    placement: "bottom",
    middleware: [flip(), shift({ crossAxis: true, padding: 8 })],
    strategy: "fixed",
  }).then(({ x, y }) => {
    Object.assign(containerElement.style, {
      left: `${x}px`,
      top: `${y}px`,
    });
  });

  trap.activate();

  if (config.closeOnClickOutside) {
    document
      .getElementById("feedbackfin__backdrop")
      ?.addEventListener("click", close);
  }

  document
    .getElementById("feedbackfin__form")!
    .addEventListener("submit", submit);
}

function close() {
  trap.deactivate();

  containerElement.innerHTML = "";

  containerElement.remove();
  optionalBackdrop.remove();
  containerElement.removeAttribute("data-success");
}

function submit(e: Event) {
  e.preventDefault();
  const target = e.target as HTMLFormElement;

  if (!config.url) {
    console.error("Feedback Fin: No URL provided");
    if (!config.disableErrorAlert)
      alert("Could not send feedback: No URL provided");
    return;
  }

  const submitElement = document.getElementById("feedbackfin__submit")!;
  submitElement.setAttribute("disabled", "");
  submitElement.innerHTML = "Sending…";

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const data = {
    ...config.user,
    message: (target.elements as any).message.value,
    timestamp: Date.now(),
  };

  fetch(config.url, {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify(data),
  })
    .then(() => {
      containerElement.setAttribute("data-success", "");
    })
    .catch((e) => {
      console.error("Feedback Fin:", e);
      if (!config.disableErrorAlert)
        alert(`Could not send feedback: ${e.message}`);
    });

  return false;
}

const feedbackfin = { init, open, close, submit, config };
(window as any).feedbackfin = feedbackfin;

export default feedbackfin;
