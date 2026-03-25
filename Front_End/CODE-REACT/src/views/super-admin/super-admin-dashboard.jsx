import React, { useState, useEffect } from "react";
import { Row, Col, Card } from "react-bootstrap";
import CountUp from "react-countup";
import { Link } from "react-router-dom";
import { superAdminApi, doctorApi, patientApi, nurseApi } from "../../services/api";

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, doctors: 0, patients: 0, nurses: 0, auditors: 0, careCoordinators: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [users, doctors, patients, nurses, auditors, coordinators] = await Promise.all([
          superAdminApi.getAllUsers(),
          doctorApi.getAll(),
          patientApi.getAll(),
          nurseApi.getAll(),
          superAdminApi.getAuditors(),
          superAdminApi.getCareCoordinators(),
        ]);
        setStats({
          users: users.length,
          doctors: doctors.length,
          patients: patients.length,
          nurses: nurses.length,
          auditors: auditors.length,
          careCoordinators: coordinators.length,
        });
        setRecentUsers(users.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { title: "Total Utilisateurs", value: stats.users, icon: "ri-team-fill", color: "primary", link: "/super-admin/users" },
    { title: "Médecins", value: stats.doctors, icon: "ri-stethoscope-fill", color: "success", link: "/doctor/doctor-list" },
    { title: "Patients", value: stats.patients, icon: "ri-user-heart-fill", color: "info", link: "/patient/patient-list" },
    { title: "Infirmiers", value: stats.nurses, icon: "ri-nurse-fill", color: "warning", link: "/nurse/nurse-list" },
    { title: "Auditeurs", value: stats.auditors, icon: "ri-shield-check-fill", color: "danger", link: "/super-admin/auditors" },
    { title: "Care Coordinators", value: stats.careCoordinators, icon: "ri-heart-pulse-fill", color: "secondary", link: "/super-admin/care-coordinators" },
  ];

  const roleColors = {
    admin: "primary", superadmin: "danger", auditor: "warning",
    carecoordinator: "info", doctor: "success", patient: "secondary", nurse: "dark",
  };
  const roleLabels = {
    admin: "Admin", superadmin: "Super Admin", auditor: "Auditeur",
    carecoordinator: "Care Coordinator", doctor: "Médecin", patient: "Patient", nurse: "Infirmier",
  };

  return (
    <>
      <Row>
        <Col sm={12}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="mb-1">Tableau de bord Super Administrateur</h4>
              <p className="text-muted mb-0">Gestion globale de la plateforme MediFollow.</p>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        {statCards.map((stat, i) => (
          <Col key={i} xl={4} md={6} className="mb-4">
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="text-muted mb-1 small">{stat.title}</p>
                    <h3 className="mb-0 fw-bold">
                      {loading ? "..." : <CountUp end={stat.value} duration={1.5} />}
                    </h3>
                  </div>
                  <div className={`bg-${stat.color} bg-opacity-10 rounded-circle p-3`}>
                    <i className={`${stat.icon} text-${stat.color}`} style={{ fontSize: "1.8rem" }}></i>
                  </div>
                </div>
                <div className="mt-3">
                  <Link to={stat.link} className={`btn btn-sm btn-${stat.color}-subtle`}>
                    Voir la liste <i className="ri-arrow-right-line ms-1"></i>
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="mt-2">
        <Col md={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-4 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Utilisateurs récents</h5>
                <Link to="/super-admin/users" className="btn btn-sm btn-primary-subtle">Voir tout</Link>
              </div>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status" />
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Nom</th>
                        <th>Email</th>
                        <th>Rôle</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUsers.map((u) => (
                        <tr key={u.id}>
                          <td>{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "—"}</td>
                          <td className="text-muted small">{u.email}</td>
                          <td>
                            <span className={`badge bg-${roleColors[u.role] || "secondary"} bg-opacity-10 text-${roleColors[u.role] || "secondary"}`}>
                              {roleLabels[u.role] || u.role}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${u.isActive ? "bg-success" : "bg-danger"} bg-opacity-10 ${u.isActive ? "text-success" : "text-danger"}`}>
                              {u.isActive ? "Actif" : "Inactif"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 pt-4 pb-0">
              <h5 className="mb-0">Actions rapides</h5>
            </Card.Header>
            <Card.Body className="d-flex flex-column gap-3">
              <Link to="/super-admin/auditors/add" className="btn btn-outline-warning">
                <i className="ri-shield-user-line me-2"></i>Ajouter un Auditeur
              </Link>
              <Link to="/super-admin/care-coordinators/add" className="btn btn-outline-info">
                <i className="ri-heart-pulse-line me-2"></i>Ajouter un Care Coordinator
              </Link>
              <Link to="/super-admin/users" className="btn btn-outline-primary">
                <i className="ri-team-line me-2"></i>Gérer les utilisateurs
              </Link>
              <Link to="/doctor/add-doctor" className="btn btn-outline-success">
                <i className="ri-stethoscope-line me-2"></i>Ajouter un Médecin
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default SuperAdminDashboard;
