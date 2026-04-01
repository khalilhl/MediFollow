import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Row, Col, Spinner, Alert } from "react-bootstrap";
import Card from "../../components/Card";
import { medicationApi } from "../../services/api";
import {
  localDateStringYMD,
  isMedicationPastEndDate,
  getIntakeHistoryByDate,
} from "../../utils/medicationReminders";

function formatDisplayDate(ymd) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return ymd;
  }
}

const PatientMedicationHistory = () => {
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

  const [medications, setMedications] = useState([]);
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
        const meds = await medicationApi.getByPatient(pid);
        setMedications(Array.isArray(meds) ? meds : []);
      } catch (e) {
        console.error(e);
        setError("Impossible de charger l'historique des médicaments.");
        setMedications([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pid]);

  const todayYmd = localDateStringYMD();

  const endedMedications = useMemo(() => {
    const list = medications.filter((m) => isMedicationPastEndDate(m, todayYmd));
    return list.sort((a, b) => {
      const endA = String(a.endDate || "").slice(0, 10);
      const endB = String(b.endDate || "").slice(0, 10);
      return endB.localeCompare(endA);
    });
  }, [medications, todayYmd]);

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
            <i className="ri-history-line me-2"></i>
            Historique des médicaments
          </h4>
          <p className="text-muted small mb-0 mt-1">
            Traitements dont la date de fin est dépassée. Le détail des prises enregistrées est conservé ci‑dessous.
          </p>
        </Col>
      </Row>

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      )}

      {!loading && error && <Alert variant="danger">{error}</Alert>}

      {!loading && !error && endedMedications.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">
            Aucun médicament terminé pour le moment. Les traitements dont la date de fin est passée apparaîtront ici.
          </Card.Body>
        </Card>
      )}

      {!loading &&
        endedMedications.map((m) => {
          const intakeByDay = getIntakeHistoryByDate(m);
          const endStr = m.endDate ? String(m.endDate).slice(0, 10) : "";
          const startStr = m.startDate ? String(m.startDate).slice(0, 10) : "";
          return (
            <Card key={m._id} className="border-0 shadow-sm mb-3">
              <Card.Body>
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                  <div>
                    <h6 className="fw-bold text-primary mb-1">{m.name}</h6>
                    <div className="small text-muted">
                      {m.dosage && <span className="me-2">{m.dosage}</span>}
                      <span>{m.frequency}</span>
                      {m.prescribedBy && <span className="ms-2">Dr. {m.prescribedBy}</span>}
                    </div>
                  </div>
                  <span className="badge bg-secondary align-self-start">
                    Fin : {endStr ? formatDisplayDate(endStr) : "—"}
                  </span>
                </div>
                {(startStr || endStr) && (
                  <p className="small text-muted mb-2 mb-md-3">
                    Période : {startStr ? formatDisplayDate(startStr) : "—"}
                    {endStr ? ` → ${formatDisplayDate(endStr)}` : ""}
                  </p>
                )}
                {m.notes && <p className="small text-muted fst-italic mb-0">Note : {m.notes}</p>}

                <div className="mt-3 pt-3 border-top">
                  <h6 className="small fw-bold text-uppercase text-muted mb-2">Suivi des prises</h6>
                  {intakeByDay.length === 0 ? (
                    <p className="small text-muted mb-0">Aucune prise enregistrée pendant cette période.</p>
                  ) : (
                    <ul className="list-unstyled small mb-0">
                      {intakeByDay.map(({ date, slots }) => (
                        <li key={date} className="mb-2">
                          <span className="fw-semibold">{formatDisplayDate(date)}</span>
                          {" — "}
                          {slots.map((s) => s.label).join(", ")}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card.Body>
            </Card>
          );
        })}
    </Container>
  );
};

export default PatientMedicationHistory;
