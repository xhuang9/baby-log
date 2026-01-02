import type { Metadata } from 'next';
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Activities',
  };
}

export default async function ActivitiesPage(props: { params: Promise<{ locale: string }> }) {
  await props.params;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Activities</h1>
      <p className="text-sm text-slate-600">Review recent sessions, highlights, and daily logs.</p>
    </div>
  );
}
