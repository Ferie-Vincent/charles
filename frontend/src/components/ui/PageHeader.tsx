type PageHeaderProps = {
  title: string;
  action?: React.ReactNode;
};

export default function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      {action && <div>{action}</div>}
    </div>
  );
}
