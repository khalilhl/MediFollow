import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dropdown } from "react-bootstrap";
import { Link } from "react-router-dom";
import { medicationApi, notificationApi } from "../services/api";
import {
  getMissedMedicationSlotsToday,
  formatSlotClock,
  localDateStringYMD,
} from "../utils/medicationReminders";

function normalizePatientId(raw) {
  if (raw == null) return "";
  if (typeof raw === "object" && raw !== null && "$oid" in raw) return String(raw.$oid);
  return String(raw);
}

function formatLate(minutesPast) {
  if (minutesPast < 60) return `En retard de ${minutesPast} min`;
  const h = Math.floor(minutesPast / 60);
  const m = minutesPast % 60;
  return m > 0 ? `En retard de ${h} h ${m} min` : `En retard de ${h} h`;
}

function formatNotifTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const diff = Date.now() - d.getTime();
    if (diff < 45_000) return "À l'instant";
    if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)} min`;
    return d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const DASHBOARD_MEDS_HASH = "/dashboard-pages/patient-dashboard#patient-medications";
const DASHBOARD_APPTS_HASH = "/dashboard-pages/patient-dashboard#patient-appointments";
const CHAT_PATH = "/chat";

/**
 * Notifications patient : RDV (API : nouveau / rappel 24 h) + rappels médicaments (créneaux non cochés).
 */
export default function PatientMedicationNotificationsBell({
  className = "",
  toggleClassName = "nav-link d-none d-xl-block position-relative",
}) {
  const [medications, setMedications] = useState([]);
  const [apiItems, setApiItems] = useState([]);
  const [apiUnread, setApiUnread] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(false);

  const [patientId, setPatientId] = useState("");

  const readPatientId = useCallback(() => {
    try {
      const s = localStorage.getItem("patientUser");
      if (!s) {
        setPatientId("");
        return;
      }
      const u = JSON.parse(s);
      setPatientId(normalizePatientId(u?.id ?? u?._id));
    } catch {
      setPatientId("");
    }
  }, []);

  useEffect(() => {
    readPatientId();
    window.addEventListener("patientUserUpdated", readPatientId);
    return () => window.removeEventListener("patientUserUpdated", readPatientId);
  }, [readPatientId]);

  const loadMeds = useCallback(async () => {
    if (!patientId) return;
    try {
      const meds = await medicationApi.getByPatient(patientId);
      setMedications(Array.isArray(meds) ? meds : []);
    } catch {
      setMedications([]);
    }
  }, [patientId]);

  const loadApi = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await notificationApi.getMine();
      setApiItems(Array.isArray(res.items) ? res.items : []);
      setApiUnread(typeof res.unread === "number" ? res.unread : 0);
    } catch {
      setApiItems([]);
      setApiUnread(0);
    }
  }, [patientId]);

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      await Promise.all([loadMeds(), loadApi()]);
    } finally {
      setLoading(false);
    }
  }, [patientId, loadMeds, loadApi]);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    const onNotif = () => load();
    window.addEventListener("patient-medications-updated", onRefresh);
    window.addEventListener("medifollow-notifications-refresh", onNotif);
    const t = setInterval(load, 25_000);
    const tick = setInterval(() => setNow(new Date()), 30_000);
    const onFocus = () => {
      load();
      setNow(new Date());
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("patient-medications-updated", onRefresh);
      window.removeEventListener("medifollow-notifications-refresh", onNotif);
      window.removeEventListener("focus", onFocus);
      clearInterval(t);
      clearInterval(tick);
    };
  }, [load]);

  const dateStr = localDateStringYMD();
  const missed = useMemo(
    () => getMissedMedicationSlotsToday(medications, now, dateStr, 1),
    [medications, now, dateStr]
  );

  const totalCount = apiUnread + missed.length;

  const onMarkReadApi = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!id || String(id).startsWith("virt-")) return;
    notificationApi.markRead(id).then(load).catch(() => {});
  };

  return (
    <Dropdown
      as="li"
      className={`nav-item ${className}`}
      onToggle={(open) => {
        if (open) load();
      }}
    >
      <Dropdown.Toggle as="a" bsPrefix=" " to="#" className={`${toggleClassName} position-relative`}>
        <i className="ri-notification-4-line" />
        {totalCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: "0.65rem", padding: "0.2em 0.45em" }}
          >
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </Dropdown.Toggle>
      <Dropdown.Menu
        drop="start"
        as="div"
        className="p-0 sub-drop dropdown-menu-end notif-dropdown-panel"
        style={{ minWidth: 300, maxWidth: "min(100vw - 1.5rem, 360px)", width: "min(100vw - 1.5rem, 360px)", overflow: "hidden" }}
      >
        <div className="m-0 card border-0 shadow-sm" style={{ overflow: "hidden", maxWidth: "100%" }}>
          <div className="py-3 px-3 d-flex justify-content-between align-items-center bg-primary mb-0 rounded-top-3">
            <h5 className="mb-0 text-white fw-bold d-flex align-items-center gap-2 flex-wrap min-w-0">
              Toutes les notifications
              <span className="badge bg-light text-dark rounded-2 px-2 py-1 small">{totalCount}</span>
            </h5>
          </div>
          <div className="p-0 card-body notif-dropdown-body">
            {!patientId && (
              <div className="text-muted small text-center py-4 px-3">Session patient requise.</div>
            )}
            {patientId && loading && apiItems.length === 0 && medications.length === 0 && (
              <div className="text-center text-muted small py-4">Chargement…</div>
            )}
            {patientId && !loading && totalCount === 0 && (
              <div className="text-muted small text-center py-4 px-3">
                Aucune notification pour l’instant (rendez-vous, rappels médicaments, messages, appels).
              </div>
            )}

            {apiItems.map((n) => {
              const id = n._id || n.id;
              const isVirt = String(id).startsWith("virt-");
              const isChat =
                n.type === "chat_message" ||
                n.type === "chat_message_sent" ||
                n.type === "chat_call_log" ||
                n.type === "chat_voice_invite";
              const isAppt =
                n.type === "appointment_reminder_24h" ||
                n.type === "appointment_new" ||
                isVirt;
              const href = isChat ? CHAT_PATH : isAppt ? DASHBOARD_APPTS_HASH : DASHBOARD_MEDS_HASH;
              const icon = isChat
                ? n.type === "chat_voice_invite"
                  ? String(n.title || "").includes("vidéo")
                    ? "ri-vidicon-line"
                    : "ri-phone-fill"
                  : n.type === "chat_message_sent"
                    ? "ri-send-plane-2-line"
                    : "ri-chat-3-line"
                : isAppt
                  ? "ri-calendar-event-fill"
                  : "ri-information-line";
              const time = formatNotifTime(n.createdAt);
              return (
                <Link
                  key={String(id)}
                  to={href}
                  className={`iq-sub-card d-block w-100 text-decoration-none border-bottom ${n.read === false ? "bg-primary-subtle bg-opacity-10" : ""}`}
                  style={{ maxWidth: "100%", boxSizing: "border-box" }}
                  onClick={() => {
                    if (!n.read && id && !isVirt) notificationApi.markRead(id).then(load).catch(() => {});
                  }}
                >
                  <div className="d-flex align-items-start gap-2 px-3 py-3">
                    <div
                      className={`flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center border ${
                        isAppt || isChat ? "bg-primary-subtle text-primary" : "bg-light text-primary"
                      }`}
                      style={{ width: 50, height: 50 }}
                    >
                      <i className={`${icon} fs-4`} aria-hidden />
                    </div>
                    <div className="flex-grow-1 text-start min-w-0" style={{ minWidth: 0 }}>
                      <div className="d-flex align-items-start justify-content-between gap-2">
                        <h6 className="mb-0 text-dark fw-semibold text-break flex-grow-1">{n.title || "Notification"}</h6>
                        {time ? (
                          <small className="flex-shrink-0 text-muted text-nowrap" style={{ fontSize: "0.7rem" }}>
                            {time}
                          </small>
                        ) : null}
                      </div>
                      <p
                        className="mb-0 small text-muted text-break mt-1"
                        style={{ lineHeight: 1.35, wordBreak: "break-word", overflowWrap: "anywhere" }}
                      >
                        {n.body}
                      </p>
                      {!n.read && !isVirt && (
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 mt-1 small text-primary text-start"
                          onClick={(e) => onMarkReadApi(e, id)}
                        >
                          Marquer lu
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}

            {missed.map((row) => {
              const mid = row.med?._id || row.med?.id;
              const key = `med-${mid}-${row.slotIndex}`;
              const title = row.med?.name || "Médicament";
              const dosage = row.med?.dosage ? String(row.med.dosage) : "";
              const slotLabel = row.slot?.label ? `${row.slot.label} · ` : "";
              const subtitle = `${slotLabel}${dosage ? `${dosage} · ` : ""}Prévu ${formatSlotClock(row.slot)}`;
              return (
                <Link
                  key={key}
                  to={DASHBOARD_MEDS_HASH}
                  className="iq-sub-card d-block w-100 text-decoration-none border-bottom"
                  style={{ maxWidth: "100%", boxSizing: "border-box" }}
                >
                  <div className="d-flex align-items-start gap-2 px-3 py-3">
                    <div
                      className="flex-shrink-0 rounded-3 bg-light d-flex align-items-center justify-content-center text-primary border"
                      style={{ width: 50, height: 50 }}
                    >
                      <i className="ri-capsule-line fs-4" aria-hidden />
                    </div>
                    <div className="flex-grow-1 text-start min-w-0" style={{ minWidth: 0 }}>
                      <div className="d-flex align-items-start justify-content-between gap-2">
                        <h6 className="mb-0 text-dark fw-semibold text-break flex-grow-1">Rappel — {title}</h6>
                        <small className="flex-shrink-0 text-muted text-nowrap" style={{ fontSize: "0.7rem" }}>
                          {formatLate(row.minutesPast)}
                        </small>
                      </div>
                      <p
                        className="mb-0 small text-muted text-break mt-1"
                        style={{ lineHeight: 1.35, wordBreak: "break-word", overflowWrap: "anywhere" }}
                      >
                        {subtitle}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}
