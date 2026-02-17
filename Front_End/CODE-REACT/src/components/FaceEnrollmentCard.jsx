import React, { useCallback, useEffect, useRef, useState } from "react";
import Card from "./Card";
import { authApi } from "../services/api";
import { captureFaceDescriptor } from "../services/face-auth";

const FaceEnrollmentCard = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState({ enrolled: false });
  const [loading, setLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraBooting, setCameraBooting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isRoleSession =
    !!localStorage.getItem("doctorToken") ||
    !!localStorage.getItem("patientToken") ||
    !!localStorage.getItem("nurseToken");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setCameraBooting(false);
    setCameraOn(false);
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!isRoleSession) return;
    try {
      const data = await authApi.faceStatus();
      setStatus(data || { enrolled: false });
    } catch {
      // Ignore status errors quietly for non-supported sessions.
    }
  }, [isRoleSession]);

  useEffect(() => {
    refreshStatus();
    return () => stopCamera();
  }, [refreshStatus, stopCamera]);

  useEffect(() => {
    const bindStreamToVideo = async () => {
      if (!cameraOn || !streamRef.current || !videoRef.current) return;
      try {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play().catch(() => {});
        if (videoRef.current.videoWidth > 0) {
          setCameraReady(true);
        }
      } catch {
        setError("Impossible d'afficher le flux camera.");
      }
    };
    bindStreamToVideo();
  }, [cameraOn]);

  const startCamera = async () => {
    setError("");
    setMessage("");
    setCameraBooting(true);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch (e) {
      setError(e?.message || "Impossible d'acceder a la camera.");
      setCameraOn(false);
      setCameraReady(false);
    } finally {
      setCameraBooting(false);
    }
  };

  const enrollFace = async () => {
    if (!videoRef.current) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const descriptor = await captureFaceDescriptor(videoRef.current);
      await authApi.faceEnroll(descriptor);
      setMessage("Visage enregistre avec succes.");
      await refreshStatus();
    } catch (e) {
      setError(e?.message || "Echec de l'enregistrement du visage.");
    } finally {
      setLoading(false);
    }
  };

  const disableFace = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await authApi.faceDisable();
      setMessage("Connexion visage desactivee.");
      await refreshStatus();
    } catch (e) {
      setError(e?.message || "Echec de la desactivation.");
    } finally {
      setLoading(false);
    }
  };

  if (!isRoleSession) return null;

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between">
        <Card.Header.Title>
          <h4 className="card-title mb-0">Connexion avec visage (camera)</h4>
        </Card.Header.Title>
      </Card.Header>
      <Card.Body>
        <p className="text-muted mb-2">
          Enregistrez votre visage pendant votre session pour pouvoir vous connecter plus tard avec la camera.
        </p>
        <div className="mb-2">
          <span className={`badge ${status?.enrolled ? "text-bg-success" : "text-bg-secondary"}`}>
            {status?.enrolled ? "Visage enregistre" : "Aucun visage enregistre"}
          </span>
        </div>
        {error ? <div className="alert alert-danger py-2">{error}</div> : null}
        {message ? <div className="alert alert-success py-2">{message}</div> : null}

        {cameraOn ? (
          <div className="mb-3">
            <div
              style={{
                width: "100%",
                maxWidth: 520,
                minHeight: 260,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "#111",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onLoadedData={() => setCameraReady(true)}
                style={{ width: "100%", minHeight: 260, objectFit: "cover", display: "block" }}
              />
              {!cameraReady ? (
                <div
                  className="text-white d-flex align-items-center justify-content-center"
                  style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }}
                >
                  Initialisation camera...
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="d-flex gap-2 flex-wrap">
          {!cameraOn ? (
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={startCamera} disabled={loading || cameraBooting}>
              <i className="ri-camera-line me-1"></i>{cameraBooting ? "Ouverture..." : "Ouvrir camera"}
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-primary btn-sm" onClick={enrollFace} disabled={loading}>
                <i className="ri-user-add-line me-1"></i>{loading ? "Enregistrement..." : "Enregistrer mon visage"}
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={stopCamera} disabled={loading}>
                <i className="ri-camera-off-line me-1"></i>Fermer camera
              </button>
            </>
          )}
          {status?.enrolled ? (
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={disableFace} disabled={loading}>
              <i className="ri-close-circle-line me-1"></i>Desactiver visage
            </button>
          ) : null}
        </div>
      </Card.Body>
    </Card>
  );
};

export default FaceEnrollmentCard;
