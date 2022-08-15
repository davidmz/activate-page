import { Observer } from "./Observer";
import { Loader } from "./types";

export function activate(loader: Loader, root: HTMLElement = document.body) {
  new Observer(loader, root).start();
}

export * from "./types";
