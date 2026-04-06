import React, { useState } from "react";
import { Row, Col, Card, Table, Badge, ProgressBar } from "react-bootstrap";
import CountUp from "react-countup";
import Chart from "react-apexcharts";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const [chartOptions] = useState({
    series: [
      { name: "Utilisateurs", data: [31, 40, 28, 51, 42, 109, 100] },
      { name: "Rendez-vous", data: [11, 32, 45, 32, 34, 52, 41] },
    ],
    chart: {
      height: 280,
      type: "area",
      toolbar: { show: false },
      width: "100%",
      redrawOnParentResize: true,
      zoom: { enabled: false },
    },
    colors: ["#089bab", "#FC9F5B"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth" },
    xaxis: {
      categories: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
      labels: { style: { fontSize: "11px" } },
    },
    legend: { position: "top", horizontalAlign: "left" },
    responsive: [
      {
        breakpoint: 576,
        options: {
          chart: { height: 240 },
          legend: { position: "bottom", horizontalAlign: "center" },
        },
      },
    ],
  });

  const stats = [
    { title: "Utilisateurs", value: 1250, icon: "ri-user-3-fill", color: "primary", link: "/doctor/doctor-list" },
    { title: "Rendez-vous", value: 342, icon: "ri-calendar-check-fill", color: "success", link: "/calendar" },
    { title: "Patients", value: 892, icon: "ri-team-fill", color: "info", link: "/dashboard-pages/patient-dashboard" },
    { title: "Revenus", value: "24.5K", icon: "ri-money-dollar-circle-fill", color: "warning", suffix: "€" },
  ];

  const recentActivities = [
    { user: "Dr. Paul Molive", action: "Nouveau rendez-vous", time: "Il y a 5 min", type: "success" },
    { user: "Marie Dupont", action: "Inscription patient", time: "Il y a 15 min", type: "info" },
    { user: "Admin", action: "Mise à jour des paramètres", time: "Il y a 1h", type: "warning" },
    { user: "Dr. Jane Smith", action: "Annulation RDV", time: "Il y a 2h", type: "danger" },
  ];

  return (
    <div className="admin-dashboard-page" style={{ minWidth: 0 }}>
      <Row>
        <Col xs={12}>
          <div className="d-flex flex-column flex-md-row flex-wrap justify-content-between align-items-start align-items-md-center gap-3 mb-4">
            <div style={{ minWidth: 0 }}>
              <h4 className="mb-1 text-break">Tableau de bord Administrateur</h4>
              <p className="text-muted mb-0 text-break">Bienvenue, voici un aperçu de votre plateforme MediFollow.</p>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="g-3 g-xl-0">
        {stats.map((stat, i) => (
          <Col key={i} xs={12} sm={6} xl={3} className="mb-4 mb-xl-0">
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div style={{ minWidth: 0 }}>
                    <p className="text-muted mb-1">{stat.title}</p>
                    <h3 className="mb-0 text-break">
                      {typeof stat.value === "number" ? (
                        <CountUp end={stat.value} duration={2} />
                      ) : (
                        stat.value
                      )}
                      {stat.suffix}
                    </h3>
                  </div>
                  <div className={`rounded-circle p-3 bg-${stat.color}-subtle flex-shrink-0`}>
                    <i className={`ri-2x text-${stat.color} ${stat.icon}`}></i>
                  </div>
                </div>
                {stat.link && (
                  <Link to={stat.link} className="btn btn-sm btn-link p-0 mt-2 text-decoration-none">
                    Voir détails <i className="ri-arrow-right-line"></i>
                  </Link>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="mt-4">
        <Col xs={12} lg={8} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <h5 className="mb-0">Activité hebdomadaire</h5>
            </Card.Header>
            <Card.Body className="overflow-hidden" style={{ minWidth: 0 }}>
              <div className="w-100" style={{ minWidth: 0 }}>
                <Chart options={chartOptions} series={chartOptions.series} type="area" height={280} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} lg={4} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <h5 className="mb-0">Activité récente</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive className="mb-0">
                <tbody>
                  {recentActivities.map((act, i) => (
                    <tr key={i}>
                      <td className="border-0 py-3">
                        <div className="text-break">
                          <strong>{act.user}</strong>
                          <p className="mb-0 small text-muted">{act.action}</p>
                        </div>
                      </td>
                      <td className="border-0 py-3 text-end text-nowrap">
                        <Badge bg={act.type} className="me-1">{act.time}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xs={12} lg={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <h5 className="mb-0">Taux d'occupation</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="d-flex flex-wrap justify-content-between gap-2 mb-1">
                  <span>Consultations</span>
                  <span>78%</span>
                </div>
                <ProgressBar variant="primary" now={78} className="mb-2" style={{ height: "8px" }} />
              </div>
              <div className="mb-3">
                <div className="d-flex flex-wrap justify-content-between gap-2 mb-1">
                  <span>Urgences</span>
                  <span>45%</span>
                </div>
                <ProgressBar variant="warning" now={45} className="mb-2" style={{ height: "8px" }} />
              </div>
              <div>
                <div className="d-flex flex-wrap justify-content-between gap-2 mb-1">
                  <span>Chirurgie</span>
                  <span>62%</span>
                </div>
                <ProgressBar variant="success" now={62} style={{ height: "8px" }} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} lg={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <h5 className="mb-0">Accès rapides</h5>
            </Card.Header>
            <Card.Body>
              <Row className="g-2">
                <Col xs={12} sm={6}>
                  <Link to="/doctor/doctor-list" className="btn btn-outline-primary w-100 py-3">
                    <i className="ri-user-add-fill d-block mb-1"></i>
                    Gestion médecins
                  </Link>
                </Col>
                <Col xs={12} sm={6}>
                  <Link to="/calendar" className="btn btn-outline-success w-100 py-3">
                    <i className="ri-calendar-fill d-block mb-1"></i>
                    Calendrier
                  </Link>
                </Col>
                <Col xs={12} sm={6}>
                  <Link to="/dashboard-pages/patient-dashboard" className="btn btn-outline-info w-100 py-3">
                    <i className="ri-team-fill d-block mb-1"></i>
                    Patients
                  </Link>
                </Col>
                <Col xs={12} sm={6}>
                  <Link to="/extra-pages/account-setting" className="btn btn-outline-warning w-100 py-3">
                    <i className="ri-settings-3-fill d-block mb-1"></i>
                    Paramètres
                  </Link>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
