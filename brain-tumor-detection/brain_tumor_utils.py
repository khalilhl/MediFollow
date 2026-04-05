"""
Utilitaires : prétraitement IRM, construction ResNet50 (ImageNet, gelé),
Grad-CAM et prédiction pour brain_tumor_predict_cli.py.
"""

from __future__ import annotations

import os

# Avant import TensorFlow : réduit le bruit sur stderr (évite de polluer stdout pour l’API Node).
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

from pathlib import Path
from typing import Any

import cv2
import numpy as np
import tensorflow as tf

IMAGE_SIZE = 224
LAST_CONV_LAYER = "conv5_block3_out"
RESNET_LAYER_NAME = "resnet50"


def default_trained_model_path() -> Path:
    """Fichier modèle par défaut : `.keras` (recommandé) si présent, sinon `.h5` (ancien)."""
    parent = Path(__file__).resolve().parent
    keras_p = parent / "brain_tumor_resnet.keras"
    if keras_p.is_file():
        return keras_p
    return parent / "brain_tumor_resnet.h5"


def resolve_yes_no_root(data_root: Path) -> Path:
    """
    Retourne le dossier qui contient directement « yes/ » et « no/ ».

    Accepte soit ``data_root/yes`` et ``data_root/no`` (Kaggle à la racine),
    soit ``data_root/<sous-dossier>/yes`` et ``.../no`` (ex. ``brain_tumor_dataset``).
    """
    root = data_root.expanduser().resolve()
    yes = root / "yes"
    no = root / "no"
    if yes.is_dir() and no.is_dir():
        return root

    candidates: list[Path] = []
    if root.is_dir():
        for sub in sorted(root.iterdir()):
            if sub.is_dir() and (sub / "yes").is_dir() and (sub / "no").is_dir():
                candidates.append(sub)

    if len(candidates) == 1:
        return candidates[0]
    if len(candidates) > 1:
        preferred = [c for c in candidates if c.name.lower() == "brain_tumor_dataset"]
        if len(preferred) == 1:
            return preferred[0]
        return candidates[0]

    raise FileNotFoundError(
        f"Pas de dossiers « yes » et « no » sous {root} "
        f"(directement ou dans un sous-dossier du premier niveau)."
    )


def find_brain_mri_data_root(start: Path | None = None) -> Path | None:
    """Remonte les parents et cherche yes/no (directs ou dans un sous-dossier)."""
    cur = (start or Path.cwd()).resolve()
    for _ in range(8):
        try:
            return resolve_yes_no_root(cur)
        except FileNotFoundError:
            pass
        if cur.parent == cur:
            break
        cur = cur.parent
    return None


def _ensure_rgb(img: np.ndarray) -> np.ndarray:
    if img.ndim == 2:
        return np.stack([img, img, img], axis=-1)
    if img.shape[-1] == 4:
        return img[..., :3]
    if img.shape[-1] == 1:
        return np.repeat(img, 3, axis=-1)
    return img


def load_image_for_model(path: str | Path) -> np.ndarray:
    """Charge une image, redimensionne 224x224, RGB, pixels dans [0, 1]."""
    p = str(path)
    raw = cv2.imread(p, cv2.IMREAD_UNCHANGED)
    if raw is None:
        raise FileNotFoundError(f"Impossible de lire l'image: {p}")
    if raw.ndim == 2:
        raw = cv2.cvtColor(raw, cv2.COLOR_GRAY2RGB)
    else:
        raw = cv2.cvtColor(raw, cv2.COLOR_BGR2RGB)
    raw = _ensure_rgb(raw)
    raw = cv2.resize(raw, (IMAGE_SIZE, IMAGE_SIZE), interpolation=cv2.INTER_AREA)
    return (raw.astype(np.float32) / 255.0).clip(0.0, 1.0)


def build_model() -> tf.keras.Model:
    """ResNet50 ImageNet, sans tête, couches gelées + Dense(1, sigmoid)."""
    base = tf.keras.applications.ResNet50(
        include_top=False,
        weights="imagenet",
        input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3),
        name=RESNET_LAYER_NAME,
    )
    base.trainable = False
    x = tf.keras.layers.GlobalAveragePooling2D(name="gap")(base.output)
    out = tf.keras.layers.Dense(1, activation="sigmoid", name="tumor_prob")(x)
    return tf.keras.Model(inputs=base.input, outputs=out, name="brain_tumor_resnet")


def get_resnet_submodel(model: tf.keras.Model) -> tf.keras.Model:
    """Accès au backbone ResNet50 (nom par défaut)."""
    try:
        return model.get_layer(RESNET_LAYER_NAME)
    except ValueError:
        for layer in model.layers:
            if isinstance(layer, tf.keras.Model) and "resnet" in layer.name.lower():
                return layer
        raise


def grad_cam_overlay(
    model: tf.keras.Model,
    img_batch: np.ndarray,
    last_conv_name: str = LAST_CONV_LAYER,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Grad-CAM : heatmap (H, W) normalisée et image RGB (H, W, 3) superposée.
    img_batch : (1, 224, 224, 3) float32 [0,1]
    """
    resnet = get_resnet_submodel(model)
    conv_layer = resnet.get_layer(last_conv_name)

    grad_model = tf.keras.Model(
        inputs=[model.inputs],
        outputs=[conv_layer.output, model.output],
    )

    with tf.GradientTape() as tape:
        conv_out, preds = grad_model(img_batch)
        # Sortie binaire : score = probabilité classe « tumeur »
        class_channel = preds[:, 0]

    grads = tape.gradient(class_channel, conv_out)
    if grads is None:
        raise RuntimeError("Grad-CAM : gradient nul.")

    pooled_grads = tf.reduce_mean(grads, axis=(1, 2))  # (batch, channels)

    conv_out = conv_out[0]
    pooled = pooled_grads[0]
    heatmap = tf.reduce_sum(conv_out * pooled, axis=-1)
    heatmap = tf.nn.relu(heatmap)
    hmax = tf.reduce_max(heatmap)
    heatmap = heatmap / (hmax + 1e-7)
    heatmap_np = heatmap.numpy().astype(np.float32)

    hm224 = cv2.resize(heatmap_np, (IMAGE_SIZE, IMAGE_SIZE), interpolation=cv2.INTER_CUBIC)
    hm224 = np.clip(hm224, 0.0, 1.0)

    img_u8 = (img_batch[0] * 255.0).clip(0, 255).astype(np.uint8)
    heat_color = cv2.applyColorMap((hm224 * 255).astype(np.uint8), cv2.COLORMAP_JET)
    heat_color = cv2.cvtColor(heat_color, cv2.COLOR_BGR2RGB)
    overlay = (0.6 * img_u8.astype(np.float32) + 0.4 * heat_color.astype(np.float32)).clip(0, 255).astype(
        np.uint8
    )
    return hm224, overlay


def predict(
    image_path: str | Path,
    model_path: str | Path | None = None,
    model: tf.keras.Model | None = None,
) -> dict[str, Any]:
    """
    Retourne prediction (0/1), probabilité, heatmap et overlay RGB.
    """
    path = Path(image_path)
    if model_path:
        mp = Path(model_path)
    else:
        env = os.environ.get("BRAIN_TUMOR_MODEL")
        mp = Path(env) if env else default_trained_model_path()

    if model is None:
        if not mp.is_file():
            raise FileNotFoundError(f"Modèle introuvable: {mp}")
        model = tf.keras.models.load_model(mp, compile=False)

    arr = load_image_for_model(path)
    batch = np.expand_dims(arr, axis=0)
    prob = float(model.predict(batch, verbose=0)[0, 0])
    pred = 1 if prob >= 0.5 else 0

    try:
        _, overlay_rgb = grad_cam_overlay(model, batch.astype(np.float32))
    except Exception:
        # Fallback : image seule si Grad-CAM échoue (couche renommée, etc.)
        overlay_rgb = (batch[0] * 255.0).clip(0, 255).astype(np.uint8)
    return {
        "prediction": pred,
        "probability": prob,
        "heatmap": None,  # optionnel ; overlay suffit pour l’UI
        "overlay_rgb": overlay_rgb,
    }


def predict_image(
    image_path: str | Path,
    model_path: str | Path | None = None,
) -> dict[str, Any]:
    """Alias explicite pour scripts externes."""
    return predict(image_path, model_path=model_path)
