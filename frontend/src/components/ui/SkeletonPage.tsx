interface Props {
  rows?: number;
}

export default function SkeletonPage({ rows = 3 }: Props) {
  return (
    <div className="skeleton-page">
      <div className="skeleton skeleton-page__header" />
      <div className="skeleton-page__kpis">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton skeleton-page__kpi" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton-page__card" />
      ))}
    </div>
  );
}
