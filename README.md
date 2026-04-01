<div align="center">

# 🏥 MediFollow

### Plateforme Web de Suivi Post-Hospitalier à Distance

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-Backend-E0234E?style=flat&logo=nestjs)](https://nestjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb)](https://mongodb.com/)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=flat&logo=jsonwebtokens)](https://jwt.io/)
[![License](https://img.shields.io/badge/Licence-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Statut-En%20cours-yellow.svg)]()

</div>

---

## 📋 Table des matières

1. [Description](#-description)
2. [Objectifs](#-objectifs)
3. [Fonctionnalités](#-fonctionnalités)
4. [Technologies utilisées](#-technologies-utilisées)
5. [Architecture du projet](#-architecture-du-projet)
6. [Accessibilité numérique](#-accessibilité-numérique)
7. [Installation et lancement](#-installation-et-lancement)
8. [Structure du projet](#-structure-du-projet)
9. [Captures d'écran](#-captures-décran)
10. [Équipe du projet](#-équipe-du-projet)
11. [Améliorations futures](#-améliorations-futures)
12. [Licence](#-licence)

---

## 📖 Description

**MediFollow** est une plateforme web complète dédiée au **suivi à distance des patients après leur sortie de l'hôpital**. Elle permet de réduire les risques de complications et les réadmissions grâce à un système interactif, ergonomique et sécurisé, connectant les patients à leurs professionnels de santé.

La plateforme assure :
- La collecte et le suivi des paramètres vitaux et des symptômes par les patients
- La consultation et l'analyse des données par les professionnels de santé
- La génération d'alertes automatiques en cas de valeurs anormales
- La traçabilité complète et la sécurité de toutes les informations médicales

> **Projet réalisé dans le cadre du PFE (Projet de Fin d'Études) — ESPRIT, 2025/2026**

---

## 🎯 Objectifs

- Concevoir une application web complète pour le suivi post-hospitalier à distance
- Implémenter différents types d'utilisateurs avec des rôles et des permissions spécifiques
- Assurer la collecte, le traitement et la visualisation de données médicales simples
- Développer un module de notifications et d'alertes automatiques
- Fournir un tableau de bord interactif pour le suivi des patients et les statistiques globales
- Garantir la sécurité, la confidentialité et la traçabilité des informations
- Livrer une interface responsive et ergonomique pour PC, tablette et mobile

---

## ✨ Fonctionnalités

### 🔐 Authentification & Sécurité
- Connexion sécurisée par rôle (JWT + MFA par email pour Admin/Super Admin)
- Gestion des sessions avec déconnexion automatique après inactivité
- Contrôle d'accès basé sur les rôles (RBAC)
- Chiffrement des données sensibles

### 👥 Gestion des Utilisateurs (Super Admin)
- Tableau de bord Super Admin dédié
- Consultation de la liste complète de tous les utilisateurs (patients, médecins, infirmiers, admins, auditeurs, coordinateurs)
- CRUD complet pour les **Auditeurs** et les **Coordinateurs de soins**
- Activation / désactivation des comptes utilisateurs
- Modification du profil avec changement de mot de passe

### 🩺 Suivi des Patients
- Saisie des paramètres vitaux : température, tension artérielle, poids, fréquence cardiaque
- Déclaration des symptômes : douleur, fatigue, essoufflement, nausées…
- Réponse aux questionnaires post-hospitaliers personnalisés
- Consultation de l'historique personnel avec visualisation graphique
- Envoi de notes et messages au médecin

### 📊 Tableau de Bord Médical
- Vue d'ensemble des patients avec statistiques
- Graphiques d'évolution des paramètres vitaux
- Indicateurs de conformité des questionnaires
- Filtres par patient, période et type de paramètre

### 🚨 Alertes & Notifications
- Détection automatique des valeurs anormales par seuils configurables
- Notifications instantanées aux médecins et coordinateurs
- Historique des alertes avec validation par le personnel soignant
- Système de rappels automatiques pour les patients

### 📁 Gestion des Services Hospitaliers
- Gestion des unités et services hospitaliers
- Questionnaires personnalisés par service
- Export des données en CSV / PDF

### 🔎 Traçabilité & Audit
- Journal complet des actions utilisateurs
- Historique horodaté de toutes les modifications
- Rapport d'audit accessible aux auditeurs qualité
- Vérification de l'intégrité des données

### 🖥️ Interface Utilisateur
- Design responsive (PC, tablette, mobile)
- Connexion biométrique par reconnaissance faciale
- Navigation vocale et accessibilité avancée (lecture de page, dictée vocale)
- Validation des formulaires en temps réel

---

## 🛠️ Technologies utilisées

### Frontend
| Technologie | Rôle |
|---|---|
| **React 18** + **Vite** | Framework UI et bundler |
| **React Router v6** | Navigation SPA |
| **Bootstrap 5** | Design et composants UI |
| **Axios / Fetch API** | Appels HTTP |
| **Chart.js / Recharts** | Visualisation des données |
| **face-api.js** | Authentification faciale |
| **Web Speech API** | Navigation vocale |

### Backend
| Technologie | Rôle |
|---|---|
| **NestJS** | Framework backend Node.js |
| **Mongoose** | ORM pour MongoDB |
| **Passport.js + JWT** | Authentification et autorisation |
| **bcrypt** | Hachage des mots de passe |
| **Nodemailer** | Envoi d'emails (MFA, notifications) |
| **Multer** | Upload de fichiers |

### Base de données & Infrastructure
| Outil | Usage |
|---|---|
| **MongoDB Atlas** | Base de données cloud NoSQL |
| **Git / GitHub** | Versionnement et collaboration |
| **GitHub Actions** | CI/CD |
| **Postman** | Tests d'API |
| **Figma** | Maquettes UI/UX |

---

## 🏗️ Architecture du projet

```
MediFollow
├── Architecture : Client-Serveur / SPA + REST API
├── Frontend     : Single Page Application (React + Vite)
├── Backend      : API REST (NestJS)
├── Base de données : MongoDB Atlas (NoSQL)
└── Auth         : JWT avec MFA email (admin/superadmin)
                   JWT direct (staff, patient, médecin, infirmier)
```

### Rôles et accès
| Rôle | Accès |
|---|---|
| **Super Admin** | Gestion globale de la plateforme, tous les utilisateurs, audit |
| **Administrateur** | Gestion des patients, médecins, infirmiers, alertes |
| **Médecin** | Suivi quotidien, analyse des données, gestion des alertes |
| **Infirmier** | Aide à la saisie, suivi des alertes, rappels patients |
| **Coordinateur** | Supervision du protocole, communication avec les patients |
| **Auditeur** | Consultation des logs et historiques pour la traçabilité |
| **Patient** | Saisie des symptômes, questionnaires, historique personnel |

---

## ♿ Accessibilité numérique

MediFollow intègre dès sa conception les principes d'**accessibilité numérique** conformément aux **WCAG 2.1** (Web Content Accessibility Guidelines), afin que la plateforme soit utilisable par tous les profils d'utilisateurs, y compris les personnes en situation de handicap, les personnes âgées ou toute personne confrontée à des obstacles numériques.

> *"Une solution inaccessible est une solution incomplète."*

### 🧭 Les 4 piliers WCAG appliqués à MediFollow

| Pilier | Principe | Application dans MediFollow |
|---|---|---|
| **Perceptible** | L'information doit être présentée de manière à être perçue par tous | Textes alternatifs sur les images, contraste suffisant, taille de police ≥ 16px |
| **Utilisable** | L'interface doit être navigable par tous | Navigation complète au clavier (Tab / Maj+Tab), indicateur de focus visible |
| **Compréhensible** | Le contenu et les interactions doivent être clairs | Labels explicites sur les formulaires, messages d'erreur descriptifs, langue HTML définie (`lang="fr"`) |
| **Robuste** | Le contenu doit fonctionner sur différents agents utilisateurs | HTML sémantique valide, compatible avec les lecteurs d'écran et les technologies d'assistance |

### ✅ Mesures d'accessibilité mises en œuvre

#### Contenu perceptible
- **Textes alternatifs** (`alt`) sur toutes les images informatives ; les images décoratives ont un `alt` vide
- **Contraste couleur** respectant le ratio minimum de 4.5:1 entre le texte et l'arrière-plan
- **Taille de police** lisible (minimum 16px), réglable par l'utilisateur
- La **couleur seule** n'est jamais utilisée comme unique vecteur d'information (icônes et textes accompagnent les codes couleurs)

#### Interface utilisable
- **Navigation au clavier** complète : toutes les fonctionnalités sont accessibles sans souris
- **Indicateur de focus** visible sur tous les éléments interactifs
- **Délai suffisant** : les sessions affichent un avertissement avant expiration, avec possibilité de prolongation
- **Pas de contenu clignotant** susceptible de provoquer des crises (respect du seuil de 3 flashes/seconde)
- Liens d'**accès direct au contenu** (skip navigation) pour contourner les blocs répétitifs

#### Contenu compréhensible
- **Titres hiérarchisés** (H1, H2, H3…) structurant logiquement chaque page
- **Libellés de liens explicites** : pas de "cliquez ici", mais des descriptions claires comme "Consulter le dossier patient"
- **Formulaires accessibles** : chaque champ possède un label associé, les erreurs de validation sont identifiées et décrites
- Les **éléments répétés** (navigation, zones de recherche) ont des noms cohérents sur toutes les pages
- Langue de la page définie par programmation (`<html lang="fr">`)

#### Contenu robuste
- **HTML sémantique valide** (vérifié avec NU HTML Checker)
- Balisage ARIA (`aria-label`, `aria-live`, `role`) pour les composants dynamiques (alertes, notifications en temps réel)
- Compatible avec les **lecteurs d'écran** (NVDA) et les **écrans Braille**
- Interface **responsive** adaptée aux mobiles, tablettes et PC (boutons tactiles de taille suffisante)

### 🔧 Technologies d'assistance (AT) supportées

| Type | Technologie |
|---|---|
| **Affichage alternatif** | Lecteur d'écran NVDA, Écran Braille |
| **Saisie alternative** | Navigation clavier complète, touches rémanentes |
| **Navigation vocale** | Web Speech API intégrée (dictée vocale) |
| **Authentification adaptée** | Reconnaissance faciale (face-api.js) en alternative au mot de passe |

### 🧪 Stratégie de test d'accessibilité

MediFollow adopte une **approche combinée** d'évaluation de l'accessibilité :

#### Tests automatisés
| Outil | Description |
|---|---|
| **IBM Accessibility Checker** | Audit WCAG 2.1 du code HTML et des éléments interactifs |
| **Accessibility Insights** *(Microsoft)* | Audits automatisés et manuels en temps réel pendant le développement |
| **WebAIM WAVE** | Visualisation des erreurs d'accessibilité directement sur la page |
| **aXe** | Détection des problèmes d'accessibilité intégrée au navigateur |

#### Tests manuels
| Outil | Usage |
|---|---|
| **TPG Colour Contrast Analyser** | Vérification manuelle du contraste des couleurs |
| **NU HTML Checker** | Validation du balisage HTML pour détecter les erreurs de structure |

#### Tests avec lecteur d'écran
- Navigation avec **NVDA** pour vérifier la cohérence entre le design visuel et les informations annoncées
- Vérification que les **états interactifs** (menu ouvert, alerte active) sont communiqués au lecteur d'écran
- Contrôle de l'**ordre de focus** logique (SC 2.4.3) et de la **visibilité du focus** (SC 2.4.7)

### 📐 Bonnes pratiques de conception inclusive appliquées

- ✔ Barre de navigation **visible et constante** sur toutes les pages
- ✔ Structuration claire avec **titres hiérarchisés**
- ✔ **Langage simple** : phrases courtes, vocabulaire médical expliqué
- ✔ Boutons **assez grands** pour une utilisation tactile
- ✔ Formulaires **courts et faciles** à remplir, avec validation en temps réel
- ✔ Prototypes testés avec des **profils variés** (personnes âgées, malvoyantes, dyslexiques)

---

## 🚀 Installation et lancement

### Prérequis
- **Node.js** v18 ou supérieur
- **npm** v9 ou supérieur
- Un compte **MongoDB Atlas** (ou MongoDB local)
- Un compte **Gmail** avec mot de passe d'application (pour les emails MFA)

### 1. Cloner le dépôt

```bash
git clone https://github.com/khalilhl/MediFollow.git
cd MediFollow
git checkout User_branch
```

### 2. Configuration du Backend

```bash
cd backend
npm install
```

Créer le fichier `.env` dans `backend/` :

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/medifollow
JWT_SECRET=votre_secret_jwt
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_application
```

Démarrer le backend :

```bash
npm run start:dev
# API disponible sur http://localhost:3000
```

### 3. Configuration du Frontend

```bash
cd Front_End/CODE-REACT
npm install
npm run dev
# Application disponible sur http://localhost:5173
```

### 4. Comptes de test

| Rôle | Email | Mot de passe |
|---|---|---|
| Super Admin | `superadmin@medifollow.com` | `SuperAdmin123!` |
| Admin | `admin@medifollow.com` | `Admin123!` |
| *(Autres comptes à créer via le Super Admin)* | — | — |

> ⚠️ Les comptes Admin et Super Admin nécessitent une **confirmation par email** (MFA) lors de la connexion.

---

## 📁 Structure du projet

```
MediFollow/
├── backend/                        # API NestJS
│   └── src/
│       ├── auth/                   # Authentification, JWT, MFA, Super Admin
│       ├── doctor/                 # Module médecin (CRUD + toggle actif)
│       ├── patient/                # Module patient (CRUD + toggle actif)
│       ├── nurse/                  # Module infirmier (CRUD + toggle actif)
│       └── main.ts
│
└── Front_End/CODE-REACT/           # Application React
    └── src/
        ├── components/
        │   └── partials/sidebar/   # Navigation latérale (avec section Super Admin)
        ├── views/
        │   ├── auth/               # Connexion, confirmation, récupération mot de passe
        │   ├── super-admin/        # Dashboard, user-list, auditors, care-coordinators
        │   ├── dashboard/          # Tableau de bord médecin
        │   └── dashboard-pages/    # Tableaux de bord patient et infirmier
        ├── services/
        │   └── api.js              # Centralisation des appels API
        └── router/
            └── default-router.jsx  # Routes de l'application
```

---

## 📸 Captures d'écran

> *Captures à ajouter après la finalisation de l'interface*

| Page | Description |
|---|---|
| 🔐 Page de connexion | Authentification avec MFA et reconnaissance faciale |
| 📊 Dashboard Super Admin | Vue globale de tous les utilisateurs |
| 👤 Liste des utilisateurs | Gestion et activation/désactivation des comptes |
| 🩺 Dashboard Médecin | Suivi des patients avec graphiques |
| 📋 Formulaire Patient | Saisie des paramètres vitaux |
| 🚨 Module Alertes | Notifications et gestion des alertes |

---

## 👥 Équipe du projet

**Équipe CodeCraft**

| Nom | Rôle |
|---|---|
| **Khalki Imen Allah** | Développeuse Full Stack — Module Super Admin, Authentification |
| **Kacem Trabelsi** | Développeur Full Stack |
| **Khalil Hlila** | Développeur Full Stack |
| **Rahma Ayed** | Développeuse Full Stack |
| **Ayoub Ben Mohamed** | Développeur Full Stack |

> **Encadrante :** Mme. Asma Ayari
> **Institution :** ESPRIT — École Supérieure Privée d'Ingénierie et de Technologies
> **Année académique :** 2025/2026

---

## 🔮 Améliorations futures

### Fonctionnalités
- [ ] Application mobile React Native pour les patients
- [ ] Intégration de capteurs IoT pour la collecte automatique des paramètres vitaux
- [ ] Intelligence artificielle pour la prédiction des risques de réadmission
- [ ] Module de téléconsultation (vidéo/chat en temps réel)
- [ ] Export des rapports médicaux en PDF personnalisé
- [ ] Système de prescription électronique
- [ ] Internationalisation complète (multilingue — pictogrammes inclus)
- [ ] Intégration avec les systèmes d'information hospitaliers (HL7/FHIR)

### Accessibilité (conformité WCAG AAA)
- [ ] Atteindre la conformité **WCAG 2.1 niveau AAA** sur l'ensemble des parcours critiques
- [ ] Ajouter des **sous-titres et transcriptions** pour tous les contenus vidéo et audio
- [ ] Intégrer un **mode sombre** et un mode **contraste élevé** commutables par l'utilisateur
- [ ] Proposer une **version en langue des signes** (LSF) pour les annonces importantes
- [ ] Audit d'accessibilité complet par une **personne en situation de handicap** (co-conception inclusive)
- [ ] Intégration de **Voiceflow** pour un assistant vocal guidant la navigation
- [ ] Support étendu des **technologies d'assistance** (contacteurs, commandes oculaires)

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

<div align="center">

**MediFollow** — *Connecting Patients and Healthcare Professionals*

Développé avec ❤️ par l'équipe **CodeCraft** — ESPRIT 2025/2026

</div>
