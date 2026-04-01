import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Row, Col, Spinner, Alert } from "react-bootstrap";
import Card from "../../components/Card";
import VitalMetricTile, { hrStatus, bpStatus, o2Status, tempStatus } from "../../components/VitalMetricTile";
import { healthLogApi } from "../../services/api";

const VITALS_TZ = "Africa/Tunis";

function formatDisplayDate(ymd) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return ymd;
  }
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: VITALS_TZ,
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return "—";
  }
}

function moodMeta(mood) {
  if (mood === "good") return { icon: "ri-shield-check-line", label: "Satisfaisant", color: "#28a745" };
  if (mood === "fair") return { icon: "ri-scales-3-line", label: "Modéré", color: "#fd7e14" };
  if (mood === "poor") return { icon: "ri-first-aid-kit-line", label: "Difficile", color: "#dc3545" };
  return { icon: null, label: "—", color: "#6c757d" };
}

function riskBadgeClass(score) {
  if (score >= 50) return "bg-danger";
  if (score >= 25) return "bg-warning text-dark";
  return "bg-success";
}

const PatientVitalsHistory = () => {
  const navigate = useNavigate();
  const [patientUser, setPatientUser] = useState(() => {
    try {
      const stored = localStorage.getItem("patientUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const rawId = patientUser?.id ?? patientUser?._id;
  const pid =
    rawId != null && typeof rawId === "object" && rawId !== null && "$oid" in rawId
      ? String(rawId.$oid)
      : rawId != null
        ? String(rawId)
        : undefined;

  const [history, setHistory] = useState([]);
  const [latestLog, setLatestLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientUser) {
      navigate("/auth/sign-in", { replace: true });
    }
  }, [patientUser, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!pid) return;
      setLoading(true);
      setError("");
      try {
        const [logs, latest] = await Promise.all([
          healthLogApi.getHistory(pid),
          healthLogApi.getLatest(pid).catch(() => null),
        ]);
        setHistory(Array.isArray(logs) ? logs : []);
        setLatestLog(latest && typeof latest === "object" ? latest : null);
      } catch (e) {
        console.error(e);
        setError("Impossible de charger l'historique des constantes vitales.");
        setHistory([]);
        setLatestLog(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pid]);

  /** Jours du plus récent au plus ancien ; relevés du même jour triés par heure décroissante. */
  const groupedByDay = useMemo(() => {
    const map = new Map();
    for (const log of history) {
      const ymd =
        log.date && /^\d{4}-\d{2}-\d{2}$/.test(String(log.date))
          ? String(log.date).slice(0, 10)
          : (() => {
              const t = log.recordedAt || log.createdAt;
              if (!t) return null;
              const d = new Date(t);
              if (Number.isNaN(d.getTime())) return null;
              const parts = new Intl.DateTimeFormat("en-CA", {
                timeZone: VITALS_TZ,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).formatToParts(d);
              const y = parts.find((p) => p.type === "year")?.value;
              const mo = parts.find((p) => p.type === "month")?.value;
              const da = parts.find((p) => p.type === "day")?.value;
              return y && mo && da ? `${y}-${mo}-${da}` : null;
            })();
      if (!ymd) continue;
      if (!map.has(ymd)) map.set(ymd, []);
      map.get(ymd).push(log);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const ta = new Date(a.recordedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.recordedAt || b.createdAt || 0).getTime();
        return tb - ta;
      });
    }
    const days = [...map.keys()].sort((a, b) => b.localeCompare(a));
    return days.map((date) => ({ date, logs: map.get(date) }));
  }, [history]);

  /** Dernier relevé affiché en tuiles : API latest, sinon premier jour le plus récent. */
  const summaryLog = useMemo(() => {
    if (latestLog) return latestLog;
    if (!groupedByDay.length) return null;
    return groupedByDay[0].logs[0] ?? null;
  }, [latestLog, groupedByDay]);

  const vSummary = summaryLog?.vitals || {};
  const hr = hrStatus(vSummary.heartRate);
  const bp = bpStatus(vSummary.bloodPressureSystolic);
  const o2 = o2Status(vSummary.oxygenSaturation);
  const tp = tempStatus(vSummary.temperature);

  if (!patientUser) {
    return null;
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-3">
        <Col>
          <Link to="/dashboard-pages/patient-dashboard" className="text-decoration-none small d-inline-flex align-items-center gap-1">
            <i className="ri-arrow-left-line"></i>
            Retour au tableau de bord
          </Link>
          <h4 className="text-primary fw-bold mt-2 mb-0">
            <i className="ri-heart-pulse-line me-2"></i>
            Historique des constantes vitales
          </h4>
          <p className="text-muted small mb-0 mt-1">
            Tous vos relevés sur la période disponible (plusieurs par jour) : constantes, ressenti, symptômes et score de
            risque — du plus récent au plus ancien.
          </p>
        </Col>
      </Row>

      {!loading && !error && (summaryLog || groupedByDay.length > 0) && (
        <Card className="border-0 shadow-sm mb-4 overflow-hidden" style={{ borderRadius: 18 }}>
          <div
            className="px-3 px-md-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-2"
            style={{
              background: "linear-gradient(105deg, #ecfdf5 0%, #ffffff 42%, #fff7ed 100%)",
              borderBottom: "1px solid rgba(8, 155, 171, 0.12)",
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: 46,
                  height: 46,
                  background: "linear-gradient(135deg, #089bab 0%, #0d9488 100%)",
                  boxShadow: "0 4px 12px rgba(8, 155, 171, 0.35)",
                }}
              >
                <i className="ri-heart-pulse-fill text-white fs-5" />
              </div>
              <div>
                <h6 className="mb-0 fw-bold text-primary">Dernier relevé</h6>
                <small className="text-muted">Synthèse des constantes du check-in le plus récent</small>
              </div>
            </div>
            {summaryLog && (summaryLog.recordedAt || summaryLog.createdAt) && (
              <span
                className="badge rounded-pill px-3 py-2 fw-normal"
                style={{
                  background: "rgba(8, 155, 171, 0.1)",
                  color: "#089bab",
                  border: "1px solid rgba(8, 155, 171, 0.25)",
                  fontSize: "0.72rem",
                }}
              >
                <i className="ri-time-line me-1" />
                {formatDateTime(summaryLog.recordedAt || summaryLog.createdAt)}
              </span>
            )}
          </div>
          <Card.Body className="p-3 p-md-4">
            <Row className="g-3">
              <Col sm={6} xl={3}>
                <VitalMetricTile
                  icon="ri-heart-pulse-fill"
                  accent="#dc3545"
                  title="Fréquence cardiaque"
                  value={vSummary.heartRate}
                  unit="bpm"
                  status={hr}
                  noDataMsg="Enregistrez vos constantes pour afficher la FC."
                />
              </Col>
              <Col sm={6} xl={3}>
                <VitalMetricTile
                  icon="ri-drop-fill"
                  accent="#089bab"
                  title="Tension artérielle"
                  value={vSummary.bloodPressureSystolic ? `${vSummary.bloodPressureSystolic}/${vSummary.bloodPressureDiastolic}` : null}
                  unit="mmHg"
                  status={bp}
                  noDataMsg="Enregistrez vos constantes pour afficher la TA."
                />
              </Col>
              <Col sm={6} xl={3}>
                <VitalMetricTile
                  icon="ri-lungs-fill"
                  accent="#6f42c1"
                  title="Saturation O₂"
                  value={vSummary.oxygenSaturation}
                  unit="%"
                  status={o2}
                  noDataMsg="Enregistrez vos constantes pour afficher SpO₂."
                />
              </Col>
              <Col sm={6} xl={3}>
                <VitalMetricTile
                  icon="ri-temp-hot-fill"
                  accent="#fd7e14"
                  title="Température"
                  value={vSummary.temperature}
                  unit="°C"
                  status={tp}
                  noDataMsg="Enregistrez vos constantes pour afficher la température."
                />
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      )}

      {!loading && error && <Alert variant="danger">{error}</Alert>}

      {!loading && !error && groupedByDay.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">
            Aucun relevé enregistré pour le moment. Complétez un check-in depuis le tableau de bord.
          </Card.Body>
        </Card>
      )}

      {!loading &&
        !error &&
        groupedByDay.map(({ date, logs }) => (
          <Card key={date} className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h6 className="fw-bold text-primary mb-3 pb-2 border-bottom">
                <i className="ri-calendar-line me-2"></i>
                {formatDisplayDate(date)}
              </h6>
              {logs.map((log, idx) => {
                const v = log.vitals || {};
                const mood = moodMeta(log.mood);
                const t = log.recordedAt || log.createdAt;
                return (
                  <div
                    key={log._id || `${date}-${t}`}
                    className={`border rounded-3 p-3 ${idx === logs.length - 1 ? "mb-0" : "mb-3"}`}
                    style={{
                      background: "linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)",
                      borderColor: "rgba(148, 163, 184, 0.25)",
                    }}
                  >
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                      <div className="small text-muted d-flex align-items-center gap-1">
                        <i className="ri-time-line" aria-hidden />
                        <span>{formatDateTime(t)}</span>
                      </div>
                      <div className="d-flex flex-wrap gap-1 align-items-center">
                        <span className={`badge ${riskBadgeClass(log.riskScore ?? 0)}`} style={{ fontSize: "0.72rem" }}>
                          Risque {log.riskScore ?? 0}/100
                        </span>
                        {log.flagged && (
                          <span className="badge bg-danger" style={{ fontSize: "0.72rem" }}>
                            <i className="ri-alert-line me-1" aria-hidden />
                            À surveiller
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="row g-2 small mb-2">
                      {v.heartRate != null && v.heartRate !== "" && (
                        <div className="col-6 col-md-4 col-lg-3">
                          <span className="text-muted d-flex align-items-center gap-1">
                            <i className="ri-heart-pulse-line text-danger" aria-hidden />
                            FC
                          </span>
                          <div className="fw-semibold">{v.heartRate} bpm</div>
                        </div>
                      )}
                      {(v.bloodPressureSystolic != null || v.bloodPressureDiastolic != null) && (
                        <div className="col-6 col-md-4 col-lg-3">
                          <span className="text-muted d-flex align-items-center gap-1">
                            <i className="ri-drop-line text-primary" aria-hidden />
                            TA
                          </span>
                          <div className="fw-semibold">
                            {v.bloodPressureSystolic ?? "—"}/{v.bloodPressureDiastolic ?? "—"} mmHg
                          </div>
                        </div>
                      )}
                      {v.oxygenSaturation != null && v.oxygenSaturation !== "" && (
                        <div className="col-6 col-md-4 col-lg-3">
                          <span className="text-muted d-flex align-items-center gap-1">
                            <i className="ri-lungs-line text-info" aria-hidden />
                            SpO₂
                          </span>
                          <div className="fw-semibold">{v.oxygenSaturation}%</div>
                        </div>
                      )}
                      {v.temperature != null && v.temperature !== "" && (
                        <div className="col-6 col-md-4 col-lg-3">
                          <span className="text-muted d-flex align-items-center gap-1">
                            <i className="ri-temp-hot-line text-warning" aria-hidden />
                            Temp.
                          </span>
                          <div className="fw-semibold">{v.temperature} °C</div>
                        </div>
                      )}
                      {v.weight != null && v.weight !== "" && (
                        <div className="col-6 col-md-4 col-lg-3">
                          <span className="text-muted d-flex align-items-center gap-1">
                            <i className="ri-scales-3-line text-secondary" aria-hidden />
                            Poids
                          </span>
                          <div className="fw-semibold">{v.weight} kg</div>
                        </div>
                      )}
                    </div>

                    <div className="d-flex flex-wrap align-items-center gap-3 mt-2 pt-2 border-top small">
                      <span className="text-muted">Ressenti :</span>
                      <span className="fw-semibold d-inline-flex align-items-center gap-1" style={{ color: mood.color }}>
                        {mood.icon ? <i className={mood.icon} aria-hidden /> : null}
                        {mood.label}
                      </span>
                      <span className="text-muted">Douleur :</span>
                      <span className="fw-semibold">{log.painLevel ?? 0}/10</span>
                    </div>

                    {Array.isArray(log.symptoms) && log.symptoms.length > 0 && (
                      <div className="mt-2">
                        <span className="text-muted small d-block mb-1">Symptômes</span>
                        <div className="d-flex flex-wrap gap-1">
                          {log.symptoms.map((s) => (
                            <span key={s} className="badge bg-warning text-dark" style={{ fontSize: "0.7rem" }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {log.notes && String(log.notes).trim() && (
                      <p className="small text-muted fst-italic mb-0 mt-2 pt-2 border-top">
                        <i className="ri-file-text-line me-1" aria-hidden />
                        {log.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </Card.Body>
          </Card>
        ))}
    </Container>
  );
};

export default PatientVitalsHistory;
