import { RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Feedback';
import { Logo } from '../components/ui/Logo';
import { usePageTitle } from '../hooks/usePageTitle';

/**
 * Shown instead of the app when this page and the server answering it are different versions.
 * Carrying on would mean pages that hang or come back empty, so the app stops and says what to do.
 */
export function ServerNotice({ kind }: { kind: 'restart' | 'reload' }) {
  usePageTitle(kind === 'restart' ? 'Restart needed' : 'Update available');
  return (
    <main className="not-found">
      <Logo />
      <div className="card">
        {kind === 'restart' ? (
          <EmptyState
            icon={RefreshCw}
            title="Nexly needs to be restarted"
            text="Nexly has been updated, but the copy that is running was started before the update. Stop it (press Ctrl+C in the terminal where it is running), start it again with “npm run dev”, then reload this page."
          >
            <Button variant="primary" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </EmptyState>
        ) : (
          <EmptyState icon={RefreshCw} title="Nexly has been updated" text="Reload the page to get the latest version.">
            <Button variant="primary" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </EmptyState>
        )}
      </div>
    </main>
  );
}
