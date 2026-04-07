import React, { useState } from "react";
import { Form, Container, Row, Col } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { generatePath } from "../landing/landingPaths";
import AuthCarouselMedifollow from "../../components/auth/AuthCarouselMedifollow";
import { api } from "../../services/api";

const SignUp = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setError(t("signUp.mustAgreeTerms", "Vous devez accepter les conditions d'utilisation"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Direct API call to the new public endpoint
      await api.postNoAuth("/patients/register", { fullName, email, password });
      
      // Auto login immediately (assuming it works)
      const data = await api.postNoAuth("/auth/patient-login", { email, password });
      
      // Cleanup previous sessions
      localStorage.removeItem("doctorToken");
      localStorage.removeItem("doctorUser");
      localStorage.removeItem("nurseToken");
      localStorage.removeItem("nurseUser");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      
      localStorage.setItem("patientToken", data.access_token);
      localStorage.setItem("patientUser", JSON.stringify(data.user));
      navigate("/dashboard-pages/patient-dashboard");
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="sign-in-page d-md-flex align-items-center custom-auth-height">
        <Container className="sign-in-page-bg mt-5 mb-md-5 mb-0 p-0">
          <Row>
            <Col md={6} className="text-center z-2">
              <div className="sign-in-detail text-white">
                <Link to="/" className="sign-in-logo mb-2">
                  <img src={generatePath("assets/images/logosite.png")} className="img-fluid" alt={t("signUp.logoAlt")} style={{ maxWidth: "320px", maxHeight: "100px", objectFit: "contain" }} />
                </Link>
                <AuthCarouselMedifollow
                  interval={4000}
                  captionKeys={{ titleKey: "signUp.carouselTitle", descKey: "signUp.carouselDesc" }}
                />
              </div>
            </Col>
            <Col md={6} className="position-relative z-2">
              <div className="sign-in-from d-flex flex-column justify-content-center">
                <h1 className="mb-0">{t("signUp.pageTitle")}</h1>
                <Form className="mt-4" onSubmit={handleSubmit}>
                  {error && (
                    <div className="alert alert-danger py-2" role="alert">
                      {error}
                    </div>
                  )}
                  <Form.Group className="form-group" controlId="formFullName">
                    <label>{t("signUp.fullName")}</label>
                    <Form.Control type="text" placeholder={t("signUp.fullNamePlaceholder")} required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </Form.Group>
                  <Form.Group className="form-group" controlId="formEmail">
                    <label>{t("signUp.email")}</label>
                    <Form.Control type="email" placeholder={t("signUp.emailPlaceholder")} required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Form.Group>
                  <Form.Group className="form-group" controlId="formPassword">
                    <label>{t("signUp.password")}</label>
                    <div className="position-relative">
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        placeholder={t("signUp.passwordPlaceholder")}
                        style={{ paddingRight: "40px" }}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? t("signUp.hidePasswordAria") : t("signUp.showPasswordAria")}
                        title={showPassword ? t("signUp.hidePassword") : t("signUp.showPassword")}
                        style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", zIndex: 2 }}
                      >
                        <i className={showPassword ? "ri-eye-off-line" : "ri-eye-line"}></i>
                      </button>
                    </div>
                  </Form.Group>
                  <div className="d-flex justify-content-between w-100 align-items-center">
                    <label className="d-inline-block form-group mb-0 d-flex">
                      <input
                        type="checkbox"
                        id="customCheck1"
                        className="custom-control-input"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                      />{" "}
                      <label className="custom-control-label me-1" htmlFor="customCheck1"></label> {t("signUp.acceptTerms")}
                      <Link className="ms-1" to="/extra-pages/terms-of-use">{t("signUp.termsLink")}</Link>
                    </label>
                    <button type="submit" className="btn btn-primary-subtle float-end" disabled={loading}>
                      {loading ? '...' : t("signUp.signUpButton")}
                    </button>
                  </div>
                  <div className="sign-info d-flex justify-content-between flex-column flex-lg-row align-items-center">
                    <span className="dark-color d-inline-block line-height-2">
                      {t("signUp.alreadyHaveAccount")}{" "}
                      <Link to="/auth/sign-in">{t("signUp.signInLink")}</Link>
                    </span>
                    <ul className="auth-social-media d-flex list-unstyled">
                      <li><a href="#facebook" aria-label={t("signUp.socialFacebook")}><i className="ri-facebook-box-line"></i></a></li>
                      <li><a href="#twitter" aria-label={t("signUp.socialTwitter")}><i className="ri-twitter-line"></i></a></li>
                      <li><a href="#instagram" aria-label={t("signUp.socialInstagram")}><i className="ri-instagram-line"></i></a></li>
                    </ul>
                  </div>
                </Form>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </>
  )
}

export default SignUp
