import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Container, Modal, Row, Spinner, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { patientApi, healthLogApi, medicationApi, appointmentApi } from "../../services/api";
import VitalMetricTile, { hrStatus, bpStatus, o2Status, tempStatus, weightStatus } from "../../components/VitalMetricTile";
import {
  localDateStringYMD,
  isMedicationPastEndDate,
  getIntakeHistoryByDate,
  formatSlotTimeLocal,
} from "../../utils/medicationReminders";

const VITALS_TZ = "Africa/Tunis";

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
    }).format(d);
  } catch {
    return "—";
  }
}

function formatDisplayDateYmd(ymd) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(String(ymd))) return ymd;
  try {
    return new Date(`${String(ymd).slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return ymd;
  }
}

function formatLogVitalsShort(log) {
  const v = log?.vitals || {};
  const parts = [];
  if (v.heartRate != null) parts.push(`FC ${v.heartRate}`);
  if (v.bloodPressureSystolic != null) {
    parts.push(`TA ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic ?? "—"}`);
  }
  if (v.oxygenSaturation != null) parts.push(`SpO₂ ${v.oxygenSaturation}%`);
  if (v.temperature != null && v.temperature !== "") parts.push(`T° ${v.temperature}`);
  if (v.weight != null && v.weight !== "") parts.push(`Poids ${v.weight} kg`);
  return parts.length ? parts.join(" · ") : "—";
}

/** Constante considérée à risque (hors plage « normale » / pas seulement « no data »). */
function isRiskStatus(status) {
  if (!status) return false;
  if (status.label === "No data" || status.label === "—" || status.label === "Non mesuré") return false;
  return status.color === "#dc3545" || status.color === "#fd7e14";
}

/**
 * Alertes pour le médecin : score serveur + symptômes + constantes anormales.
 * @returns {{ severity: 'danger'|'warning', text: string }[]}
 */
function buildDoctorAlerts(latestLog, v) {
  const out = [];
  if (!latestLog) return out;

  const score = typeof latestLog.riskScore === "number" ? latestLog.riskScore : 0;
  if (latestLog.flagged) {
    out.push({
      severity: "danger",
      text: `Score de risque global : ${score}/100 — vigilance clinique recommandée.`,
    });
  } else if (score >= 25) {
    out.push({
      severity: "warning",
      text: `Score de risque modéré : ${score}/100.`,
    });
  }

  if (typeof latestLog.painLevel === "number" && latestLog.painLevel >= 7) {
    out.push({
      severity: "danger",
      text: `Douleur déclarée : ${latestLog.painLevel}/10.`,
    });
  } else if (typeof latestLog.painLevel === "number" && latestLog.painLevel >= 5) {
    out.push({
      severity: "warning",
      text: `Douleur modérée : ${latestLog.painLevel}/10.`,
    });
  }

  if (latestLog.mood === "poor") {
    out.push({ severity: "warning", text: "Ressenti du patient : difficile." });
  } else if (latestLog.mood === "fair") {
    out.push({ severity: "warning", text: "Ressenti du patient : modéré." });
  }

  if (v) {
    const hr = hrStatus(v.heartRate);
    if (v.heartRate != null && isRiskStatus(hr)) {
      out.push({
        severity: hr.color === "#dc3545" ? "danger" : "warning",
        text: `Fréquence cardiaque : ${hr.label}`,
      });
    }
    const bp = bpStatus(v.bloodPressureSystolic);
    if (v.bloodPressureSystolic != null && isRiskStatus(bp)) {
      out.push({
        severity: bp.color === "#dc3545" ? "danger" : "warning",
        text: `Tension (systolique) : ${bp.label}`,
      });
    }
    const o2 = o2Status(v.oxygenSaturation);
    if (v.oxygenSaturation != null && isRiskStatus(o2)) {
      out.push({
        severity: o2.color === "#dc3545" ? "danger" : "warning",
        text: `Saturation O₂ : ${o2.label}`,
      });
    }
    const tp = tempStatus(v.temperature);
    if (v.temperature != null && v.temperature !== "" && isRiskStatus(tp)) {
      out.push({
        severity: tp.color === "#dc3545" ? "danger" : "warning",
        text: `Température : ${tp.label}`,
      });
    }
  }

  return out;
}

const DoctorMyPatients = () => {
  const [doctorUser] = useState(() => {
    try {
      const s = localStorage.getItem("doctorUser");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const doctorId = doctorUser?.id || doctorUser?._id;
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [detailPatient, setDetailPatient] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [latestLog, setLatestLog] = useState(null);
  const [medications, setMedications] = useState([]);
  const [healthHistory, setHealthHistory] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  const closeDetail = useCallback(() => {
    setDetailPatient(null);
    setLatestLog(null);
    setMedications([]);
    setHealthHistory([]);
    setUpcomingAppointments([]);
    setDetailError("");
    setDetailLoading(false);
  }, []);

  const openDetail = useCallback((p) => {
    setDetailPatient(p);
    setLatestLog(null);
    setMedications([]);
    setHealthHistory([]);
    setUpcomingAppointments([]);
    setDetailError("");
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const raw = await patientApi.getMyAssignedForDoctor();
        if (!cancelled) setPatients(Array.isArray(raw) ? raw : []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Impossible de charger les patients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  useEffect(() => {
    if (!detailPatient) return;
    const pid = detailPatient._id || detailPatient.id;
    if (!pid) return;
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      setDetailError("");
      try {
        const [log, hist, meds, appts] = await Promise.all([
          healthLogApi.getLatest(pid).catch(() => null),
          healthLogApi.getHistory(pid).catch(() => []),
          medicationApi.getByPatient(pid).catch(() => []),
          appointmentApi.getUpcoming(pid).catch(() => []),
        ]);
        if (cancelled) return;
        setLatestLog(log && typeof log === "object" ? log : null);
        setHealthHistory(Array.isArray(hist) ? hist : []);
        setMedications(Array.isArray(meds) ? meds : []);
        setUpcomingAppointments(Array.isArray(appts) ? appts : []);
      } catch (e) {
        if (!cancelled) setDetailError(e.message || "Impossible de charger le dossier patient");
        if (!cancelled) {
          setLatestLog(null);
          setMedications([]);
          setHealthHistory([]);
          setUpcomingAppointments([]);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailPatient]);

  const vSummary = latestLog?.vitals || {};
  const hr = hrStatus(vSummary.heartRate);
  const bp = bpStatus(vSummary.bloodPressureSystolic);
  const o2 = o2Status(vSummary.oxygenSaturation);
  const tp = tempStatus(vSummary.temperature);
  const wt = weightStatus(vSummary.weight);

  const doctorAlerts = buildDoctorAlerts(latestLog, vSummary);
  const hasAnyAlert = doctorAlerts.length > 0;
  const hasVitalMeasurements =
    vSummary &&
    ["heartRate", "bloodPressureSystolic", "oxygenSaturation", "temperature", "weight"].some(
      (k) => vSummary[k] != null && vSummary[k] !== ""
    );

  const todayYmd = localDateStringYMD();

  const sortedMedications = useMemo(() => {
    const list = [...medications];
    list.sort((a, b) => {
      const aEnded = isMedicationPastEndDate(a, todayYmd);
      const bEnded = isMedicationPastEndDate(b, todayYmd);
      if (aEnded !== bEnded) return aEnded ? 1 : -1;
      const endA = String(a.endDate || "9999-12-31").slice(0, 10);
      const endB = String(b.endDate || "9999-12-31").slice(0, 10);
      return endB.localeCompare(endA);
    });
    return list;
  }, [medications, todayYmd]);

  const recentCheckIns = useMemo(() => {
    let h = [...healthHistory];
    const latestId = latestLog?._id ?? latestLog?.id;
    if (latestId) {
      const sid = String(latestId);
      h = h.filter((row) => String(row._id ?? row.id) !== sid);
    }
    h.sort(
      (a, b) =>
        new Date(b.recordedAt || b.createdAt || 0).getTime() - new Date(a.recordedAt || a.createdAt || 0).getTime()
    );
    return h.slice(0, 15);
  }, [healthHistory, latestLog]);

  if (!doctorId) {
    return (
      <Container className="py-5">
        <p className="text-muted text-center">Connectez-vous en tant que médecin.</p>
        <div className="text-center">
          <Link to="/auth/sign-in" className="btn btn-primary">
            Connexion
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="pb-5">
      <Row className="mb-4">
        <Col>
          <h4 className="fw-bold mb-1">Mes patients</h4>
          <p className="text-muted mb-0">Patients dont vous êtes le médecin référent.</p>
        </Col>
      </Row>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : patients.length === 0 ? (
            <p className="text-muted text-center py-5 mb-0">Aucun patient ne vous est assigné pour le moment.</p>
          ) : (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Département</th>
                  <th className="text-end"></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const pid = p._id || p.id;
                  return (
                    <tr key={pid}>
                      <td className="fw-semibold">
                        {p.firstName} {p.lastName}
                      </td>
                      <td>{p.email}</td>
                      <td>{p.department || p.service || "—"}</td>
                      <td className="text-end text-nowrap">
                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => openDetail(p)}>
                          Voir le dossier patient
                        </Button>
                        <Link to={`/patient/patient-profile/${pid}`} className="btn btn-sm btn-outline-secondary">
                          Profil
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={!!detailPatient} onHide={closeDetail} size="xl" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            {detailPatient ? (
              <>
                <i className="ri-folder-user-line me-2 text-primary" />
                Dossier — {detailPatient.firstName} {detailPatient.lastName}
              </>
            ) : (
              "Patient"
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailPatient && (
            <p className="text-muted small mb-3">
              {detailPatient.email}
              {detailPatient.department || detailPatient.service ? (
                <>
                  {" "}
                  · {detailPatient.department || detailPatient.service}
                </>
              ) : null}
            </p>
          )}

          {detailLoading && (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" size="sm" className="me-2" />
              Chargement du dossier (constantes, traitements, historique)…
            </div>
          )}

          {!detailLoading && detailError && <Alert variant="danger">{detailError}</Alert>}

          {!detailLoading && !detailError && detailPatient && (
            <>
              {/* ——— Constantes vitales (dernier relevé) ——— */}
              <h6 className="text-primary fw-bold mb-2 mt-1">
                <i className="ri-heart-pulse-fill me-2" />
                Dernières constantes vitales
              </h6>
              {!latestLog ? (
                <Alert variant="light" className="border text-muted mb-4">
                  Aucun relevé de constantes pour ce patient.
                </Alert>
              ) : (
                <>
                  {hasAnyAlert && (
                    <div className="mb-3">
                      {doctorAlerts.map((a, i) => (
                        <Alert key={i} variant={a.severity === "danger" ? "danger" : "warning"} className="py-2 mb-2">
                          <i className={`me-2 ${a.severity === "danger" ? "ri-alarm-warning-fill" : "ri-alert-line"}`} />
                          {a.text}
                        </Alert>
                      ))}
                    </div>
                  )}

                  {!hasAnyAlert && hasVitalMeasurements && (
                    <Alert variant="success" className="py-2 mb-3">
                      <i className="ri-shield-check-line me-2" />
                      Dernier relevé sans alerte automatique sur les seuils affichés.
                    </Alert>
                  )}
                  {!hasAnyAlert && !hasVitalMeasurements && (
                    <Alert variant="light" className="py-2 mb-3 border text-muted">
                      <i className="ri-information-line me-2" />
                      Dernier check-in sans mesures de constantes détaillées.
                    </Alert>
                  )}

                  <div
                    className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 pb-2 border-bottom"
                    style={{ borderColor: "rgba(8, 155, 171, 0.15)" }}
                  >
                    <span className="small fw-semibold text-primary">Relevé du</span>
                    {(latestLog.recordedAt || latestLog.createdAt) && (
                      <span className="badge rounded-pill bg-light text-dark border">
                        <i className="ri-time-line me-1" />
                        {formatDateTime(latestLog.recordedAt || latestLog.createdAt)}
                      </span>
                    )}
                  </div>

                  <Row className="g-3 mb-4">
                    <Col sm={6} xl={4}>
                      <VitalMetricTile
                        icon="ri-heart-pulse-fill"
                        accent="#dc3545"
                        title="Fréquence cardiaque"
                        value={vSummary.heartRate}
                        unit="bpm"
                        status={hr}
                        noDataMsg="Non renseigné."
                      />
                    </Col>
                    <Col sm={6} xl={4}>
                      <VitalMetricTile
                        icon="ri-drop-fill"
                        accent="#089bab"
                        title="Tension artérielle"
                        value={
                          vSummary.bloodPressureSystolic
                            ? `${vSummary.bloodPressureSystolic}/${vSummary.bloodPressureDiastolic ?? "—"}`
                            : null
                        }
                        unit="mmHg"
                        status={bp}
                        noDataMsg="Non renseigné."
                      />
                    </Col>
                    <Col sm={6} xl={4}>
                      <VitalMetricTile
                        icon="ri-lungs-fill"
                        accent="#6f42c1"
                        title="Saturation O₂"
                        value={vSummary.oxygenSaturation}
                        unit="%"
                        status={o2}
                        noDataMsg="Non renseigné."
                      />
                    </Col>
                    <Col sm={6} xl={4}>
                      <VitalMetricTile
                        icon="ri-temp-hot-fill"
                        accent="#fd7e14"
                        title="Température"
                        value={vSummary.temperature}
                        unit="°C"
                        status={tp}
                        noDataMsg="Non renseigné."
                      />
                    </Col>
                    <Col sm={6} xl={4}>
                      <VitalMetricTile
                        icon="ri-scales-3-line"
                        accent="#198754"
                        title="Poids"
                        value={vSummary.weight}
                        unit="kg"
                        status={wt}
                        noDataMsg="Non renseigné."
                      />
                    </Col>
                  </Row>

                  {Array.isArray(latestLog.symptoms) && latestLog.symptoms.length > 0 && (
                    <div className="mb-4 p-3 rounded-3 bg-light border">
                      <div className="small fw-semibold text-muted mb-1">Symptômes déclarés (dernier relevé)</div>
                      <div className="small">{latestLog.symptoms.join(", ")}</div>
                    </div>
                  )}
                </>
              )}

              {/* ——— Traitements ——— */}
              <h6 className="text-primary fw-bold mb-2 border-top pt-4">
                <i className="ri-medicine-bottle-line me-2" />
                Traitements & médicaments
              </h6>
              {sortedMedications.length === 0 ? (
                <p className="text-muted small mb-4">Aucun traitement enregistré pour ce patient.</p>
              ) : (
                <div className="table-responsive mb-3">
                  <Table size="sm" bordered hover className="align-middle bg-white">
                    <thead className="table-light">
                      <tr>
                        <th>Médicament</th>
                        <th>Dosage</th>
                        <th>Fréquence</th>
                        <th>Prescrit par</th>
                        <th>Période</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMedications.map((m) => {
                        const mid = m._id || m.id;
                        const endStr = m.endDate ? String(m.endDate).slice(0, 10) : "";
                        const startStr = m.startDate ? String(m.startDate).slice(0, 10) : "";
                        const ended = isMedicationPastEndDate(m, todayYmd);
                        return (
                          <tr key={mid}>
                            <td className="fw-semibold">{m.name}</td>
                            <td>{m.dosage || "—"}</td>
                            <td>{m.frequency || "—"}</td>
                            <td>{m.prescribedBy || "—"}</td>
                            <td className="small text-muted">
                              {startStr ? formatDisplayDateYmd(startStr) : "—"}
                              {endStr ? ` → ${formatDisplayDateYmd(endStr)}` : ""}
                            </td>
                            <td>
                              <span className={`badge ${ended ? "bg-secondary" : "bg-success"}`}>
                                {ended ? "Terminé" : "En cours"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}

              {/* ——— Historique des prises (par médicament) ——— */}
              {sortedMedications.length > 0 && (
                <>
                  <h6 className="text-primary fw-bold mb-2">
                    <i className="ri-history-line me-2" />
                    Historique des prises (récent)
                  </h6>
                  <p className="text-muted small mb-3">
                    Jours où le patient a coché une prise — les 5 derniers jours avec relevé par traitement.
                  </p>
                  {sortedMedications.map((m) => {
                    const mid = m._id || m.id;
                    const intakeByDay = getIntakeHistoryByDate(m);
                    const recentDays = intakeByDay.slice(0, 5);
                    return (
                      <Card key={`intake-${mid}`} className="border mb-3 shadow-sm">
                        <Card.Body className="py-2 px-3">
                          <div className="fw-semibold small text-dark mb-2">{m.name}</div>
                          {recentDays.length === 0 ? (
                            <p className="small text-muted mb-0">Aucune prise enregistrée récemment.</p>
                          ) : (
                            <ul className="list-unstyled small mb-0">
                              {recentDays.map(({ date, slots }) => (
                                <li key={date} className="mb-2">
                                  <span className="fw-medium">{formatDisplayDateYmd(date)}</span>
                                  <ul className="list-unstyled ps-2 mb-0 text-muted">
                                    {slots.map((s) => (
                                      <li key={`${date}-${s.index}`}>
                                        {s.label}
                                        {s.recordedAt ? (
                                          <span className="text-dark ms-1">— {formatSlotTimeLocal(s.recordedAt)}</span>
                                        ) : (
                                          <span className="fst-italic ms-1">— heure non enregistrée</span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </li>
                              ))}
                            </ul>
                          )}
                        </Card.Body>
                      </Card>
                    );
                  })}
                </>
              )}

              {/* ——— Historique des check-ins (30 j) ——— */}
              <h6 className="text-primary fw-bold mb-2 border-top pt-4">
                <i className="ri-file-list-3-line me-2" />
                Historique des check-ins (30 derniers jours)
              </h6>
              {recentCheckIns.length === 0 ? (
                <p className="text-muted small mb-4">Aucun autre relevé dans la période.</p>
              ) : (
                <div className="table-responsive mb-4">
                  <Table size="sm" bordered className="align-middle bg-white">
                    <thead className="table-light">
                      <tr>
                        <th>Date / heure</th>
                        <th>Constantes</th>
                        <th>Score</th>
                        <th>Douleur</th>
                        <th>Ressenti</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCheckIns.map((log) => {
                        const lid = log._id || log.id;
                        const t = log.recordedAt || log.createdAt;
                        const score = typeof log.riskScore === "number" ? log.riskScore : "—";
                        return (
                          <tr key={lid}>
                            <td className="text-nowrap small">{formatDateTime(t)}</td>
                            <td className="small">{formatLogVitalsShort(log)}</td>
                            <td>
                              {log.flagged ? (
                                <span className="badge bg-danger">{score}</span>
                              ) : Number(score) >= 25 ? (
                                <span className="badge bg-warning text-dark">{score}</span>
                              ) : (
                                <span className="badge bg-light text-dark border">{score}</span>
                              )}
                            </td>
                            <td>{typeof log.painLevel === "number" ? `${log.painLevel}/10` : "—"}</td>
                            <td className="small text-capitalize">{log.mood || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}

              {/* ——— RDV à venir ——— */}
              <h6 className="text-primary fw-bold mb-2 border-top pt-2">
                <i className="ri-calendar-check-line me-2" />
                Prochains rendez-vous
              </h6>
              {upcomingAppointments.length === 0 ? (
                <p className="text-muted small mb-0">Aucun rendez-vous confirmé à venir.</p>
              ) : (
                <ul className="list-unstyled small mb-0">
                  {upcomingAppointments.map((a) => {
                    const aid = a._id || a.id;
                    return (
                      <li key={aid} className="mb-2 p-2 rounded border bg-light">
                        <span className="fw-semibold">{a.title || "Consultation"}</span>
                        <span className="text-muted ms-2">
                          {a.date ? formatDisplayDateYmd(a.date) : ""}
                          {a.time ? ` · ${a.time}` : ""}
                        </span>
                        {a.status && (
                          <span className="badge bg-primary ms-2 text-capitalize">{a.status}</span>
                        )}
                        {a.location && <div className="text-muted mt-1">{a.location}</div>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          {detailPatient && (
            <Link
              to={`/patient/patient-profile/${detailPatient._id || detailPatient.id}`}
              className="btn btn-primary"
              onClick={closeDetail}
            >
              Ouvrir le profil complet
            </Link>
          )}
          <Button variant="outline-secondary" onClick={closeDetail}>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default DoctorMyPatients;
