import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Dropdown,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { appointmentApi, healthLogApi, medicationApi } from "../../services/api";
import MedicationNameAutocomplete from "../../components/MedicationNameAutocomplete";
import DosageAutocomplete from "../../components/DosageAutocomplete";
import { broadcastDoctorHealthLogResolved, subscribeDoctorHealthLogResolved } from "../../utils/healthLogResolveBroadcast";

const FREQUENCIES = [
  "1 fois par jour",
  "2 fois par jour",
  "3 fois par jour",
  "Toutes les 8 heures",
  "Hebdomadaire",
  "Si besoin",
];

const newMedLineId = () => `med-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const emptyMedLine = () => ({
  id: newMedLineId(),
  name: "",
  useCustomMedication: false,
  dosage: "",
  useCustomDosage: false,
  frequency: FREQUENCIES[0],
  startDate: "",
  endDate: "",
  notes: "",
});

const defaultRdvForm = () => ({
  title: "Rendez-vous urgent — suivi constantes",
  type: "checkup",
  date: new Date().toISOString().slice(0, 10),
  time: "09:00",
  notes: "",
});

const APPOINTMENT_TYPES = [
  { value: "checkup", label: "Consultation de suivi" },
  { value: "lab", label: "Analyses" },
  { value: "specialist", label: "Spécialiste" },
  { value: "imaging", label: "Imagerie" },
  { value: "physiotherapy", label: "Rééducation" },
];

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
  const [resolveModal, setResolveModal] = useState(null);
  const [modalNote, setModalNote] = useState("");
  const [rdvModal, setRdvModal] = useState(null);
  const [rdvForm, setRdvForm] = useState(() => defaultRdvForm());
  const [rdvSaving, setRdvSaving] = useState(false);
  const [rdvError, setRdvError] = useState("");
  const [medModal, setMedModal] = useState(null);
  const [medLine, setMedLine] = useState(() => emptyMedLine());
  const [medSaving, setMedSaving] = useState(false);
  const [medError, setMedError] = useState("");

  const doctorDisplayName = useMemo(() => {
    if (!doctorUser) return "";
    const ln = doctorUser.lastName ? `Dr. ${doctorUser.firstName || ""} ${doctorUser.lastName}`.trim() : "";
    return ln || doctorUser.firstName || "Médecin";
  }, [doctorUser]);

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

  const closeResolveModal = () => {
    setResolveModal(null);
    setModalNote("");
  };

  const resolveOne = async (healthLogId, patientId, resolutionNote) => {
    const note = String(resolutionNote ?? "").trim();
    if (!note) {
      window.alert("Rédigez une consigne pour le patient avant de clôturer.");
      return;
    }
    setResolveBusyId(healthLogId);
    try {
      await healthLogApi.doctorResolveVitalAlert(healthLogId, { resolutionNote: note });
      closeResolveModal();
      await load();
      broadcastDoctorHealthLogResolved(healthLogId, patientId);
    } catch (e) {
      window.alert(e.message || "Clôture impossible");
    } finally {
      setResolveBusyId(null);
    }
  };

  const confirmResolveFromModal = () => {
    if (!resolveModal) return;
    void resolveOne(resolveModal.id, resolveModal.patientId, modalNote);
  };

  const closeRdvModal = () => {
    setRdvModal(null);
    setRdvForm(defaultRdvForm());
    setRdvError("");
  };

  const openRdvModal = (patientId, patientName) => {
    setRdvForm(defaultRdvForm());
    setRdvError("");
    setRdvModal({ patientId, patientName });
  };

  const submitUrgentRdv = async (e) => {
    e.preventDefault();
    if (!rdvModal || !doctorId) return;
    const date = String(rdvForm.date || "").trim();
    const time = String(rdvForm.time || "").trim();
    if (!date) {
      setRdvError("Indiquez une date.");
      return;
    }
    if (!time) {
      setRdvError("Indiquez une heure.");
      return;
    }
    setRdvSaving(true);
    setRdvError("");
    try {
      await appointmentApi.create({
        patientId: rdvModal.patientId,
        doctorId: String(doctorId),
        doctorName: doctorDisplayName,
        title: String(rdvForm.title || "").trim() || "Rendez-vous urgent",
        type: rdvForm.type || "checkup",
        date,
        time,
        location: "",
        patientMessage: "",
        notes: String(rdvForm.notes || "").trim(),
        status: "confirmed",
      });
      closeRdvModal();
    } catch (err) {
      setRdvError(err.message || "Création impossible.");
    } finally {
      setRdvSaving(false);
    }
  };

  const closeMedModal = () => {
    setMedModal(null);
    setMedLine(emptyMedLine());
    setMedError("");
  };

  const openMedModal = (patientId, patientName) => {
    setMedLine(emptyMedLine());
    setMedError("");
    setMedModal({ patientId, patientName });
  };

  const patchMedLine = (patch) => {
    setMedLine((prev) => ({ ...prev, ...patch }));
  };

  const submitNewMedication = async (e) => {
    e.preventDefault();
    if (!medModal) return;
    const name = String(medLine.name || "").trim();
    if (!name) {
      setMedError("Saisissez le nom du médicament.");
      return;
    }
    setMedSaving(true);
    setMedError("");
    try {
      await medicationApi.create({
        patientId: medModal.patientId,
        name,
        dosage: String(medLine.dosage || "").trim(),
        frequency: medLine.frequency,
        startDate: medLine.startDate || "",
        endDate: medLine.endDate || "",
        notes: String(medLine.notes || "").trim(),
      });
      closeMedModal();
    } catch (err) {
      setMedError(err.message || "Enregistrement impossible.");
    } finally {
      setMedSaving(false);
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
            Utilisez le bouton <strong>+</strong> pour la <strong>consigne</strong> (clôture), un <strong>rendez-vous urgent</strong> ou un{" "}
            <strong>nouveau médicament</strong> via les fenêtres dédiées. Statuts : <strong>en attente</strong> ou <strong>résolu</strong>.
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
              {/* popper fixed sur Dropdown.Menu : sinon .table-responsive masque le 3e item */}
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
                        <td style={{ minWidth: 260 }}>
                          {pending ? (
                            <div className="d-flex flex-wrap align-items-center gap-1">
                              <Link
                                to={`/doctor/my-patients/${encodeURIComponent(pid)}`}
                                className="btn btn-outline-primary btn-sm"
                              >
                                Dossier
                              </Link>
                              <Dropdown as={ButtonGroup}>
                                <Dropdown.Toggle
                                  variant="primary"
                                  size="sm"
                                  id={`urg-actions-${row.id}`}
                                  disabled={resolveBusyId != null}
                                  className="d-inline-flex align-items-center px-2"
                                  title="Actions"
                                >
                                  <i className="ri-add-line fs-6" />
                                </Dropdown.Toggle>
                                <Dropdown.Menu
                                  align="end"
                                  popperConfig={{ strategy: "fixed" }}
                                  className="shadow-sm"
                                >
                                  <Dropdown.Item
                                    onClick={() => {
                                      setResolveModal({ id: row.id, patientId: pid });
                                      setModalNote("");
                                    }}
                                  >
                                    <i className="ri-file-text-line me-2 text-primary" />
                                    Consigne au patient (clôturer)
                                  </Dropdown.Item>
                                  <Dropdown.Item onClick={() => openRdvModal(pid, row.patientName)}>
                                    <i className="ri-calendar-event-line me-2 text-warning" />
                                    Rendez-vous urgent
                                  </Dropdown.Item>
                                  <Dropdown.Divider />
                                  <Dropdown.Item onClick={() => openMedModal(pid, row.patientName)}>
                                    <i className="ri-medicine-bottle-line me-2 text-success" />
                                    Ajouter un médicament
                                  </Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown>
                            </div>
                          ) : (
                            <Link
                              to={`/doctor/my-patients/${encodeURIComponent(pid)}`}
                              className="btn btn-outline-primary btn-sm"
                            >
                              Dossier
                            </Link>
                          )}
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

      <Modal show={resolveModal != null} onHide={closeResolveModal} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Consigne pour le patient</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted mb-2">
            Ce message est envoyé au patient dans la messagerie sécurisée et <strong>clôture</strong> cette alerte.
          </p>
          <Form.Control
            as="textarea"
            rows={5}
            className="small"
            placeholder="Votre solution : traitement, surveillance, consignes…"
            value={modalNote}
            onChange={(e) => setModalNote(e.target.value)}
            disabled={resolveBusyId != null}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={closeResolveModal} disabled={resolveBusyId != null}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!modalNote.trim() || resolveBusyId != null}
            onClick={confirmResolveFromModal}
          >
            {resolveBusyId != null ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Envoi…
              </>
            ) : (
              <>
                <i className="ri-send-plane-line me-1" />
                Envoyer et clôturer
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={rdvModal != null} onHide={closeRdvModal} centered backdrop="static" size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="ri-calendar-event-line me-2 text-warning" />
            Rendez-vous urgent
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={submitUrgentRdv}>
          <Modal.Body>
            {rdvModal && (
              <p className="small text-muted mb-3">
                Patient : <strong>{rdvModal.patientName}</strong>. Le rendez-vous est créé comme <strong>confirmé</strong>.
              </p>
            )}
            {rdvError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {rdvError}
              </div>
            )}
            <Row className="g-2 mb-2">
              <Col md={12}>
                <Form.Label className="small fw-semibold">Motif / titre</Form.Label>
                <Form.Control
                  size="sm"
                  value={rdvForm.title}
                  onChange={(e) => setRdvForm((f) => ({ ...f, title: e.target.value }))}
                  disabled={rdvSaving}
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-semibold">Type</Form.Label>
                <Form.Select
                  size="sm"
                  value={rdvForm.type}
                  onChange={(e) => setRdvForm((f) => ({ ...f, type: e.target.value }))}
                  disabled={rdvSaving}
                >
                  {APPOINTMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6} className="d-none d-md-block" aria-hidden />
              <Col md={6}>
                <Form.Label className="small fw-semibold">Date *</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  required
                  value={rdvForm.date}
                  onChange={(e) => setRdvForm((f) => ({ ...f, date: e.target.value }))}
                  disabled={rdvSaving}
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-semibold">Heure *</Form.Label>
                <Form.Control
                  type="time"
                  size="sm"
                  required
                  value={rdvForm.time}
                  onChange={(e) => setRdvForm((f) => ({ ...f, time: e.target.value }))}
                  disabled={rdvSaving}
                />
              </Col>
              <Col md={12}>
                <Form.Label className="small fw-semibold">Notes (interne)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  size="sm"
                  placeholder="Optionnel"
                  value={rdvForm.notes}
                  onChange={(e) => setRdvForm((f) => ({ ...f, notes: e.target.value }))}
                  disabled={rdvSaving}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" size="sm" type="button" onClick={closeRdvModal} disabled={rdvSaving}>
              Annuler
            </Button>
            <Button variant="warning" size="sm" type="submit" disabled={rdvSaving}>
              {rdvSaving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <i className="ri-check-line me-1" />
                  Créer le rendez-vous
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={medModal != null} onHide={closeMedModal} centered backdrop="static" size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="ri-medicine-bottle-line me-2 text-success" />
            Nouveau médicament
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={submitNewMedication}>
          <Modal.Body>
            {medModal && (
              <p className="small text-muted mb-3">
                Patient : <strong>{medModal.patientName}</strong>. Le traitement sera visible sur le tableau de bord patient.
              </p>
            )}
            {medError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {medError}
              </div>
            )}
            <Row className="g-2">
              <Col md={12}>
                <Form.Label className="small fw-semibold">Nom du médicament *</Form.Label>
                <MedicationNameAutocomplete
                  id={`esc-med-name-${medLine.id}`}
                  value={medLine.name}
                  useCustom={!!medLine.useCustomMedication}
                  onChange={(patch) => patchMedLine(patch)}
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-semibold">Dosage</Form.Label>
                <DosageAutocomplete
                  id={`esc-med-dose-${medLine.id}`}
                  value={medLine.dosage}
                  useCustom={!!medLine.useCustomDosage}
                  onChange={(patch) => patchMedLine(patch)}
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-semibold">Fréquence</Form.Label>
                <Form.Select
                  size="sm"
                  value={medLine.frequency}
                  onChange={(e) => patchMedLine({ frequency: e.target.value })}
                  disabled={medSaving}
                >
                  {FREQUENCIES.map((fr) => (
                    <option key={fr} value={fr}>
                      {fr}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-semibold">Date de début</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={medLine.startDate}
                  onChange={(e) => patchMedLine({ startDate: e.target.value })}
                  disabled={medSaving}
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-semibold">Date de fin</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={medLine.endDate}
                  onChange={(e) => patchMedLine({ endDate: e.target.value })}
                  disabled={medSaving}
                />
              </Col>
              <Col md={12}>
                <Form.Label className="small fw-semibold">Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  size="sm"
                  placeholder="ex. Pendant les repas"
                  value={medLine.notes}
                  onChange={(e) => patchMedLine({ notes: e.target.value })}
                  disabled={medSaving}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" size="sm" type="button" onClick={closeMedModal} disabled={medSaving}>
              Annuler
            </Button>
            <Button variant="success" size="sm" type="submit" disabled={medSaving}>
              {medSaving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <i className="ri-check-line me-1" />
                  Enregistrer le médicament
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default DoctorNurseEscalations;
