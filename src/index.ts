import { computePosition, flip, shift } from "@floating-ui/dom";
import { createFocusTrap } from "focus-trap";

import { formHTML } from "./form-html";
import formCSS from "./form.css";

export type FeedbackFinConfig = {
  url: string;
  user: Record<any, any>;
  chatbotTitle: string;
  greetingMessage: string | null;
  disableErrorAlert: boolean;
  closeOnClickOutside: boolean;
};
const config: FeedbackFinConfig = {
  url: "",
  user: {},
  chatbotTitle: "Chatbot",
  greetingMessage: null,
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

const messagesHistory = document.createElement("div");
messagesHistory.id = "chatbot__messages_history";

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

  const chatbotHeaderTitleText = document.createElement("span");
  chatbotHeaderTitleText.id = "chatbot__title_text";
  chatbotHeaderTitleText.textContent = config.chatbotTitle;
  const chatbotHeaderTitle = document.getElementById("chatbot__title")!;
  chatbotHeaderTitle.appendChild(chatbotHeaderTitleText);

  const chatbotBody = document.getElementById("chatbot__body")!;
  chatbotBody.prepend(messagesHistory);
  if (config.greetingMessage && messagesHistory.children.length === 0) {
    createNewMessageEntry(config.greetingMessage, Date.now(), "system");
  }

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

function createNewMessageEntry(
  message: string,
  timestamp: number,
  from: "system" | "user"
) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("chatbot__message");
  messageElement.classList.add(`chatbot__message--${from}`);

  const messageText = document.createElement("p");
  messageText.textContent = message;
  messageElement.appendChild(messageText);

  const messageTimestamp = document.createElement("p");
  messageTimestamp.textContent =
    ("0" + new Date(timestamp).getHours()).slice(-2) + // Hours (padded with 0 if needed)
    ":" +
    ("0" + new Date(timestamp).getMinutes()).slice(-2); // Minutes (padded with 0 if needed)
  messageElement.appendChild(messageTimestamp);

  messagesHistory.prepend(messageElement);
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

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const data = {
    ...config.user,
    message: (target.elements as any).message.value,
    timestamp: Date.now(),
  };

  createNewMessageEntry(data.message, data.timestamp, "user");

  fetch(config.url, {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify(data),
  })
    .then(async (res) => {
      if (res.ok) {
        createNewMessageEntry(await res.text(), Date.now(), "system");
      } else {
        console.error("Feedback Fin: Server error", res);
        if (!config.disableErrorAlert)
          alert(`Could not send message: ${res.statusText}`);
      }
      submitElement.removeAttribute("disabled");
    })
    .catch((e) => {
      submitElement.removeAttribute("disabled");
      console.error("Feedback Fin:", e);
      if (!config.disableErrorAlert)
        alert(`Could not send message: ${e.message}`);
    });

  target.reset();
  return false;
}

const feedbackfin = { init, open, close, submit, config };
(window as any).feedbackfin = feedbackfin;

export default feedbackfin;
