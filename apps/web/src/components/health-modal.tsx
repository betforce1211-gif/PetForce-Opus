"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Modal } from "./modal";
import {
  HEALTH_RECORD_TYPE_LABELS,
  HEALTH_RECORD_TYPE_ICONS,
  MEDICATION_FREQUENCY_SUGGESTIONS,
  COMMON_VACCINES,
} from "@petforce/core";
import type { HealthRecordType } from "@petforce/core";

interface HealthModalProps {
  householdId: string;
  onClose: () => void;
}

type Tab = "visits" | "vaccinations" | "medications";

export function HealthModal({ householdId, onClose }: HealthModalProps) {
  const [tab, setTab] = useState<Tab>("visits");

  return (
    <Modal open onClose={onClose}>
      <h2 style={titleStyle}>Health Records</h2>

      {/* Tab bar */}
      <div style={tabBar}>
        {(
          [
            { key: "visits", label: "\uD83C\uDFE5 Vet Visits", },
            { key: "vaccinations", label: "\uD83D\uDC89 Vaccinations" },
            { key: "medications", label: "\uD83D\uDC8A Medications" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={tabBtn(tab === t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "visits" && <VetVisitsTab householdId={householdId} />}
      {tab === "vaccinations" && <VaccinationsTab householdId={householdId} />}
      {tab === "medications" && <MedicationsTab householdId={householdId} />}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
        <button type="button" onClick={onClose} style={closeBtnStyle}>
          Done
        </button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════
// Vet Visits Tab
// ══════════════════════════════════════════

function VetVisitsTab({ householdId }: { householdId: string }) {
  const utils = trpc.useContext();
  const dashboardQuery = trpc.dashboard.get.useQuery({ householdId });
  const recordsQuery = trpc.health.listRecords.useQuery({ householdId });

  const [petId, setPetId] = useState("");
  const [type, setType] = useState<HealthRecordType>("vet_visit");
  const [date, setDate] = useState("");
  const [vetOrClinic, setVetOrClinic] = useState("");
  const [reason, setReason] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editType, setEditType] = useState<HealthRecordType>("vet_visit");
  const [editDate, setEditDate] = useState("");
  const [editVet, setEditVet] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const createMut = trpc.health.createRecord.useMutation({
    onSuccess: () => {
      utils.health.listRecords.invalidate();
      utils.health.summary.invalidate();
      resetForm();
    },
  });
  const updateMut = trpc.health.updateRecord.useMutation({
    onSuccess: () => {
      utils.health.listRecords.invalidate();
      utils.health.summary.invalidate();
      setEditId(null);
    },
  });
  const deleteMut = trpc.health.deleteRecord.useMutation({
    onSuccess: () => {
      utils.health.listRecords.invalidate();
      utils.health.summary.invalidate();
    },
  });

  const pets = dashboardQuery.data?.pets ?? [];
  const effectivePetId = petId || (pets.length === 1 ? pets[0].id : "");

  const records = (recordsQuery.data ?? []).filter(
    (r) => r.type === "vet_visit" || r.type === "checkup" || r.type === "procedure"
  );

  function resetForm() {
    setDate("");
    setVetOrClinic("");
    setReason("");
    setCost("");
    setNotes("");
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectivePetId || !date) return;
    createMut.mutate({
      householdId,
      petId: effectivePetId,
      type,
      date: new Date(date),
      vetOrClinic: vetOrClinic || null,
      reason: reason || null,
      cost: cost ? parseFloat(cost) : null,
      notes: notes || null,
    });
  };

  const startEdit = (r: (typeof records)[number]) => {
    setEditId(r.id);
    setEditType(r.type as HealthRecordType);
    setEditDate(toDateInput(r.date));
    setEditVet(r.vetOrClinic ?? "");
    setEditReason(r.reason ?? "");
    setEditCost(r.cost != null ? String(r.cost) : "");
    setEditNotes(r.notes ?? "");
  };

  const handleSaveEdit = () => {
    if (!editId || !editDate) return;
    updateMut.mutate({
      householdId,
      id: editId,
      type: editType,
      date: new Date(editDate),
      vetOrClinic: editVet || null,
      reason: editReason || null,
      cost: editCost ? parseFloat(editCost) : null,
      notes: editNotes || null,
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this health record?")) return;
    deleteMut.mutate({ householdId, id });
  };

  const petMap = new Map(pets.map((p) => [p.id, p.name]));
  const grouped = groupByPet(records);

  return (
    <>
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Add Visit / Checkup / Procedure</legend>
        <form onSubmit={handleAdd} style={formGrid}>
          {pets.length > 1 && (
            <label style={labelStyle}>
              <span style={labelText}>Pet</span>
              <select value={effectivePetId} onChange={(e) => setPetId(e.target.value)} required style={inputStyle}>
                <option value="">Select pet</option>
                {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          <label style={labelStyle}>
            <span style={labelText}>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as HealthRecordType)} style={inputStyle}>
              <option value="vet_visit">Vet Visit</option>
              <option value="checkup">Checkup</option>
              <option value="procedure">Procedure</option>
            </select>
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Vet / Clinic</span>
            <input type="text" value={vetOrClinic} onChange={(e) => setVetOrClinic(e.target.value)} placeholder="Dr. Smith" maxLength={200} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Reason</span>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Annual checkup" maxLength={500} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Cost ($)</span>
            <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" min="0" step="0.01" style={inputStyle} />
          </label>
          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            <span style={labelText}>Notes</span>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" maxLength={2000} style={inputStyle} />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" disabled={createMut.isLoading || !effectivePetId || !date} style={addBtn(createMut.isLoading)}>
              {createMut.isLoading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
        {createMut.error && <p style={errorText}>{createMut.error.message}</p>}
      </fieldset>

      <fieldset style={{ ...fieldsetStyle, marginTop: "1rem" }}>
        <legend style={legendStyle}>Records</legend>
        {records.length === 0 ? (
          <p style={emptyText}>No vet visits yet. Add one above!</p>
        ) : (
          <div style={recordsContainer}>
            {Array.from(grouped.entries()).map(([pId, items]) => (
              <div key={pId}>
                <div style={petGroupHeader}>{petMap.get(pId) ?? "Unknown Pet"}</div>
                {items
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((r) =>
                    editId === r.id ? (
                      <div key={r.id} style={recordRow}>
                        <select value={editType} onChange={(e) => setEditType(e.target.value as HealthRecordType)} style={{ ...inputStyle, width: 100 }}>
                          <option value="vet_visit">Vet Visit</option>
                          <option value="checkup">Checkup</option>
                          <option value="procedure">Procedure</option>
                        </select>
                        <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={inputStyle} />
                        <input value={editVet} onChange={(e) => setEditVet(e.target.value)} placeholder="Vet" style={{ ...inputStyle, width: 90 }} />
                        <input value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="Reason" style={{ ...inputStyle, flex: 1 }} />
                        <input type="number" value={editCost} onChange={(e) => setEditCost(e.target.value)} placeholder="$" style={{ ...inputStyle, width: 60 }} />
                        <button type="button" onClick={handleSaveEdit} disabled={updateMut.isLoading} style={saveBtn}>{updateMut.isLoading ? "..." : "Save"}</button>
                        <button type="button" onClick={() => setEditId(null)} style={cancelBtn}>Cancel</button>
                      </div>
                    ) : (
                      <div key={r.id} style={recordRow}>
                        <span style={recordIcon}>{HEALTH_RECORD_TYPE_ICONS[r.type] ?? "\uD83C\uDFE5"}</span>
                        <span style={recordLabel}>{HEALTH_RECORD_TYPE_LABELS[r.type] ?? r.type}</span>
                        <span style={recordDate}>{formatDate(r.date)}</span>
                        {r.vetOrClinic && <span style={recordMeta}>{r.vetOrClinic}</span>}
                        {r.reason && <span style={recordMeta}>{r.reason}</span>}
                        {r.cost != null && <span style={recordMeta}>${r.cost.toFixed(2)}</span>}
                        <span style={{ flex: 1 }} />
                        <button type="button" onClick={() => startEdit(r)} style={editBtnStyle}>Edit</button>
                        <button type="button" onClick={() => handleDelete(r.id)} disabled={deleteMut.isLoading} style={deleteBtnStyle}>Delete</button>
                      </div>
                    )
                  )}
              </div>
            ))}
          </div>
        )}
        {(updateMut.error || deleteMut.error) && <p style={errorText}>{updateMut.error?.message ?? deleteMut.error?.message}</p>}
      </fieldset>
    </>
  );
}

// ══════════════════════════════════════════
// Vaccinations Tab
// ══════════════════════════════════════════

function VaccinationsTab({ householdId }: { householdId: string }) {
  const utils = trpc.useContext();
  const dashboardQuery = trpc.dashboard.get.useQuery({ householdId });
  const recordsQuery = trpc.health.listRecords.useQuery({ householdId });

  const [petId, setPetId] = useState("");
  const [vaccineName, setVaccineName] = useState("");
  const [date, setDate] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [vetOrClinic, setVetOrClinic] = useState("");
  const [notes, setNotes] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editVaccine, setEditVaccine] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNextDue, setEditNextDue] = useState("");
  const [editVet, setEditVet] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const createMut = trpc.health.createRecord.useMutation({
    onSuccess: () => {
      utils.health.listRecords.invalidate();
      utils.health.summary.invalidate();
      resetForm();
    },
  });
  const updateMut = trpc.health.updateRecord.useMutation({
    onSuccess: () => {
      utils.health.listRecords.invalidate();
      utils.health.summary.invalidate();
      setEditId(null);
    },
  });
  const deleteMut = trpc.health.deleteRecord.useMutation({
    onSuccess: () => {
      utils.health.listRecords.invalidate();
      utils.health.summary.invalidate();
    },
  });

  const pets = dashboardQuery.data?.pets ?? [];
  const effectivePetId = petId || (pets.length === 1 ? pets[0].id : "");

  const records = (recordsQuery.data ?? []).filter((r) => r.type === "vaccination");

  // Determine species for suggestions
  const selectedPet = pets.find((p) => p.id === effectivePetId);
  const suggestions = selectedPet ? (COMMON_VACCINES[selectedPet.species] ?? []) : [];

  function resetForm() {
    setVaccineName("");
    setDate("");
    setNextDueDate("");
    setVetOrClinic("");
    setNotes("");
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectivePetId || !vaccineName || !date) return;
    createMut.mutate({
      householdId,
      petId: effectivePetId,
      type: "vaccination",
      date: new Date(date),
      vaccineName,
      nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
      vetOrClinic: vetOrClinic || null,
      notes: notes || null,
    });
  };

  const startEdit = (r: (typeof records)[number]) => {
    setEditId(r.id);
    setEditVaccine(r.vaccineName ?? "");
    setEditDate(toDateInput(r.date));
    setEditNextDue(r.nextDueDate ? toDateInput(r.nextDueDate) : "");
    setEditVet(r.vetOrClinic ?? "");
    setEditNotes(r.notes ?? "");
  };

  const handleSaveEdit = () => {
    if (!editId || !editDate) return;
    updateMut.mutate({
      householdId,
      id: editId,
      vaccineName: editVaccine || null,
      date: new Date(editDate),
      nextDueDate: editNextDue ? new Date(editNextDue) : null,
      vetOrClinic: editVet || null,
      notes: editNotes || null,
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this vaccination record?")) return;
    deleteMut.mutate({ householdId, id });
  };

  const petMap = new Map(pets.map((p) => [p.id, p.name]));
  const grouped = groupByPet(records);
  const now = new Date();

  return (
    <>
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Add Vaccination</legend>

        {/* Vaccine suggestion chips */}
        {suggestions.length > 0 && (
          <div style={chipRow}>
            {suggestions.map((v) => (
              <button key={v} type="button" onClick={() => setVaccineName(v)} style={suggestionChip(vaccineName === v)}>
                {v}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} style={formGrid}>
          {pets.length > 1 && (
            <label style={labelStyle}>
              <span style={labelText}>Pet</span>
              <select value={effectivePetId} onChange={(e) => setPetId(e.target.value)} required style={inputStyle}>
                <option value="">Select pet</option>
                {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          <label style={labelStyle}>
            <span style={labelText}>Vaccine Name</span>
            <input type="text" value={vaccineName} onChange={(e) => setVaccineName(e.target.value)} placeholder="Rabies" required maxLength={200} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Date Given</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Next Due</span>
            <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Vet / Clinic</span>
            <input type="text" value={vetOrClinic} onChange={(e) => setVetOrClinic(e.target.value)} placeholder="Dr. Smith" maxLength={200} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Notes</span>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" maxLength={2000} style={inputStyle} />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" disabled={createMut.isLoading || !effectivePetId || !vaccineName || !date} style={addBtn(createMut.isLoading)}>
              {createMut.isLoading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
        {createMut.error && <p style={errorText}>{createMut.error.message}</p>}
      </fieldset>

      <fieldset style={{ ...fieldsetStyle, marginTop: "1rem" }}>
        <legend style={legendStyle}>Vaccination Records</legend>
        {records.length === 0 ? (
          <p style={emptyText}>No vaccinations yet. Add one above!</p>
        ) : (
          <div style={recordsContainer}>
            {Array.from(grouped.entries()).map(([pId, items]) => (
              <div key={pId}>
                <div style={petGroupHeader}>{petMap.get(pId) ?? "Unknown Pet"}</div>
                {items
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((r) => {
                    const overdue = r.nextDueDate && new Date(r.nextDueDate) < now;
                    return editId === r.id ? (
                      <div key={r.id} style={recordRow}>
                        <input value={editVaccine} onChange={(e) => setEditVaccine(e.target.value)} placeholder="Vaccine" style={{ ...inputStyle, flex: 1 }} />
                        <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={inputStyle} />
                        <input type="date" value={editNextDue} onChange={(e) => setEditNextDue(e.target.value)} style={inputStyle} />
                        <input value={editVet} onChange={(e) => setEditVet(e.target.value)} placeholder="Vet" style={{ ...inputStyle, width: 90 }} />
                        <button type="button" onClick={handleSaveEdit} disabled={updateMut.isLoading} style={saveBtn}>{updateMut.isLoading ? "..." : "Save"}</button>
                        <button type="button" onClick={() => setEditId(null)} style={cancelBtn}>Cancel</button>
                      </div>
                    ) : (
                      <div key={r.id} style={{ ...recordRow, ...(overdue ? overdueRow : {}) }}>
                        <span style={recordIcon}>{"\uD83D\uDC89"}</span>
                        <span style={recordLabel}>{r.vaccineName ?? "Vaccination"}</span>
                        <span style={recordDate}>{formatDate(r.date)}</span>
                        {r.nextDueDate && (
                          <span style={{ ...recordMeta, color: overdue ? "#DC2626" : "#6B7280", fontWeight: overdue ? 700 : 500 }}>
                            Due: {formatDate(r.nextDueDate)}
                            {overdue && " (OVERDUE)"}
                          </span>
                        )}
                        {r.vetOrClinic && <span style={recordMeta}>{r.vetOrClinic}</span>}
                        <span style={{ flex: 1 }} />
                        <button type="button" onClick={() => startEdit(r)} style={editBtnStyle}>Edit</button>
                        <button type="button" onClick={() => handleDelete(r.id)} disabled={deleteMut.isLoading} style={deleteBtnStyle}>Delete</button>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        )}
        {(updateMut.error || deleteMut.error) && <p style={errorText}>{updateMut.error?.message ?? deleteMut.error?.message}</p>}
      </fieldset>
    </>
  );
}

// ══════════════════════════════════════════
// Medications Tab
// ══════════════════════════════════════════

function MedicationsTab({ householdId }: { householdId: string }) {
  const utils = trpc.useContext();
  const dashboardQuery = trpc.dashboard.get.useQuery({ householdId });
  const medsQuery = trpc.health.listMedications.useQuery({ householdId });

  const [petId, setPetId] = useState("");
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [prescribedBy, setPrescribedBy] = useState("");
  const [medNotes, setMedNotes] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDosage, setEditDosage] = useState("");
  const [editFrequency, setEditFrequency] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editPrescribed, setEditPrescribed] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const createMut = trpc.health.createMedication.useMutation({
    onSuccess: () => {
      utils.health.listMedications.invalidate();
      utils.health.summary.invalidate();
      resetForm();
    },
  });
  const updateMut = trpc.health.updateMedication.useMutation({
    onSuccess: () => {
      utils.health.listMedications.invalidate();
      utils.health.summary.invalidate();
      setEditId(null);
    },
  });
  const deleteMut = trpc.health.deleteMedication.useMutation({
    onSuccess: () => {
      utils.health.listMedications.invalidate();
      utils.health.summary.invalidate();
    },
  });

  const pets = dashboardQuery.data?.pets ?? [];
  const effectivePetId = petId || (pets.length === 1 ? pets[0].id : "");
  const meds = medsQuery.data ?? [];

  function resetForm() {
    setName("");
    setDosage("");
    setFrequency("");
    setStartDate("");
    setEndDate("");
    setPrescribedBy("");
    setMedNotes("");
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectivePetId || !name) return;
    createMut.mutate({
      householdId,
      petId: effectivePetId,
      name,
      dosage: dosage || null,
      frequency: frequency || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      prescribedBy: prescribedBy || null,
      notes: medNotes || null,
    });
  };

  const startEdit = (m: (typeof meds)[number]) => {
    setEditId(m.id);
    setEditName(m.name);
    setEditDosage(m.dosage ?? "");
    setEditFrequency(m.frequency ?? "");
    setEditStart(m.startDate ? toDateInput(m.startDate) : "");
    setEditEnd(m.endDate ? toDateInput(m.endDate) : "");
    setEditPrescribed(m.prescribedBy ?? "");
    setEditNotes(m.notes ?? "");
  };

  const handleSaveEdit = () => {
    if (!editId || !editName) return;
    updateMut.mutate({
      householdId,
      id: editId,
      name: editName,
      dosage: editDosage || null,
      frequency: editFrequency || null,
      startDate: editStart ? new Date(editStart) : null,
      endDate: editEnd ? new Date(editEnd) : null,
      prescribedBy: editPrescribed || null,
      notes: editNotes || null,
    });
  };

  const handleToggleActive = (m: (typeof meds)[number]) => {
    updateMut.mutate({
      householdId,
      id: m.id,
      isActive: !m.isActive,
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this medication?")) return;
    deleteMut.mutate({ householdId, id });
  };

  const petMap = new Map(pets.map((p) => [p.id, p.name]));
  const grouped = groupByPet(meds);

  return (
    <>
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Add Medication</legend>

        {/* Frequency suggestion chips */}
        <div style={chipRow}>
          {MEDICATION_FREQUENCY_SUGGESTIONS.map((f) => (
            <button key={f} type="button" onClick={() => setFrequency(f)} style={suggestionChip(frequency === f)}>
              {f}
            </button>
          ))}
        </div>

        <form onSubmit={handleAdd} style={formGrid}>
          {pets.length > 1 && (
            <label style={labelStyle}>
              <span style={labelText}>Pet</span>
              <select value={effectivePetId} onChange={(e) => setPetId(e.target.value)} required style={inputStyle}>
                <option value="">Select pet</option>
                {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          <label style={labelStyle}>
            <span style={labelText}>Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Apoquel" required maxLength={200} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Dosage</span>
            <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="50mg" maxLength={100} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Frequency</span>
            <input type="text" value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="Twice daily" maxLength={100} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Start Date</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>End Date</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Prescribed By</span>
            <input type="text" value={prescribedBy} onChange={(e) => setPrescribedBy(e.target.value)} placeholder="Dr. Smith" maxLength={200} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Notes</span>
            <input type="text" value={medNotes} onChange={(e) => setMedNotes(e.target.value)} placeholder="Optional" maxLength={2000} style={inputStyle} />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" disabled={createMut.isLoading || !effectivePetId || !name} style={addBtn(createMut.isLoading)}>
              {createMut.isLoading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
        {createMut.error && <p style={errorText}>{createMut.error.message}</p>}
      </fieldset>

      <fieldset style={{ ...fieldsetStyle, marginTop: "1rem" }}>
        <legend style={legendStyle}>Current Medications</legend>
        {meds.length === 0 ? (
          <p style={emptyText}>No medications yet. Add one above!</p>
        ) : (
          <div style={recordsContainer}>
            {Array.from(grouped.entries()).map(([pId, items]) => (
              <div key={pId}>
                <div style={petGroupHeader}>{petMap.get(pId) ?? "Unknown Pet"}</div>
                {items
                  .sort((a, b) => (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1))
                  .map((m) =>
                    editId === m.id ? (
                      <div key={m.id} style={recordRow}>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" style={{ ...inputStyle, flex: 1 }} />
                        <input value={editDosage} onChange={(e) => setEditDosage(e.target.value)} placeholder="Dosage" style={{ ...inputStyle, width: 70 }} />
                        <input value={editFrequency} onChange={(e) => setEditFrequency(e.target.value)} placeholder="Frequency" style={{ ...inputStyle, width: 90 }} />
                        <input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} style={inputStyle} title="Start" />
                        <input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} style={inputStyle} title="End" />
                        <button type="button" onClick={handleSaveEdit} disabled={updateMut.isLoading} style={saveBtn}>{updateMut.isLoading ? "..." : "Save"}</button>
                        <button type="button" onClick={() => setEditId(null)} style={cancelBtn}>Cancel</button>
                      </div>
                    ) : (
                      <div key={m.id} style={{ ...recordRow, opacity: m.isActive ? 1 : 0.5 }}>
                        <span style={recordIcon}>{"\uD83D\uDC8A"}</span>
                        <span style={recordLabel}>{m.name}</span>
                        {m.dosage && <span style={recordMeta}>{m.dosage}</span>}
                        {m.frequency && <span style={recordMeta}>{m.frequency}</span>}
                        <span style={{
                          ...statusBadge,
                          background: m.isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(107, 114, 128, 0.1)",
                          color: m.isActive ? "#059669" : "#6B7280",
                        }}>
                          {m.isActive ? "Active" : "Inactive"}
                        </span>
                        <span style={{ flex: 1 }} />
                        <button type="button" onClick={() => handleToggleActive(m)} disabled={updateMut.isLoading} style={toggleBtn(m.isActive)}>
                          {m.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" onClick={() => startEdit(m)} style={editBtnStyle}>Edit</button>
                        <button type="button" onClick={() => handleDelete(m.id)} disabled={deleteMut.isLoading} style={deleteBtnStyle}>Delete</button>
                      </div>
                    )
                  )}
              </div>
            ))}
          </div>
        )}
        {(updateMut.error || deleteMut.error) && <p style={errorText}>{updateMut.error?.message ?? deleteMut.error?.message}</p>}
      </fieldset>
    </>
  );
}

// ══════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════

function toDateInput(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().split("T")[0];
}

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function groupByPet<T extends { petId: string }>(items: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const arr = grouped.get(item.petId) ?? [];
    arr.push(item);
    grouped.set(item.petId, arr);
  }
  return grouped;
}

// ══════════════════════════════════════════
// Styles
// ══════════════════════════════════════════

const titleStyle: React.CSSProperties = {
  margin: "0 0 1rem",
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "#1A1637",
};

const tabBar: React.CSSProperties = {
  display: "flex",
  gap: "0.35rem",
  marginBottom: "1.25rem",
  borderBottom: "2px solid #E5E7EB",
  paddingBottom: "0",
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "0.5rem 1rem",
  fontSize: "0.85rem",
  fontWeight: 600,
  border: "none",
  borderBottom: active ? "2px solid #6366F1" : "2px solid transparent",
  marginBottom: "-2px",
  background: "none",
  color: active ? "#6366F1" : "#6B7280",
  cursor: "pointer",
  transition: "all 0.15s ease",
});

const fieldsetStyle: React.CSSProperties = {
  border: "1px solid #E5E7EB",
  borderRadius: "0.75rem",
  padding: "0.75rem 1rem",
  margin: 0,
};

const legendStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "0.9rem",
  padding: "0 0.5rem",
  color: "#374151",
};

const chipRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.4rem",
  marginBottom: "0.6rem",
};

const suggestionChip = (active: boolean): React.CSSProperties => ({
  padding: "0.25rem 0.7rem",
  borderRadius: "999px",
  fontSize: "0.75rem",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  background: active
    ? "linear-gradient(135deg, #6366F1, #8B5CF6)"
    : "rgba(99, 102, 241, 0.06)",
  color: active ? "white" : "#6366F1",
  transition: "all 0.15s ease",
});

const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "0.6rem",
};

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const labelText: React.CSSProperties = { fontWeight: 600, fontSize: "0.75rem", color: "#374151" };

const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  borderRadius: "0.5rem",
  border: "1px solid #D1D5DB",
  fontSize: "0.85rem",
  outline: "none",
};

const addBtn = (loading: boolean): React.CSSProperties => ({
  padding: "0.45rem 1.1rem",
  borderRadius: "0.5rem",
  background: "linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)",
  color: "white",
  fontWeight: 600,
  fontSize: "0.85rem",
  border: "none",
  cursor: loading ? "not-allowed" : "pointer",
  opacity: loading ? 0.7 : 1,
  whiteSpace: "nowrap",
});

const petGroupHeader: React.CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 700,
  color: "#6366F1",
  padding: "0.25rem 0",
  borderBottom: "1px solid rgba(99, 102, 241, 0.1)",
  marginBottom: "0.35rem",
};

const recordsContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const recordRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.35rem 0.25rem",
  fontSize: "0.825rem",
  flexWrap: "wrap",
};

const overdueRow: React.CSSProperties = {
  background: "rgba(239, 68, 68, 0.04)",
  borderRadius: "0.375rem",
};

const recordIcon: React.CSSProperties = {
  fontSize: "0.9rem",
  lineHeight: 1,
};

const recordLabel: React.CSSProperties = {
  fontWeight: 600,
  color: "#1A1637",
};

const recordDate: React.CSSProperties = {
  color: "#6B7280",
  fontWeight: 500,
};

const recordMeta: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.75rem",
};

const statusBadge: React.CSSProperties = {
  padding: "0.15rem 0.5rem",
  borderRadius: "999px",
  fontSize: "0.7rem",
  fontWeight: 600,
};

const editBtnStyle: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "rgba(99, 102, 241, 0.06)",
  color: "#6366F1",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const deleteBtnStyle: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "rgba(239, 68, 68, 0.06)",
  color: "#DC2626",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const saveBtn: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "#6366F1",
  color: "white",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const cancelBtn: React.CSSProperties = {
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: "#F3F4F6",
  color: "#374151",
  fontWeight: 600,
  fontSize: "0.75rem",
  border: "none",
  cursor: "pointer",
};

const toggleBtn = (isActive: boolean): React.CSSProperties => ({
  padding: "0.2rem 0.6rem",
  borderRadius: "0.375rem",
  background: isActive ? "rgba(239, 68, 68, 0.06)" : "rgba(16, 185, 129, 0.06)",
  color: isActive ? "#DC2626" : "#059669",
  fontWeight: 600,
  fontSize: "0.7rem",
  border: "none",
  cursor: "pointer",
});

const closeBtnStyle: React.CSSProperties = {
  padding: "0.6rem 1.5rem",
  borderRadius: "0.5rem",
  background: "#F3F4F6",
  color: "#374151",
  fontWeight: 600,
  fontSize: "0.875rem",
  border: "none",
  cursor: "pointer",
};

const errorText: React.CSSProperties = {
  color: "#EF4444",
  fontSize: "0.825rem",
  marginTop: "0.5rem",
};

const emptyText: React.CSSProperties = {
  color: "#A5A8BA",
  fontSize: "0.85rem",
  textAlign: "center",
  margin: "1rem 0 0.5rem",
};
