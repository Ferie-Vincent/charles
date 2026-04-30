import PageHeader from '../../../components/ui/PageHeader';
import Card from '../../../components/ui/Card';

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard Portefeuille" />
      <div className="kpi-grid">
        <Card>
          <p className="kpi-label">Chantiers actifs</p>
          <p className="kpi-value">—</p>
        </Card>
        <Card>
          <p className="kpi-label">Budget total engagé</p>
          <p className="kpi-value">—</p>
        </Card>
        <Card>
          <p className="kpi-label">Avancement moyen</p>
          <p className="kpi-value">—</p>
        </Card>
        <Card>
          <p className="kpi-label">Incidents ouverts</p>
          <p className="kpi-value">—</p>
        </Card>
      </div>
    </div>
  );
}
