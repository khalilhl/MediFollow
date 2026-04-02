/**
 * Métadonnées et formatage partagés entre la cloche et la page « Toutes les notifications ».
 */

export const CHAT_PATH = "/chat";
export const DASHBOARD_MEDS_HASH = "/dashboard-pages/patient-dashboard#patient-medications";
export const DASHBOARD_APPTS_HASH = "/dashboard-pages/patient-dashboard#patient-appointments";

export function formatNotifTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const diff = Date.now() - d.getTime();
    if (diff < 45_000) return "À l'instant";
    if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)} min`;
    if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)} h`;
    return d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function patientIdFromDoc(raw) {
  if (raw == null) return "";
  if (typeof raw === "object" && raw !== null && "$oid" in raw) return String(raw.$oid);
  return String(raw);
}

export function patientLink(role, patientIdRaw) {
  const pid = patientIdFromDoc(patientIdRaw);
  if (!pid) return "#";
  if (role === "doctor") return `/doctor/my-patients/${pid}`;
  if (role === "admin") return "/admin/appointment-requests";
  return `/dashboard`;
}

export function isVirtualId(id) {
  return id != null && String(id).startsWith("virt-");
}

export function isAppointmentNotifType(type) {
  return type === "appointment_new" || type === "appointment_reminder_24h";
}

export function appointmentListLink(role) {
  if (role === "admin") return "/admin/appointment-requests";
  if (role === "doctor") return "/doctor/availability-calendar";
  return "/dashboard-pages/nurse-dashboard";
}

/** Métadonnées lien + icône pour médecin / infirmier / admin. */
export function staffNotifMeta(n, role) {
  const t = n.type || "";
  const id = n._id || n.id;
  if (
    t === "chat_message" ||
    t === "chat_message_sent" ||
    t === "chat_call_log" ||
    t === "chat_voice_invite"
  ) {
    const video = t === "chat_voice_invite" && String(n.body || "").includes("vidéo");
    return {
      href: CHAT_PATH,
      icon:
        t === "chat_voice_invite"
          ? video
            ? "ri-vidicon-line"
            : "ri-phone-fill"
          : t === "chat_message_sent"
            ? "ri-send-plane-2-line"
            : "ri-chat-3-line",
      iconWrapClass: "rounded-3 bg-primary-subtle text-primary border",
    };
  }
  if (t === "appointment_request") {
    return {
      href: "/admin/appointment-requests",
      icon: "ri-calendar-add-line",
      iconWrapClass: "rounded-3 bg-primary-subtle text-primary border",
    };
  }
  if (isAppointmentNotifType(t) || isVirtualId(id)) {
    const isReminder = t === "appointment_reminder_24h";
    return {
      href: appointmentListLink(role),
      icon: isReminder ? "ri-alarm-line" : "ri-calendar-check-line",
      iconWrapClass: "rounded-3 bg-primary-subtle text-primary border",
    };
  }
  return {
    href: patientLink(role, n.patientId),
    icon: "ri-alarm-warning-fill",
    iconWrapClass: "rounded-circle bg-danger-subtle text-danger",
  };
}

export function staffDefaultTitle(n) {
  return n.type === "appointment_request"
    ? "Demande de rendez-vous"
    : n.type === "appointment_new"
      ? "Nouveau rendez-vous"
      : n.type === "appointment_reminder_24h"
        ? "Rappel rendez-vous"
        : n.type === "chat_message" ||
            n.type === "chat_message_sent" ||
            n.type === "chat_call_log" ||
            n.type === "chat_voice_invite"
          ? "Messagerie"
          : "Alerte patient";
}

/** Catégorie filtre staff : danger | rdv | demande_rdv | messagerie | autres */
export function staffNotifCategory(n) {
  const t = n.type || "";
  const id = n._id || n.id;
  if (t === "risk_alert") return "danger";
  if (t === "appointment_request") return "demande_rdv";
  if (isAppointmentNotifType(t) || isVirtualId(id)) return "rdv";
  if (
    t === "chat_message" ||
    t === "chat_message_sent" ||
    t === "chat_call_log" ||
    t === "chat_voice_invite"
  ) {
    return "messagerie";
  }
  return "autres";
}

/** Catégorie filtre patient : messages_appels | rdv | medicaments | autres */
export function patientApiCategory(n) {
  const id = n._id || n.id;
  const isVirt = isVirtualId(id);
  const isChat =
    n.type === "chat_message" ||
    n.type === "chat_message_sent" ||
    n.type === "chat_call_log" ||
    n.type === "chat_voice_invite";
  const isAppt =
    n.type === "appointment_reminder_24h" || n.type === "appointment_new" || isVirt;
  if (isChat) return "messages_appels";
  if (isAppt) return "rdv";
  return "autres";
}
