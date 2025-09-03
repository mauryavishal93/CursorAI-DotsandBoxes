export class BaseComponent {
  constructor(elementId) {
    this.element = document.getElementById(elementId);
    if (!this.element) {
      throw new Error(`Element with id '${elementId}' not found`);
    }
  }

  show() {
    this.element.style.display = 'block';
  }

  hide() {
    this.element.style.display = 'none';
  }

  addClass(className) {
    this.element.classList.add(className);
  }

  removeClass(className) {
    this.element.classList.remove(className);
  }

  toggleClass(className) {
    this.element.classList.toggle(className);
  }

  setText(text) {
    this.element.textContent = text;
  }

  setHTML(html) {
    this.element.innerHTML = html;
  }

  addEventListener(event, handler) {
    this.element.addEventListener(event, handler);
  }

  removeEventListener(event, handler) {
    this.element.removeEventListener(event, handler);
  }
}

export default BaseComponent;
