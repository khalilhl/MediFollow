import React, { useState, useEffect } from "react";
import { Row, Col, Card, Button, Badge, Form, InputGroup, Spinner, Alert, Modal } from "react-bootstrap";
import { superAdminApi, doctorApi, patientApi, nurseApi } from "../../services/api";

const ROLE_LABELS = {
  admin: { label: "Admin", color: "danger" },
  superadmin: { label: "Super Admin", color: "dark" },
  doctor: { label: "Doctor", color: "primary" },
  patient: { label: "Patient", color: "info" },
  nurse: { label: "Nurse", color: "warning" },
  auditor: { label: "Auditor", color: "secondary" },
  carecoordinator: { label: "Care Coordinator", color: "success" },
};

const UserList = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [actionMsg, setActionMsg] = useState("");
  const [confirmModal, setConfirmModal] = useState({ show: false, user: null, action: "" });

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const [adminUsers, doctors, patients, nurses] = await Promise.all([
        superAdminApi.getAllUsers(),
        doctorApi.getAll(),
        patientApi.getAll(),
        nurseApi.getAll(),
      ]);

      const mapped = [
        ...(Array.isArray(adminUsers) ? adminUsers : []).map((u) => ({
          _id: u.id || u._id,
          name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
          email: u.email,
          role: u.role,
          isActive: u.isActive !== false,
          collection: "user",
        })),
        ...(Array.isArray(doctors) ? doctors : []).map((d) => ({
          _id: d._id || d.id,
          name: `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.email,
          email: d.email,
          role: "doctor",
          isActive: d.isActive !== false,
          collection: "doctor",
        })),
        ...(Array.isArray(patients) ? patients : []).map((p) => ({
          _id: p._id || p.id,
          name: `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.email,
          email: p.email,
          role: "patient",
          isActive: p.isActive !== false,
          collection: "patient",
        })),
        ...(Array.isArray(nurses) ? nurses : []).map((n) => ({
          _id: n._id || n.id,
          name: `${n.firstName || ""} ${n.lastName || ""}`.trim() || n.email,
          email: n.email,
          role: "nurse",
          isActive: n.isActive !== false,
          collection: "nurse",
        })),
      ].filter((u) => u.role !== "superadmin");

      setAllUsers(mapped);
    } catch (err) {
      setError("Failed to load users: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggle = async (user) => {
    try {
      if (user.collection === "doctor") await doctorApi.toggleActive(user._id);
      else if (user.collection === "patient") await patientApi.toggleActive(user._id);
      else if (user.collection === "nurse") await nurseApi.toggleActive(user._id);
      else await superAdminApi.toggleUserActive(user._id);

      setActionMsg(`Account of ${user.name} ${user.isActive ? "deactivated" : "activated"} successfully.`);
      setTimeout(() => setActionMsg(""), 3000);
      loadUsers();
    } catch (err) {
      setError("Error changing account status: " + (err.message || ""));
    }
    setConfirmModal({ show: false, user: null, action: "" });
  };

  const openConfirm = (user) => {
    setConfirmModal({ show: true, user, action: user.isActive ? "deactivate" : "activate" });
  };

  const displayed = allUsers.filter((u) => {
    const matchSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && u.isActive) ||
      (filterStatus === "inactive" && !u.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  const stats = {
    total: allUsers.length,
    active: allUsers.filter((u) => u.isActive).length,
    inactive: allUsers.filter((u) => !u.isActive).length,
  };

  return (
    <>
      <Row>
        <Col md={12}>
          <h4 className="fw-bold mb-1" style={{ color: "#009688" }}>
            All Users
          </h4>
          <p className="text-muted mb-4">Manage all accounts on the platform</p>
        </Col>
      </Row>

      <Row className="mb-4">
        {[
          { label: "Total Users", value: stats.total, color: "#009688", icon: "ri-team-fill" },
          { label: "Active", value: stats.active, color: "#4caf50", icon: "ri-user-follow-fill" },
          { label: "Deactivated", value: stats.inactive, color: "#f44336", icon: "ri-user-unfollow-fill" },
        ].map((s) => (
          <Col md={4} key={s.label}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 48, height: 48, background: s.color + "20" }}
                >
                  <i className={s.icon} style={{ fontSize: 22, color: s.color }}></i>
                </div>
                <div>
                  <div className="fw-bold fs-4" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-muted small">{s.label}</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {actionMsg && <Alert variant="success" dismissible onClose={() => setActionMsg("")}>{actionMsg}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}

      <Card className="shadow-sm border-0">
        <Card.Body>
          <Row className="mb-3 g-2">
            <Col md={5}>
              <InputGroup>
                <InputGroup.Text><i className="ri-search-line"></i></InputGroup.Text>
                <Form.Control
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="doctor">Doctor</option>
                <option value="patient">Patient</option>
                <option value="nurse">Nurse</option>
                <option value="auditor">Auditor</option>
                <option value="carecoordinator">Care Coordinator</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </Form.Select>
            </Col>
            <Col md={1}>
              <Button variant="outline-secondary" onClick={loadUsers} title="Refresh">
                <i className="ri-refresh-line"></i>
              </Button>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" style={{ color: "#009688" }} />
              <p className="mt-3 text-muted">Loading users...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead style={{ background: "#f8f9fa" }}>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    displayed.map((user, idx) => {
                      const roleInfo = ROLE_LABELS[user.role] || { label: user.role, color: "secondary" };
                      return (
                        <tr key={`${user.collection}-${user._id}`}>
                          <td className="text-muted">{idx + 1}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                style={{ width: 36, height: 36, background: "#009688", fontSize: 14, flexShrink: 0 }}
                              >
                                {(user.name || "?")[0].toUpperCase()}
                              </div>
                              <span>{user.name || "—"}</span>
                            </div>
                          </td>
                          <td className="text-muted">{user.email}</td>
                          <td>
                            <Badge bg={roleInfo.color}>{roleInfo.label}</Badge>
                          </td>
                          <td>
                            <Badge bg={user.isActive ? "success" : "secondary"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant={user.isActive ? "outline-danger" : "outline-success"}
                              onClick={() => openConfirm(user)}
                            >
                              <i className={user.isActive ? "ri-user-unfollow-line" : "ri-user-follow-line"}></i>
                              {" "}{user.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <div className="text-muted small mt-2">
                Showing {displayed.length} of {allUsers.length} user(s)
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={confirmModal.show} onHide={() => setConfirmModal({ show: false, user: null, action: "" })}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Action</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to <strong>{confirmModal.action}</strong> the account of{" "}
          <strong>{confirmModal.user?.name}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmModal({ show: false, user: null, action: "" })}>
            Cancel
          </Button>
          <Button
            variant={confirmModal.user?.isActive ? "danger" : "success"}
            onClick={() => handleToggle(confirmModal.user)}
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default UserList;
