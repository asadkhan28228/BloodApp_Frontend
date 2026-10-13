export function isDonorAvailable(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    (typeof value === "string" &&
      ["true", "1"].includes(value.trim().toLowerCase()))
  );
}

export function isDonorActive(value: unknown): boolean {
  return !(
    value === false ||
    value === 0 ||
    (typeof value === "string" &&
      ["false", "0"].includes(value.trim().toLowerCase()))
  );
}
