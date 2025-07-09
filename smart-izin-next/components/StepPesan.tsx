import React from 'react';

interface Flight {
  flight: string;
  etd: string;
  from: string;
  to: string;
  eta: string;
}
interface Day {
  dateStr: string;
  dateNum: number;
  actualDate: Date; // Real Date object for proper comparison
  flights: Flight[];
  skip: boolean;
  isWorking: boolean;
  tempFlightCode?: string;
}
interface Period {
  days: Day[];
  startDateStr: string;
  hariKe: string;
  tomorrowWorkingDayNumber?: number;
}

interface StepPesanProps {
  parsed: Period;
  info: {
    timeOfDay: string;
    gender: string;
    recipient: string;
  };
  dokumen: {
    expMedex: string;
    expReccA320: string;
    flightDuration: string;
    idCard: string;
  };
}

const formatDate = (dateStr: string) => {
  // Universal month conversion to Indonesian
  const monthMap: { [key: string]: string } = {
    'January': 'Januari', 'February': 'Februari', 'March': 'Maret', 'April': 'April',
    'May': 'Mei', 'June': 'Juni', 'July': 'Juli', 'August': 'Agustus',
    'September': 'September', 'October': 'Oktober', 'November': 'November', 'December': 'Desember'
  };
  
  // Handle "29 Tue" format - need to infer month from context
  const dayMatch = dateStr.match(/^(\d{1,2})\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i);
  if (dayMatch) {
    // For simple day format, we'll need the actual Date to determine month
    // For now, return as is and let the calling code provide proper date
    return `${dayMatch[1]} [Month] 2025`; // Placeholder, should be resolved by caller
  }
  
  // Handle "August 01 Fri" format (all months)
  const monthMatch = dateStr.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i);
  if (monthMatch) {
    const indonesianMonth = monthMap[monthMatch[1]] || monthMatch[1];
    return `${monthMatch[2]} ${indonesianMonth} 2025`;
  }
  
  // Fallback
  return dateStr;
};

// Better date formatter using actual Date object
const formatDateFromActual = (actualDate: Date): string => {
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                     'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const day = actualDate.getDate();
  const month = monthNames[actualDate.getMonth()];
  const year = actualDate.getFullYear();
  
  return `${day} ${month} ${year}`;
};

const StepPesan: React.FC<StepPesanProps> = ({ parsed, info, dokumen }) => {
  const [copySuccess, setCopySuccess] = React.useState(false);
  
  if (!parsed) return null;
  const today = new Date();
  
  // **USE UNIVERSAL DATE FORMATTING**
  const startDate = parsed.days[0] ? formatDateFromActual(parsed.days[0].actualDate) : '';
  const numDays = parsed.days.length;
  
  // **USE CORRECT WORKING DAY NUMBER**
  const workingDayNumber = parsed.tomorrowWorkingDayNumber || 1;
  const hariKeOptions = ['pertama', 'kedua', 'ketiga', 'keempat', 'kelima', 'keenam'];
  const hariKe = hariKeOptions[workingDayNumber - 1] || 'pertama';

  let message = `Selamat ${info.timeOfDay} ${info.gender} ${info.recipient},\n`;
  message += `Mohon maaf mengganggu waktu istirahat nya ${info.gender}, izin konfirmasi ${info.gender} perkenalkan saya :\n\n`;
  message += `Nama : Ershanda Juniarta\nNo ID : 231542\nBatch : 612 IU / SJV 32\n\n`;
  message += `Izin ikutan ${info.gender}, besok duty hari ${hariKe} saya ${info.gender} dan saya izin ikutan sejak besok pada tanggal ${startDate} untuk ${numDays} hari kedepan ${info.gender} dengan rute:\n\n`;
  parsed.days.forEach((d) => {
    message += `Pada tanggal ${formatDateFromActual(d.actualDate)}:\n`;
    d.flights.forEach((f) => {
      message += `- ${f.flight} ${f.from}-${f.to} (ETD ${f.etd})\n`;
    });
    message += '\n';
  });
  message += `Berikut saya lampirkan dokumen :\n`;
  message += `Nama : Ershanda Juniarta\nNo ID : 231542\nNo FAC : 23-0675\nExp medex : ${dokumen.expMedex}\n`;
  message += `Exp recc A320 : ${dokumen.expReccA320}\nExp passport : 31 Januari 2033\nID card : ${dokumen.idCard}\n`;
  message += `Vaksin : Vaksin ke 3 booster\nLama terbang : ${dokumen.flightDuration} Bulan\n\n`;
  message += `Semua Dokumen saya lengkap ${info.gender} SEP, OM dan Notice terbaru sudah saya download ${info.gender}. Mohon arahan serta bimbingannya ${info.gender}, dan saya izin ikutan yaa ${info.gender}🙏🏻\n`;
  message += `Terimakasih dan Selamat istirahat ${info.gender}🙏🏻`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      alert('Gagal menyalin pesan. Silakan copy manual.');
    }
  };

  return (
    <div className="fade-in">
      <h4>Step 5: Pesan</h4>
      <div style={{ background: '#f6f8fa', borderRadius: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 18, marginBottom: 16, whiteSpace: 'pre-wrap', maxHeight: '400px', overflowY: 'auto', lineHeight: 1.6 }}>
        {message}
      </div>
      
      {copySuccess && (
        <div className="slide-up" style={{ 
          background: '#4CAF50', 
          color: 'white', 
          padding: '12px 16px', 
          borderRadius: 12, 
          marginBottom: 16, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8,
          fontSize: 14,
          fontWeight: 500
        }}>
          <div className="success-checkmark" style={{ background: 'white' }}>
            <div style={{ color: '#4CAF50' }}>✓</div>
          </div>
          Pesan berhasil disalin ke clipboard!
        </div>
      )}
      
      <button 
        className="btn btn-secondary btn-block" 
        onClick={handleCopy}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: 8,
          fontSize: 16,
          fontWeight: 600
        }}
      >
        <i className="fa fa-copy"></i>
        {copySuccess ? 'Disalin!' : 'Salin Pesan'}
      </button>
    </div>
  );
};

export default StepPesan; 