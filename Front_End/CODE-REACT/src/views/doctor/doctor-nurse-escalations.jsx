import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { healthLogApi } from "../../services/api";
import { broadcastDoctorHealthLogResolved, subscribeDoctorHealthLogResolved } from "../../utils/healthLogResolveBroadcast";

const VITALS_TZ = "Africa/Tunis";

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: VITALS_TZ,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "—";
  }
}

function formatVitalsShort(v) {
  if (!v || typeof v !== "object") return "—";
  const parts = [];
  if (v.heartRate != null) parts.push(`FC ${v.heartRate}`);
  if (v.bloodPressureSystolic != null) {
    parts.push(`TA ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic ?? "—"}`);
  }
  if (v.oxygenSaturation != null) parts.push(`SpO₂ ${v.oxygenSaturation}%`);
  if (v.temperature != null && v.temperature !== "") parts.push(`T° ${v.temperature}`);
  return parts.length ? parts.join(" · ") : "—";
}

const FILTER_TABS = [
  { key: "all", label: "Tous" },
  { key: "pending", label: "En attente" },
  { key: "resolved", label: "Résolus" },
];

const DoctorNurseEscalations = () => {
  const [doctorUser] = useState(() => {
    try {
      const s = localStorage.getItem("doctorUser");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const doctorId = doctorUser?.id || doctorUser?._id;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [resolveBusyId, setResolveBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await healthLogApi.doctorNurseEscalations("all");
      setItems(Array.isArray(raw) ? raw : []);
    } catch (e) {
      setError(e.message || "Impossible de charger l’historique");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    load();
  }, [doctorId, load]);

  useEffect(() => {
    if (!doctorId) return;
    return subscribeDoctorHealthLogResolved(() => {
      void load();
    });
  }, [doctorId, load]);

  const filtered = useMemo(() => {
    if (filter === "pending") {
      return items.filter((r) => r.escalationStatus === "escalated_to_doctor");
    }
    if (filter === "resolved") {
      return items.filter((r) => r.escalationStatus === "resolved");
    }
    return items;
  }, [items, filter]);

  const counts = useMemo(() => {
    const pending = items.filter((r) => r.escalationStatus === "escalated_to_doctor").length;
    const resolved = items.filter((r) => r.escalationStatus === "resolved").length;
    return { pending, resolved, total: items.length };
  }, [items]);

  const resolveOne = async (healthLogId, patientId) => {
    setResolveBusyId(healthLogId);
    try {
      await healthLogApi.doctorResolveVitalAlert(healthLogId);
      await load();
      broadcastDoctorHealthLogResolved(healthLogId, patientId);
    } catch (e) {
      window.alert(e.message || "Clôture impossible");
    } finally {
      setResolveBusyId(null);
    }
  };

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
      <Row className="mb-4 align-items-end">
        <Col md={8}>
          <h4 className="fw-bold mb-1">
            <i className="ri-alarm-warning-fill text-danger me-2" />
            Urgences escaladées par l’infirmier
          </h4>
          <p className="text-muted mb-0">
            Historique des cas où un infirmier a sollicité votre avis (patients dont vous êtes le médecin référent).
            Statuts : <strong>en attente</strong> (action requise) ou <strong>résolu</strong> après clôture.
          </p>
        </Col>
        <Col md={4} className="text-md-end mt-3 mt-md-0">
          <Button variant="outline-secondary" size="sm" onClick={load} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="ri-refresh-line me-1" />}
            Actualiser
          </Button>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="py-3">
              <div className="small text-muted">Total escalades</div>
              <div className="fs-4 fw-semibold text-primary">{counts.total}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm h-100 border-start border-warning border-3 rounded">
            <Card.Body className="py-3">
              <div className="small text-muted">En attente</div>
              <div className="fs-4 fw-semibold text-warning">{counts.pending}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm h-100 border-start border-success border-3 rounded">
            <Card.Body className="py-3">
              <div className="small text-muted">Résolus</div>
              <div className="fs-4 fw-semibold text-success">{counts.resolved}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <span className="small text-muted">Filtrer l’affichage</span>
            <ButtonGroup size="sm">
              {FILTER_TABS.map((t) => (
                <Button
                  key={t.key}
                  variant={filter === t.key ? "primary" : "outline-primary"}
                  onClick={() => setFilter(t.key)}
                >
                  {t.label}
                  {t.key === "pending" && counts.pending > 0 ? (
                    <Badge bg="danger" className="ms-1">
                      {counts.pending}
                    </Badge>
                  ) : null}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted text-center py-5 mb-0">
              {counts.total === 0
                ? "Aucune escalade infirmier enregistrée pour vos patients."
                : "Aucun cas dans ce filtre."}
            </p>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle small">
                <thead className="table-light">
                  <tr>
                    <th>Patient</th>
                    <th>Statut</th>
                    <th>Relevé</th>
                    <th>Escalade</th>
                    <th>Infirmier</th>
                    <th>Score</th>
                    <th>Constantes</th>
                    <th>Note infirmier</th>
                    <th className="text-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const pending = row.escalationStatus === "escalated_to_doctor";
                    const pid = row.patientId;
                    return (
                      <tr key={row.id}>
                        <td className="fw-semibold">{row.patientName}</td>
                        <td>
                          {pending ? (
                            <Badge bg="warning" text="dark">
                              En attente
                            </Badge>
                          ) : (
                            <Badge bg="success">Résolu</Badge>
                          )}
                        </td>
                        <td className="text-nowrap">{formatWhen(row.recordedAt)}</td>
                        <td className="text-nowrap">{formatWhen(row.escalatedAt)}</td>
                        <td>{row.escalatedByNurseName || "—"}</td>
                        <td>
                          <span className="badge bg-light text-dark border">{row.riskScore ?? "—"}/100</span>
                        </td>
                        <td style={{ maxWidth: 220 }}>{formatVitalsShort(row.vitals)}</td>
                        <td style={{ maxWidth: 200 }} className="text-muted">
                          {row.escalationNote ? (
                            <span title={row.escalationNote}>{row.escalationNote.slice(0, 80)}{row.escalationNote.length > 80 ? "…" : ""}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            <Link
                              to={`/doctor/my-patients/${encodeURIComponent(pid)}`}
                              className="btn btn-outline-primary btn-sm"
                            >
                              Dossier
                            </Link>
                            {pending && (
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={resolveBusyId === row.id}
                                onClick={() => resolveOne(row.id, pid)}
                              >
                                {resolveBusyId === row.id ? (
                                  <>
                                    <Spinner animation="border" size="sm" className="me-1" />
                                    Clôture…
                                  </>
                                ) : (
                                  <>
                                    <i className="ri-checkbox-circle-line me-1" />
                                    Marquer comme résolu
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DoctorNurseEscalations;
