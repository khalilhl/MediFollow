import React, { useEffect, useMemo, useState } from "react";
import { Card, Col, Container, Form, Row, Button, Alert, Spinner, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { doctorAvailabilityApi } from "../../services/api";

function daysInMonth(yearMonth) {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return 31;
  return new Date(y, m, 0).getDate();
}

function monthDates(yearMonth) {
  const n = daysInMonth(yearMonth);
  const out = [];
  for (let d = 1; d <= n; d += 1) {
    const ds = String(d).padStart(2, "0");
    out.push(`${yearMonth}-${ds}`);
  }
  return out;
}

function formatDisplayDate(iso) {
  try {
    const [y, m, day] = iso.split("-");
    return `${day}/${m}/${y}`;
  } catch {
    return iso;
  }
}

/** Aligne les dates renvoyées par l’API (ex. 2026-4-2) sur les clés du tableau (2026-04-02). */
function normalizeDateKey(d) {
  if (!d || typeof d !== "string") return "";
  const part = d.trim().split("T")[0];
  const segs = part.split("-");
  if (segs.length !== 3) return part;
  return `${segs[0]}-${segs[1].padStart(2, "0")}-${segs[2].padStart(2, "0")}`;
}

const DoctorAvailabilityCalendar = () => {
  const [doctorUser] = useState(() => {
    try {
      const s = localStorage.getItem("doctorUser");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const now = new Date();
  const defaultYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearMonth, setYearMonth] = useState(defaultYm);
  const [dayText, setDayText] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [savedSummary, setSavedSummary] = useState("");

  const dates = useMemo(() => monthDates(yearMonth), [yearMonth]);

  useEffect(() => {
    if (!doctorUser) return;
    let cancelled = false;
    const ds = monthDates(yearMonth);
    (async () => {
      setLoading(true);
      setError("");
      setSuccess(false);
      try {
        const raw = await doctorAvailabilityApi.getMyMonth(yearMonth);
        const slots = Array.isArray(raw?.slots) ? raw.slots : [];
        const map = {};
        ds.forEach((d) => {
          map[d] = "";
        });
        slots.forEach((s) => {
          const key = normalizeDateKey(s?.date);
          if (key && ds.includes(key)) {
            const times = (s.times || []).join(", ");
            map[key] = times;
          }
        });
        if (!cancelled) setDayText(map);
      } catch (e) {
        if (!cancelled) setError(e.message || "Chargement impossible.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doctorUser, yearMonth]);

  const handleMonthChange = (e) => {
    setYearMonth(e.target.value);
  };

  const handleDayChange = (date, value) => {
    setDayText((prev) => ({ ...prev, [date]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!doctorUser) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    setSavedSummary("");
    try {
      const slots = [];
      dates.forEach((d) => {
        const raw = (dayText[d] || "").trim();
        if (!raw) return;
        const times = raw
          .split(/[,;]+/)
          .map((t) => t.trim())
          .filter(Boolean);
        if (times.length) slots.push({ date: d, times });
      });
      if (slots.length === 0) {
        setError(
          "Ajoutez au moins une heure sur un jour (ex. 14:00 sur la ligne du 02/04) puis enregistrez. Laisser tout vide enregistre un mois fermé."
        );
        setSaving(false);
        return;
      }
      await doctorAvailabilityApi.saveMyMonth(yearMonth, slots);
      setSuccess(true);
      setSavedSummary(`${slots.length} jour(s) avec créneaux enregistré(s).`);
      const raw = await doctorAvailabilityApi.getMyMonth(yearMonth);
      const loaded = Array.isArray(raw?.slots) ? raw.slots : [];
      const ds = monthDates(yearMonth);
      const map = {};
      ds.forEach((d) => {
        map[d] = "";
      });
      loaded.forEach((s) => {
        const key = normalizeDateKey(s?.date);
        if (key && ds.includes(key)) {
          map[key] = (s.times || []).join(", ");
        }
      });
      setDayText(map);
    } catch (err) {
      const msg = err.message || "Enregistrement impossible.";
      if (err.status === 401 || err.status === 403) {
        setError(
          `${msg} Si vous êtes aussi connecté comme patient, déconnectez le patient ou ouvrez le calendrier dans une fenêtre privée pour utiliser uniquement le compte médecin.`
        );
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!doctorUser) {
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
    <Container fluid className="py-4">
      <Row className="mb-3">
        <Col>
          <Link to="/dashboard" className="text-decoration-none small d-inline-flex align-items-center gap-1">
            <i className="ri-arrow-left-line"></i>
            Retour
          </Link>
          <h4 className="text-primary fw-bold mt-2 mb-0">
            <i className="ri-calendar-2-line me-2"></i>
            Calendrier de disponibilités
          </h4>
          <p className="text-muted small mb-0 mt-1">
            Indiquez les créneaux ouverts par jour pour le mois choisi (format d&apos;heure : 09:00, 09:30, séparés par des
            virgules). Les patients ne pourront demander un rendez-vous que sur ces créneaux libres.
          </p>
        </Col>
      </Row>

      <Row>
        <Col lg={10}>
          <Card className="border-0 shadow-sm" style={{ borderRadius: 16 }}>
            <Card.Body className="p-4">
              <Form onSubmit={handleSave}>
                <Row className="g-3 align-items-end mb-3">
                  <Col md={4}>
                    <Form.Label className="small fw-bold">Mois</Form.Label>
                    <Form.Control type="month" value={yearMonth} onChange={handleMonthChange} />
                  </Col>
                  <Col md="auto">
                    <Button type="submit" variant="primary" disabled={saving || loading}>
                      {saving ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Enregistrement…
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line me-2"></i>
                          Enregistrer le mois
                        </>
                      )}
                    </Button>
                  </Col>
                </Row>

                {error && <Alert variant="danger">{error}</Alert>}
                {success && (
                  <Alert variant="success">
                    Disponibilités enregistrées. {savedSummary}
                  </Alert>
                )}

                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                  </div>
                ) : (
                  <div className="table-responsive" style={{ maxHeight: "70vh" }}>
                    <Table size="sm" bordered hover className="align-middle mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ width: "9rem" }}>Jour</th>
                          <th>Heures disponibles (ex. 09:00, 09:30, 14:00)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dates.map((d) => (
                          <tr key={d}>
                            <td className="text-nowrap small fw-semibold">{formatDisplayDate(d)}</td>
                            <td>
                              <Form.Control
                                size="sm"
                                placeholder="Laisser vide = fermé"
                                value={dayText[d] ?? ""}
                                onChange={(e) => handleDayChange(d, e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DoctorAvailabilityCalendar;
