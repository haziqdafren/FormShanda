import React, { useEffect } from 'react';

interface StepDokumenProps {
  values: {
    expMedex: string;
    expReccA320: string;
    flightDuration: string;
    idCard: string;
  };
  onChange: (field: string, value: string) => void;
  onValidChange: (valid: boolean) => void;
}

const StepDokumen: React.FC<StepDokumenProps> = ({ values, onChange, onValidChange }) => {
  // Validate fields
  useEffect(() => {
    const valid = values.expMedex && values.expReccA320 && values.flightDuration && values.idCard;
    onValidChange(!!valid);
  }, [values, onValidChange]);

  return (
    <div>
      <h4>Step 4: Dokumen</h4>
      <div className="form-group">
        <label htmlFor="expMedex">Exp Medex:</label>
        <input
          type="text"
          className="form-control"
          id="expMedex"
          value={values.expMedex}
          onChange={e => onChange('expMedex', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="expReccA320">Exp Recc A320:</label>
        <input
          type="text"
          className="form-control"
          id="expReccA320"
          value={values.expReccA320}
          onChange={e => onChange('expReccA320', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="flightDuration">Lama Terbang (dalam bulan):</label>
        <input
          type="text"
          className="form-control"
          id="flightDuration"
          value={values.flightDuration}
          readOnly
        />
      </div>
      <div className="form-group">
        <label htmlFor="idCard">ID Card:</label>
        <input
          type="text"
          className="form-control"
          id="idCard"
          value={values.idCard}
          onChange={e => onChange('idCard', e.target.value)}
        />
      </div>
    </div>
  );
};

export default StepDokumen; 