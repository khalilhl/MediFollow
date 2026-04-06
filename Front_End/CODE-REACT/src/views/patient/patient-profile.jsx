import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Col, Row } from "react-bootstrap";
import { useParams, Link } from "react-router-dom";
import Card from "../../components/Card";
import FaceEnrollmentCard from "../../components/FaceEnrollmentCard";
import { patientApi, doctorApi, nurseApi } from "../../services/api";

import img11 from "/assets/images/user/11.png";

const generatePath = (path) => window.origin + import.meta.env.BASE_URL + path;

/** Title-case words for readable names (display only). */
function titleCaseWords(value) {
  if (value == null || String(value).trim() === "") return "";
  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const PatientProfile = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);

  useEffect(() => {
    if (!id) return;
    const fetchPatient = async () => {
      try {
        const [data, dList, nList] = await Promise.all([
          patientApi.getById(id),
          doctorApi.getAll().catch(() => []),
          nurseApi.getAll().catch(() => []),
        ]);
        setPatient(data);
        setDoctors(Array.isArray(dList) ? dList : []);
        setNurses(Array.isArray(nList) ? nList : []);
      } catch (err) {
        setError(err.message || t("patientProfile.notFound"));
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t stable; refetch only when id changes
  }, [id]);

  const displayGender = useCallback(
    (g) => {
      if (g == null || String(g).trim() === "") return null;
      const s = String(g).trim().toLowerCase();
      if (["homme", "male", "m", "man"].includes(s)) return t("patientDashboard.genderMale");
      if (["femme", "female", "f", "woman"].includes(s)) return t("patientDashboard.genderFemale");
      if (["other", "autre", "o"].includes(s)) return t("patientDashboard.genderOther");
      return String(g).trim();
    },
    [t],
  );

  const assignedDoctor = patient?.doctorId
    ? doctors.find((d) => (d._id || d.id)?.toString() === patient.doctorId?.toString())
    : null;
  const assignedNurse = patient?.nurseId
    ? nurses.find((n) => (n._id || n.id)?.toString() === patient.nurseId?.toString())
    : null;

  const displayPatient = patient || {};
  const profileImg = patient?.profileImage
    ? (patient.profileImage.startsWith("data:") ? patient.profileImage
      : (patient.profileImage.startsWith("http") ? patient.profileImage : generatePath(patient.profileImage)))
    : img11;

  if (loading) {
    return (
      <Row>
        <Col sm={12}>
          <Card>
            <Card.Body className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">{t("patientProfile.loadingHidden")}</span>
              </div>
              <p className="mt-3 mb-0">{t("patientProfile.loading")}</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  }

  if (id && error) {
    return (
      <Row>
        <Col sm={12}>
          <Card>
            <Card.Body className="text-center py-5">
              <p className="text-danger mb-3">{error}</p>
              <Link to="/patient/patient-list" className="btn btn-primary-subtle">{t("patientProfile.backToList")}</Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  }

  return (
    <>
      <Row>
        <Col sm={12}>
          <FaceEnrollmentCard />
        </Col>
      </Row>
      <Row className="g-3 g-lg-4">
        <Col xs={12} lg={4} className="order-1 order-lg-0">
          <Card>
            <Card.Body className="ps-0 pe-0 pt-0">
              <div className="docter-details-block">
                <div className="doc-profile-bg bg-primary rounded-top-2" style={{ height: "150px" }}>
                </div>
                <div className="docter-profile text-center">
                  <img src={profileImg} alt={t("patientProfile.profileAlt")} className="avatar-130 img-fluid" style={{ objectFit: "cover" }} />
                </div>
                <div className="text-center mt-3 ps-3 pe-3">
                  <h4><b>{displayPatient.firstName} {displayPatient.lastName}</b></h4>
                  <p className="mb-0">{displayPatient.email || "—"}</p>
                </div>
                <hr />
                <ul className="doctoe-sedual d-flex align-items-center justify-content-between p-0 m-0">
                  <li className="text-center">
                    <h6 className="mb-0">{t("patientProfile.bloodType")}</h6>
                    <span>{displayPatient.bloodType || "—"}</span>
                  </li>
                  <li className="text-center">
                    <h6 className="mb-0">{t("patientProfile.gender")}</h6>
                    <span>{displayGender(displayPatient.gender) ?? "—"}</span>
                  </li>
                  <li className="text-center">
                    <h6 className="mb-0">{t("patientProfile.dateOfBirth")}</h6>
                    <span>{displayPatient.dateOfBirth || "—"}</span>
                  </li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} lg={8} className="order-2 order-lg-1 min-w-0">
          <Card>
            <Card.Header className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <Card.Header.Title className="mb-0">
                <h4 className="card-title mb-0">{t("patientProfile.personalInfo")}</h4>
              </Card.Header.Title>
              <Link to={`/patient/edit-patient/${id}`} className="btn btn-primary-subtle btn-sm flex-shrink-0">{t("patientProfile.edit")}</Link>
            </Card.Header>
            <Card.Body className="px-3 px-sm-4">
              <div className="about-info m-0 p-0">
                <Row className="gy-2 gx-0">
                  <Col xs={12} sm={4} className="fw-medium text-secondary pt-1">{t("patientProfile.fieldFirstName")}</Col>
                  <Col xs={12} sm={8} className="text-dark text-break pb-1 pb-sm-0">{displayPatient.firstName || "—"}</Col>
                  <Col xs={12} sm={4} className="fw-medium text-secondary pt-1">{t("patientProfile.fieldLastName")}</Col>
                  <Col xs={12} sm={8} className="text-dark text-break pb-1 pb-sm-0">{displayPatient.lastName || "—"}</Col>
                  <Col xs={12} sm={4} className="fw-medium text-secondary pt-1">{t("patientProfile.fieldEmail")}</Col>
                  <Col xs={12} sm={8} className="text-dark text-break pb-1 pb-sm-0">
                    <a href={`mailto:${displayPatient.email || ""}`} className="text-primary text-decoration-underline">{displayPatient.email || "—"}</a>
                  </Col>
                  <Col xs={12} sm={4} className="fw-medium text-secondary pt-1">{t("patientProfile.fieldPhone")}</Col>
                  <Col xs={12} sm={8} className="text-dark pb-1 pb-sm-0">
                    <a href={`tel:${displayPatient.phone || ""}`} className="text-primary text-decoration-underline">{displayPatient.phone || "—"}</a>
                  </Col>
                  <Col xs={12} sm={4} className="fw-medium text-secondary pt-1">{t("patientProfile.fieldAlternate")}</Col>
                  <Col xs={12} sm={8} className="text-dark text-break pb-1 pb-sm-0">{displayPatient.alternateContact || "—"}</Col>
                  <Col xs={12} sm={4} className="fw-medium text-secondary pt-1">{t("patientProfile.fieldDepartment")}</Col>
                  <Col xs={12} sm={8} className="text-dark text-break pb-1 pb-sm-0">{displayPatient.department || displayPatient.service || "—"}</Col>
                  <Col xs={12} sm={4} className="fw-medium text-secondary pt-1">{t("patientProfile.fieldAddress")}</Col>
                  <Col xs={12} sm={8} className="text-dark text-break pb-1 pb-sm-0">{displayPatient.address || "—"}</Col>
                  <Col xs={12} sm={4} className="fw-medium text-secondary pt-1">{t("patientProfile.fieldCity")}</Col>
                  <Col xs={12} sm={8} className="text-dark text-break pb-1 pb-sm-0">{displayPatient.city || "—"}</Col>
                  <Col xs={12} sm={4} className="fw-medium text-secondary pt-1">{t("patientProfile.fieldCountry")}</Col>
                  <Col xs={12} sm={8} className="text-dark text-break pb-1 pb-sm-0">{displayPatient.country || "—"}</Col>
                  <Col xs={12} sm={4} className="fw-medium text-secondary pt-1">{t("patientProfile.fieldPostal")}</Col>
                  <Col xs={12} sm={8} className="text-dark text-break pb-1 pb-sm-0">{displayPatient.pinCode || "—"}</Col>
                </Row>
              </div>
            </Card.Body>
          </Card>
          <Card className="mt-4">
            <Card.Header>
              <Card.Header.Title>
                <h4 className="card-title mb-0" id="patient-profile-care-team-heading">{t("patientProfile.careTeam")}</h4>
              </Card.Header.Title>
            </Card.Header>
            <Card.Body className="pt-3 px-3 px-sm-4">
              <div className="row g-3 g-md-4" role="list" aria-labelledby="patient-profile-care-team-heading">
                <Col xs={12} md={6} role="listitem" className="min-w-0">
                  <article
                    className="h-100 rounded-3 border bg-white overflow-hidden d-flex flex-column"
                    style={{
                      borderColor: "rgba(8, 155, 171, 0.35)",
                      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.06)",
                    }}
                    aria-labelledby="care-team-physician-title"
                  >
                    <div
                      className="px-3 py-2 border-bottom d-flex align-items-center gap-2"
                      style={{
                        background: "linear-gradient(105deg, rgba(8, 155, 171, 0.14) 0%, rgba(8, 155, 171, 0.06) 100%)",
                        borderColor: "rgba(8, 155, 171, 0.2)",
                      }}
                    >
                      <span className="text-primary fs-5 lh-1" aria-hidden="true">
                        <i className="ri-stethoscope-line" />
                      </span>
                      <h5 className="mb-0 fs-6 fw-bold text-dark text-uppercase" style={{ letterSpacing: "0.04em" }} id="care-team-physician-title">
                        {t("patientProfile.physician")}
                      </h5>
                    </div>
                    <div className="p-3 p-md-4 flex-grow-1 min-w-0">
                      {assignedDoctor ? (
                        <>
                          <p className="mb-2 fs-5 fw-bold text-dark lh-sm text-break">
                            Dr. {titleCaseWords(assignedDoctor.firstName)} {titleCaseWords(assignedDoctor.lastName)}
                          </p>
                          {assignedDoctor.specialty ? (
                            <p className="mb-3 fw-medium text-dark" style={{ fontSize: "0.9375rem", lineHeight: 1.5 }}>
                              {titleCaseWords(assignedDoctor.specialty)}
                            </p>
                          ) : null}
                          {assignedDoctor.email ? (
                            <a
                              href={`mailto:${assignedDoctor.email}`}
                              className="d-inline-flex align-items-start gap-2 text-primary fw-medium text-break rounded-1"
                              style={{ textDecoration: "underline", textUnderlineOffset: "0.2em" }}
                            >
                              <i className="ri-mail-line flex-shrink-0 mt-1" aria-hidden="true" />
                              <span>{assignedDoctor.email}</span>
                            </a>
                          ) : null}
                        </>
                      ) : (
                        <p className="mb-0 text-dark" style={{ fontSize: "0.9375rem" }}>{t("patientProfile.notAssignedPhysician")}</p>
                      )}
                    </div>
                  </article>
                </Col>
                <Col xs={12} md={6} role="listitem" className="min-w-0">
                  <article
                    className="h-100 rounded-3 border bg-white overflow-hidden d-flex flex-column"
                    style={{
                      borderColor: "rgba(8, 155, 171, 0.35)",
                      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.06)",
                    }}
                    aria-labelledby="care-team-nurse-title"
                  >
                    <div
                      className="px-3 py-2 border-bottom d-flex align-items-center gap-2"
                      style={{
                        background: "linear-gradient(105deg, rgba(8, 155, 171, 0.14) 0%, rgba(8, 155, 171, 0.06) 100%)",
                        borderColor: "rgba(8, 155, 171, 0.2)",
                      }}
                    >
                      <span className="text-primary fs-5 lh-1" aria-hidden="true">
                        <i className="ri-nurse-line" />
                      </span>
                      <h5 className="mb-0 fs-6 fw-bold text-dark text-uppercase" style={{ letterSpacing: "0.04em" }} id="care-team-nurse-title">
                        {t("patientProfile.nurse")}
                      </h5>
                    </div>
                    <div className="p-3 p-md-4 flex-grow-1 min-w-0">
                      {assignedNurse ? (
                        <>
                          <p className="mb-2 fs-5 fw-bold text-dark lh-sm text-break">
                            {titleCaseWords(assignedNurse.firstName)} {titleCaseWords(assignedNurse.lastName)}
                          </p>
                          {assignedNurse.department ? (
                            <p className="mb-3 fw-medium text-dark" style={{ fontSize: "0.9375rem", lineHeight: 1.5 }}>
                              {titleCaseWords(assignedNurse.department)}
                            </p>
                          ) : null}
                          {assignedNurse.email ? (
                            <a
                              href={`mailto:${assignedNurse.email}`}
                              className="d-inline-flex align-items-start gap-2 text-primary fw-medium text-break rounded-1"
                              style={{ textDecoration: "underline", textUnderlineOffset: "0.2em" }}
                            >
                              <i className="ri-mail-line flex-shrink-0 mt-1" aria-hidden="true" />
                              <span>{assignedNurse.email}</span>
                            </a>
                          ) : null}
                        </>
                      ) : (
                        <p className="mb-0 text-dark" style={{ fontSize: "0.9375rem" }}>{t("patientProfile.notAssignedNurse")}</p>
                      )}
                    </div>
                  </article>
                </Col>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default PatientProfile;
