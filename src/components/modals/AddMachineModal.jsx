import React from "react";
import { X } from "lucide-react";

export default function AddMachineModal({ show, onClose, newMachineData, setNewMachineData, onAdd }) {
  if (!show) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) =>
        e.target.className === "modal-overlay" && onClose()
      }
    >
      <div className="premium-modal">
        <div className="modal-header-premium">
          <h3 className="modal-title">Add Machine</h3>

          <button
            className="modal-close-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-premium space-y-4">
          <div className="input-field-modern">
            <label htmlFor="machine-name">Machine Name</label>
            <input
              id="machine-name"
              name="machine-name"
              type="text"
              placeholder="e.g. Hydraulic Press #99"
              value={newMachineData.name}
              onChange={(e) =>
                setNewMachineData({
                  ...newMachineData,
                  name: e.target.value,
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="input-field-modern">
              <label htmlFor="machine-type">Machine Type</label>
              <select
                id="machine-type"
                name="machine-type"
                value={newMachineData.machine_type}
                onChange={(e) =>
                  setNewMachineData({
                    ...newMachineData,
                    machine_type: e.target.value,
                  })
                }
              >
                <option value="">Select Type</option>
                <option value="Hydraulic Press">Hydraulic Press</option>
                <option value="CNC Concentric">CNC Concentric</option>
                <option value="Industrial Loom">Industrial Loom</option>
                <option value="Generator">Generator</option>
              </select>
            </div>
            <div className="input-field-modern">
              <label htmlFor="machine-year">Year of Manufacture</label>
              <input
                id="machine-year"
                name="machine-year"
                type="number"
                placeholder="2024"
                value={newMachineData.model_year}
                onChange={(e) =>
                  setNewMachineData({
                    ...newMachineData,
                    model_year: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="input-field-modern">
            <label htmlFor="machine-oem">Manufacturer</label>
            <input
              id="machine-oem"
              name="machine-oem"
              type="text"
              placeholder="e.g. Hydra-Tech Germany"
              value={newMachineData.oem}
              onChange={(e) =>
                setNewMachineData({
                  ...newMachineData,
                  oem: e.target.value,
                })
              }
            />
          </div>

          <button
            className="main-action-btn h-11 rounded-lg mt-4 bg-slate-900"
            onClick={onAdd}
          >
            Add Machine
          </button>
        </div>
      </div>
    </div>
  );
}
