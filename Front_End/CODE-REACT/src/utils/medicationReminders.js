/**
 * Créneaux horaires de rappel (heure locale) selon la fréquence prescrite.
 * Français (ordonnance) + anglais (ancien formulaire).
 */
export function getReminderSlotsForFrequency(frequency) {
  const f = String(frequency || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!f || f.includes("si besoin") || f.includes("as needed")) {
    return [];
  }

  if (f.includes("1 fois") || f.includes("once daily") || f === "once daily") {
    return [{ h: 9, m: 0, label: "Quotidien" }];
  }
  if (f.includes("2 fois") || f.includes("twice daily")) {
    return [
      { h: 8, m: 0, label: "Matin" },
      { h: 20, m: 0, label: "Soir" },
    ];
  }
  if (f.includes("3 fois") || f.includes("three times daily")) {
    return [
      { h: 8, m: 0, label: "Matin" },
      { h: 14, m: 0, label: "Midi" },
      { h: 21, m: 0, label: "Soir" },
    ];
  }
  if (f.includes("8 heures") || f.includes("every 8 hours")) {
    return [
      { h: 6, m: 0, label: "" },
      { h: 14, m: 0, label: "" },
      { h: 22, m: 0, label: "" },
    ];
  }
  if (f.includes("hebdomadaire") || f.includes("weekly")) {
    return [{ h: 9, m: 0, label: "Hebdomadaire" }];
  }

  return [{ h: 9, m: 0, label: "" }];
}

export function localDateStringYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Comparaison chaînes YYYY-MM-DD */
export function compareYMD(a, b) {
  if (!a || !b) return 0;
  return a.localeCompare(b);
}

/** Le patient peut marquer « pris » ce jour (date locale) ? */
export function canMarkMedicationForDate(med, dateStr) {
  if (!dateStr) return false;
  if (med.startDate && compareYMD(dateStr, med.startDate) < 0) return false;
  if (med.endDate && compareYMD(dateStr, med.endDate) > 0) return false;
  return true;
}

export function isMedicationActiveOnDate(med, dateStr) {
  if (med.startDate && compareYMD(dateStr, med.startDate) < 0) return false;
  if (med.endDate && compareYMD(dateStr, med.endDate) > 0) return false;
  return true;
}

/** Clés fusionnées : takenSlotKeys + legacy takenDates (journée entière seulement si pas de clés # pour ce jour). */
export function getMergedSlotKeys(med) {
  const keys = new Set(med.takenSlotKeys || []);
  const slots = getReminderSlotsForFrequency(med.frequency);
  const n = slots.length;
  if (n > 0) {
    (med.takenDates || []).forEach((d) => {
      const base = String(d).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return;
      const hasSlotKeyForDate = [...keys].some((k) => String(k).startsWith(`${base}#`));
      if (hasSlotKeyForDate) return;
      for (let i = 0; i < n; i++) {
        keys.add(`${base}#${i}`);
      }
    });
  }
  return [...keys];
}

export function isSlotTaken(med, dateStr, slotIndex) {
  return getMergedSlotKeys(med).includes(`${dateStr}#${slotIndex}`);
}

/** Nombre de créneaux non cochés pour ce jour */
export function remainingSlotsToday(med, dateStr) {
  const slots = getReminderSlotsForFrequency(med.frequency);
  if (!slots.length || !canMarkMedicationForDate(med, dateStr)) return 0;
  let rem = 0;
  slots.forEach((_, i) => {
    if (!isSlotTaken(med, dateStr, i)) rem += 1;
  });
  return rem;
}
