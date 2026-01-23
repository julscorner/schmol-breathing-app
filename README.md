# Breathing App 🌬️

Application de respiration guidée pour la relaxation et la pleine conscience.

## Fonctionnalités

- 🧘 Deux modes de respiration : Équilibrée (4-4-4-4) et Longue expiration (4-8)
- ⏱️ Durée configurable (1 à 5 minutes)
- ✨ Animations fluides et apaisantes
- 🌙 Thème sombre avec ciel étoilé
- ♿ Accessible (WCAG 2.1 AA)
- 📱 Responsive (mobile et desktop)

## Déploiement sur Vercel

### Option 1 : Via GitHub (recommandé)

1. Crée un compte sur [GitHub](https://github.com) si tu n'en as pas
2. Crée un nouveau repository et uploade tous ces fichiers
3. Va sur [vercel.com](https://vercel.com) et connecte-toi avec GitHub
4. Clique sur "New Project"
5. Importe ton repository GitHub
6. Vercel détecte automatiquement que c'est un projet Vite
7. Clique sur "Deploy"
8. Ton site est en ligne ! 🎉

### Option 2 : Via Vercel CLI

1. Installe Vercel CLI :
   ```bash
   npm install -g vercel
   ```

2. Dans le dossier du projet :
   ```bash
   vercel
   ```

3. Suis les instructions

## Développement local

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build pour la production
npm run build
```

## Structure du projet

```
breathing-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx        # Composant principal
│   ├── index.css      # Styles Tailwind
│   └── main.jsx       # Point d'entrée
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Licence

MIT
