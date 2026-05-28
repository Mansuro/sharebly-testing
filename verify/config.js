// config.js - Shared configuration and helpers
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CONFIG = {
  BASE_URL: process.env.SHAREBLY_URL || 'http://78.46.183.126:5173',

  // Test credentials — override via env vars, never commit real creds
  TEST_EMAIL: process.env.SHAREBLY_TEST_EMAIL || 'CHANGE_ME@example.com',
  TEST_PASSWORD: process.env.SHAREBLY_TEST_PASSWORD || 'CHANGE_ME',

  // Login flow.
  //
  // Sharebly's /login route is broken — actual login is a modal that opens
  // from a "Log in" button in the navbar. So we go to the trigger page,
  // click the button, fill the modal, and confirm via a logged-in signal
  // (not a URL change — modal stays on the same page).
  LOGIN_TRIGGER_PATH: '/',
  LOGIN_PATH: '/login', // kept for reference, not used in the modal flow

  // Indicators that we're successfully logged in. Add app-specific signals
  // here (a specific class, button text, avatar element, etc.).
  LOGGED_IN_INDICATORS: [
    'button:has-text("Log out")',
    'button:has-text("Logout")',
    'button:has-text("Sign out")',
    'button:has-text("Abmelden")',
    'a:has-text("Log out")',
    '[aria-label="account" i]',
    '[aria-label*="user menu" i]',
    '[data-testid*="logout" i]',
    '[data-testid*="user-menu" i]',
    'img[alt*="avatar" i]',
    '.MuiAvatar-root',
  ],

  // Success messages shown briefly during/after login (toast, snackbar, etc.).
  // Sharebly shows "Authenticated" in the modal before it closes.
  LOGIN_SUCCESS_MESSAGES: [
    'Authenticated',
    'Successfully logged in',
    'Welcome back',
    'Erfolgreich angemeldet',
  ],

  // Login form detection.
  //
  // Sharebly uses Material UI which auto-generates input IDs (e.g. _r_0_)
  // that change on every render, so we can't target by ID. The script
  // tries multiple strategies in order:
  //   1. By label text (works best for MUI, native, most libraries)
  //   2. By explicit CSS selector below
  //   3. By placeholder
  //   4. By position in the form
  //
  // Add language variants to the labels list — Sharebly may render the
  // login page in German or English depending on locale.
  LOGIN_EMAIL_LABELS: ['Email', 'E-Mail', 'E-mail', 'Username', 'Benutzername'],
  LOGIN_PASSWORD_LABELS: ['Password', 'Passwort', 'Kennwort'],

  LOGIN_SELECTORS: {
    // MUI hides the input behind text/password types — these are fallbacks
    email: 'input.MuiOutlinedInput-input[type="text"], form input[type="email"]',
    password: 'input[type="password"]',
    submit: 'button[type="submit"]',
  },

  // Timeouts (ms)
  HTTP_TIMEOUT: 10_000,
  PAGE_TIMEOUT: 20_000,
  NAV_WAIT: 'domcontentloaded', // or 'networkidle' for slower

  // Concurrency
  HTTP_CONCURRENCY: 8,
  BROWSER_CONCURRENCY: 3,

  // Output directory
  OUT_DIR: path.resolve(__dirname, 'output'),

  // 404 detection
  //
  // Sharebly's 404 page is completely blank. We detect "not found" by
  // measuring rendered content. A real page has hundreds of DOM nodes,
  // visible text, and a header/footer. If all those are missing, it's a 404.
  //
  // CALIBRATE these after first run:
  //   - Visit a known-good page, check page_metrics in output JSON
  //   - Visit a known 404, check page_metrics
  //   - Set thresholds between the two
  BLANK_PAGE_TEXT_THRESHOLD: 50, // chars of visible text below this = blank
  BLANK_PAGE_ELEMENT_THRESHOLD: 20, // DOM elements below this = blank

  // Secondary check: text indicators (kept as fallback if 404 ever gets text)
  NOT_FOUND_INDICATORS: [
    'text=404',
    'text=Page not found',
    'text=Not Found',
    'text=does not exist',
  ],
};

// Ensure output dir exists
if (!fs.existsSync(CONFIG.OUT_DIR)) {
  fs.mkdirSync(CONFIG.OUT_DIR, { recursive: true });
}

export function loadRoutes() {
  const routesPath = path.resolve(__dirname, '../routes.json');
  const data = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
  return data.routes;
}

/**
 * For an inferred route, generate path variants to try.
 * Returns the original path + sensible alternatives.
 */
export function generateVariants(route) {
  if (!route.inferred) return [route.path];

  const variants = new Set([route.path]);
  const segments = route.path.split('/').filter(Boolean);

  // Try kebab-case <-> snake_case for each segment
  const swap = (s) => {
    const kebab = s.replace(/_/g, '-');
    const snake = s.replace(/-/g, '_');
    return [kebab, snake];
  };

  // Build cartesian product of variants for each segment
  function build(acc, idx) {
    if (idx === segments.length) {
      variants.add('/' + acc.join('/'));
      return;
    }
    for (const v of [...new Set(swap(segments[idx]))]) {
      build([...acc, v], idx + 1);
    }
  }
  build([], 0);

  // Also try component-name-derived variants (PascalCase -> kebab)
  if (route.component) {
    const kebab = route.component
      .replace(/Page$/, '')
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
    variants.add('/' + kebab);
  }

  return [...variants];
}

export function saveJson(filename, data) {
  const filepath = path.join(CONFIG.OUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  return filepath;
}

export function loadJson(filename) {
  const filepath = path.join(CONFIG.OUT_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}
