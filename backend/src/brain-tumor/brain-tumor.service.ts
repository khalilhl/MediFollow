import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execFileAsync = promisify(execFile);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'image/tiff': '.tif',
  'image/gif': '.gif',
};

/** Parse la dernière ligne JSON (TensorFlow peut écrire des warnings avant). */
function parsePythonJsonStdout(stdout: string): Record<string, unknown> {
  const s = stdout.trim();
  if (!s) {
    throw new Error('Sortie Python vide');
  }
  const lines = s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        /* ligne suivante */
      }
    }
  }
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    throw new Error(`Réponse JSON invalide (début): ${s.slice(0, 400)}`);
  }
}

export interface BrainTumorPredictResult {
  prediction: number;
  probability: number;
  labelText: string;
  overlayPngBase64: string;
}

export interface BrainTumorUploadMeta {
  mimetype?: string;
  originalname?: string;
}

@Injectable()
export class BrainTumorService {
  /**
   * Interpréteur avec TensorFlow : variable d’environnement, sinon venv du dossier brain-tumor-detection.
   * Sur Windows, un chemin non quoté dans `.env` du type `C:\Users\...` peut être mal lu (séquence `\U`) :
   * utiliser des `/` ou des guillemets.
   */
  private async resolvePythonBinary(root: string): Promise<string> {
    const fromEnv = process.env.BRAIN_TUMOR_PYTHON?.trim();
    if (fromEnv) {
      try {
        await fs.access(fromEnv);
        return fromEnv;
      } catch {
        console.warn(`[brain-tumor] BRAIN_TUMOR_PYTHON introuvable (${fromEnv}), essai .venv local.`);
      }
    }
    const winVenv = path.join(root, '.venv', 'Scripts', 'python.exe');
    const unixVenv = path.join(root, '.venv', 'bin', 'python');
    try {
      await fs.access(winVenv);
      return winVenv;
    } catch {
      /* linux / mac */
    }
    try {
      await fs.access(unixVenv);
      return unixVenv;
    } catch {
      /* dernier recours */
    }
    return 'python';
  }

  /** Préfère `brain_tumor_resnet.keras`, sinon ancien `.h5`. */
  private async resolveModelPath(root: string): Promise<string> {
    if (process.env.BRAIN_TUMOR_MODEL) {
      const p = path.resolve(process.env.BRAIN_TUMOR_MODEL);
      try {
        await fs.access(p);
        return p;
      } catch {
        throw new ServiceUnavailableException(`BRAIN_TUMOR_MODEL introuvable : ${p}`);
      }
    }
    const keras = path.join(root, 'brain_tumor_resnet.keras');
    const h5 = path.join(root, 'brain_tumor_resnet.h5');
    try {
      await fs.access(keras);
      return keras;
    } catch {
      /* ancien format */
    }
    try {
      await fs.access(h5);
      return h5;
    } catch {
      throw new ServiceUnavailableException(
        'Modèle introuvable (brain_tumor_resnet.keras ou .h5). Entraînez avec train_brain_tumor.py ou définissez BRAIN_TUMOR_MODEL.',
      );
    }
  }

  /** Suffixe fichier temporaire (OpenCV lit selon le contenu ; l’extension évite les soucis Windows). */
  private tempSuffix(meta?: BrainTumorUploadMeta): string {
    const orig = meta?.originalname;
    if (orig) {
      const ext = path.extname(orig).toLowerCase();
      if (ext && /^\.[a-z0-9]{1,8}$/i.test(ext)) {
        return ext;
      }
    }
    const mt = meta?.mimetype;
    if (mt && MIME_TO_EXT[mt]) {
      return MIME_TO_EXT[mt];
    }
    return '.jpg';
  }

  /** Cherche brain-tumor-detection : cwd parent (npm dans backend/) ou cwd = racine repo. */
  private async resolveBrainTumorRoot(): Promise<string> {
    if (process.env.BRAIN_TUMOR_ROOT) {
      const p = path.resolve(process.env.BRAIN_TUMOR_ROOT);
      try {
        await fs.access(path.join(p, 'brain_tumor_predict_cli.py'));
        return p;
      } catch {
        throw new ServiceUnavailableException(
          `BRAIN_TUMOR_ROOT (${p}) : brain_tumor_predict_cli.py introuvable.`,
        );
      }
    }
    const candidates = [
      path.resolve(process.cwd(), '..', 'brain-tumor-detection'),
      path.resolve(process.cwd(), 'brain-tumor-detection'),
    ];
    for (const c of candidates) {
      try {
        await fs.access(path.join(c, 'brain_tumor_predict_cli.py'));
        return c;
      } catch {
        /* essai suivant */
      }
    }
    throw new ServiceUnavailableException(
      `Script brain_tumor_predict_cli.py introuvable. Chemins testés : ${candidates.join(' ; ')}. Définissez BRAIN_TUMOR_ROOT.`,
    );
  }

  async predictFromBuffer(buffer: Buffer, meta?: BrainTumorUploadMeta): Promise<BrainTumorPredictResult> {
    const root = await this.resolveBrainTumorRoot();
    const script = path.join(root, 'brain_tumor_predict_cli.py');
    const modelPath = await this.resolveModelPath(root);

    const suffix = this.tempSuffix(meta);
    const tmp = path.join(os.tmpdir(), `mri-${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`);
    await fs.writeFile(tmp, buffer);

    const py = await this.resolvePythonBinary(root);
    const env = {
      ...process.env,
      BRAIN_TUMOR_MODEL: modelPath,
      PYTHONUTF8: '1',
      PYTHONWARNINGS: 'ignore',
      /** Réduit les logs C++ TensorFlow / oneDNN sur stderr (pas des erreurs métier). */
      TF_CPP_MIN_LOG_LEVEL: '3',
      TF_ENABLE_ONEDNN_OPTS: '0',
    };

    try {
      const { stdout, stderr } = await execFileAsync(py, [script, tmp, modelPath], {
        maxBuffer: 50 * 1024 * 1024,
        env,
        windowsHide: true,
      });
      let raw: Record<string, unknown>;
      try {
        raw = parsePythonJsonStdout(stdout);
      } catch {
        if (stderr?.trim()) {
          console.warn('[brain-tumor]', stderr);
        }
        throw new Error('Réponse Python invalide');
      }
      if (typeof raw.error === 'string') {
        if (stderr?.trim()) {
          console.warn('[brain-tumor]', stderr);
        }
        throw new BadRequestException(raw.error);
      }
      return {
        prediction: Number(raw.prediction),
        probability: Number(raw.probability),
        labelText: String(raw.labelText),
        overlayPngBase64: String(raw.overlayPngBase64),
      };
    } catch (e: unknown) {
      if (e instanceof BadRequestException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[brain-tumor] exec failed', msg);
      throw new BadRequestException(
        "Analyse IRM impossible (vérifiez Python, TensorFlow et l'image). Détails: " + msg,
      );
    } finally {
      await fs.unlink(tmp).catch(() => undefined);
    }
  }
}
