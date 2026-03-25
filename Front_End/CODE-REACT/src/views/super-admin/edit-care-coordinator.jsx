import React, { useState, useEffect } from "react";
import { Row, Col, Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { superAdminApi } from "../../services/api";

const EditCareCoordinator = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    department: "", specialty: "", address: "", city: "", country: "",
    password: "", confirmPassword: "",
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await superAdminApi.getCareCoordinatorById(id);
        const u = data?.data || data;
        setForm({
          firstName: u.firstName || u.name?.split(" ")[0] || "",
          lastName: u.lastName || u.name?.split(" ").slice(1).join(" ") || "",
          email: u.email || "",
          phone: u.phone || "",
          department: u.department || "",
          specialty: u.specialty || "",
          address: u.address || "",
          city: u.city || "",
          country: u.country || "",
          password: "",
          confirmPassword: "",
        });
      } catch {
        setError("Failed to load care coordinator data.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password || form.confirmPassword) {
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (form.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.confirmPassword;
      if (!payload.password) delete payload.password;
      await superAdminApi.updateCareCoordinator(id, payload);
      setSuccess("Care Coordinator updated successfully.");
      setTimeout(() => navigate("/super-admin/care-coordinators"), 1500);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to update care coordinator.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" style={{ color: "#009688" }} />
      </div>
    );
  }

  return (
    <Row className="justify-content-center">
      <Col md={8}>
        <Card className="shadow-sm border-0">
          <Card.Header style={{ background: "#009688", color: "#fff" }}>
            <h5 className="mb-0">
              <i className="ri-edit-line me-2"></i>Edit Care Coordinator
            </h5>
          </Card.Header>
          <Card.Body className="p-4">
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>First Name</Form.Label>
                    <Form.Control name="firstName" value={form.firstName} onChange={handleChange} required />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Last Name</Form.Label>
                    <Form.Control name="lastName" value={form.lastName} onChange={handleChange} required />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Email</Form.Label>
                    <Form.Control type="email" name="email" value={form.email} onChange={handleChange} required />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Phone</Form.Label>
                    <Form.Control name="phone" value={form.phone} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Department</Form.Label>
                    <Form.Control name="department" value={form.department} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Specialty</Form.Label>
                    <Form.Control name="specialty" value={form.specialty} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Address</Form.Label>
                    <Form.Control name="address" value={form.address} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>City</Form.Label>
                    <Form.Control name="city" value={form.city} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Country</Form.Label>
                    <Form.Control name="country" value={form.country} onChange={handleChange} />
                  </Form.Group>
                </Col>
              </Row>

              <hr className="my-4" />
              <h6 className="text-muted mb-3">
                <i className="ri-lock-line me-1"></i>Change Password <span className="fw-normal">(leave blank to keep current)</span>
              </h6>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>New Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Min. 6 characters"
                      minLength={6}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Confirm Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm new password"
                      minLength={6}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex gap-2 mt-4">
                <Button type="submit" style={{ background: "#009688", border: "none" }} disabled={saving}>
                  {saving ? <Spinner size="sm" animation="border" /> : <><i className="ri-save-line me-1"></i>Save Changes</>}
                </Button>
                <Button variant="outline-secondary" onClick={() => navigate("/super-admin/care-coordinators")}>
                  Cancel
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default EditCareCoordinator;
