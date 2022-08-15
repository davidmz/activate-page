import { type Instance } from "./Instance";

export { type Instance } from "./Instance";
export type Disposer = () => void;
export type Activator = (it: Instance) => void | Disposer;
export type Loader = (name: string) => Promise<Activator>;
