import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Chantiers', to: '/projects' },
  { label: 'DQE', to: '/dqe' },
  { label: 'Exécution', to: '/execution' },
  { label: 'Coûts', to: '/costs' },
  { label: 'QSE', to: '/qse' },
  { label: 'Reporting', to: '/reporting' },
  { label: 'Paramètres', to: '/settings' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>Chantier Platform</h2>
      </div>
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.to === '/'}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
