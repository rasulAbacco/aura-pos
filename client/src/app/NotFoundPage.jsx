import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-cream p-6 text-center">
      <h1 className="font-display text-3xl">Page not found</h1>
      <Link className="font-semibold text-mauve underline underline-offset-4" to="/">Go to the home page</Link>
    </div>
  );
}
