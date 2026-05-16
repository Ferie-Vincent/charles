# Task Completion Checklist

## TDD Discipline
1. Write failing test
2. Verify it fails with expected error
3. Implement minimum code to pass
4. Verify pass
5. Commit

## After implementing a feature
- Run backend tests: `cd backend && /Applications/MAMP/bin/php/php8.4.17/bin/php artisan test`
- Run frontend tests: `cd frontend && npm run test`
- Check for RBAC: all endpoints need company_id scoping + policy authorization
- No SQLite — must use real MySQL (chantier_platform_test)
- Run tests at end of feature batch, not between each file

## Git commits
Branch: fix/audit-7points (current)
Main branch: main
Use conventional commits (fix/feat/refactor prefixes)
