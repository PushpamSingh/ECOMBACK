// Escapes a user-supplied string so it can be used literally inside a RegExp,
// preventing regex injection and catastrophic-backtracking (ReDoS) on search.
export const escapeRegex = (str = '') => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Builds a safe case-insensitive "contains" filter for a field.
export const containsFilter = (value) => ({ $regex: escapeRegex(value), $options: 'i' });
