import { ArrowLeft, UserX } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { ApiError, errorMessage } from '../api/client';
import { ProfileDetail } from '../components/profile/ProfileDetail';
import { buttonClass } from '../components/ui/Button';
import { EmptyState, ErrorState, ProgressRing, Skeleton } from '../components/ui/Feedback';
import { useCurrentUser } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';

function ProfileSkeleton() {
  return (
    <div className="card card--pad" aria-hidden>
      <div className="row" style={{ gap: 20 }}>
        <Skeleton width={96} height={96} radius={30} />
        <div className="stack" style={{ gap: 10, flex: 1 }}>
          <Skeleton width="45%" height={26} />
          <Skeleton width="65%" />
          <Skeleton width="35%" />
        </div>
      </div>
      <div className="stack" style={{ gap: 12, marginTop: 32 }}>
        <Skeleton height={110} radius={14} />
        <Skeleton width="30%" />
        <Skeleton />
        <Skeleton width="85%" />
      </div>
    </div>
  );
}

/** A member's full profile. With no id in the URL it shows the signed-in user's own profile. */
export function ProfilePage() {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const params = useParams();
  const userId = params.id === undefined ? me.id : Number(params.id);
  const validId = Number.isInteger(userId) && userId > 0;
  const isSelf = userId === me.id;

  const { data, loading, error, reload, setData } = useAsync(
    () => (validId ? api.people.get(userId) : Promise.reject(new ApiError(404, 'NOT_FOUND', 'That profile does not exist.'))),
    // Refetch the viewer's own profile after an edit as well as when the id changes.
    [userId, validId, me.profile.updatedAt],
  );

  const notFound = error instanceof ApiError && error.status === 404;
  usePageTitle(data ? data.person.profile.fullName : 'Profile');

  return (
    <div className="page-narrow">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft aria-hidden />
        Back
      </button>

      {loading && !data && <ProfileSkeleton />}

      {error && !data &&
        (notFound ? (
          <div className="card">
            <EmptyState icon={UserX} title="Profile not found" text="This person may have left Nexly, or the link is not quite right.">
              <Link to="/discover" className={buttonClass({ variant: 'primary' })}>
                Back to Discover
              </Link>
            </EmptyState>
          </div>
        ) : (
          <ErrorState title="This profile did not load" message={errorMessage(error)} onRetry={reload} />
        ))}

      {data && (
        <>
          {isSelf && me.completion.percent < 100 && (
            <div className="card self-banner">
              <ProgressRing value={me.completion.percent} size={56} stroke={6} label={`Profile ${me.completion.percent}% complete`} />
              <div>
                <strong>This is how other members see you.</strong>
                <p className="muted">
                  Still to add: {me.completion.items.filter((item) => !item.done).map((item) => item.label.toLowerCase()).join(', ')}.
                </p>
              </div>
              <Link to="/profile/edit" className={buttonClass({ variant: 'primary', size: 'sm' })}>
                Complete profile
              </Link>
            </div>
          )}
          <div className="card card--pad">
            <ProfileDetail person={data.person} onChange={(person) => setData({ person })} />
          </div>
        </>
      )}
    </div>
  );
}
