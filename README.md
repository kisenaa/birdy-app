# Birdy Application

This project consists of a **Backend API** (FastAPI + PostgreSQL) and a **Mobile App**.  
Below are setup instructions for the backend

---
## 📚 Table Of Contents

- [Backend Setup](#backend-setup)
- [Mobile App Setup](#mobile-app-setup)

## Backend Setup

Refer to the following documentation for backend development and API usage:
- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)
- [Tortoise ORM Basic Usage](https://tortoise.github.io/examples.html#basic-usage)
- [Tortoise ORM Setup](https://tortoise.github.io/setup.html)

### 1. Prerequisites

- Python 3.12+ installed
- PostgreSQL installed and running

### 2. Clone the Repository and install the py package

```sh
git clone <yorepo-url>
pip install -r Application/Backend/requirements.txt
pre-commit install
cd ./Application/Backend
```

### 3. Environment Variables

Copy the sample environment file and edit it with your credentials:

```sh
cp .env.sample .env
```

Edit `.env` and set:
- `DB_USERNAME`, `DB_PASSWORD`, `DB_IP`, `DB_PORT`, `DB_NAME`
- `JWT_SECRET_KEY`, `JWT_REFRESH_SECRET_KEY` (use `openssl rand -hex 32` to generate)

### 4. Install Dependencies

```sh
pip install -r requirements.txt
```

### 5. Database Migration

Initialize and migrate the database using [Aerich](https://tortoise-orm.readthedocs.io/en/latest/migration.html):

```sh
# First time setup . 
cd Application/Backend
aerich upgrade
# After modifying models .
aerich migrate --name {description}
python ./database/patch_migration.py ./migrations/models/
aerich upgrade
```

If you change field types, run the patch script before upgrading:
```sh
python database/patch_migration.py migrations/models/
```

### 6. Run the Backend Server

```sh
python main.py
```

The API will be available at:  
`http://localhost:8085` (or as configured)

### 7. Running Tests

```sh
pytest
```

---

## Project Structure

```
Application/
├── Backend/
│   ├── app.py
│   ├── main.py
│   ├── config.py
│   ├── routes/
│   ├── models/
│   ├── database/
│   ├── migrations/
│   ├── tests/
│   └── ...
└── Mobile App/
```
---

## Useful Commands

- **Start server:** `python main.py`
- **Start Dev Server(Auto Reload)**: `fastapi dev .\Application\Backend\app.py --port 8085`
- **Run tests:** `pytest`
- **Migrate DB:** `aerich migrate --name <desc> && aerich upgrade`
- **Patch migration files:** `python database/patch_migration.py migrations/models/`
---

## API Documentation

Once running, visit:  
`http://localhost:8085/docs` for Swagger UI.

---

## Mobile App Setup
Refer to the following resources for guidance on setting up and developing the mobile app:

- [Ignite CLI Guide](https://docs.infinite.red/ignite-cli/Guide/)
- [React Native Components and APIs](https://reactnative.dev/docs/components-and-apis)
- [Expo Documentation](https://docs.expo.dev/)

### 1. Prerequisites

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/) (recommended) or [npm](https://www.npmjs.com/) / [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- Android Studio and/or Xcode (for running on emulators/simulators or devices)

### 2. Install Dependencies

Navigate to the Application/Mobile App directory and install dependencies:

```sh
cd Application/MobileApp
pnpm install
# or
npm install
# or
yarn install
```

### 3. Running the App

#### Run on Android

```sh
pnpm android
# or
npm run android
# or
yarn android
```

#### Run on iOS

```sh
pnpm ios
# or
npm run ios
# or
yarn ios
```

#### Run on Web

```sh
pnpm web
# or
npm run web
# or
yarn web
```

### 4. Building the App

You can use [EAS Build](https://docs.expo.dev/build/introduction/) for production builds:

```sh
pnpm run build:android:prod
pnpm run build:ios:prod
```

See more build scripts in [Application/MobileApp/package.json](Application/MobileApp/package.json).

### 5. Running Tests

```sh
pnpm test
# or
npm test
# or
yarn test
```

### 6. End-to-End Testing (Maestro)

Ensure [Maestro](https://maestro.mobile.dev/) is installed, then run:

```sh
pnpm run test:maestro
```
---
For more details, see [Application/MobileApp/README.md](Application/MobileApp/README.md).

