import type { SupportedLang } from "@/lib/langs";

/**
 * Dictionnaire i18n du PANEL admin/dashboard (≠ carte publique).
 *
 * Pattern : flat keys avec chemins dot-séparés (`nav.section.principal`).
 * Chaque clé pointe vers un objet `Record<SupportedLang, string>`.
 *
 * Phase 1 (cette release) : sidebar + topbar + home hero + status communs.
 * Les autres écrans (éditeur de carte, formulaires, etc.) seront migrés
 * progressivement — en attendant, ils restent en français.
 *
 * On évite next-intl/react-intl pour rester léger : pas de dep, pas de setup
 * router middleware. Cookie `ruliz_panel_lang` + Context React + helper t().
 */

type LangDict = Record<SupportedLang, string>;

const DICT: Record<string, LangDict> = {
  // -----------------------------------------------------------------------
  // Sidebar — sections
  // -----------------------------------------------------------------------
  "nav.section.principal": {
    fr: "Principal",
    en: "Main",
    es: "Principal",
    de: "Haupt",
    it: "Principale",
    pt: "Principal",
    zh: "主要",
  },
  "nav.section.acquisition": {
    fr: "Acquisition",
    en: "Acquisition",
    es: "Adquisición",
    de: "Akquise",
    it: "Acquisizione",
    pt: "Aquisição",
    zh: "获取",
  },
  "nav.section.gestion": {
    fr: "Gestion",
    en: "Management",
    es: "Gestión",
    de: "Verwaltung",
    it: "Gestione",
    pt: "Gestão",
    zh: "管理",
  },
  "nav.section.pilotage": {
    fr: "Pilotage",
    en: "Operations",
    es: "Pilotaje",
    de: "Steuerung",
    it: "Pilotaggio",
    pt: "Pilotagem",
    zh: "运营",
  },
  "nav.section.donnees": {
    fr: "Données",
    en: "Data",
    es: "Datos",
    de: "Daten",
    it: "Dati",
    pt: "Dados",
    zh: "数据",
  },
  "nav.section.systeme": {
    fr: "Système",
    en: "System",
    es: "Sistema",
    de: "System",
    it: "Sistema",
    pt: "Sistema",
    zh: "系统",
  },

  // -----------------------------------------------------------------------
  // Sidebar — items dashboard
  // -----------------------------------------------------------------------
  "nav.dashboard": {
    fr: "Tableau de bord",
    en: "Dashboard",
    es: "Panel",
    de: "Dashboard",
    it: "Dashboard",
    pt: "Painel",
    zh: "仪表板",
  },
  "nav.restaurant": {
    fr: "Mon resto",
    en: "My restaurant",
    es: "Mi restaurante",
    de: "Mein Restaurant",
    it: "Il mio ristorante",
    pt: "Meu restaurante",
    zh: "我的餐厅",
  },
  "nav.menu": {
    fr: "Éditeur de carte",
    en: "Menu editor",
    es: "Editor de carta",
    de: "Karten-Editor",
    it: "Editor menù",
    pt: "Editor da carta",
    zh: "菜单编辑器",
  },
  "nav.qrcodes": {
    fr: "QR codes",
    en: "QR codes",
    es: "Códigos QR",
    de: "QR-Codes",
    it: "Codici QR",
    pt: "Códigos QR",
    zh: "二维码",
  },
  "nav.stats": {
    fr: "Statistiques",
    en: "Analytics",
    es: "Estadísticas",
    de: "Statistiken",
    it: "Statistiche",
    pt: "Estatísticas",
    zh: "统计",
  },
  "nav.jeu": {
    fr: "Roulette d'avis",
    en: "Review roulette",
    es: "Ruleta de reseñas",
    de: "Bewertungs-Roulette",
    it: "Roulette recensioni",
    pt: "Roleta de avaliações",
    zh: "评价转盘",
  },
  "nav.popups": {
    fr: "Pop-ups",
    en: "Pop-ups",
    es: "Pop-ups",
    de: "Pop-ups",
    it: "Pop-up",
    pt: "Pop-ups",
    zh: "弹窗",
  },
  "nav.sms": {
    fr: "SMS marketing",
    en: "SMS marketing",
    es: "SMS marketing",
    de: "SMS-Marketing",
    it: "SMS marketing",
    pt: "SMS marketing",
    zh: "短信营销",
  },
  "nav.clients": {
    fr: "Clients",
    en: "Customers",
    es: "Clientes",
    de: "Kunden",
    it: "Clienti",
    pt: "Clientes",
    zh: "客户",
  },
  "nav.team": {
    fr: "Équipe",
    en: "Team",
    es: "Equipo",
    de: "Team",
    it: "Team",
    pt: "Equipa",
    zh: "团队",
  },
  "nav.billing": {
    fr: "Facturation",
    en: "Billing",
    es: "Facturación",
    de: "Abrechnung",
    it: "Fatturazione",
    pt: "Faturação",
    zh: "账单",
  },
  "nav.settings": {
    fr: "Paramètres",
    en: "Settings",
    es: "Ajustes",
    de: "Einstellungen",
    it: "Impostazioni",
    pt: "Definições",
    zh: "设置",
  },
  "nav.boutique": {
    fr: "Boutique QR",
    en: "QR shop",
    es: "Tienda QR",
    de: "QR-Shop",
    it: "Negozio QR",
    pt: "Loja QR",
    zh: "二维码商店",
  },
  "nav.more": {
    fr: "Plus",
    en: "More",
    es: "Más",
    de: "Mehr",
    it: "Altro",
    pt: "Mais",
    zh: "更多",
  },
  "nav.openMyMenu": {
    fr: "Voir ma carte",
    en: "View my menu",
    es: "Ver mi carta",
    de: "Karte ansehen",
    it: "Vedi il mio menù",
    pt: "Ver minha carta",
    zh: "查看菜单",
  },
  "drawer.section.compte": {
    fr: "Compte",
    en: "Account",
    es: "Cuenta",
    de: "Konto",
    it: "Account",
    pt: "Conta",
    zh: "账户",
  },

  // -----------------------------------------------------------------------
  // Sidebar — items admin
  // -----------------------------------------------------------------------
  "nav.admin.overview": {
    fr: "Vue d'ensemble",
    en: "Overview",
    es: "Vista general",
    de: "Übersicht",
    it: "Panoramica",
    pt: "Visão geral",
    zh: "总览",
  },
  "nav.admin.activity": {
    fr: "Activité",
    en: "Activity",
    es: "Actividad",
    de: "Aktivität",
    it: "Attività",
    pt: "Atividade",
    zh: "活动",
  },
  "nav.admin.clients": {
    fr: "Clients",
    en: "Clients",
    es: "Clientes",
    de: "Kunden",
    it: "Clienti",
    pt: "Clientes",
    zh: "客户",
  },
  "nav.admin.restaurants": {
    fr: "Restaurants",
    en: "Restaurants",
    es: "Restaurantes",
    de: "Restaurants",
    it: "Ristoranti",
    pt: "Restaurantes",
    zh: "餐厅",
  },
  "nav.admin.logs": {
    fr: "Logs",
    en: "Logs",
    es: "Registros",
    de: "Logs",
    it: "Log",
    pt: "Logs",
    zh: "日志",
  },
  "nav.admin.factures": {
    fr: "BC / Factures",
    en: "Orders / Invoices",
    es: "Pedidos / Facturas",
    de: "Bestellungen / Rechnungen",
    it: "Ordini / Fatture",
    pt: "Pedidos / Faturas",
    zh: "订单/发票",
  },
  "nav.admin.demo": {
    fr: "Ma carte démo",
    en: "My demo menu",
    es: "Mi carta demo",
    de: "Meine Demo-Karte",
    it: "La mia carta demo",
    pt: "Minha carta demo",
    zh: "我的演示菜单",
  },
  "nav.section.outils": {
    fr: "Outils",
    en: "Tools",
    es: "Herramientas",
    de: "Werkzeuge",
    it: "Strumenti",
    pt: "Ferramentas",
    zh: "工具",
  },

  // -----------------------------------------------------------------------
  // Topbar
  // -----------------------------------------------------------------------
  "topbar.search.placeholder": {
    fr: "Recherche rapide…",
    en: "Quick search…",
    es: "Búsqueda rápida…",
    de: "Schnellsuche…",
    it: "Ricerca rapida…",
    pt: "Pesquisa rápida…",
    zh: "快速搜索…",
  },
  "topbar.search.aria": {
    fr: "Rechercher (Cmd+K)",
    en: "Search (Cmd+K)",
    es: "Buscar (Cmd+K)",
    de: "Suchen (Cmd+K)",
    it: "Cerca (Cmd+K)",
    pt: "Procurar (Cmd+K)",
    zh: "搜索 (Cmd+K)",
  },
  "topbar.sidebar.collapse": {
    fr: "Réduire",
    en: "Collapse",
    es: "Colapsar",
    de: "Einklappen",
    it: "Riduci",
    pt: "Colapsar",
    zh: "折叠",
  },
  "topbar.sidebar.expand": {
    fr: "Déployer",
    en: "Expand",
    es: "Expandir",
    de: "Ausklappen",
    it: "Espandi",
    pt: "Expandir",
    zh: "展开",
  },
  "topbar.notifications": {
    fr: "Notifications",
    en: "Notifications",
    es: "Notificaciones",
    de: "Benachrichtigungen",
    it: "Notifiche",
    pt: "Notificações",
    zh: "通知",
  },

  // -----------------------------------------------------------------------
  // SidebarBrand status dot
  // -----------------------------------------------------------------------
  "brand.status.online": {
    fr: "Serveur en ligne",
    en: "Server online",
    es: "Servidor en línea",
    de: "Server online",
    it: "Server online",
    pt: "Servidor online",
    zh: "服务器在线",
  },

  // -----------------------------------------------------------------------
  // SidebarFooter user menu
  // -----------------------------------------------------------------------
  "userMenu.aria": {
    fr: "Menu utilisateur",
    en: "User menu",
    es: "Menú de usuario",
    de: "Benutzermenü",
    it: "Menu utente",
    pt: "Menu do utilizador",
    zh: "用户菜单",
  },
  "userMenu.online": {
    fr: "En ligne",
    en: "Online",
    es: "En línea",
    de: "Online",
    it: "Online",
    pt: "Online",
    zh: "在线",
  },
  "userMenu.profile": {
    fr: "Profil",
    en: "Profile",
    es: "Perfil",
    de: "Profil",
    it: "Profilo",
    pt: "Perfil",
    zh: "个人资料",
  },
  "userMenu.settings": {
    fr: "Paramètres",
    en: "Settings",
    es: "Ajustes",
    de: "Einstellungen",
    it: "Impostazioni",
    pt: "Definições",
    zh: "设置",
  },
  "userMenu.help": {
    fr: "Aide & support",
    en: "Help & support",
    es: "Ayuda y soporte",
    de: "Hilfe & Support",
    it: "Aiuto e supporto",
    pt: "Ajuda & suporte",
    zh: "帮助与支持",
  },
  "userMenu.signOut": {
    fr: "Se déconnecter",
    en: "Sign out",
    es: "Cerrar sesión",
    de: "Abmelden",
    it: "Disconnetti",
    pt: "Sair",
    zh: "登出",
  },
  "userMenu.legalMentions": {
    fr: "Mentions légales & CGV",
    en: "Legal notice & T&Cs",
    es: "Aviso legal y CGV",
    de: "Impressum & AGB",
    it: "Note legali e CGV",
    pt: "Avisos legais & CGV",
    zh: "法律声明与条款",
  },
  "userMenu.legalPrivacy": {
    fr: "Politique de confidentialité",
    en: "Privacy policy",
    es: "Política de privacidad",
    de: "Datenschutzerklärung",
    it: "Politica sulla privacy",
    pt: "Política de privacidade",
    zh: "隐私政策",
  },

  // -----------------------------------------------------------------------
  // Dashboard home — Welcome / Status
  // -----------------------------------------------------------------------
  "home.status.online": {
    fr: "Carte en ligne",
    en: "Menu live",
    es: "Carta en línea",
    de: "Karte online",
    it: "Menu online",
    pt: "Carta online",
    zh: "菜单上线",
  },
  "home.overview": {
    fr: "Vue d'ensemble",
    en: "Overview",
    es: "Vista general",
    de: "Übersicht",
    it: "Panoramica",
    pt: "Visão geral",
    zh: "总览",
  },

  // -----------------------------------------------------------------------
  // Lang picker (le picker lui-même)
  // -----------------------------------------------------------------------
  "langPicker.aria": {
    fr: "Changer la langue du panel",
    en: "Change panel language",
    es: "Cambiar idioma del panel",
    de: "Panel-Sprache ändern",
    it: "Cambia lingua del pannello",
    pt: "Alterar idioma do painel",
    zh: "更改面板语言",
  },
  "langPicker.title": {
    fr: "Langue du panel",
    en: "Panel language",
    es: "Idioma del panel",
    de: "Panel-Sprache",
    it: "Lingua del pannello",
    pt: "Idioma do painel",
    zh: "面板语言",
  },

  // -----------------------------------------------------------------------
  // Impersonation banner
  // -----------------------------------------------------------------------
  "impersonation.mode": {
    fr: "Mode SAV",
    en: "Support mode",
    es: "Modo SAT",
    de: "Support-Modus",
    it: "Modalità SAV",
    pt: "Modo de suporte",
    zh: "客服模式",
  },
  "impersonation.actingAs": {
    fr: "Tu agis en tant que",
    en: "You are acting as",
    es: "Estás actuando como",
    de: "Du handelst als",
    it: "Stai agendo come",
    pt: "Está a agir como",
    zh: "您正以以下身份操作",
  },
  "impersonation.exit": {
    fr: "Quitter le mode SAV",
    en: "Exit support mode",
    es: "Salir del modo SAT",
    de: "Support-Modus beenden",
    it: "Esci dalla modalità SAV",
    pt: "Sair do modo de suporte",
    zh: "退出客服模式",
  },
};

export type PanelLang = SupportedLang;

/**
 * Server-safe translator. Lookup key dans le dict ; fallback sur la valeur FR
 * si la lang demandée n'existe pas (ne devrait jamais arriver), sinon retourne
 * la clé brute pour signaler un missing translation.
 */
export function t(key: string, lang: PanelLang = "fr"): string {
  const entry = DICT[key];
  if (!entry) return key; // missing translation → key shown
  return entry[lang] ?? entry.fr ?? key;
}
