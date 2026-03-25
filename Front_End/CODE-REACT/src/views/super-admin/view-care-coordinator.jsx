import React, { useState, useEffect } from "react";
import { Row, Col, Card, Button, Badge, Spinner, Alert } from "react-bootstrap";
import { useParams, useNavigate, Link } from "react-router-dom";
import { superAdminApi } from "../../services/api";

const ViewCareCoordinator = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coordinator, setCoordinator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await superAdminApi.getCareCoordinatorById(id);
        setCoordinator(res?.data || res);
      } catch {
        setError("Failed to load care coordinator profile.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" style={{ color: "#009688" }} />
      </div>
    );
  }

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!coordinator) return null;

  const displayName =
    coordinator.name ||
    `${coordinator.firstName || ""} ${coordinator.lastName || ""}`.trim() ||
    coordinator.email;

  const fields = [
    { label: "Email", value: coordinator.email, icon: "ri-mail-line" },
    { label: "Phone", value: coordinator.phone, icon: "ri-phone-line" },
    { label: "Department", value: coordinator.department, icon: "ri-building-2-line" },
    { label: "Specialty", value: coordinator.specialty, icon: "ri-stethoscope-line" },
    { label: "Address", value: coordinator.address, icon: "ri-map-pin-line" },
    { label: "City", value: coordinator.city, icon: "ri-building-line" },
    { label: "Country", value: coordinator.country, icon: "ri-global-line" },
  ];

  return (
    <Row className="justify-content-center">
      <Col md={8}>
        <Card className="shadow-sm border-0">
          <Card.Header
            className="d-flex align-items-center justify-content-between"
            style={{ background: "#009688", color: "#fff" }}
          >
            <h5 className="mb-0">
              <i className="ri-heart-pulse-fill me-2"></i>Care Coordinator Profile
            </h5>
            <div className="d-flex gap-2">
              <Link to={`/super-admin/care-coordinators/edit/${id}`} className="btn btn-sm btn-light">
                <i className="ri-edit-line me-1"></i>Edit
              </Link>
              <Button variant="outline-light" size="sm" onClick={() => navigate("/super-admin/care-coordinators")}>
                <i className="ri-arrow-left-line me-1"></i>Back
              </Button>
            </div>
          </Card.Header>
          <Card.Body className="p-4">
            <div className="d-flex align-items-center gap-4 mb-4 pb-4 border-bottom">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                style={{ width: 80, height: 80, background: "#009688", fontSize: 28, flexShrink: 0 }}
              >
                {displayName[0]?.toUpperCase() || "C"}
              </div>
              <div>
                <h4 className="mb-1">{displayName}</h4>
                <Badge bg="success" className="me-2">Care Coordinator</Badge>
                <Badge bg={coordinator.isActive !== false ? "success" : "danger"}>
                  {coordinator.isActive !== false ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            <Row className="g-3">
              {fields.map(({ label, value, icon }) =>
                value ? (
                  <Col md={6} key={label}>
                    <div className="d-flex align-items-start gap-2">
                      <i className={`${icon} mt-1`} style={{ color: "#009688", fontSize: 16 }}></i>
                      <div>
                        <div className="text-muted small">{label}</div>
                        <div className="fw-medium">{value}</div>
                      </div>
                    </div>
                  </Col>
                ) : null
              )}
            </Row>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default ViewCareCoordinator;
