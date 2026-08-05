import { Platform } from 'react-native';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'hi';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
];

export const translations: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Navigation & General
    settings: 'Settings',
    profile: 'Profile',
    projects: 'Projects',
    completed: 'Completed',
    deleted: 'Deleted',
    newProject: 'New Project',
    back: 'Back',
    cancel: 'Cancel',
    save: 'Save',
    clear: 'Clear',

    // Theme Section
    theme: 'THEME',
    themeSubtitle: 'Customize your visual experience',
    lightMode: 'Light',
    darkMode: 'Dark',
    systemDefault: 'System',

    // Language Section
    language: 'LANGUAGE',
    languageSubtitle: 'Select interface display language',
    selectLanguage: 'Select Language',

    // Preferences Section
    preferences: 'PREFERENCES',
    pushNotifications: 'Push Notifications',
    pushNotificationsSub: 'Receive reminders & status updates',
    cloudAutoSync: 'Cloud Auto Sync',
    cloudAutoSyncSub: 'Sync project changes with Supabase',
    compactCards: 'Compact Project Cards',
    compactCardsSub: 'Use condensed card layout on dashboard',
    hapticFeedback: 'Haptic Feedback',
    hapticFeedbackSub: 'Vibrate on button presses & actions',

    // Data & Storage
    dataStorage: 'DATA & STORAGE',
    exportData: 'Export Project Data',
    exportDataSub: 'Copy JSON data backup to clipboard',
    clearCache: 'Clear Cache',
    clearCacheSub: 'Reset local preferences cache',

    // About & Account
    about: 'ABOUT & APP INFO',
    appVersion: 'App Version',
    securityPrivacy: 'Security & Privacy',
    account: 'ACCOUNT',
    logOut: 'Log Out of Trak',
    confirmLogout: 'Are you sure you want to log out of Trak?',

    // Statuses
    active: 'Active',
    blocked: 'Blocked',
    idle: 'Idle',
    deadline: 'DEADLINE',
    updated: 'Updated',
  },

  es: {
    settings: 'Configuración',
    profile: 'Perfil',
    projects: 'Proyectos',
    completed: 'Completados',
    deleted: 'Eliminados',
    newProject: 'Nuevo Proyecto',
    back: 'Volver',
    cancel: 'Cancelar',
    save: 'Guardar',
    clear: 'Limpiar',

    theme: 'TEMA',
    themeSubtitle: 'Personaliza tu experiencia visual',
    lightMode: 'Claro',
    darkMode: 'Oscuro',
    systemDefault: 'Sistema',

    language: 'IDIOMA',
    languageSubtitle: 'Selecciona el idioma de visualización',
    selectLanguage: 'Seleccionar Idioma',

    preferences: 'PREFERENCIAS',
    pushNotifications: 'Notificaciones Push',
    pushNotificationsSub: 'Recibe recordatorios y actualizaciones',
    cloudAutoSync: 'Sincronización en la Nube',
    cloudAutoSyncSub: 'Sincronizar cambios con Supabase',
    compactCards: 'Tarjetas Compactas',
    compactCardsSub: 'Usar diseño compacto en el panel',
    hapticFeedback: 'Respuesta Háptica',
    hapticFeedbackSub: 'Vibrar al presionar botones',

    dataStorage: 'DATOS Y ALMACENAMIENTO',
    exportData: 'Exportar Datos de Proyectos',
    exportDataSub: 'Copiar copia de seguridad JSON al portapapeles',
    clearCache: 'Borrar Caché',
    clearCacheSub: 'Restablecer caché de preferencias locales',

    about: 'ACERCA DE E INFORMACIÓN',
    appVersion: 'Versión de la App',
    securityPrivacy: 'Seguridad y Privacidad',
    account: 'CUENTA',
    logOut: 'Cerrar Sesión en Trak',
    confirmLogout: '¿Estás seguro de que deseas cerrar sesión?',

    active: 'Activo',
    blocked: 'Bloqueado',
    idle: 'Inactivo',
    deadline: 'FECHA LÍMITE',
    updated: 'Actualizado',
  },

  fr: {
    settings: 'Paramètres',
    profile: 'Profil',
    projects: 'Projets',
    completed: 'Terminés',
    deleted: 'Supprimés',
    newProject: 'Nouveau Projet',
    back: 'Retour',
    cancel: 'Annuler',
    save: 'Enregistrer',
    clear: 'Effacer',

    theme: 'THÈME',
    themeSubtitle: 'Personnalisez votre expérience visuelle',
    lightMode: 'Clair',
    darkMode: 'Sombre',
    systemDefault: 'Système',

    language: 'LANGUE',
    languageSubtitle: 'Sélectionnez la langue d\'affichage',
    selectLanguage: 'Choisir la Langue',

    preferences: 'PRÉFÉRENCES',
    pushNotifications: 'Notifications Push',
    pushNotificationsSub: 'Recevez des rappels et des mises à jour',
    cloudAutoSync: 'Sync Auto Cloud',
    cloudAutoSyncSub: 'Synchroniser les modifications avec Supabase',
    compactCards: 'Cartes Compactes',
    compactCardsSub: 'Affichage condensé sur le tableau de bord',
    hapticFeedback: 'Retour Haptique',
    hapticFeedbackSub: 'Vibrer lors des pressions sur les boutons',

    dataStorage: 'DONNÉES ET STOCKAGE',
    exportData: 'Exporter les Données',
    exportDataSub: 'Copier la sauvegarde JSON dans le presse-papiers',
    clearCache: 'Vider le Cache',
    clearCacheSub: 'Réinitialiser le cache des préférences locales',

    about: 'À PROPOS',
    appVersion: 'Version de l\'App',
    securityPrivacy: 'Sécurité et Confidentialité',
    account: 'COMPTE',
    logOut: 'Se Déconnecter de Trak',
    confirmLogout: 'Êtes-vous sûr de vouloir vous déconnecter ?',

    active: 'Actif',
    blocked: 'Bloqué',
    idle: 'Inactif',
    deadline: 'DATE LIMITE',
    updated: 'Mis à jour',
  },

  de: {
    settings: 'Einstellungen',
    profile: 'Profil',
    projects: 'Projekte',
    completed: 'Abgeschlossen',
    deleted: 'Gelöscht',
    newProject: 'Neues Projekt',
    back: 'Zurück',
    cancel: 'Abbrechen',
    save: 'Speichern',
    clear: 'Löschen',

    theme: 'DESIGN',
    themeSubtitle: 'Passen Sie Ihr visuelles Erlebnis an',
    lightMode: 'Hell',
    darkMode: 'Dunkel',
    systemDefault: 'System',

    language: 'SPRACHE',
    languageSubtitle: 'Wählen Sie die Anzeigesprache',
    selectLanguage: 'Sprache Auswählen',

    preferences: 'EINSTELLUNGEN',
    pushNotifications: 'Push-Benachrichtigungen',
    pushNotificationsSub: 'Erhalten Sie Erinnerungen & Statusupdates',
    cloudAutoSync: 'Cloud-Auto-Sync',
    cloudAutoSyncSub: 'Projektänderungen mit Supabase synchronisieren',
    compactCards: 'Kompakte Karten',
    compactCardsSub: 'Kompaktes Layout im Dashboard nutzen',
    hapticFeedback: 'Haptisches Feedback',
    hapticFeedbackSub: 'Bei Tastendruck vibrieren',

    dataStorage: 'DATEN & SPEICHER',
    exportData: 'Projektdaten Exportieren',
    exportDataSub: 'JSON-Backup in die Zwischenablage kopieren',
    clearCache: 'Cache Leeren',
    clearCacheSub: 'Lokalen Einstellungscache zurücksetzen',

    about: 'ÜBER DIE APP',
    appVersion: 'App-Version',
    securityPrivacy: 'Sicherheit & Datenschutz',
    account: 'KONTO',
    logOut: 'Bei Trak Abmelden',
    confirmLogout: 'Möchten Sie sich wirklich abmelden?',

    active: 'Aktiv',
    blocked: 'Blockiert',
    idle: 'Inaktiv',
    deadline: 'FRIST',
    updated: 'Aktualisiert',
  },

  hi: {
    settings: 'सेटिंग्स',
    profile: 'प्रोफाइल',
    projects: 'प्रोजेक्ट्स',
    completed: 'पूर्ण',
    deleted: 'हटाए गए',
    newProject: 'नया प्रोजेक्ट',
    back: 'वापस',
    cancel: 'रद्द करें',
    save: 'सहेजें',
    clear: 'साफ़ करें',

    theme: 'थीम',
    themeSubtitle: 'अपना दृश्य अनुभव अनुकूलित करें',
    lightMode: 'लाइट',
    darkMode: 'डार्क',
    systemDefault: 'सिस्टम',

    language: 'भाषा',
    languageSubtitle: 'प्रदर्शन भाषा चुनें',
    selectLanguage: 'भाषा चुनें',

    preferences: 'प्राथमिकताएं',
    pushNotifications: 'पुश नोटिफिकेशन',
    pushNotificationsSub: 'रिमाइंडर और अपडेट प्राप्त करें',
    cloudAutoSync: 'क्लाउड ऑटो सिंक',
    cloudAutoSyncSub: 'Supabase के साथ बदलाव सिंक करें',
    compactCards: 'कंपैक्ट कार्ड',
    compactCardsSub: 'डैशबोर्ड पर संक्षिप्त कार्ड लेआउट',
    hapticFeedback: 'हैप्टिक फीडबैक',
    hapticFeedbackSub: 'बटन दबाने पर कंपन करें',

    dataStorage: 'डेटा और स्टोरेज',
    exportData: 'प्रोजेक्ट डेटा एक्सपोर्ट करें',
    exportDataSub: 'क्लिपबोर्ड पर JSON बैकअप कॉपी करें',
    clearCache: 'कैश साफ़ करें',
    clearCacheSub: 'लोकल सेटिंग्स कैश रीसेट करें',

    about: 'ऐप के बारे में',
    appVersion: 'ऐप संस्करण',
    securityPrivacy: 'सुरक्षा और गोपनीयता',
    account: 'खाता',
    logOut: 'Trak से लॉग आउट करें',
    confirmLogout: 'क्या आप निश्चित रूप से लॉग आउट करना चाहते हैं?',

    active: 'सक्रिय',
    blocked: 'अवरुद्ध',
    idle: 'निष्क्रिय',
    deadline: 'अंतिम तिथि',
    updated: 'अद्यतन',
  },
};

export function getDeviceLanguage(): SupportedLanguage {
  try {
    let locale = 'en';
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      locale = navigator.language || 'en';
    }
    const code = locale.slice(0, 2).toLowerCase();
    if (code === 'es' || code === 'fr' || code === 'de' || code === 'hi') {
      return code;
    }
  } catch (e) {
    // Default fallback
  }
  return 'en';
}

export function t(key: string, lang: SupportedLanguage = 'en'): string {
  const dict = translations[lang] || translations.en;
  return dict[key] || translations.en[key] || key;
}
