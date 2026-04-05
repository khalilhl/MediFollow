import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { brainTumorApi } from "../../services/api";

const MAX_BYTES = 16 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/bmp", "image/tiff", "image/gif"]);

const DoctorBrainMri = () => {
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

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onPick = (e) => {
    const f = e.target.files?.[0];
    setError("");
    setResult(null);
    if (!f) {
      setFile(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      return;
    }
    if (!ALLOWED.has(f.type)) {
      setError(t("doctorBrainMri.badType"));
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(t("doctorBrainMri.tooLarge"));
      return;
    }
    setFile(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const onAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await brainTumorApi.predict(file);
      setResult(data);
    } catch (e) {
      setError(e.message || t("doctorBrainMri.error"));
    } finally {
      setLoading(false);
    }
  };

  const overlaySrc =
    result?.overlayPngBase64 != null ? `data:image/png;base64,${result.overlayPngBase64}` : null;

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
    <Container fluid className="py-4">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h4 className="mb-2">{t("doctorBrainMri.title")}</h4>
              <p className="text-muted small mb-4">{t("doctorBrainMri.subtitle")}</p>
              <Alert variant="info" className="small mb-4">
                {t("doctorBrainMri.disclaimer")}
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label>{t("doctorBrainMri.chooseFile")}</Form.Label>
                <Form.Control type="file" accept="image/*" onChange={onPick} disabled={loading} />
              </Form.Group>

              {previewUrl && (
                <div className="mb-3">
                  <div className="small text-muted mb-1">{t("doctorBrainMri.previewOriginal")}</div>
                  <img
                    src={previewUrl}
                    alt=""
                    className="img-fluid rounded border"
                    style={{ maxHeight: 280, objectFit: "contain" }}
                  />
                </div>
              )}

              <Button variant="primary" onClick={onAnalyze} disabled={!file || loading}>
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t("doctorBrainMri.analyzing")}
                  </>
                ) : (
                  t("doctorBrainMri.analyze")
                )}
              </Button>

              {error && (
                <Alert variant="danger" className="mt-3 mb-0">
                  {error}
                </Alert>
              )}

              {result && !error && (
                <div className="mt-4">
                  <h6 className="mb-2">{t("doctorBrainMri.prediction")}</h6>
                  <p className="mb-1">
                    <strong>
                      {result.prediction === 1
                        ? t("doctorBrainMri.tumor")
                        : t("doctorBrainMri.normal")}
                    </strong>
                  </p>
                  <p className="text-muted small mb-3">
                    {t("doctorBrainMri.probability", {
                      pct: Math.round((result.probability ?? 0) * 1000) / 10,
                    })}
                  </p>
                  {overlaySrc && (
                    <>
                      <div className="small text-muted mb-1">{t("doctorBrainMri.heatmapTitle")}</div>
                      <img
                        src={overlaySrc}
                        alt=""
                        className="img-fluid rounded border"
                        style={{ maxHeight: 360, objectFit: "contain" }}
                      />
                    </>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DoctorBrainMri;
