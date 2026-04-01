import React, { useEffect, useState } from "react";
import { Card, Col, Container, Row, Spinner, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { departmentApi } from "../../services/api";

const DoctorDepartmentNurses = () => {
  const [doctorUser] = useState(() => {
    try {
      const s = localStorage.getItem("doctorUser");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const doctorId = doctorUser?.id || doctorUser?._id;
  const [department, setDepartment] = useState("");
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!doctorId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await departmentApi.getMyNursesAsDoctor();
        if (!cancelled) {
          setDepartment(data?.department || "");
          setNurses(Array.isArray(data?.nurses) ? data.nurses : []);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Impossible de charger les infirmiers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

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
          <h4 className="fw-bold mb-1">Infirmiers du département</h4>
          <p className="text-muted mb-0">
            {department
              ? `Collaborateurs du service : ${department}`
              : "Votre profil ne comporte pas encore de département défini (par un administrateur)."}
          </p>
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
          ) : !department ? (
            <p className="text-muted text-center py-5 mb-0">
              Aucun département renseigné sur votre compte — la liste des infirmiers du même service ne peut pas être
              affichée.
            </p>
          ) : nurses.length === 0 ? (
            <p className="text-muted text-center py-5 mb-0">Aucun infirmier enregistré pour ce département.</p>
          ) : (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Spécialité</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {nurses.map((n) => {
                  const nid = n._id || n.id;
                  return (
                    <tr key={nid}>
                      <td className="fw-semibold">
                        {n.firstName} {n.lastName}
                      </td>
                      <td>{n.email}</td>
                      <td>{n.specialty || "—"}</td>
                      <td className="text-end">
                        <Link to={`/nurse/nurse-profile/${nid}`} className="btn btn-sm btn-outline-primary">
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
    </Container>
  );
};

export default DoctorDepartmentNurses;
