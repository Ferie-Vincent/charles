import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/stores/auth-store';
import { getRoleGroup } from '../../../lib/roles';
import { updateProfile, changePassword, updateCompany, getNotifPrefs, saveNotifPrefs, type NotifPrefs, getAiSettings, updateAiSettings, testAiConnection } from '../api/settings';
import PageHeader from '../../../components/ui/PageHeader';

type Tab = 'profil' | 'entreprise' | 'notifications' | 'acces' | 'ia' | 'apropos';

/* ── Small reusable toggle ─────────────────────── */
function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`settings-toggle ${checked ? 'settings-toggle--on' : ''}`}
    >
      <span className="settings-toggle__thumb" />
    </button>
  );
}

/* ── Section wrapper ───────────────────────────── */
function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="settings-section">
      <div className="settings-section__head">
        <h3 className="settings-section__title">{title}</h3>
        {desc && <p className="settings-section__desc">{desc}</p>}
      </div>
      <div className="settings-section__body">{children}</div>
    </div>
  );
}

/* ── Alert banner ──────────────────────────────── */
function Alert({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  return (
    <div className={`settings-alert settings-alert--${type}`}>
      {type === 'success' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      )}
      {msg}
    </div>
  );
}

/* ════════════════════════════════════════════════
   TAB: Profil
   ════════════════════════════════════════════════ */
function TabProfil() {
  const { user, setUser } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name ?? '', email: user?.email ?? '' });
  const [pwdForm, setPwdForm]         = useState({ current_password: '', password: '', password_confirmation: '' });
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [pwdStatus, setPwdStatus]         = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd]         = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileStatus(null);
    try {
      const res = await updateProfile(profileForm);
      setUser(res.user);
      setProfileStatus({ type: 'success', msg: 'Profil mis à jour.' });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.errors?.email?.[0] ?? 'Erreur lors de la mise à jour.';
      setProfileStatus({ type: 'error', msg });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePwd(e: React.FormEvent) {
    e.preventDefault();
    if (pwdForm.password !== pwdForm.password_confirmation) {
      setPwdStatus({ type: 'error', msg: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    setSavingPwd(true);
    setPwdStatus(null);
    try {
      await changePassword(pwdForm);
      setPwdStatus({ type: 'success', msg: 'Mot de passe modifié.' });
      setPwdForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err: any) {
      const msg = err?.response?.data?.errors?.current_password?.[0]
        ?? err?.response?.data?.message
        ?? 'Erreur lors du changement.';
      setPwdStatus({ type: 'error', msg });
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="settings-content">
      {/* Profil info */}
      <Section title="Informations personnelles" desc="Votre nom et adresse email dans la plateforme.">
        <div className="settings-profile-card">
          <div className="settings-avatar">{(user?.name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
          <div>
            <div className="settings-profile-card__name">{user?.name}</div>
            <div className="settings-profile-card__meta">{user?.role?.label} · {user?.company?.name}</div>
          </div>
        </div>
        <form onSubmit={handleSaveProfile} className="settings-form">
          {profileStatus && <Alert {...profileStatus} />}
          <div className="settings-row-2">
            <div className="form-field">
              <label className="form-label">Nom complet</label>
              <input className="form-input" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-field">
              <label className="form-label">Adresse email</label>
              <input className="form-input" type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
          </div>
          <div className="form-field" style={{ opacity: 0.6, pointerEvents: 'none' }}>
            <label className="form-label">Rôle</label>
            <input className="form-input" value={user?.role?.label ?? ''} readOnly tabIndex={-1} />
          </div>
          <div className="settings-form__footer">
            <button type="submit" className="btn btn--primary" disabled={savingProfile}>
              {savingProfile ? 'Enregistrement…' : 'Enregistrer le profil'}
            </button>
          </div>
        </form>
      </Section>

      <div className="settings-divider" />

      {/* Mot de passe */}
      <Section title="Changer le mot de passe" desc="Minimum 8 caractères. Vous devrez saisir votre mot de passe actuel.">
        <form onSubmit={handleChangePwd} className="settings-form">
          {pwdStatus && <Alert {...pwdStatus} />}
          <div className="form-field">
            <label className="form-label">Mot de passe actuel</label>
            <input className="form-input" type="password" value={pwdForm.current_password} onChange={e => setPwdForm(f => ({ ...f, current_password: e.target.value }))} required autoComplete="current-password" />
          </div>
          <div className="settings-row-2">
            <div className="form-field">
              <label className="form-label">Nouveau mot de passe</label>
              <input className="form-input" type="password" value={pwdForm.password} onChange={e => setPwdForm(f => ({ ...f, password: e.target.value }))} required minLength={8} autoComplete="new-password" />
            </div>
            <div className="form-field">
              <label className="form-label">Confirmer le mot de passe</label>
              <input className="form-input" type="password" value={pwdForm.password_confirmation} onChange={e => setPwdForm(f => ({ ...f, password_confirmation: e.target.value }))} required autoComplete="new-password" />
            </div>
          </div>
          <div className="settings-form__footer">
            <button type="submit" className="btn btn--primary" disabled={savingPwd || !pwdForm.current_password || !pwdForm.password}>
              {savingPwd ? 'Modification…' : 'Changer le mot de passe'}
            </button>
          </div>
        </form>
      </Section>
    </div>
  );
}

/* ════════════════════════════════════════════════
   TAB: Entreprise
   ════════════════════════════════════════════════ */
function TabEntreprise() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user?.company?.name ?? '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await updateCompany(form);
      setUser({ ...user!, company: { ...user!.company, name: form.name } });
      setStatus({ type: 'success', msg: 'Informations société mises à jour.' });
    } catch (err: any) {
      setStatus({ type: 'error', msg: err?.response?.data?.message ?? 'Erreur.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-content">
      <Section title="Informations de la société" desc="Ces informations apparaissent dans les rapports PDF et documents générés.">
        <form onSubmit={handleSave} className="settings-form">
          {status && <Alert {...status} />}
          <div className="form-field">
            <label className="form-label">Nom de la société</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ name: e.target.value })} required />
          </div>
          <div className="settings-form__footer">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </Section>

      <div className="settings-divider" />

      <Section title="Données de la plateforme">
        <div className="settings-info-grid">
          <div className="settings-info-item">
            <span className="settings-info-item__label">Identifiant plateforme</span>
            <span className="settings-info-item__value settings-info-item__value--mono">{user?.company?.slug ?? '—'}</span>
          </div>
          <div className="settings-info-item">
            <span className="settings-info-item__label">Utilisateurs actifs</span>
            <span className="settings-info-item__value">Voir <Link to="/users" className="settings-link">gestion utilisateurs →</Link></span>
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ════════════════════════════════════════════════
   TAB: Notifications
   ════════════════════════════════════════════════ */
function TabNotifications() {
  const [prefs, setPrefs] = useState<NotifPrefs>(getNotifPrefs);
  const [saved, setSaved] = useState(false);

  function update(patch: Partial<NotifPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveNotifPrefs(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="settings-content">
      <Section title="Alertes WhatsApp" desc="Recevez les alertes critiques sur WhatsApp via Twilio.">
        <div className="settings-form">
          <div className="settings-toggle-row">
            <div>
              <div className="settings-toggle-row__label">Activer les alertes WhatsApp</div>
              <div className="settings-toggle-row__sub">BDC en attente, stocks bas, chantiers critiques</div>
            </div>
            <Toggle id="wa-enabled" checked={prefs.whatsapp_enabled} onChange={v => update({ whatsapp_enabled: v })} />
          </div>
          {prefs.whatsapp_enabled && (
            <div className="form-field">
              <label className="form-label">Numéro WhatsApp de réception</label>
              <input
                className="form-input"
                type="tel"
                value={prefs.whatsapp_number}
                onChange={e => update({ whatsapp_number: e.target.value })}
                placeholder="+225 07 00 00 00 00"
              />
              <p className="form-hint">Format accepté : +225XXXXXXXXXX ou 07XXXXXXXX (CI)</p>
            </div>
          )}
        </div>
      </Section>

      <div className="settings-divider" />

      <Section title="Types d'alertes" desc="Choisissez les événements qui déclenchent une notification.">
        <div className="settings-form">
          <div className="settings-toggle-row">
            <div>
              <div className="settings-toggle-row__label">BDC en attente d'approbation</div>
              <div className="settings-toggle-row__sub">Alerte quand un bon de commande attend depuis plus de 24h</div>
            </div>
            <Toggle id="alert-bdc" checked={prefs.alert_bdc} onChange={v => update({ alert_bdc: v })} />
          </div>
          <div className="settings-toggle-row">
            <div>
              <div className="settings-toggle-row__label">Stock sous seuil minimum</div>
              <div className="settings-toggle-row__sub">Alerte quand un article passe sous son seuil d'alerte</div>
            </div>
            <Toggle id="alert-stock" checked={prefs.alert_stock} onChange={v => update({ alert_stock: v })} />
          </div>
          <div className="settings-toggle-row">
            <div>
              <div className="settings-toggle-row__label">Chantiers en score critique</div>
              <div className="settings-toggle-row__sub">Alerte quand le health score passe sous 50</div>
            </div>
            <Toggle id="alert-critique" checked={prefs.alert_critique} onChange={v => update({ alert_critique: v })} />
          </div>
        </div>
      </Section>

      <div className="settings-divider" />

      <Section title="Rapport hebdomadaire" desc="Génération automatique le lundi à 07h00.">
        <div className="settings-form">
          <div className="settings-toggle-row">
            <div>
              <div className="settings-toggle-row__label">Rapport hebdomadaire automatique</div>
              <div className="settings-toggle-row__sub">Génère et archive un PDF chaque lundi matin</div>
            </div>
            <Toggle id="rapport-hebdo" checked={prefs.rapport_hebdo} onChange={v => update({ rapport_hebdo: v })} />
          </div>
        </div>
      </Section>

      {saved && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100 }}>
          <Alert type="success" msg="Préférences enregistrées." />
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   TAB: Accès
   ════════════════════════════════════════════════ */
function TabAcces() {
  return (
    <div className="settings-content">
      <Section title="Gestion des accès" desc="Administration des utilisateurs et configuration des permissions par rôle.">
        <div className="settings-access-grid">
          <Link to="/users" className="settings-access-card">
            <div className="settings-access-card__icon settings-access-card__icon--blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="settings-access-card__body">
              <div className="settings-access-card__title">Utilisateurs</div>
              <div className="settings-access-card__desc">Créer, modifier, désactiver des comptes. Attribuer des rôles.</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>

          <Link to="/permissions" className="settings-access-card">
            <div className="settings-access-card__icon settings-access-card__icon--purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div className="settings-access-card__body">
              <div className="settings-access-card__title">Matrice des permissions</div>
              <div className="settings-access-card__desc">Configurer l'accès aux modules par rôle (DT, terrain, comptable…).</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>

          <Link to="/ged" className="settings-access-card">
            <div className="settings-access-card__icon settings-access-card__icon--green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="settings-access-card__body">
              <div className="settings-access-card__title">Gestion documentaire</div>
              <div className="settings-access-card__desc">Plans, contrats, PV, rapports — stockage et partage centralisé.</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>
      </Section>
    </div>
  );
}

/* ════════════════════════════════════════════════
   TAB: À propos
   ════════════════════════════════════════════════ */
function TabApropos() {
  const { user } = useAuth();
  return (
    <div className="settings-content">
      <Section title="Plateforme Chantier">
        <div className="settings-info-grid">
          <div className="settings-info-item">
            <span className="settings-info-item__label">Version</span>
            <span className="settings-info-item__value settings-info-item__value--mono">v1.0.0</span>
          </div>
          <div className="settings-info-item">
            <span className="settings-info-item__label">Environnement</span>
            <span className="settings-info-item__value">
              <span className="acct-status-badge" style={{ background: '#f0fdf415', color: '#16a34a', borderColor: '#16a34a40' }}>Production</span>
            </span>
          </div>
          <div className="settings-info-item">
            <span className="settings-info-item__label">Société</span>
            <span className="settings-info-item__value">{user?.company?.name}</span>
          </div>
          <div className="settings-info-item">
            <span className="settings-info-item__label">Utilisateur connecté</span>
            <span className="settings-info-item__value">{user?.name} · {user?.role?.label}</span>
          </div>
        </div>
      </Section>

      <div className="settings-divider" />

      <Section title="Stack technique">
        <div className="settings-stack-grid">
          {[
            { layer: 'Backend',   tech: 'Laravel 12 · PHP 8.3',       icon: '🔧' },
            { layer: 'Base de données', tech: 'MySQL 8+ (MAMP)',       icon: '🗄️' },
            { layer: 'Frontend',  tech: 'React 18 · TypeScript · Vite', icon: '⚛️' },
            { layer: 'Auth',      tech: 'Laravel Sanctum (sessions)',   icon: '🔒' },
            { layer: 'Fichiers',  tech: 'Storage::disk (public/MinIO)', icon: '📁' },
            { layer: 'IA',        tech: 'Groq · Anthropic Claude',      icon: '🤖' },
            { layer: 'SMS/WA',    tech: 'Twilio WhatsApp',              icon: '📱' },
            { layer: 'PWA',       tech: 'vite-plugin-pwa · Workbox',    icon: '📲' },
          ].map(({ layer, tech }) => (
            <div key={layer} className="settings-stack-item">
              <span className="settings-stack-item__layer">{layer}</span>
              <span className="settings-stack-item__tech">{tech}</span>
            </div>
          ))}
        </div>
      </Section>

      <div className="settings-divider" />

      <Section title="Mentions">
        <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Plateforme développée pour la gestion multi-chantier BTP en Côte d'Ivoire.
          Toutes les données sont stockées sur vos serveurs. Aucune donnée n'est partagée avec des tiers.
        </p>
      </Section>
    </div>
  );
}

/* ════════════════════════════════════════════════
   TAB: Module IA
   ════════════════════════════════════════════════ */
const AI_PROVIDERS = [
  { value: 'mistral',   label: 'Mistral AI',   desc: 'mistral-small-latest · pixtral-12b (vision)' },
  { value: 'groq',      label: 'Groq',          desc: 'llama-3.1-8b-instant · ultra-rapide' },
  { value: 'anthropic', label: 'Anthropic',      desc: 'claude-haiku-4-5 · plus créatif' },
] as const;

function TabIA() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: getAiSettings,
    staleTime: 5 * 60 * 1000,
  });

  const [provider, setProvider] = useState<string>(settings?.ai_provider ?? 'mistral');
  const [apiKey, setApiKey]     = useState('');
  const [showKey, setShowKey]   = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const mutation = useMutation({
    mutationFn: updateAiSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      setStatus({ type: 'success', msg: 'Paramètres IA sauvegardés.' });
      setApiKey('');
    },
    onError: () => setStatus({ type: 'error', msg: 'Erreur lors de la sauvegarde.' }),
  });

  async function handleToggle(enabled: boolean) {
    mutation.mutate({ ai_enabled: enabled });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    mutation.mutate({
      ai_enabled: settings?.ai_enabled ?? true,
      ai_provider: provider,
      ai_api_key: apiKey || undefined,
    });
  }

  async function handleTest() {
    if (!apiKey) return;
    setTestStatus('testing');
    const ok = await testAiConnection(provider, apiKey);
    setTestStatus(ok ? 'ok' : 'fail');
    setTimeout(() => setTestStatus('idle'), 4000);
  }

  if (isLoading) return <div className="settings-content"><p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Chargement…</p></div>;

  const enabled = settings?.ai_enabled ?? true;

  return (
    <div className="settings-content">
      <Section
        title="Module IA"
        desc="Activez ou désactivez l'ensemble des fonctionnalités IA (briefing matinal, pré-remplissage journal, analyse photo, requêtes RAG)."
      >
        <div className="settings-row">
          <div className="settings-row__label">
            <span className="settings-row__title">Activer le module IA</span>
            <span className="settings-row__hint">
              {enabled
                ? 'Toutes les fonctionnalités IA sont actives.'
                : 'L\'IA est désactivée — CHARLES fonctionne sans IA.'}
            </span>
          </div>
          <Toggle id="ai-toggle" checked={enabled} onChange={handleToggle} />
        </div>
      </Section>

      {enabled && (
        <>
          <div className="settings-divider" />
          <Section
            title="Fournisseur IA"
            desc="Choisissez le fournisseur et saisissez votre clef API. Si vide, la clef de la plateforme est utilisée."
          >
            <form onSubmit={handleSave}>
              <div className="ai-provider-list">
                {AI_PROVIDERS.map(p => (
                  <label key={p.value} className={`ai-provider-card ${provider === p.value ? 'ai-provider-card--active' : ''}`}>
                    <input
                      type="radio"
                      name="provider"
                      value={p.value}
                      checked={provider === p.value}
                      onChange={() => { setProvider(p.value); setTestStatus('idle'); }}
                      className="ai-provider-card__radio"
                    />
                    <div className="ai-provider-card__body">
                      <span className="ai-provider-card__name">{p.label}</span>
                      <span className="ai-provider-card__desc">{p.desc}</span>
                    </div>
                    {settings?.ai_provider === p.value && settings?.has_api_key && (
                      <span className="ai-provider-card__badge">Votre clef</span>
                    )}
                  </label>
                ))}
              </div>

              <div className="settings-field" style={{ marginTop: '1.25rem' }}>
                <label className="settings-label">
                  Votre clef API{settings?.has_api_key ? ' (laissez vide pour conserver l\'existante)' : ''}
                </label>
                <div className="ai-key-input-wrap">
                  <input
                    type={showKey ? 'text' : 'password'}
                    className="form-input"
                    placeholder={settings?.has_api_key ? '••••••••••••••••' : 'sk-…'}
                    value={apiKey}
                    onChange={e => { setApiKey(e.target.value); setTestStatus('idle'); }}
                    autoComplete="off"
                  />
                  <button type="button" className="ai-key-toggle" onClick={() => setShowKey(v => !v)} aria-label="Afficher/masquer">
                    {showKey
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              <div className="ai-actions">
                {apiKey && (
                  <button type="button" className="ai-test-btn" onClick={handleTest} disabled={testStatus === 'testing'}>
                    {testStatus === 'testing' && <span className="spinner-xs" />}
                    {testStatus === 'ok'      && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    {testStatus === 'fail'    && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                    {testStatus === 'idle'    && 'Tester la connexion'}
                    {testStatus === 'testing' && 'Test en cours…'}
                    {testStatus === 'ok'      && 'Connexion réussie'}
                    {testStatus === 'fail'    && 'Connexion échouée'}
                  </button>
                )}
                <button type="submit" className="btn btn--primary btn--sm" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              </div>

              {status && <Alert type={status.type} msg={status.msg} />}
            </form>
          </Section>

          <div className="settings-divider" />
          <Section title="Fonctionnalités couvertes">
            <div className="ai-features-grid">
              {[
                { icon: '☀️', label: 'Briefing matinal', desc: 'Résumé IA de votre portefeuille chaque matin' },
                { icon: '📝', label: 'Journal pré-rempli', desc: 'Météo, ouvriers et matériaux suggérés automatiquement' },
                { icon: '🔍', label: 'Requêtes RAG', desc: 'Questions en langage naturel sur vos chantiers' },
                { icon: '📷', label: 'Analyse photo', desc: 'Analyse visuelle des photos de chantier (Mistral Vision)' },
              ].map(f => (
                <div key={f.label} className="ai-feature-card">
                  <span className="ai-feature-card__icon">{f.icon}</span>
                  <div>
                    <div className="ai-feature-card__label">{f.label}</div>
                    <div className="ai-feature-card__desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {!enabled && (
        <div className="ai-disabled-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>CHARLES fonctionne en mode standard — aucune fonctionnalité IA n'est active pour votre entreprise.</span>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   PAGE PRINCIPALE
   ════════════════════════════════════════════════ */
export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('profil');
  const roleGroup = getRoleGroup(user?.role?.name ?? '');
  const isDirection = roleGroup === 'direction';

  const tabs: { id: Tab; label: string; icon: React.ReactNode; directionOnly?: boolean }[] = [
    {
      id: 'profil',
      label: 'Mon profil',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
    },
    {
      id: 'entreprise',
      label: 'Entreprise',
      directionOnly: true,
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    },
    {
      id: 'acces',
      label: 'Accès',
      directionOnly: true,
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    },
    {
      id: 'ia',
      label: 'Module IA',
      directionOnly: true,
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>,
    },
    {
      id: 'apropos',
      label: 'À propos',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    },
  ];

  const visibleTabs = tabs.filter(t => !t.directionOnly || isDirection);

  return (
    <div>
      <PageHeader
        breadcrumb="ADMINISTRATION"
        title="Paramètres"
        subtitle="Profil, notifications, accès et informations plateforme"
      />
      <div className="page-content">
        <div className="settings-layout">
          {/* Sidebar nav */}
          <nav className="settings-nav">
            {visibleTabs.map(t => (
              <button
                key={t.id}
                type="button"
                className={`settings-nav__item ${tab === t.id ? 'settings-nav__item--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          {/* Content area */}
          <div className="settings-main">
            {tab === 'profil'        && <TabProfil />}
            {tab === 'entreprise'    && <TabEntreprise />}
            {tab === 'notifications' && <TabNotifications />}
            {tab === 'acces'         && <TabAcces />}
            {tab === 'ia'            && <TabIA />}
            {tab === 'apropos'       && <TabApropos />}
          </div>
        </div>
      </div>
    </div>
  );
}
