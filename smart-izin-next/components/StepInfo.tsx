import React, { useEffect } from 'react';

interface StepInfoProps {
  values: {
    timeOfDay: string;
    gender: string;
    recipient: string;
  };
  onChange: (field: string, value: string) => void;
  onValidChange: (valid: boolean) => void;
}

const StepInfo: React.FC<StepInfoProps> = ({ values, onChange, onValidChange }) => {
  // Validate fields
  useEffect(() => {
    const valid = values.timeOfDay && values.gender && values.recipient;
    onValidChange(!!valid);
  }, [values, onValidChange]);

  return (
    <div>
      <h4>Step 3: Info</h4>
      <div className="form-group">
        <label htmlFor="timeOfDay">Waktu:</label>
        <select
          className="form-control"
          id="timeOfDay"
          value={values.timeOfDay}
          onChange={e => onChange('timeOfDay', e.target.value)}
        >
          <option value="">Pilih waktu</option>
          <option value="pagi">Pagi</option>
          <option value="siang">Siang</option>
          <option value="malam">Malam</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="gender">Pilih:</label>
        <select
          className="form-control"
          id="gender"
          value={values.gender}
          onChange={e => onChange('gender', e.target.value)}
        >
          <option value="">Pilih</option>
          <option value="mba">Mba</option>
          <option value="mas">Mas</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="recipient">Nama Penerima:</label>
        <input
          type="text"
          className="form-control"
          id="recipient"
          placeholder="Contoh: Eva Putri Anggaraini"
          value={values.recipient}
          onChange={e => onChange('recipient', e.target.value)}
        />
      </div>
    </div>
  );
};

export default StepInfo; 