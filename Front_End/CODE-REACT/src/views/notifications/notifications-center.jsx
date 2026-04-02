import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Col, Container, Form, Row, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import { medicationApi, notificationApi } from "../../services/api";
import {
  formatNotifTime,
  staffNotifMeta,
  staffDefaultTitle,
  staffNotifCategory,
  patientApiCategory,
  CHAT_PATH,
  DASHBOARD_APPTS_HASH,
  DASHBOARD_MEDS_HASH,
  isVirtualId,
} from "../../utils/notificationMeta";
import {
  getMissedMedicationSlotsToday,
  formatSlotClock,
  localDateStringYMD,
} from "../../utils/medicationReminders";
import "./notifications-center.scss";

function formatLate(minutesPast) {
  if (minutesPast < 60) return `En retard de ${minutesPast} min`;
  const h = Math.floor(minutesPast / 60);
  const m = minutesPast % 60;
  return m > 0 ? `En retard de ${h} h ${m} min` : `En retard de ${h} h`;
}

function normalizePatientId(raw) {
  if (raw == null) return "";
  if (typeof raw === "object" && raw !== null && "$oid" in raw) return String(raw.$oid);
  return String(raw);
}

function getSession() {
  try {
    if (localStorage.getItem("patientUser")) {
      const u = JSON.parse(localStorage.getItem("patientUser"));
      return { role: "patient", id: normalizePatientId(u?.id ?? u?._id) };
    }
    if (localStorage.getItem("doctorUser")) {
      const u = JSON.parse(localStorage.getItem("doctorUser"));
      return { role: "doctor", id: String(u?.id ?? u?._id ?? "") };
    }
    if (localStorage.getItem("nurseUser")) {
      const u = JSON.parse(localStorage.getItem("nurseUser"));
      return { role: "nurse", id: String(u?.id ?? u?._id ?? "") };
    }
    if (localStorage.getItem("adminUser")) {
      const u = JSON.parse(localStorage.getItem("adminUser"));
      return { role: "admin", id: String(u?.id ?? u?._id ?? "") };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function matchesReadFilter(n, filter) {
  if (filter === "all") return true;
  const id = n._id || n.id;
  const virt = isVirtualId(id);
  if (filter === "unread") {
    if (virt) return true;
    return n.read !== true;
  }
  if (filter === "read") {
    if (virt) return false;
    return n.read === true;
  }
  return true;
}

function ReadFilterButtons({ value, onChange }) {
  const opts = [
    { v: "all", label: "Toutes" },
    { v: "unread", label: "Non lues" },
    { v: "read", label: "Lues" },
  ];
  return (
    <div className="notifications-center__btn-group btn-group" role="group" aria-label="Filtrer par lecture">
      {opts.map(({ v, label }) => (
        <button
          key={v}
          type="button"
          className={`btn btn-sm ${value === v ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => onChange(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function NotificationsCenterPage() {
  const [session] = useState(() => getSession());
  const role = session?.role;

  const [readFilter, setReadFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [apiItems, setApiItems] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [medications, setMedications] = useState([]);
  const [now, setNow] = useState(() => new Date());

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await notificationApi.getMine();
      setApiItems(Array.isArray(res.items) ? res.items : []);
      setUnreadTotal(typeof res.unread === "number" ? res.unread : 0);
    } catch (e) {
      setErr(e?.message || "Erreur");
      setApiItems([]);
      setUnreadTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPatient = useCallback(async () => {
    const pid = session?.id;
    if (!pid) return;
    setLoading(true);
    setErr("");
    try {
      const [meds, res] = await Promise.all([
        medicationApi.getByPatient(pid).catch(() => []),
        notificationApi.getMine(),
      ]);
      setMedications(Array.isArray(meds) ? meds : []);
      setApiItems(Array.isArray(res.items) ? res.items : []);
      setUnreadTotal(typeof res.unread === "number" ? res.unread : 0);
    } catch (e) {
      setErr(e?.message || "Erreur");
      setApiItems([]);
      setMedications([]);
      setUnreadTotal(0);
    } finally {
      setLoading(false);
    }
  }, [session?.id]);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    if (role === "patient") loadPatient();
    else loadStaff();
  }, [session, role, loadPatient, loadStaff]);

  useEffect(() => {
    const onNotif = () => {
      if (role === "patient") loadPatient();
      else loadStaff();
    };
    window.addEventListener("medifollow-notifications-refresh", onNotif);
    return () => window.removeEventListener("medifollow-notifications-refresh", onNotif);
  }, [role, loadPatient, loadStaff]);

  useEffect(() => {
    if (role !== "patient") return undefined;
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, [role]);

  const dateStr = localDateStringYMD();
  const missedMeds = useMemo(
    () =>
      role === "patient" && session?.id
        ? getMissedMedicationSlotsToday(medications, now, dateStr, 1)
        : [],
    [role, session?.id, medications, now, dateStr],
  );

  const filteredStaffItems = useMemo(() => {
    if (role === "patient") return [];
    return apiItems.filter((n) => {
      if (!matchesReadFilter(n, readFilter)) return false;
      if (catFilter === "all") return true;
      return staffNotifCategory(n) === catFilter;
    });
  }, [apiItems, readFilter, catFilter, role]);

  const filteredPatientRows = useMemo(() => {
    if (role !== "patient") return { api: [], med: [] };

    if (catFilter === "medicaments") {
      if (readFilter === "read") return { api: [], med: [] };
      return { api: [], med: missedMeds };
    }

    const api = apiItems.filter((n) => {
      if (!matchesReadFilter(n, readFilter)) return false;
      if (catFilter === "all") return true;
      if (catFilter === "messages_appels") return patientApiCategory(n) === "messages_appels";
      if (catFilter === "rdv") return patientApiCategory(n) === "rdv";
      if (catFilter === "autres") return patientApiCategory(n) === "autres";
      return true;
    });

    const showMed = catFilter === "all" && (readFilter === "all" || readFilter === "unread");
    const med = showMed ? missedMeds : [];

    return { api, med };
  }, [apiItems, missedMeds, readFilter, catFilter, role]);

  const onMarkRead = async (id) => {
    if (!id || isVirtualId(id)) return;
    try {
      await notificationApi.markRead(id);
      if (role === "patient") await loadPatient();
      else await loadStaff();
    } catch {
      /* ignore */
    }
  };

  const onMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      if (role === "patient") await loadPatient();
      else await loadStaff();
    } catch {
      /* ignore */
    }
  };

  const staffRole = role === "admin" ? "admin" : role === "doctor" ? "doctor" : "nurse";

  const roleLabel =
    role === "patient"
      ? "Espace patient"
      : role === "doctor"
        ? "Espace médecin"
        : role === "nurse"
          ? "Espace infirmier(ère)"
          : "Administration";

  if (!session) {
    return (
      <Container fluid className="notifications-center py-4">
        <div className="notifications-center__guest">
          <i className="ri-lock-line d-block" aria-hidden />
          <h5 className="fw-semibold mb-2">Connexion requise</h5>
          <p className="text-muted small mb-0">Connectez-vous pour afficher et filtrer vos notifications.</p>
        </div>
      </Container>
    );
  }

  const listEmptyStaff = !loading && role !== "patient" && filteredStaffItems.length === 0;
  const listEmptyPatient =
    !loading &&
    role === "patient" &&
    filteredPatientRows.api.length === 0 &&
    filteredPatientRows.med.length === 0;

  return (
    <Container fluid className="notifications-center py-4 px-3 px-md-4">
      <div className="notifications-center__hero">
        <Row className="align-items-center g-3">
          <Col xs="auto">
            <div className="notifications-center__hero-icon" aria-hidden>
              <i className="ri-notification-3-fill" />
            </div>
          </Col>
          <Col>
            <p className="small text-white text-opacity-75 mb-1 fw-medium">{roleLabel}</p>
            <h1 className="notifications-center__title">Notifications</h1>
            <p className="notifications-center__subtitle">
              Consultez vos alertes, messages et rendez-vous. Filtrez par statut ou par type.
            </p>
          </Col>
          <Col xs={12} md="auto" className="d-flex flex-wrap align-items-center gap-2 justify-content-md-end">
            {unreadTotal > 0 && (
              <span className="notifications-center__badge-unread">{unreadTotal} non lue{unreadTotal > 1 ? "s" : ""}</span>
            )}
            <button type="button" className="btn btn-light btn-sm fw-semibold shadow-sm" onClick={onMarkAllRead}>
              <i className="ri-check-double-line me-1" aria-hidden />
              Tout marquer lu
            </button>
          </Col>
        </Row>
      </div>

      <div className="notifications-center__filters">
        <Row className="g-4 align-items-end">
          <Col md={6} lg={5}>
            <div className="notifications-center__filter-label">Lecture</div>
            <ReadFilterButtons value={readFilter} onChange={setReadFilter} />
          </Col>
          <Col md={6} lg={4}>
            <div className="notifications-center__filter-label">Type</div>
            <div className="notifications-center__select-wrap">
              {role === "patient" ? (
                <Form.Select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  aria-label="Filtrer par type"
                >
                  <option value="all">Tous les types</option>
                  <option value="messages_appels">Messages et appels</option>
                  <option value="rdv">Rendez-vous</option>
                  <option value="medicaments">Rappels médicaments</option>
                  <option value="autres">Autres</option>
                </Form.Select>
              ) : (
                <Form.Select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  aria-label="Filtrer par type"
                >
                  <option value="all">Tous les types</option>
                  <option value="danger">Alertes danger</option>
                  <option value="rdv">Rendez-vous</option>
                  <option value="demande_rdv">Demandes de rendez-vous</option>
                  <option value="messagerie">Messagerie</option>
                  <option value="autres">Autres</option>
                </Form.Select>
              )}
            </div>
          </Col>
        </Row>
      </div>

      {loading && (
        <div className="notifications-center__loading">
          <Spinner animation="border" variant="primary" role="status" className="mb-2" />
          <p className="text-muted small mb-0">Chargement des notifications…</p>
        </div>
      )}

      {err && !loading && (
        <div className="alert alert-danger rounded-3 shadow-sm" role="alert">
          {err}
        </div>
      )}

      {!loading && role !== "patient" && (
        <div className="notifications-center__list-card">
          {listEmptyStaff ? (
            <div className="notifications-center__empty">
              <i className="ri-inbox-line" aria-hidden />
              <p className="mb-0 fw-medium">Aucune notification pour ces filtres</p>
              <p className="small text-muted mt-2 mb-0">Modifiez la lecture ou le type pour élargir la liste.</p>
            </div>
          ) : (
            filteredStaffItems.map((n) => {
              const id = n._id || n.id;
              const { href, icon, iconWrapClass } = staffNotifMeta(n, staffRole);
              const isRead = n.read === true;
              const virt = isVirtualId(id);
              const time = formatNotifTime(n.createdAt);
              return (
                <Link
                  key={String(id)}
                  to={href}
                  className={`notifications-center__item ${!isRead ? "notifications-center__item--unread" : ""}`}
                  onClick={() => {
                    if (!isRead && id && !virt) onMarkRead(id);
                  }}
                >
                  <div className="notifications-center__item-inner">
                    <div className={`notifications-center__icon-box ${iconWrapClass} border`}>
                      <i className={icon} aria-hidden />
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap">
                        <h2 className="h6 mb-0 text-dark fw-semibold text-break pe-2">
                          {n.title || staffDefaultTitle(n)}
                        </h2>
                        {time ? <span className="notifications-center__time-pill">{time}</span> : null}
                      </div>
                      <p className="mb-0 small text-muted text-break mt-1 lh-sm">{n.body}</p>
                      {!isRead && !virt && (
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 mt-2 text-primary fw-semibold"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onMarkRead(id);
                          }}
                        >
                          Marquer comme lu
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {!loading && role === "patient" && (
        <div className="notifications-center__list-card">
          {listEmptyPatient ? (
            <div className="notifications-center__empty">
              <i className="ri-inbox-line" aria-hidden />
              <p className="mb-0 fw-medium">Aucune notification pour ces filtres</p>
              <p className="small text-muted mt-2 mb-0">Essayez « Toutes » en lecture ou changez le type.</p>
            </div>
          ) : (
            <>
              {filteredPatientRows.api.map((n) => {
                const id = n._id || n.id;
                const isVirt = isVirtualId(id);
                const isChat =
                  n.type === "chat_message" ||
                  n.type === "chat_message_sent" ||
                  n.type === "chat_call_log" ||
                  n.type === "chat_voice_invite";
                const isAppt =
                  n.type === "appointment_reminder_24h" || n.type === "appointment_new" || isVirt;
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
                const unread = n.read === false;
                return (
                  <Link
                    key={String(id)}
                    to={href}
                    className={`notifications-center__item ${unread ? "notifications-center__item--unread" : ""}`}
                    onClick={() => {
                      if (!n.read && id && !isVirt) onMarkRead(id);
                    }}
                  >
                    <div className="notifications-center__item-inner">
                      <div
                        className={`notifications-center__icon-box border ${
                          isAppt || isChat ? "bg-primary-subtle text-primary" : "bg-light text-primary"
                        }`}
                      >
                        <i className={`${icon} fs-5`} aria-hidden />
                      </div>
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap">
                          <h2 className="h6 mb-0 text-dark fw-semibold text-break pe-2">{n.title || "Notification"}</h2>
                          {time ? <span className="notifications-center__time-pill">{time}</span> : null}
                        </div>
                        <p className="mb-0 small text-muted text-break mt-1 lh-sm">{n.body}</p>
                        {!n.read && !isVirt && (
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 mt-2 text-primary fw-semibold"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onMarkRead(id);
                            }}
                          >
                            Marquer comme lu
                          </button>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
              {filteredPatientRows.med.map((row) => {
                const mid = row.med?._id || row.med?.id;
                const key = `med-${mid}-${row.slotIndex}`;
                const title = row.med?.name || "Médicament";
                const dosage = row.med?.dosage ? String(row.med.dosage) : "";
                const slotLabel = row.slot?.label ? `${row.slot.label} · ` : "";
                const subtitle = `${slotLabel}${dosage ? `${dosage} · ` : ""}Prévu ${formatSlotClock(row.slot)}`;
                return (
                  <Link key={key} to={DASHBOARD_MEDS_HASH} className="notifications-center__item notifications-center__item--unread">
                    <div className="notifications-center__item-inner">
                      <div className="notifications-center__icon-box bg-light text-primary border">
                        <i className="ri-capsule-line fs-5" aria-hidden />
                      </div>
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap">
                          <h2 className="h6 mb-0 text-dark fw-semibold text-break pe-2">Rappel — {title}</h2>
                          <span className="notifications-center__time-pill">{formatLate(row.minutesPast)}</span>
                        </div>
                        <p className="mb-0 small text-muted text-break mt-1 lh-sm">{subtitle}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </div>
      )}
    </Container>
  );
}
