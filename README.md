# Chantier Platform

Monorepo for the chantier multi-project management platform.

## Apps

- `backend/`: Laravel API
- `frontend/`: React web app

## Local Requirements

- PHP 8.3+
- Composer 2+
- Node.js 20+
- npm 10+
- MySQL 8+ (via Homebrew or MAMP)

## Backend Setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Testing

### Backend

```bash
cd backend
php artisan test
```

### Frontend

```bash
cd frontend
npm run test
```

## Foundation Verification

### Backend

```bash
cd backend
php artisan migrate:fresh --seed
php artisan test
```

### Frontend

```bash
cd frontend
npm run test
npm run build
```
