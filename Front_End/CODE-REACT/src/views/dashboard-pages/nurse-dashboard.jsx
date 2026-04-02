import React, { useState, useEffect } from "react";
import { Row, Col, Badge, ListGroup, Alert, Button, Modal, Form, Spinner } from "react-bootstrap";
import Card from "../../components/Card";
import { nurseApi, healthLogApi } from "../../services/api";
import SecureMessagingHubCard from "../../components/SecureMessagingHubCard";

const generatePath = (path) => window.origin + import.meta.env.BASE_URL + path;

const NurseDashboard = () => {
  const [nurseUser, setNurseUser] = useState(() => {
    try {
      const stored = localStorage.getItem("nurseUser");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [pendingAlerts, setPendingAlerts] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [escModal, setEscModal] = useState({ open: false, logId: null, patientName: "" });
  const [escNote, setEscNote] = useState("");
  const [escBusy, setEscBusy] = useState(false);

  const loadPendingAlerts = () => {
    setPendingLoading(true);
    healthLogApi
      .nursePendingAlerts()
      .then((data) => setPendingAlerts(Array.isArray(data) ? data : []))
      .catch(() => setPendingAlerts([]))
      .finally(() => setPendingLoading(false));
  };

  useEffect(() => {
    const id = nurseUser?.id || nurseUser?._id;
    if (id) {
      nurseApi.getById(id)
        .then((nurse) => setNurseUser((prev) => prev ? { ...prev, ...nurse, id: nurse._id || nurse.id } : prev))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("nurseToken")) loadPendingAlerts();
  }, [nurseUser?.id, nurseUser?._id]);

  const profileImg = nurseUser?.profileImage?.startsWith("data:")
    ? nurseUser.profileImage
    : nurseUser?.profileImage?.startsWith("http")
    ? nurseUser.profileImage
    : nurseUser?.profileImage
    ? generatePath(nurseUser.profileImage.startsWith("/") ? nurseUser.profileImage.slice(1) : nurseUser.profileImage)
    : generatePath("/assets/images/user/11.png");

  return (
    <>
      <Row>
        <Col sm={12}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Card.Header.Title>
                <h4 className="card-title mb-0">
                  Tableau de bord Infirmier(ère) - Suivi quotidien
                </h4>
              </Card.Header.Title>
              <Badge bg="primary">Connecté</Badge>
            </Card.Header>
            <Card.Body>
              <Card className="border-0 shadow-sm">
                <Card.Body className="d-flex align-items-center">
                  <img
                    src={profileImg}
                    alt="Profil"
                    className="rounded-circle me-3"
                    style={{ width: 80, height: 80, objectFit: "cover" }}
                  />
                  <div>
                    <h5 className="mb-1">
                      {nurseUser ? `${nurseUser.firstName || ""} ${nurseUser.lastName || ""}`.trim() || nurseUser.email : "Infirmier(ère)"}
                    </h5>
                    <p className="text-muted mb-0">
                      {nurseUser?.specialty || "Infirmier(ère)"} • {nurseUser?.department || "—"}
                    </p>
                    <small className="text-muted">{nurseUser?.email}</small>
                  </div>
                </Card.Body>
              </Card>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col sm={12}>
          <SecureMessagingHubCard variant="nurse" />
        </Col>
      </Row>

      <Row className="mt-4">
        <Col sm={12}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <Card.Header.Title>
                <h5 className="card-title mb-0">
                  <i className="ri-heart-pulse-fill me-2 text-danger" />
                  Alertes constantes vitales (à traiter)
                </h5>
              </Card.Header.Title>
              <Button variant="outline-secondary" size="sm" onClick={loadPendingAlerts} disabled={pendingLoading}>
                {pendingLoading ? <Spinner size="sm" animation="border" className="me-1" /> : <i className="ri-refresh-line me-1" />}
                Actualiser
              </Button>
            </Card.Header>
            <Card.Body>
              {!localStorage.getItem("nurseToken") && (
                <p className="text-muted small mb-0">Connectez-vous pour voir les alertes urgentes de vos patients.</p>
              )}
              {localStorage.getItem("nurseToken") && pendingLoading && pendingAlerts.length === 0 && (
                <div className="text-muted small">
                  <Spinner size="sm" animation="border" className="me-2" />
                  Chargement…
                </div>
              )}
              {localStorage.getItem("nurseToken") && !pendingLoading && pendingAlerts.length === 0 && (
                <p className="text-muted small mb-0">
                  <i className="ri-checkbox-circle-line me-1 text-success" />
                  Aucune alerte constantes ouverte pour vos patients assignés.
                </p>
              )}
              {pendingAlerts.length > 0 && (
                <ListGroup variant="flush" className="border rounded-3">
                  {pendingAlerts.map((a) => (
                    <ListGroup.Item
                      key={a.id}
                      className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-3"
                    >
                      <div>
                        <div className="fw-semibold">{a.patientName || "Patient"}</div>
                        <div className="small text-muted">
                          Score {a.riskScore ?? "—"}/100
                          {a.escalationStatus === "escalated_to_doctor" ? (
                            <Badge bg="warning" text="dark" className="ms-2">
                              Escalade médecin
                            </Badge>
                          ) : (
                            <Badge bg="danger" className="ms-2">
                              Action infirmier
                            </Badge>
                          )}
                        </div>
                        {a.recordedAt && (
                          <div className="small text-muted mt-1">
                            Relevé : {new Date(a.recordedAt).toLocaleString("fr-FR")}
                          </div>
                        )}
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {a.escalationStatus !== "escalated_to_doctor" && (
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => {
                              setEscNote("");
                              setEscModal({ open: true, logId: a.id, patientName: a.patientName || "Patient" });
                            }}
                          >
                            <i className="ri-arrow-up-circle-line me-1" />
                            Escalader au médecin
                          </Button>
                        )}
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
              <Alert variant="light" className="border mt-3 mb-0 small">
                <strong>Rappel :</strong> répondez au patient dans la messagerie sécurisée ; en cas de doute clinique, escaladez au médecin
                référent — il recevra une notification et un message sur le fil patient–médecin.
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={escModal.open} onHide={() => !escBusy && setEscModal({ open: false, logId: null, patientName: "" })} centered>
        <Modal.Header closeButton>
          <Modal.Title>Escalade au médecin — {escModal.patientName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Contexte / demande (optionnel)</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={escNote}
              onChange={(e) => setEscNote(e.target.value)}
              placeholder="Ex. : patient dyspnéique malgré conseils, TA élevée persistante…"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEscModal({ open: false, logId: null, patientName: "" })} disabled={escBusy}>
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!escModal.logId) return;
              setEscBusy(true);
              try {
                await healthLogApi.escalateToDoctor(escModal.logId, escNote);
                setEscModal({ open: false, logId: null, patientName: "" });
                setEscNote("");
                loadPendingAlerts();
              } catch (e) {
                window.alert(e.message || "Escalade impossible");
              } finally {
                setEscBusy(false);
              }
            }}
            disabled={escBusy}
          >
            {escBusy ? <Spinner size="sm" animation="border" className="me-1" /> : null}
            Confirmer l’escalade
          </Button>
        </Modal.Footer>
      </Modal>

      <Row className="mt-4">
        <Col md={4}>
          <Card>
            <Card.Header>
              <Card.Header.Title>
                <h5 className="card-title mb-0">
                  <i className="ri-calendar-check-line me-2"></i>
                  Suivi quotidien
                </h5>
              </Card.Header.Title>
            </Card.Header>
            <Card.Body>
              <Card className="border-0 bg-primary-subtle">
                <Card.Body>
                  <h6 className="text-primary">Patients à surveiller aujourd'hui</h6>
                  <p className="mb-0 fs-4">—</p>
                  <small className="text-muted">Mise à jour en cours</small>
                </Card.Body>
              </Card>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>
              <Card.Header.Title>
                <h5 className="card-title mb-0">
                  <i className="ri-file-edit-line me-2"></i>
                  Saisie des données
                </h5>
              </Card.Header.Title>
            </Card.Header>
            <Card.Body>
              <Card className="border-0 bg-success-subtle">
                <Card.Body>
                  <h6 className="text-success">Fiches à compléter</h6>
                  <p className="mb-0 fs-4">—</p>
                  <small className="text-muted">Mise à jour en cours</small>
                </Card.Body>
              </Card>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>
              <Card.Header.Title>
                <h5 className="card-title mb-0">
                  <i className="ri-alarm-warning-line me-2"></i>
                  Alertes suivies
                </h5>
              </Card.Header.Title>
            </Card.Header>
            <Card.Body>
              <Card className="border-0 bg-warning-subtle">
                <Card.Body>
                  <h6 className="text-warning">Alertes constantes ouvertes</h6>
                  <p className="mb-0 fs-4">{pendingLoading ? "…" : pendingAlerts.length}</p>
                  <small className="text-muted">Relevés urgents non clôturés par le médecin</small>
                </Card.Body>
              </Card>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <Card.Header.Title>
                <h5 className="card-title mb-0">
                  <i className="ri-information-line me-2"></i>
                  Rôle Infirmier(ère) - General Practitioners/Nurses
                </h5>
              </Card.Header.Title>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Suivi quotidien</strong> : Surveillance des patients en post-hospitalisation
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Saisie des données</strong> : Enregistrement des données de santé et des observations
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Suivi des alertes</strong> : Gestion et suivi des notifications et alertes patients
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default NurseDashboard;
