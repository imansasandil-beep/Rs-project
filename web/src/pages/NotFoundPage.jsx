import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/States.jsx';

export function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      message="That address does not match anything in Rs."
      action={
        <Link className="btn btn--primary btn--md" to="/">
          Back to the dashboard
        </Link>
      }
    />
  );
}
