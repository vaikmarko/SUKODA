/** Shared et / en / ru strings for the resident portal. Views add their keys before Alpine starts. */
export const dict = {};

export function add(partial) {
  Object.assign(dict, partial);
}
