# Suggested Commands

## Backend
```bash
cd backend
composer install
php artisan key:generate
php artisan migrate:fresh --seed
/Applications/MAMP/bin/php/php8.4.17/bin/php artisan serve --port=8000
```

## Frontend
```bash
cd frontend && npm install
cd frontend && npm run dev        # http://localhost:5173
cd frontend && npm run build
```

## Testing
```bash
# All backend tests
cd backend && /Applications/MAMP/bin/php/php8.4.17/bin/php artisan test

# Single test file
cd backend && /Applications/MAMP/bin/php/php8.4.17/bin/php artisan test tests/Feature/Auth/LoginTest.php

# All frontend tests
cd frontend && npm run test
```

## Git
```bash
git status
git log --oneline -10
git diff HEAD
```
