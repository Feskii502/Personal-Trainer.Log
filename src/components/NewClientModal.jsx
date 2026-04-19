import { useState } from 'react';
import Modal from './ui/Modal.jsx';
import { addClient } from '../lib/store.js';

const toDateInput = (d) => d.toISOString().slice(0, 10);

export default function NewClientModal({ open, onClose, onCreated }) {
  const today = new Date();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 90);

  const [name, setName] = useState('');
  const [signup, setSignup] = useState(toDateInput(today));
  const [exp, setExp] = useState(toDateInput(expiry));
  const [height, setHeight] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    const id = addClient({
      name: name.trim(),
      signupDate: new Date(signup).toISOString(),
      expiryDate: exp ? new Date(exp).toISOString() : null,
      height: height === '' ? null : Number(height),
    });
    setName('');
    setHeight('');
    onCreated?.(id);
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Client"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary disabled:opacity-40"
            disabled={!name.trim()}
            onClick={submit}
          >
            Add Client
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="section-title block mb-2">Name</label>
          <input
            autoFocus
            className="input"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="section-title block mb-2">Signup Date</label>
            <input
              type="date"
              className="input"
              value={signup}
              onChange={(e) => setSignup(e.target.value)}
            />
          </div>
          <div>
            <label className="section-title block mb-2">Expiry Date</label>
            <input
              type="date"
              className="input"
              value={exp}
              onChange={(e) => setExp(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="section-title block mb-2">
            Height (cm) · set once
          </label>
          <input
            type="number"
            inputMode="numeric"
            className="input"
            placeholder="e.g., 178"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
          <div className="text-xs text-txt-muted mt-1.5">
            Cannot be edited later. Used to compute BMI.
          </div>
        </div>
      </div>
    </Modal>
  );
}
