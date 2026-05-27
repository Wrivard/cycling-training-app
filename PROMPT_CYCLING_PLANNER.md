# Prompt Claude Code — App de planification d'entraînement cycliste

> Copie-colle ce document entier comme premier message à Claude Code dans ton projet vide.

---

## Contexte du projet

Construis une **web app multi-utilisateurs** de planification d'entraînement cycliste. Deux utilisateurs au départ (moi + ma copine), mais l'archi doit être propre et multi-tenant dès le début. L'app permet de :

1. Planifier des séances de cycling sur un **calendrier** (endurance, intervalles, récup, repos, etc.).
2. **Tracer des routes à la main sur une carte** (snap-to-road, comme RideWithGPS) + **importer des fichiers GPX**.
3. Se connecter à **Strava** (OAuth) pour récupérer les activités réalisées (distance, dénivelé, vitesse, durée).
4. Se connecter à **Whoop** (OAuth) pour récupérer recovery, strain, sommeil, HRV.
5. Comparer **prévu vs réalisé** : chaque séance planifiée peut être matchée à une activité Strava.

## Stack technique imposée

- **Frontend** : React + Vite + TypeScript + Tailwind CSS
- **Backend** : FastAPI (Python 3.11+)
- **DB + Auth** : Supabase (Postgres + Supabase Auth email/Google)
- **Carte + routing** : Mapbox GL JS + Mapbox Directions API (profil `cycling`, qui fait le snap-to-road et calcule distance/dénivelé)
- **State client** : React Query (TanStack Query) pour le data fetching
- **Calendrier** : librairie au choix (FullCalendar ou react-big-calendar), vue mois + semaine

Toutes les clés/secrets passent par variables d'environnement, jamais en dur.

---

## ⚠️ Contraintes API critiques à respecter (vérifiées, à ne PAS ignorer)

### Strava
- **Single Player Mode** : toute nouvelle app Strava démarre avec une capacité de 1 athlète. La capacité monte automatiquement à mesure que des athlètes s'authentifient. Pour 2 users c'est OK, mais documente-le dans le README.
- **Affichage restreint** : les données Strava d'un user ne peuvent être affichées **qu'à ce user lui-même**. Donc **pas de feed partagé** entre moi et ma copine pour les données Strava. Chacun voit uniquement ses propres activités. Isole strictement par `user_id` au niveau DB (Row Level Security Supabase).
- **Interdiction IA** : les données issues de l'API Strava ne doivent **jamais** alimenter un modèle d'IA / ML. Si on ajoute plus tard une feature d'ajustement intelligent des séances, elle se basera sur Whoop ou la saisie manuelle, **pas** sur Strava. Mets un commentaire clair dans le code à l'endroit où les données Strava sont stockées.
- **Rate limits** : 200 req / 15 min, 2000 req / jour. Le sync est **manuel (bouton)**, donc large, mais gère proprement les `429 Too Many Requests` (lis les headers `X-Ratelimit-Limit` et `X-Ratelimit-Usage`).
- **OAuth** : flow standard authorization code. Scopes : `read,activity:read_all`. Stocke `access_token`, `refresh_token`, `expires_at`. Rafraîchis le token quand expiré.

### Whoop
- **API v2 uniquement** (la v1 est supprimée). Base URL et endpoints v2.
- **OAuth 2.0** avec scopes : `read:recovery read:sleep read:workout read:cycles read:profile offline`. Le scope `offline` est **obligatoire** pour obtenir un refresh token.
- **Refresh token** : les access tokens expirent vite (~1h), donc rafraîchis avant chaque appel si expiré.
- Les données de **recovery** se récupèrent via les endpoints **Cycle** en v2 (recovery score 0–100%, RHR, HRV, SpO2).
- Endpoints utiles : `/v2/recovery`, `/v2/activity/sleep`, `/v2/activity/workout`, `/v2/cycle`, `/v2/user/profile/basic`. Tous paginés (curseur `nextToken`).

---

## Modèle de données (Supabase / Postgres)

Active **Row Level Security** sur toutes les tables : chaque user n'accède qu'à ses propres lignes (`auth.uid() = user_id`).

```
profiles
  id (uuid, = auth.users.id), display_name, created_at

oauth_connections
  id, user_id, provider ('strava'|'whoop'), access_token, refresh_token,
  expires_at, scope, provider_user_id, created_at, updated_at
  -- tokens chiffrés au repos si possible

planned_sessions          -- séances PLANIFIÉES
  id, user_id, date, type ('endurance'|'intervals'|'recovery'|'rest'|'race'|'other'),
  title, description, target_distance_km, target_duration_min, target_tss,
  route_id (nullable, fk -> routes), completed_activity_id (nullable, fk -> activities),
  created_at, updated_at

routes                    -- routes tracées ou importées
  id, user_id, name, distance_km, elevation_gain_m,
  geojson (jsonb, la polyline), source ('drawn'|'gpx'), created_at

activities                -- activités RÉALISÉES (Strava)
  id, user_id, strava_id (unique), name, type, start_date,
  distance_km, moving_time_s, elevation_gain_m, average_speed_kmh,
  average_hr, max_hr, polyline (text), raw (jsonb), synced_at

whoop_metrics             -- métriques quotidiennes Whoop
  id, user_id, date, recovery_score, hrv_ms, resting_hr,
  strain, sleep_performance, sleep_duration_min, raw (jsonb), synced_at
```

---

## Features détaillées à implémenter

### 1. Auth
- Supabase Auth : login email/mot de passe + Google OAuth.
- Page de login propre, redirection vers le dashboard une fois connecté.
- Middleware backend qui valide le JWT Supabase sur chaque route protégée.

### 2. Page « Connexions » (Settings)
- Boutons « Connecter Strava » et « Connecter Whoop » qui lancent le flow OAuth.
- Callback backend qui échange le code, stocke les tokens dans `oauth_connections`.
- Affiche l'état (connecté / déconnecté) + bouton « Déconnecter » (révoque le token côté provider).
- Bouton **« Sync maintenant »** par provider → déclenche la récupération des données.

### 3. Sync Strava (manuel)
- Endpoint backend `POST /api/sync/strava` : rafraîchit le token si besoin, récupère les activités récentes (`/athlete/activities`, paginé), upsert dans `activities` par `strava_id`.
- Gère les 429 (backoff).
- Ne récupère que les activités de type vélo (`Ride`, `VirtualRide`).

### 4. Sync Whoop (manuel)
- Endpoint `POST /api/sync/whoop` : rafraîchit le token, récupère recovery/sleep/cycle des N derniers jours, upsert dans `whoop_metrics` par `(user_id, date)`.

### 5. Calendrier (cœur de l'app)
- Vue mois + semaine.
- Chaque jour affiche : les séances **planifiées** (badge couleur par type) et, si dispo, le **recovery Whoop** du jour (pastille colorée : vert >66%, jaune 34–66%, rouge <34%).
- Clic sur un jour → créer/éditer une séance planifiée (modal).
- Une séance planifiée peut être liée à une **route** (sélecteur).
- **Prévu vs réalisé** : si une activité Strava existe à la même date, propose de la matcher à la séance planifiée. Une fois matchée, affiche un comparatif (distance prévue vs réelle, durée, dénivelé).

### 6. Planificateur de routes (Mapbox)
- Carte Mapbox plein écran avec outil de tracé : je clique des points, l'app appelle **Mapbox Directions API (profil cycling)** pour snapper le tracé aux routes entre chaque point.
- Affiche distance totale + dénivelé en temps réel.
- Bouton « Annuler dernier point », « Effacer ».
- Sauvegarde la route (nom + geojson) dans `routes`.
- **Import GPX** : upload d'un fichier `.gpx`, parse côté backend (lib `gpxpy`), extrait la polyline + distance + dénivelé, sauvegarde dans `routes`.
- Liste des routes sauvegardées avec preview mini-carte.

### 7. Dashboard
- Vue d'ensemble de la semaine : séances à venir, recovery du jour, dernières activités Strava, charge d'entraînement (somme des durées/TSS de la semaine).

---

## Structure du projet attendue

```
/frontend          (React + Vite)
  /src
    /components
    /pages         (Login, Dashboard, Calendar, RoutePlanner, Settings)
    /hooks
    /lib           (supabase client, api client, mapbox helpers)
/backend           (FastAPI)
  /app
    /routers       (auth, sync, routes, sessions, oauth)
    /services      (strava_client, whoop_client, gpx_parser)
    /models        (pydantic schemas)
    main.py
  requirements.txt
/supabase
  migrations.sql   (toutes les tables + RLS policies)
README.md          (setup, variables d'env, comment créer les apps Strava/Whoop/Mapbox)
.env.example
```

---

## Variables d'environnement (`.env.example`)

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Strava (créer l'app sur https://www.strava.com/settings/api)
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:8000/api/oauth/strava/callback

# Whoop (créer l'app sur https://developer.whoop.com)
WHOOP_CLIENT_ID=
WHOOP_CLIENT_SECRET=
WHOOP_REDIRECT_URI=http://localhost:8000/api/oauth/whoop/callback

# Mapbox (token sur https://account.mapbox.com)
VITE_MAPBOX_TOKEN=
```

---

## Ordre de construction recommandé

Procède par étapes, et **arrête-toi pour me montrer le résultat après chaque grande étape** :

1. Scaffold du projet (frontend + backend + migrations Supabase + README).
2. Auth Supabase complète (login/logout, route protégée backend).
3. Page Connexions + flow OAuth Strava + Whoop + stockage tokens.
4. Sync Strava + Sync Whoop (boutons manuels) → données en DB.
5. Calendrier avec séances planifiées (CRUD).
6. Planificateur de routes Mapbox (tracé + snap) + import GPX.
7. Matching prévu/réalisé + comparatif.
8. Dashboard.

Commence par l'étape 1. Pose-moi des questions si une décision technique est ambiguë avant de coder. Génère du code propre, typé, avec gestion d'erreurs réelle (pas de `console.log` partout, pas de `// TODO` laissés en plan sur les chemins critiques).
