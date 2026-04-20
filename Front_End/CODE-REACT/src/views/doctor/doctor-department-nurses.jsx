import React, { useEffect, useState } from "react";
import { Card, Col, Container, Row, Spinner, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { departmentApi } from "../../services/api";

const DoctorDepartmentNurses = () => {
  const { t } = useTranslation();
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
        if (!cancelled) setError(e.message || t("doctorDepartmentNurses.loadError"));
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
        <p className="text-muted text-center">{t("doctorMyPatients.loginDoctor")}</p>
        <div className="text-center">
          <Link to="/auth/sign-in" className="btn btn-primary">
            {t("doctorMyPatients.signIn")}
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="pb-5">
      <Row className="mb-4">
        <Col>
          <h4 className="fw-bold mb-1">{t("doctorDepartmentNurses.pageTitle")}</h4>
          <p className="text-muted mb-0">
            {department ? t("doctorDepartmentNurses.subtitleWithDept", { department }) : t("doctorDepartmentNurses.subtitleNoDept")}
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
            <p className="text-muted text-center py-5 mb-0">{t("doctorDepartmentNurses.emptyNoDept")}</p>
          ) : nurses.length === 0 ? (
            <p className="text-muted text-center py-5 mb-0">{t("doctorDepartmentNurses.emptyNoNurses")}</p>
          ) : (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>{t("doctorDepartmentNurses.colName")}</th>
                  <th>{t("doctorDepartmentNurses.colEmail")}</th>
                  <th>{t("doctorDepartmentNurses.colSpecialty")}</th>
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
                          {t("doctorDepartmentNurses.profile")}
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
