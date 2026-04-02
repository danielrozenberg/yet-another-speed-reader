export function voidifyAsync<This, Args extends unknown[]>(
  fn: (this: This, ...args: Args) => Promise<void>,
): (this: This, ...args: Args) => void {
  return function (this: This, ...args: Args): void {
    void fn.apply(this, args);
  };
}
