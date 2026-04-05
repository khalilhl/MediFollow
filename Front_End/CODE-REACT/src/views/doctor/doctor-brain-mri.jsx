import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Badge,
  ProgressBar,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { brainTumorApi } from "../../services/api";
import "./doctor-brain-mri.scss";

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
  const rawProb = Number(result?.probability);
  const probPct = Number.isFinite(rawProb)
    ? Math.min(100, Math.max(0, Math.round(rawProb * 1000) / 10))
    : 0;
  const isTumor = result?.prediction === 1;

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
    <div className="doctor-brain-mri-page">
      <Container fluid className="py-4 px-lg-4">
        <Row className="justify-content-center">
          <Col xxl={10} xl={11}>
            <div className="dbm-hero d-flex align-items-start gap-3">
              <div className="dbm-icon-wrap" aria-hidden>
                <i className="ri-brain-line" />
              </div>
              <div className="flex-grow-1 min-w-0">
                <h1 className="h4 mb-1 fw-semibold text-body">{t("doctorBrainMri.title")}</h1>
                <p className="text-muted small mb-0 lh-base">{t("doctorBrainMri.subtitle")}</p>
              </div>
            </div>

            <Row className="g-4">
              <Col lg={5}>
                <Card className="dbm-card shadow-sm h-100">
                  <Card.Header>{t("doctorBrainMri.sectionImaging")}</Card.Header>
                  <Card.Body className="p-4">
                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-semibold text-secondary text-uppercase">
                        {t("doctorBrainMri.chooseFile")}
                      </Form.Label>
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={onPick}
                        disabled={loading}
                        className="form-control-sm"
                      />
                      {file && (
                        <div className="dbm-file-meta mt-2">
                          <span className="text-body">{t("doctorBrainMri.fileSelected")}:</span> {file.name}
                        </div>
                      )}
                    </Form.Group>

                    {previewUrl ? (
                      <div className="mb-0">
                        <div className="small fw-semibold text-secondary text-uppercase mb-2">
                          {t("doctorBrainMri.previewOriginal")}
                        </div>
                        <div className="dbm-preview-box">
                          <img src={previewUrl} alt="" />
                        </div>
                      </div>
                    ) : (
                      <div className="dbm-empty-panel mb-0">
                        <i className="ri-image-add-line fs-2 text-secondary mb-2 d-block opacity-50" aria-hidden />
                        <span className="small">{t("doctorBrainMri.uploadPlaceholder")}</span>
                      </div>
                    )}

                    <div className="d-grid gap-2 mt-4">
                      <Button
                        variant="primary"
                        size="lg"
                        className="fw-semibold"
                        onClick={onAnalyze}
                        disabled={!file || loading}
                      >
                        {loading ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" role="status" />
                            {t("doctorBrainMri.analyzing")}
                          </>
                        ) : (
                          <>
                            <i className="ri-radar-line me-2" aria-hidden />
                            {t("doctorBrainMri.analyze")}
                          </>
                        )}
                      </Button>
                    </div>

                    {error && (
                      <Alert variant="danger" className="mt-3 mb-0 small">
                        {error}
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={7}>
                <Card className="dbm-card shadow-sm h-100">
                  <Card.Header>{t("doctorBrainMri.sectionResults")}</Card.Header>
                  <Card.Body className="p-4">
                    {!result && !loading && (
                      <div className="dbm-empty-panel border-0 bg-transparent py-5">
                        <i className="ri-file-chart-line fs-1 text-secondary mb-3 d-block opacity-40" aria-hidden />
                        <p className="small mb-0 px-md-4">{t("doctorBrainMri.emptyResults")}</p>
                      </div>
                    )}

                    {loading && (
                      <div className="text-center py-5">
                        <Spinner animation="border" className="text-primary mb-3" />
                        <p className="small text-muted mb-0">{t("doctorBrainMri.analyzing")}</p>
                      </div>
                    )}

                    {result && !loading && (
                      <>
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                          <span className="dbm-score-label mb-0">{t("doctorBrainMri.prediction")}</span>
                          <Badge
                            pill
                            bg={isTumor ? "warning" : "success"}
                            text={isTumor ? "dark" : "white"}
                            className="dbm-result-badge"
                          >
                            {isTumor ? t("doctorBrainMri.tumor") : t("doctorBrainMri.normal")}
                          </Badge>
                        </div>

                        <div className="mb-4">
                          <div className="dbm-score-label">{t("doctorBrainMri.modelConfidence")}</div>
                          <div className="d-flex align-items-center gap-3 mb-1">
                            <ProgressBar
                              now={probPct}
                              max={100}
                              variant={isTumor ? "warning" : "success"}
                              className="flex-grow-1"
                              style={{ height: "10px" }}
                              aria-valuenow={probPct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            />
                            <span className="small fw-semibold tabular-nums text-body">{probPct}%</span>
                          </div>
                          <div className="small text-muted">{t("doctorBrainMri.probabilityCaption")}</div>
                        </div>

                        {overlaySrc && (
                          <Row className="g-3">
                            <Col md={6}>
                              <div className="small fw-semibold text-secondary text-uppercase mb-2">
                                {t("doctorBrainMri.previewOriginal")}
                              </div>
                              <div className="dbm-preview-box">
                                <img src={previewUrl} alt="" />
                              </div>
                            </Col>
                            <Col md={6}>
                              <div className="small fw-semibold text-secondary text-uppercase mb-2">
                                {t("doctorBrainMri.heatmapTitle")}
                              </div>
                              <div className="dbm-preview-box">
                                <img src={overlaySrc} alt="" />
                              </div>
                              <p className="dbm-heatmap-caption mb-0">{t("doctorBrainMri.heatmapCaption")}</p>
                            </Col>
                          </Row>
                        )}

                        <p className="dbm-footnote mb-0">{t("doctorBrainMri.clinicalNote")}</p>
                      </>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Alert variant="light" className="border mt-4 mb-0 small text-secondary">
              <i className="ri-information-line me-2 align-middle" aria-hidden />
              {t("doctorBrainMri.disclaimer")}
            </Alert>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default DoctorBrainMri;
