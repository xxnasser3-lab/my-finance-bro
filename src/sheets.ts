import type { Tx } from './store/types';

type Opener = (preset?: Partial<Tx>) => void;
let opener: Opener = () => {};

export function registerTxOpener(fn: Opener): void {
  opener = fn;
}

/** Open the add/edit transaction sheet from anywhere. */
export function openTx(preset?: Partial<Tx>): void {
  opener(preset);
}
