type PageHeaderProps = {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  action?: React.ReactNode;
  syncLabel?: string;
};

export default function PageHeader({ title, subtitle, breadcrumb, action, syncLabel }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header__left">
        {breadcrumb && <div className="page-header__breadcrumb">{breadcrumb}</div>}
        <h1>{title}</h1>
        {subtitle && <p className="page-header__sub">{subtitle}</p>}
      </div>
      <div className="page-header__right">
        {syncLabel && (
          <span className="page-header__sync">
            <span className="page-header__sync-dot" />
            {syncLabel}
          </span>
        )}
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
