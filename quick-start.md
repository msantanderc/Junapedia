# ⚡ Inicio Rápido - 30 Minutos

## 🎯 Resumen

Esta guía te llevará de 0 a tener tu aplicación en internet en 30 minutos.

---

## ✅ Paso 1: Firebase (10 min)

```
1. Ir a: https://console.firebase.google.com/
2. Crear proyecto: "pluxee-junaeb-guide"
3. Crear Firestore Database (modo producción)
4. Copiar credenciales de configuración
```

**Reglas de Firestore:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /stores/{storeId} {
      allow read, write: if true;
    }
  }
}
```

---

## ✅ Paso 2: Proyecto Local (10 min)

```bash
# Crear y entrar al proyecto
mkdir pluxee-junaeb-guide
cd pluxee-junaeb-guide

# Crear estructura
npm create vite@latest . -- --template react
npm install firebase lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Archivos clave a crear:**
- `.env` → Tus credenciales de Firebase
- `src/firebase.js` → Configuración Firebase
- `src/App.jsx` → Código de la aplicación

```bash
# Probar
npm run dev
```

---

## ✅ Paso 3: GitHub (5 min)

**Opción fácil - GitHub Desktop:**
```
1. Descargar: https://desktop.github.com/
2. File → Add Local Repository
3. Publish Repository
```

**Opción terminal:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/pluxee-junaeb-guide.git
git push -u origin main
```

---

## ✅ Paso 4: Deploy en Vercel (5 min)

```
1. Ir a: https://vercel.com
2. Sign up con GitHub
3. Import Project
4. Seleccionar repositorio
5. Agregar variables de entorno (.env)
6. Deploy
```

---

## 📦 Archivos Necesarios Mínimos

```
pluxee-junaeb-guide/
├── src/
│   ├── App.jsx          ← Código principal
│   ├── firebase.js      ← Config Firebase
│   ├── main.jsx         ← Entry point
│   └── index.css        ← Estilos
├── .env                 ← Credenciales
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
└── index.html
```

---

## 🔑 Variables de Entorno (.env)

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456
VITE_FIREBASE_APP_ID=1:123456:web:abc123
```

---

## 🚀 Comandos Importantes

```bash
# Desarrollo local
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Subir cambios a GitHub
git add .
git commit -m "Descripción del cambio"
git push
```

---

## 🎨 Características de la App

✅ Base de datos de 60+ locales
✅ Búsqueda y filtros
✅ Pestañas Restaurantes/Supermercados
✅ Búsqueda con IA
✅ Agregar/Editar/Eliminar locales
✅ Diseño responsive
✅ Base de datos en la nube

---

## 🆘 Troubleshooting Rápido

**No aparecen locales:**
→ Click en "Cargar 60 Locales"

**Error de Firebase:**
→ Revisa .env y reinicia servidor

**Error al subir a GitHub:**
→ Verifica .gitignore incluye .env

**Deploy falla en Vercel:**
→ Agrega variables de entorno en configuración

---

## 📱 URLs Útiles

- **Firebase Console:** https://console.firebase.google.com/
- **GitHub:** https://github.com
- **Vercel:** https://vercel.com
- **Netlify:** https://netlify.com

---

## 🎉 ¡Listo!

Tu app estará en:
- **Local:** http://localhost:3000
- **Producción:** https://tu-proyecto.vercel.app

---

## 📚 Próximos Pasos

1. Personaliza los estilos
2. Agrega más locales
3. Implementa autenticación
4. Agrega un dominio personalizado
5. Comparte con otros usuarios

**¿Preguntas?** Revisa `GUIA_INSTALACION.md` para más detalles.