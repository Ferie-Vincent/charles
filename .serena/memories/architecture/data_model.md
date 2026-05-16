# Data Model

## Core
- companies (id, name)
- users (id, company_id, role_id, name, email, password)
- roles (id, name, label) — 8 roles: direction, directeur-technique, conducteur-travaux, chef-chantier, metreur-economiste, comptable, moyens-generaux, lecture-seule
- role_permissions (role_id, permission_key, can_access, can_write)

## Projects
- projects (id, company_id, code, name, status, location, budget_amount, start_date, end_date, latitude, longitude, target_progress, current_progress)
- project_members (project_id, user_id, role)
- project_activities (project_id, user_id, description, type)

## Execution
- daily_logs (id, project_id, user_id, log_date UNIQUE/project, weather, workers_count, progress_percent, has_incident, incident_type, equipment_status, materials_received JSON)
- incidents (id, project_id, type, severity mineur/majeur/critique, status, occurred_at, resolved_at)
- project_photos (id, project_id, path, tag, user_id)

## Finance
- budget_entries (id, project_id, type previsionnel/engagement/paiement, category, label, amount, entry_date)
- invoices (id, project_id, supplier_id, status soumise/validee/payee, amount, vat, purchase_order_id)
- suppliers (id, company_id, project_id, name, contact, email, phone)
- general_expenses (id, company_id, category, label, amount, status pending/approved/rejected)

## DQE
- dqe_versions (id, project_id, name, version_number, status draft/soumise/validated/archived, total_ht, notes)
- dqe_lines (id, dqe_version_id, lot, ouvrage, unite, quantite, prix_unitaire, montant_ht, ordre)

## Achats/Stocks
- purchase_orders (id, company_id, project_id, supplier, description, amount, status pending/approved/rejected/received, delivery_note_path, delivery_photos JSON, engagement_entry_id)
- stock_items (id, company_id, name, reference, unit, quantity, min_quantity)
- stock_movements (id, stock_item_id, type in/out/adjustment, quantity, note, user_id, purchase_order_id)
- demandes_besoins (id, company_id, project_id, preengagement_entry_id, status draft/submitted/approved/rejected/prepared/delivered/recorded)

## Documents
- ged_documents (id, company_id, project_id nullable, name, path, mime_type, size_bytes, type plan/contrat/pv/rapport/facture/photo/bl/ao/os/marche/autre, uploaded_by)
- project_reports (id, project_id, filename, path, week_of, size_bytes, type hebdo/manuel)

## AI
- situation_travaux (generated from DQE + daily_logs via Mistral)
- tasks (id, project_id, title, assigned_to, assigned_by, status)
