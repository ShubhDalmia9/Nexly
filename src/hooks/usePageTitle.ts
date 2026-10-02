import { useEffect } from 'react';

const BASE_TITLE = 'Nexly';
const DEFAULT_TITLE = 'Nexly — Find the right people, faster';

/** Sets the browser tab title for a page, so tabs and screen readers announce where you are. */
export function usePageTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE_TITLE}` : DEFAULT_TITLE;
  }, [title]);
}
