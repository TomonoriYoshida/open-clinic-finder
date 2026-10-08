/**
 * Whether the list was shown earlier in this visit, so a detail page can go
 * back to it (with its place and filters) instead of to a fresh top page.
 * Module state: it lasts across client-side navigation, not a reload.
 */
let hasVisitedList = false;

export function markListVisited(): void {
  hasVisitedList = true;
}

export function listWasVisited(): boolean {
  return hasVisitedList;
}
