import { Instance } from "./Instance";
import { Activator, Loader } from "./types";

const mainAttr = "act:as";

export class Observer {
  private activators = new Map<string, Promise<Activator>>();
  private instances = new Map<HTMLElement, Instance[]>();

  public constructor(
    private loader: Loader,
    private root: HTMLElement = document.body,
  ) {
    // nothing
  }

  start() {
    this.addTree(this.root);

    // Starting observer
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes.values()) {
            node instanceof HTMLElement && this.addTree(node);
          }
          for (const node of mutation.removedNodes.values()) {
            node instanceof HTMLElement && this.removeTree(node);
          }
        }
      }
    });
    observer.observe(this.root, { childList: true, subtree: true });
  }

  private addTree(root: HTMLElement) {
    const elements = root.querySelectorAll(`[${CSS.escape(mainAttr)}]`);
    for (const el of elements.values()) {
      this.addElement(el as HTMLElement);
    }
  }

  private removeTree(root: HTMLElement) {
    const elements = root.querySelectorAll(`[${CSS.escape(mainAttr)}]`);
    for (const el of elements.values()) {
      this.removeElement(el as HTMLElement);
    }
  }

  private addElement(element: HTMLElement) {
    const items = element.getAttribute(mainAttr)?.split(/\s+/) || [];
    for (const it of items) {
      const [actName, refName = actName] = it.split(":", 2);
      let loadPromise = this.activators.get(actName);
      if (!loadPromise) {
        loadPromise = this.loader(actName).catch((e) => {
          // eslint-disable-next-line no-console
          console.error(`Cannot load '${actName}' activator`, e);
          throw e;
        });
        this.activators.set(actName, loadPromise);
      }

      loadPromise.then((activator) => {
        if (!element.isConnected) {
          return;
        }
        const instance = new Instance(element, refName);
        const elementInstances = this.instances.get(element);
        if (elementInstances) {
          elementInstances.push(instance);
        } else {
          this.instances.set(element, [instance]);
        }
        const res = activator(instance);
        res && instance.autoDispose(res);
      });
    }
  }

  private removeElement(element: HTMLElement) {
    const components = this.instances.get(element) || [];
    this.instances.delete(element);
    for (const compo of components) {
      compo._disconnect();
    }
  }
}
