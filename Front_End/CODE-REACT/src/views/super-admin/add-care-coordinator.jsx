import React, { useState } from "react";
import Card from "../../components/Card";
import { Button, Col, Container, Form, Row } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { superAdminApi } from "../../services/api";

const generatePath = (path) => window.origin + import.meta.env.BASE_URL + path;

const SPECIALTIES = ["Coordination des soins", "Suivi post-opératoire", "Maladies chroniques", "Pédiatrie", "Gériatrie", "Oncologie", "Autre"];

const AddCareCoordinator = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profilePreview, setProfilePreview] = useState(generatePath("/assets/images/user/11.png"));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setProfilePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.target;
    const password = form.pass?.value;
    const rpass = form.rpass?.value;
    if (password !== rpass) { setError("Les mots de passe ne correspondent pas"); setLoading(false); return; }
    if (password?.length < 6) { setError("Le mot de passe doit contenir au moins 6 caractères"); setLoading(false); return; }
    const profileImage = profilePreview.startsWith("data:") ? profilePreview : null;
    try {
      await superAdminApi.createCareCoordinator({
        firstName: form.fname?.value, lastName: form.lname?.value,
        email: form.email?.value, password,
        specialty: form.specialty?.value, department: form.department?.value,
        phone: form.phone?.value, address: form.address?.value,
        city: form.city?.value, country: form.country?.value,
        profileImage,
      });
      navigate("/super-admin/care-coordinators");
    } catch (err) {
      setError(err.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid>
      <Row>
        <Col sm={12}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div className="header-title">
                <h4 className="card-title">Ajouter un Care Coordinator</h4>
              </div>
            </Card.Header>
            <Card.Body>
              {error && <div className="alert alert-danger">{error}</div>}
              <Form onSubmit={handleSubmit}>
                <Row className="mb-4">
                  <Col lg={12}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="position-relative">
                        <img src={profilePreview} alt="Profile" className="rounded-circle border"
                          style={{ width: 100, height: 100, objectFit: "cover" }} />
                        <label htmlFor="profilePic" className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                          style={{ width: 28, height: 28, cursor: "pointer" }}>
                          <i className="ri-camera-line" style={{ fontSize: 14 }}></i>
                          <input type="file" id="profilePic" accept="image/*" className="d-none" onChange={handleFileChange} />
                        </label>
                      </div>
                      <div>
                        <h6 className="mb-1">Photo de profil</h6>
                        <small className="text-muted">JPG, PNG — max 2MB</small>
                      </div>
                    </div>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Prénom <span className="text-danger">*</span></Form.Label>
                      <Form.Control type="text" name="fname" placeholder="Prénom" required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Nom <span className="text-danger">*</span></Form.Label>
                      <Form.Control type="text" name="lname" placeholder="Nom de famille" required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                      <Form.Control type="email" name="email" placeholder="email@medifollow.com" required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Téléphone</Form.Label>
                      <Form.Control type="text" name="phone" placeholder="+216 XX XXX XXX" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Spécialité</Form.Label>
                      <Form.Select name="specialty">
                        <option value="">-- Sélectionner --</option>
                        {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Département</Form.Label>
                      <Form.Control type="text" name="department" placeholder="Ex: Coordination" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Ville</Form.Label>
                      <Form.Control type="text" name="city" placeholder="Tunis" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Pays</Form.Label>
                      <Form.Control type="text" name="country" placeholder="Tunisie" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Mot de passe <span className="text-danger">*</span></Form.Label>
                      <Form.Control type="password" name="pass" placeholder="Mot de passe" required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Confirmer le mot de passe <span className="text-danger">*</span></Form.Label>
                      <Form.Control type="password" name="rpass" placeholder="Confirmer" required />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex gap-2 mt-4">
                  <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? <><span className="spinner-border spinner-border-sm me-2" />Enregistrement...</> : "Ajouter le Care Coordinator"}
                  </Button>
                  <Button variant="outline-secondary" onClick={() => navigate("/super-admin/care-coordinators")}>Annuler</Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AddCareCoordinator;
