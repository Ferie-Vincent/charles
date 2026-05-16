# Backend Structure (Laravel 12)

## Controllers (37 total)
- Auth: AuthController, ProfileController
- Projects: ProjectController, DailyLogController, HealthScoreController, SafetyScoreController, MaterialReceiptController, ProjectPhotoController, ProjectIncidentController, ProjectAccountingController, ProjectReportController
- Finance: BudgetController, InvoiceController, SupplierController, GlobalSupplierController, GeneralExpenseController
- Achats/Stocks: PurchaseOrderController, StockController, DemandeBesoinController
- GED: GedController
- DQE: DqeVersionController, SituationTravauxController
- Portfolio: PortfolioCostsController, PortfolioAccountingController, PortfolioOperationsController, PortfolioEvaluationController, PortfolioQhseController, PortfolioDqeController, PortfolioReportingController, PortfolioAnalysisController
- Admin: UserController, PermissionsController, DashboardController, TaskController
- AI: MeetingReportController, WhatsAppTestController

## Models (23 total)
User, Role, Company, Project, ProjectMember, ProjectActivity, DailyLog, Incident, BudgetEntry, ProjectPhoto, ProjectReport, DqeVersion, DqeLine, Invoice, Supplier, GeneralExpense, StockItem, StockMovement, PurchaseOrder, DemandeBesoin, GedDocument, RolePermission, Task

## Services
- GroqService: AI fallback chain (Mistral → Groq → Anthropic)
- PermissionService: requireAccess/requireWrite per feature
- ProjectFinancialMetricsService: canonical financial metrics (budget engagé/réalisé/RAC/écart)
- ProjectMetricsService: project KPIs
- HealthScoreService: 4-component score (planning/regularity/budget/safety)
- WorkflowService: state machine transitions
- WhatsAppAlertService: Twilio E.164 normalization

## Policies
- ProjectPolicy: create=direction|DT, update=direction|DT|conducteur|metreur
- DailyLogPolicy: terrain roles
- IncidentPolicy
- UserPolicy

## Events & Listeners
- DailyLogCreated → CreateIncidentFromDailyLog, UpdateProjectProgressOnDailyLog

## Tests (19 files, ~163 passing)
Feature tests in: Auth, Projects, DailyLogs, Portfolio, Dqe, HealthScore, Company, Smoke, RbacAuthorization, WhatsAppPhoneNormalization, InvoiceWorkflow
