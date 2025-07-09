import React, { useState } from 'react';
import StepUpload from '../components/StepUpload';
import dynamic from 'next/dynamic';
import StepInfo from '../components/StepInfo';
import StepDokumen from '../components/StepDokumen';
import StepPesan from '../components/StepPesan';

// Dynamically import StepReview to avoid SSR issues with tesseract.js
const StepReview = dynamic(() => import('../components/StepReview'), { ssr: false });

export default function Home() {
  // Track the current step (0: Upload, 1: Review, 2: Info, 3: Dokumen, 4: Pesan)
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [parsed, setParsed] = useState<unknown>(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  // Info step state
  const [info, setInfo] = useState({ timeOfDay: '', gender: '', recipient: '' });
  const [infoValid, setInfoValid] = useState(false);
  // Dokumen step state
  const [dokumen, setDokumen] = useState({
    expMedex: '10 Oktober 2025',
    expReccA320: '30 November 2025',
    flightDuration: '',
    idCard: 'July 2027',
  });
  const [dokumenValid, setDokumenValid] = useState(false);

  // Calculate flight duration (months since July 2023)
  React.useEffect(() => {
    const flightStartDate = new Date('2023-07-01');
    const currentDate = new Date();
    const monthsDiff = (currentDate.getFullYear() - flightStartDate.getFullYear()) * 12 + (currentDate.getMonth() - flightStartDate.getMonth());
    setDokumen(d => ({ ...d, flightDuration: monthsDiff.toString() }));
  }, []);

  // Only enable next if current step is valid
  const canGoNext =
    (step === 0 && files.length > 0) ||
    (step === 1 && reviewConfirmed) ||
    (step === 2 && infoValid) ||
    (step === 3 && dokumenValid) ||
    step > 3;

  return (
    <div style={{ 
      maxWidth: 480, 
      margin: '0 auto', 
      padding: '16px', 
      background: '#fff', 
      borderRadius: 18, 
      marginTop: '24px',
      marginBottom: '24px',
      marginLeft: '16px',
      marginRight: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
      minHeight: '80vh'
    }}>
      <h2 style={{ 
        textAlign: 'center', 
        fontWeight: 700, 
        letterSpacing: 0.5,
        background: 'linear-gradient(90deg, #7f53ac, #647dee)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '24px'
      }}>
        ❤️ Izin Ikutan Shanda
      </h2>
      {/* Stepper UI */}
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '18px 0', flexWrap: 'wrap' }}>
        {["Upload", "Review", "Info", "Dokumen", "Pesan"].map((label, i) => (
          <div key={i} style={{ textAlign: 'center', flex: 1, minWidth: '60px' }}>
            <div style={{
              width: 32, 
              height: 32, 
              borderRadius: '50%',
              background: step === i ? 'linear-gradient(90deg,#7f53ac,#647dee)' : step > i ? '#4CAF50' : '#e3e8ee',
              color: (step === i || step > i) ? '#fff' : '#7f53ac',
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 600, 
              fontSize: '1.1em', 
              marginBottom: 6,
              transition: 'all 0.3s ease',
              boxShadow: step === i ? '0 4px 12px rgba(127, 83, 172, 0.3)' : 'none'
            }}>
              {step > i ? '✓' : i + 1}
            </div>
            <div style={{ 
              fontSize: '0.8em', 
              color: step === i ? '#7f53ac' : step > i ? '#4CAF50' : '#888', 
              fontWeight: step === i ? 600 : 400,
              transition: 'all 0.3s ease'
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>
      {/* Step content */}
      {step === 0 && (
        <div className="fade-in">
          <h4>Step 1: Upload</h4>
          <StepUpload onUploadComplete={setFiles} />
          <button
            style={{ marginTop: 24 }}
            className="btn btn-primary btn-block"
            onClick={() => setStep(1)}
            disabled={!canGoNext}
          >
            <i className="fa fa-arrow-right" style={{ marginRight: 8 }}></i>
            Next
          </button>
        </div>
      )}
      {step === 1 && (
        <div className="fade-in">
          <StepReview
            files={files}
            onParsed={parsed => {
              setParsed(parsed);
              setReviewConfirmed(false);
            }}
            onConfirm={() => setReviewConfirmed(true)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setStep(0)}
            >
              <i className="fa fa-arrow-left" style={{ marginRight: 8 }}></i>
              Back
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2 }}
              onClick={() => setStep(2)}
              disabled={!canGoNext}
            >
              <i className="fa fa-arrow-right" style={{ marginRight: 8 }}></i>
              Next
            </button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="fade-in">
          <StepInfo
            values={info}
            onChange={(field, value) => setInfo(i => ({ ...i, [field]: value }))}
            onValidChange={setInfoValid}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setStep(1)}
            >
              <i className="fa fa-arrow-left" style={{ marginRight: 8 }}></i>
              Back
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2 }}
              onClick={() => setStep(3)}
              disabled={!canGoNext}
            >
              <i className="fa fa-arrow-right" style={{ marginRight: 8 }}></i>
              Next
            </button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="fade-in">
          <StepDokumen
            values={dokumen}
            onChange={(field, value) => setDokumen(d => ({ ...d, [field]: value }))}
            onValidChange={setDokumenValid}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setStep(2)}
            >
              <i className="fa fa-arrow-left" style={{ marginRight: 8 }}></i>
              Back
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2 }}
              onClick={() => setStep(4)}
              disabled={!canGoNext}
            >
              <i className="fa fa-check" style={{ marginRight: 8 }}></i>
              Generate
            </button>
          </div>
        </div>
      )}
      {step === 4 && (
        <div className="fade-in">
          <StepPesan parsed={parsed as any} info={info} dokumen={dokumen} />
          <button
            className="btn btn-secondary btn-block"
            style={{ marginTop: 16 }}
            onClick={() => setStep(3)}
          >
            <i className="fa fa-arrow-left" style={{ marginRight: 8 }}></i>
            Back to Edit
          </button>
        </div>
      )}
    </div>
  );
} 