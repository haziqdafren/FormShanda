import React, { useEffect, useState } from 'react';

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

interface StepReviewProps {
  files: File[];
  onParsed: (parsed: Period | null) => void;
  onConfirm: () => void;
}

const StepReview: React.FC<StepReviewProps> = ({ files, onParsed, onConfirm }) => {
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [parsed, setParsed] = useState<Period | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // OCR and parse when files change
  useEffect(() => {
    if (!files.length) return;
    setOcrStatus('Memproses gambar...');
    setProgress(0);
    setParsed(null);
    setError(null);
    setConfirmed(false);
    // Dynamically import tesseract.js only on the client
    import('tesseract.js').then(Tesseract => {
      Promise.all(files.map((file, idx) =>
        Tesseract.default.recognize(file, 'eng', {
          logger: m => {
            if (m.status === 'recognizing text') {
              setOcrStatus(`Gambar ${idx + 1}: ${Math.round(m.progress * 100)}%`);
              setProgress(Math.round((idx + m.progress) / files.length * 100));
            }
          }
        }).then(({ data: { text } }) => text)
      )).then(results => {
        setOcrStatus('Parsing jadwal...');
        const mergedText = results.join('\n');
        const period = parseSchedule(mergedText);
        if (period && period.days.length > 0) {
          setParsed(period);
          setError(null);
          onParsed(period);
        } else {
          setParsed(null);
          setError('Jadwal tidak valid atau tidak ditemukan.');
          onParsed(null);
        }
        setOcrStatus('');
        setProgress(100);
      }).catch(() => {
        setError('Gagal melakukan OCR. Coba ulangi.');
        setOcrStatus('');
        setProgress(0);
        setParsed(null);
        onParsed(null);
      });
    });
    // eslint-disable-next-line
  }, [files]);

  // **UNIVERSAL DATE HELPERS**
  const monthNameToNumber = (monthName: string): number => {
    const months: { [key: string]: number } = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    return months[monthName.toLowerCase()] ?? 0;
  };

  const createActualDate = (dateStr: string, contextMonth?: number, timestampMapping?: { [dayNum: number]: number }, year: number = 2025): Date => {
    // Handle "August 01 Fri" format - explicit month
    const monthMatch = dateStr.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i);
    if (monthMatch) {
      const month = monthNameToNumber(monthMatch[1]);
      const day = parseInt(monthMatch[2]);
      return new Date(year, month, day);
    }
    
    // Handle "29 Tue" format - PRIORITIZE TIMESTAMP MAPPING
    const dayMatch = dateStr.match(/^(\d{1,2})\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i);
    if (dayMatch) {
      const day = parseInt(dayMatch[1]);
      
      // **ULTRATHINK: Use timestamp mapping first (100% reliable)**
      if (timestampMapping && timestampMapping[day] !== undefined) {
        const month = timestampMapping[day];
        console.log(`TIMESTAMP OVERRIDE: ${dateStr} -> ${day} uses month ${month} from timestamp mapping`);
        return new Date(year, month, day);
      }
      
      // Fallback to context month
      const month = contextMonth ?? 6; // Default to July if no context
      return new Date(year, month, day);
    }
    
    // Fallback
    return new Date(year, 0, 1);
  };

  const detectScheduleContext = (lines: string[]): { contextMonth: number, hasMultipleMonths: boolean } => {
    let months = new Set<number>();
    let contextMonth = 6; // Default July
    let firstExplicitMonth = null;
    
    console.log('=== IMPROVED CONTEXT DETECTION ===');
    
    for (const line of lines) {
      const monthMatch = line.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)/i);
      if (monthMatch) {
        const month = monthNameToNumber(monthMatch[1]);
        months.add(month);
        console.log(`Found explicit month: ${monthMatch[1]} (${month})`);
        
        // **FIX 1: Use FIRST explicit month as context, not last**
        if (firstExplicitMonth === null) {
          firstExplicitMonth = month;
          contextMonth = month;
          console.log(`Setting context month to FIRST explicit month: ${monthMatch[1]} (${month})`);
        }
      }
      
      // **FIX 2: Also detect month names in mixed content**
      const mixedMonthMatch = line.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
      if (mixedMonthMatch && !monthMatch) {
        const month = monthNameToNumber(mixedMonthMatch[1]);
        months.add(month);
        console.log(`Found month in mixed content: ${mixedMonthMatch[1]} (${month})`);
        
        if (firstExplicitMonth === null) {
          firstExplicitMonth = month;
          contextMonth = month;
          console.log(`Setting context month to mixed month: ${mixedMonthMatch[1]} (${month})`);
        }
      }
    }
    
    // **FIX 3: Special logic for cross-month scenarios**
    if (months.size > 1) {
      const monthArray = Array.from(months).sort();
      // For cross-month, prefer the earlier month as context
      contextMonth = monthArray[0];
      console.log(`Cross-month detected: ${monthArray}, using EARLIER month as context: ${contextMonth}`);
    }
    
    console.log('Final context detection:', { contextMonth, hasMultipleMonths: months.size > 1, allMonths: Array.from(months) });
    
    return {
      contextMonth,
      hasMultipleMonths: months.size > 1
    };
  };

  // **ULTRATHINK TIMESTAMP EXTRACTION - 100% RELIABLE**
  const extractTimestampMapping = (lines: string[]): { [dayNum: number]: number } => {
    const dayToMonthMapping: { [dayNum: number]: number } = {};
    
    console.log('=== EXTRACTING TIMESTAMPS ===');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // **Pattern 1: Direct timestamp format "29/07/2025 21:30"**
      const directTimestampMatch = line.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
      if (directTimestampMatch) {
        const day = parseInt(directTimestampMatch[1]);
        const month = parseInt(directTimestampMatch[2]) - 1; // JS months are 0-indexed
        const year = parseInt(directTimestampMatch[3]);
        
        dayToMonthMapping[day] = month;
        console.log(`DIRECT TIMESTAMP: ${day}/${directTimestampMatch[2]}/${year} -> Day ${day} = Month ${month} (${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month]})`);
      }
      
      // **Pattern 2: Rest format "Rest : 28:55 (01/08/2025 05:00)"**
      const restTimestampMatch = line.match(/Rest\s*:\s*\d{1,2}:\d{2}\s*\((\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\)/);
      if (restTimestampMatch) {
        const day = parseInt(restTimestampMatch[1]);
        const month = parseInt(restTimestampMatch[2]) - 1; // JS months are 0-indexed
        const year = parseInt(restTimestampMatch[3]);
        
        dayToMonthMapping[day] = month;
        console.log(`REST TIMESTAMP: ${day}/${restTimestampMatch[2]}/${year} -> Day ${day} = Month ${month} (${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month]})`);
      }
      
      // **Pattern 3: Any format with dd/mm/yyyy**
      const generalTimestampMatch = line.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (generalTimestampMatch && !directTimestampMatch && !restTimestampMatch) {
        const day = parseInt(generalTimestampMatch[1]);
        const month = parseInt(generalTimestampMatch[2]) - 1; // JS months are 0-indexed
        const year = parseInt(generalTimestampMatch[3]);
        
        dayToMonthMapping[day] = month;
        console.log(`GENERAL TIMESTAMP: ${day}/${generalTimestampMatch[2]}/${year} -> Day ${day} = Month ${month} (${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month]})`);
      }
    }
    
    console.log('Final timestamp mapping:', dayToMonthMapping);
    return dayToMonthMapping;
  };

  const smartTodayDetectionCrossMonth = (allDays: Day[]): Date => {
    if (allDays.length === 0) return new Date();
    
    // Days are already sorted by corrected actual date
    const sortedDays = [...allDays];
    
    console.log('=== FIXED SMART TODAY DETECTION ===');
    console.log('Sorted days:', sortedDays.map(d => `${d.dateStr} (${d.actualDate.toDateString()}, working: ${d.isWorking})`));
    
    // **DETECT CROSS-MONTH SCENARIO**
    const months = [...new Set(sortedDays.map(d => d.actualDate.getMonth()))];
    const isCrossMonth = months.length > 1;
    console.log('Cross-month scenario detected:', isCrossMonth, 'months:', months);
    
    // **FIX 4: Detect if this is a historical/completed schedule**
    const currentDate = new Date();
    const latestScheduleDate = sortedDays[sortedDays.length - 1].actualDate;
    const isHistoricalSchedule = latestScheduleDate < currentDate;
    
    console.log('Schedule analysis:', {
      currentDate: currentDate.toDateString(),
      latestScheduleDate: latestScheduleDate.toDateString(),
      isHistoricalSchedule
    });
    
    if (isHistoricalSchedule) {
      // **FIX 5: For historical schedules, position "today" BEFORE the working period**
      console.log('HISTORICAL SCHEDULE DETECTED - using conservative today positioning');
      
      const firstWorkingDay = sortedDays.find(d => d.isWorking && d.flights.length > 0);
      if (firstWorkingDay) {
        const conservativeToday = new Date(firstWorkingDay.actualDate);
        conservativeToday.setDate(conservativeToday.getDate() - 1);
        console.log(`HISTORICAL: Setting today to ${conservativeToday.toDateString()} (before first working day ${firstWorkingDay.dateStr})`);
        return conservativeToday;
      }
      
      // Fallback for historical: day before earliest date
      const earliestDate = sortedDays[0].actualDate;
      const fallbackToday = new Date(earliestDate);
      fallbackToday.setDate(fallbackToday.getDate() - 1);
      console.log(`HISTORICAL FALLBACK: Setting today to ${fallbackToday.toDateString()}`);
      return fallbackToday;
    }
    
    // Strategy 1: Find the last OFF day in the schedule
    let lastOffDay = null;
    for (let i = sortedDays.length - 1; i >= 0; i--) {
      if (!sortedDays[i].isWorking) {
        lastOffDay = sortedDays[i];
        break;
      }
    }
    
    if (lastOffDay) {
      // **FIX 6: Be more careful about OFF day logic**
      // Check if this OFF day is at the end (completed cycle) vs beginning (upcoming cycle)
      const offDayIndex = sortedDays.findIndex(d => d === lastOffDay);
      const hasWorkingDaysAfterOff = sortedDays.slice(offDayIndex + 1).some(d => d.isWorking);
      
      if (hasWorkingDaysAfterOff) {
        // OFF day is in the middle/beginning, normal logic
        const today = new Date(lastOffDay.actualDate);
        today.setDate(today.getDate() + 1);
        console.log(`Strategy 1a: OFF day with working days after, setting today to ${today.toDateString()}`);
        return today;
      } else {
        // OFF day is at the end, this is a completed cycle - treat as historical
        const firstWorkingDay = sortedDays.find(d => d.isWorking && d.flights.length > 0);
        if (firstWorkingDay) {
          const today = new Date(firstWorkingDay.actualDate);
          today.setDate(today.getDate() - 1);
          console.log(`Strategy 1b: OFF day at end (completed cycle), setting today before working period: ${today.toDateString()}`);
          return today;
        }
      }
    }
    
    if (isCrossMonth) {
      // **CROSS-MONTH SPECIFIC LOGIC - ULTRA-CONSERVATIVE**
      console.log('Using cross-month specific logic...');
      
      // **ROOT CAUSE FIX: For cross-month scenarios, set "today" to the absolute earliest possible date**
      // This ensures ALL days across ALL months are treated as "future"
      const earliestDate = sortedDays[0].actualDate;
      const ultraConservativeToday = new Date(earliestDate);
      ultraConservativeToday.setDate(ultraConservativeToday.getDate() - 2); // Go back 2 days to be extra safe
      
      console.log(`CROSS-MONTH ULTRA-CONSERVATIVE: Setting today to ${ultraConservativeToday.toDateString()} (2 days before earliest: ${earliestDate.toDateString()})`);
      console.log(`This ensures ALL days will be > today:`, sortedDays.map(d => `${d.dateStr} (${d.actualDate.toDateString()}) > ${ultraConservativeToday.toDateString()} = ${d.actualDate > ultraConservativeToday}`));
      
      return ultraConservativeToday;
    }
    
    // **SINGLE MONTH LOGIC - Use more intelligent detection**
    const realToday = new Date();
    
    // Check if any of the schedule dates are close to real today
    const todayMatches = sortedDays.filter(d => {
      const dayDiff = Math.abs(d.actualDate.getTime() - realToday.getTime()) / (1000 * 60 * 60 * 24);
      return dayDiff <= 3; // Within 3 days of real today
    });
    
    if (todayMatches.length > 0) {
      console.log(`Strategy 2a: Found dates close to real today:`, todayMatches.map(d => d.dateStr));
      // Use real today, but ensure it's before the first working day
      const firstWorkingDay = sortedDays.find(d => d.isWorking);
      if (firstWorkingDay && realToday < firstWorkingDay.actualDate) {
        console.log(`Strategy 2a: Using real today ${realToday.toDateString()} (before first working day)`);
        return realToday;
      }
    }
    
    // Strategy 2b: Position today before the first working day
    const firstWorkingDay = sortedDays.find(d => d.isWorking);
    if (firstWorkingDay) {
      const today = new Date(firstWorkingDay.actualDate);
      today.setDate(today.getDate() - 1);
      console.log(`Strategy 2b: Set today to day before first working day: ${today.toDateString()}`);
      return today;
    }
    
    // Strategy 3: Fallback to real today adjusted for schedule context
    const scheduleMonth = sortedDays[0].actualDate.getMonth();
    const scheduleYear = sortedDays[0].actualDate.getFullYear();
    
    if (realToday.getMonth() !== scheduleMonth || realToday.getFullYear() !== scheduleYear) {
      const adjustedToday = new Date(scheduleYear, scheduleMonth, realToday.getDate());
      console.log(`Strategy 3: Adjusted today from ${realToday.toDateString()} to ${adjustedToday.toDateString()} to match schedule context`);
      return adjustedToday;
    }
    
    console.log(`Strategy 3: Using real today ${realToday.toDateString()}`);
    return realToday;
  };

  // **ULTRATHINK TIMESTAMP-BASED PARSING**
  function parseSchedule(text: string): Period | null {
    console.log('=== ULTRATHINK TIMESTAMP-BASED PARSING START ===');
    console.log('Raw OCR text:', text);
    
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    console.log('Cleaned lines:', lines);
    
    let daysMap: { [key: string]: Day } = {};
    
    // **SEPARATE SKIP CODE CATEGORIES**
    let nonWorkingCodes = ['OFF', 'DO', 'S/L']; // Day off, cycle breakers
    let workingButNoFlightsCodes = ['R2T2', 'R1T2', 'R3T2', 'SA1', 'SA2']; // Training/sim, still working days
    let allSkipCodes = [...nonWorkingCodes, ...workingButNoFlightsCodes];
    
    // **STEP 1: EXTRACT TIMESTAMPS FOR RELIABLE MONTH DETECTION**
    const dayToMonthMapping = extractTimestampMapping(lines);
    console.log('=== TIMESTAMP MAPPING ===');
    console.log('Day-to-month mapping:', dayToMonthMapping);
    
    // **STEP 2: DETECT SCHEDULE CONTEXT (with timestamp backup)**
    const { contextMonth, hasMultipleMonths } = detectScheduleContext(lines);
    console.log('=== CONTEXT DETECTION ===');
    console.log('Detected schedule context:', { contextMonth, hasMultipleMonths });
    console.log('Context month name:', ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][contextMonth]);
    
    let currentDay: Day | null = null;
    
    // Patterns to match your actual format
    let dayRegex = /^(\d{1,2})\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i; // "08 Tue", "19 Sat"
    let dayRegexWithMonth = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i; // "August 01 Fri"
    let flightRegex = /^([A-Z0-9]{2,})\s+(\d{4})\s+([A-Z]{3})\s+([A-Z]{3})\s+(\d{4})$/; // "IU856 0730 CGK BTH 0910"
    
    console.log('=== LINE BY LINE PARSING ===');
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      console.log(`Processing line ${i}: "${line}"`);
      
      // Check for day headers
      let dayMatch = line.match(dayRegex);
      let dayWithMonthMatch = line.match(dayRegexWithMonth);
      
      if (dayMatch) {
        console.log(`  -> MATCHED simple day pattern: ${dayMatch[0]}`);
      } else if (dayWithMonthMatch) {
        console.log(`  -> MATCHED explicit month pattern: ${dayWithMonthMatch[0]}`);
      } else if (line.match(flightRegex)) {
        console.log(`  -> MATCHED flight pattern: ${line}`);
      } else if (nonWorkingCodes.some(code => line.includes(code))) {
        console.log(`  -> MATCHED non-working code: ${line}`);
      } else if (workingButNoFlightsCodes.some(code => line.includes(code))) {
        console.log(`  -> MATCHED working-no-flights code: ${line}`);
      } else {
        console.log(`  -> NO MATCH for: "${line}"`);
      }
      
      if (dayMatch) {
        // Format: "29 Tue" - **ULTRATHINK: Use timestamp mapping**
        let dateNum = parseInt(dayMatch[1]);
        let dayName = dayMatch[2];
        let dateStr = `${dayMatch[1]} ${dayName}`;
        let actualDate = createActualDate(dateStr, contextMonth, dayToMonthMapping);
        
        console.log(`PARSED SIMPLE DAY: ${dateStr} -> ${actualDate.toDateString()} (using timestamp mapping)`);
        
        currentDay = { 
          dateStr: dateStr, 
          dateNum: dateNum,
          actualDate: actualDate,
          flights: [], 
          skip: false,
          isWorking: true
        };
        daysMap[dateStr] = currentDay;
        continue;
      }
      
      if (dayWithMonthMatch) {
        // Format: "August 01 Fri" - **Explicit month always reliable**
        let month = dayWithMonthMatch[1];
        let dateNum = parseInt(dayWithMonthMatch[2]);
        let dayName = dayWithMonthMatch[3];
        let dateStr = `${month} ${dayWithMonthMatch[2]} ${dayName}`;
        let actualDate = createActualDate(dateStr, contextMonth, dayToMonthMapping);
        
        console.log(`PARSED EXPLICIT DAY: ${dateStr} -> ${actualDate.toDateString()}`);
        
        currentDay = { 
          dateStr: dateStr, 
          dateNum: dateNum,
          actualDate: actualDate,
          flights: [], 
          skip: false,
          isWorking: true
        };
        daysMap[dateStr] = currentDay;
        continue;
      }
      
      // **ULTRATHINK: Timestamp-based day parsing (backup)**
      const looseDayMatch = line.match(/^(\d{1,2})\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i);
      if (looseDayMatch) {
        let dateNum = parseInt(looseDayMatch[1]);
        let dayName = looseDayMatch[2];
        let dateStr = `${looseDayMatch[1]} ${dayName}`;
        
        // **PRIORITY 1: Use timestamp mapping if available**
        if (dayToMonthMapping[dateNum] !== undefined) {
          let actualDate = createActualDate(dateStr, contextMonth, dayToMonthMapping);
          
          console.log(`PARSED TIMESTAMP-BASED DAY: ${dateStr} -> ${actualDate.toDateString()} (using timestamp mapping)`);
          
          // **Check for duplicate - only create if not already exists**
          if (!daysMap[dateStr]) {
            currentDay = { 
              dateStr: dateStr, 
              dateNum: dateNum,
              actualDate: actualDate,
              flights: [], 
              skip: false,
              isWorking: true
            };
            daysMap[dateStr] = currentDay;
          } else {
            currentDay = daysMap[dateStr];
            console.log(`Using existing day: ${dateStr}`);
          }
          continue;
        }
        
        // **PRIORITY 2: Check previous lines for month context**
        let foundMonthContext = null;
        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
          const prevMonthMatch = lines[j].match(/^(January|February|March|April|May|June|July|August|September|October|November|December)$/i);
          if (prevMonthMatch) {
            foundMonthContext = monthNameToNumber(prevMonthMatch[1]);
            console.log(`Found recent month context for ${line}: ${prevMonthMatch[1]} (${foundMonthContext}) at line ${j}`);
            break;
          }
        }
        
        // **PRIORITY 3: Use recent month context if different from global context**
        if (foundMonthContext !== null && foundMonthContext !== contextMonth) {
          let actualDate = createActualDate(dateStr, foundMonthContext, dayToMonthMapping);
          
          console.log(`PARSED CONTEXT-AWARE DAY: ${dateStr} -> ${actualDate.toDateString()} (using recent context month ${foundMonthContext} instead of global ${contextMonth})`);
          
          // **Check for duplicate - only create if not already exists**
          if (!daysMap[dateStr]) {
            currentDay = { 
              dateStr: dateStr, 
              dateNum: dateNum,
              actualDate: actualDate,
              flights: [], 
              skip: false,
              isWorking: true
            };
            daysMap[dateStr] = currentDay;
          } else {
            currentDay = daysMap[dateStr];
            console.log(`Using existing day: ${dateStr}`);
          }
          continue;
        }
      }
      
      // Skip if no current day
      if (!currentDay) continue;
      
      // **CHECK FOR SKIP CODES WITH DIFFERENT HANDLING**
      if (nonWorkingCodes.some(code => line.includes(code))) {
        // OFF, DO, S/L - not working at all
        console.log(`  -> SETTING NON-WORKING: ${line}`);
        currentDay.skip = true;
        currentDay.isWorking = false;
        continue;
      }
      
      // **FIX 8: Better R2T2 detection - check before flight regex**
      if (workingButNoFlightsCodes.some(code => line.includes(code))) {
        // R2T2, R1T2, etc - working day but no regular flights
        console.log(`  -> SETTING WORKING-NO-FLIGHTS: ${line}`);
        currentDay.skip = true; // Skip for flight parsing
        currentDay.isWorking = true; // Still counts as working day
        continue;
      }
      
      // **FIX 9: Special R2T2 flight format detection**
      const r2t2Match = line.match(/^(R\d+T\d+)\s+(\d{4})\s+([A-Z]{3})\s+([A-Z]{3})\s+(\d{4})$/);
      if (r2t2Match) {
        console.log(`  -> DETECTED R2T2 FLIGHT FORMAT: ${line} - treating as working-no-flights`);
        currentDay.skip = true; // Skip for flight parsing (training flights don't count)
        currentDay.isWorking = true; // Still counts as working day
        continue;
      }
      
      // **CHECK FOR FLIGHT LINES - Handle both single line and split format**
      let flightMatch = line.match(flightRegex);
      if (flightMatch) {
        console.log(`  -> ADDING FLIGHT: ${flightMatch[1]} ${flightMatch[2]} ${flightMatch[3]}-${flightMatch[4]} ${flightMatch[5]}`);
        currentDay.flights.push({
          flight: flightMatch[1],
          etd: flightMatch[2],
          from: flightMatch[3],
          to: flightMatch[4],
          eta: flightMatch[5]
        });
      } else {
        // **Handle split flight format: "IU831" on one line, "1200 BKS CGK 1315" on next**
        let flightCodeMatch = line.match(/^([A-Z0-9]{2,})$/); // Just flight code
        let flightDetailsMatch = line.match(/^(\d{4})\s+([A-Z]{3})\s+([A-Z]{3})\s+(\d{4})$/); // Time and route
        
        if (flightCodeMatch && currentDay) {
          // Store flight code temporarily
          console.log(`  -> STORING FLIGHT CODE: ${flightCodeMatch[1]}`);
          currentDay.tempFlightCode = flightCodeMatch[1];
        } else if (flightDetailsMatch && currentDay && currentDay.tempFlightCode) {
          // Combine with stored flight code
          console.log(`  -> COMBINING SPLIT FLIGHT: ${currentDay.tempFlightCode} + ${flightDetailsMatch[0]}`);
          currentDay.flights.push({
            flight: currentDay.tempFlightCode,
            etd: flightDetailsMatch[1],
            from: flightDetailsMatch[2],
            to: flightDetailsMatch[3],
            eta: flightDetailsMatch[4]
          });
          delete currentDay.tempFlightCode; // Clean up
        }
      }
    }
    
    // **STEP 1: Get ALL days and fix cross-month context**
    let allDays = Object.values(daysMap);
    
    console.log('=== RAW PARSED DAYS ===');
    allDays.forEach(d => {
      console.log(`RAW: ${d.dateStr} -> ${d.actualDate.toDateString()} (working: ${d.isWorking}, flights: ${d.flights.length})`);
    });
    
    // **ULTRATHINK: Timestamp-based validation (no correction needed)**
    console.log('=== TIMESTAMP-BASED VALIDATION ===');
    
    // **STEP 1: Detect all months present in the schedule**
    const allMonthsInSchedule = [...new Set(allDays.map(d => d.actualDate.getMonth()))].sort();
    console.log('All months in schedule:', allMonthsInSchedule.map(m => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]));
    
    // **STEP 2: Validate against timestamp mapping**
    const timestampMonths = Object.values(dayToMonthMapping);
    const uniqueTimestampMonths = [...new Set(timestampMonths)].sort();
    console.log('Timestamp months:', uniqueTimestampMonths.map(m => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]));
    
    // **STEP 3: Check for any mismatches and correct if necessary**
    let correctionsMade = 0;
    allDays.forEach(day => {
      const isSimpleFormat = day.dateStr.match(/^(\d{1,2})\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i);
      if (isSimpleFormat) {
        const dayNum = day.dateNum;
        const currentMonth = day.actualDate.getMonth();
        
        // Check if timestamp mapping has a different month for this day
        if (dayToMonthMapping[dayNum] !== undefined && dayToMonthMapping[dayNum] !== currentMonth) {
          const correctMonth = dayToMonthMapping[dayNum];
          const oldDate = day.actualDate.toDateString();
          day.actualDate = new Date(2025, correctMonth, dayNum);
          console.log(`TIMESTAMP CORRECTION: ${day.dateStr} from ${oldDate} to ${day.actualDate.toDateString()}`);
          correctionsMade++;
        }
      }
    });
    
    console.log(`Timestamp-based corrections made: ${correctionsMade}`);
    
    if (uniqueTimestampMonths.length > 1) {
      console.log('✅ Cross-month schedule detected via timestamps - highly reliable!');
    } else {
      console.log('Single month schedule detected via timestamps');
    }
    
    // **STEP 1.5: MONTH-AWARE SORTING - Critical for cross-month logic**
    console.log('=== MONTH-AWARE SORTING ===');
    console.log('Before sorting:', allDays.map(d => `${d.dateStr} -> ${d.actualDate.toDateString()}`));
    
    // Sort all days by corrected actual date AND ensure month progression
    allDays.sort((a, b) => {
      // Primary sort: by actual date
      const dateCompare = a.actualDate.getTime() - b.actualDate.getTime();
      if (dateCompare !== 0) return dateCompare;
      
      // Secondary sort: if same date, prefer explicit month format
      const aIsExplicit = a.dateStr.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)/);
      const bIsExplicit = b.dateStr.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)/);
      
      if (aIsExplicit && !bIsExplicit) return -1;
      if (!aIsExplicit && bIsExplicit) return 1;
      return 0;
    });
    
    console.log('After month-aware sorting:', allDays.map(d => `${d.dateStr} -> ${d.actualDate.toDateString()}`));
    
    // **STEP 2: CONSERVATIVE Smart "today" detection for cross-month scenarios**
    const smartToday = smartTodayDetectionCrossMonth(allDays);
    console.log('Smart today detection (cross-month aware):', smartToday.toDateString());
    console.log('All days after correction:', allDays.map(d => ({ 
      dateStr: d.dateStr, 
      actualDate: d.actualDate.toDateString(),
      isWorking: d.isWorking,
      hasFlights: d.flights.length > 0
    })));
    
    // **STEP 3: Find current work cycle start (universal date logic)**
    function findWorkCycleStart(days: Day[], today: Date): number {
      let lastOffDayIndex = -1;
      for (let i = 0; i < days.length; i++) {
        if (days[i].actualDate <= today) {
          if (!days[i].isWorking) {
            lastOffDayIndex = i; // Keep tracking the latest OFF day
          }
        }
      }
      
      if (lastOffDayIndex >= 0) {
        // Found last non-working day, work cycle starts the day after
        return lastOffDayIndex + 1;
      }
      
      // If no non-working day found, assume cycle starts from first day
      return 0;
    }
    
    // **STEP 4: Count completed working days in current cycle (universal date logic)**
    function countCompletedWorkingDays(days: Day[], cycleStartIndex: number, today: Date): number {
      let count = 0;
      console.log('=== COUNTING COMPLETED WORKING DAYS ===');
      console.log(`Cycle starts at index ${cycleStartIndex}, today is ${today.toDateString()}`);
      
      for (let i = cycleStartIndex; i < days.length; i++) {
        // Count working days up to and INCLUDING today
        const dayIsBeforeOrOnToday = days[i].actualDate <= today;
        const dayIsWorking = days[i].isWorking;
        
        console.log(`Day ${i}: ${days[i].dateStr} (${days[i].actualDate.toDateString()}) - beforeOrOnToday: ${dayIsBeforeOrOnToday}, isWorking: ${dayIsWorking}`);
        
        if (dayIsBeforeOrOnToday && dayIsWorking) {
          count++;
          console.log(`  -> COUNTED as completed working day #${count}`);
        }
      }
      
      console.log(`Total completed working days: ${count}`);
      return count;
    }
    
    // **STEP 5: Calculate work cycle info (universal)**
    const workCycleStartIndex = findWorkCycleStart(allDays, smartToday);
    const completedWorkingDays = countCompletedWorkingDays(allDays, workCycleStartIndex, smartToday);
    const tomorrowWorkingDayNumber = completedWorkingDays + 1;
    
    console.log('=== WORK CYCLE CALCULATION ===');
    console.log('Work cycle calculation:', {
      smartToday: smartToday.toDateString(),
      workCycleStartIndex,
      completedWorkingDays,
      tomorrowWorkingDayNumber
    });
    
    // **STEP 6: Filter future days with actual flights only (universal date logic)**
    console.log('=== FUTURE DAY FILTERING ===');
    console.log('Smart today detection:', smartToday.toDateString());
    console.log('All days before filtering:');
    allDays.forEach(d => {
      console.log(`  ${d.dateStr} -> ${d.actualDate.toDateString()} (working: ${d.isWorking}, skip: ${d.skip}, flights: ${d.flights.length})`);
    });
    
    let futureDays = allDays.filter(d => {
      const isFuture = d.actualDate > smartToday;
      const isWorking = d.isWorking;
      const notSkipped = !d.skip;
      const hasFlights = d.flights.length > 0;
      const shouldInclude = isFuture && isWorking && notSkipped && hasFlights;
      
      console.log(`FILTER ${d.dateStr} (${d.actualDate.toDateString()}): future=${isFuture}, working=${isWorking}, notSkipped=${notSkipped}, hasFlights=${hasFlights} -> ${shouldInclude ? 'INCLUDE' : 'EXCLUDE'}`);
      
      return shouldInclude;
    });
    
    console.log('=== FILTERING RESULTS ===');
    console.log('Future days included:', futureDays.map(d => `${d.dateStr} (${d.actualDate.toDateString()})`));
    console.log('Future days excluded:', allDays.filter(d => !futureDays.includes(d)).map(d => `${d.dateStr} (${d.actualDate.toDateString()}) - reason: ${d.actualDate <= smartToday ? 'not future' : !d.isWorking ? 'not working' : d.skip ? 'skipped' : 'no flights'}`));
    
    // **STEP 7: Build period until last CGK arrival with cross-month awareness**
    console.log('=== PERIOD BUILDING ===');
    console.log('Future days to build period from:', futureDays.map(d => `${d.dateStr} (${d.actualDate.toDateString()})`));
    
    let periodDays: Day[] = [];
    for (let i = 0; i < futureDays.length; i++) {
      periodDays.push(futureDays[i]);
      console.log(`Added to period: ${futureDays[i].dateStr} (${futureDays[i].actualDate.toDateString()})`);
      
      let lastFlight = futureDays[i].flights[futureDays[i].flights.length - 1];
      if (lastFlight && lastFlight.to === 'CGK') {
        console.log(`Found CGK arrival on ${futureDays[i].dateStr}, ending period build`);
        break;
      }
    }
    
    console.log('=== FINAL PERIOD ===');
    console.log('Period days:', periodDays.map(d => `${d.dateStr} (${d.actualDate.toDateString()})`));
    console.log('Period spans months:', [...new Set(periodDays.map(d => d.actualDate.getMonth()))]);
    
    // **STEP 8: Convert day number to "hari ke-" text**
    let hariKeOptions = ['pertama', 'kedua', 'ketiga', 'keempat', 'kelima', 'keenam'];
    let hariKe = hariKeOptions[tomorrowWorkingDayNumber - 1] || 'pertama';
    
    console.log('=== FINAL RESULT ===');
    console.log(`Tomorrow working day number: ${tomorrowWorkingDayNumber} -> hari ${hariKe}`);
    console.log(`Period length: ${periodDays.length} days`);
    console.log(`Starts: ${periodDays[0]?.dateStr} (${periodDays[0]?.actualDate.toDateString()})`);
    console.log(`Ends: ${periodDays[periodDays.length - 1]?.dateStr} (${periodDays[periodDays.length - 1]?.actualDate.toDateString()})`);
    
    // **ROOT CAUSE ANALYSIS SUMMARY**
    console.log('=== ROOT CAUSE ANALYSIS SUMMARY ===');
    console.log('1. RAW PARSED DAYS:', Object.keys(daysMap));
    console.log('2. AFTER CROSS-MONTH CORRECTION:', allDays.map(d => `${d.dateStr} -> ${d.actualDate.toDateString()}`));
    console.log('3. SMART TODAY CUTOFF:', smartToday.toDateString());
    console.log('4. FUTURE FILTER RESULTS:', futureDays.map(d => `${d.dateStr} (${d.actualDate.toDateString()})`));
    console.log('5. FINAL PERIOD:', periodDays.map(d => `${d.dateStr} (${d.actualDate.toDateString()})`));
    
    if (periodDays.length === 0) {
      console.log('❌ ERROR: No days in final period! Check the filters above.');
    }
    
    // **CROSS-MONTH VALIDATION**
    const periodMonths = [...new Set(periodDays.map(d => d.actualDate.getMonth()))];
    console.log('Period spans months:', periodMonths.map(m => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]));
    
    if (periodMonths.length > 1) {
      console.log('✅ SUCCESS: Cross-month period detected and included!');
    } else if (periodMonths.length === 1) {
      console.log('⚠️  WARNING: Only single month in period - check if this is expected');
    }
    
    return periodDays.length > 0 ? {
      days: periodDays,
      startDateStr: periodDays[0].dateStr,
      hariKe,
      tomorrowWorkingDayNumber // Add this for message generation
    } : null;
  }

  return (
    <div>
      <h4>Step 2: Review</h4>
      
      {/* Auto filtering info */}
      <div style={{ background: '#e8f4f8', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
        <strong>📅 Smart Filter:</strong> Menampilkan jadwal untuk periode mendatang secara otomatis
      </div>

      {ocrStatus && (
        <div className="fade-in" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="loading-spinner"></div>
            {ocrStatus}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {error && <div style={{ color: '#d32f2f', fontWeight: 500, marginBottom: 10 }}>{error}</div>}
      {parsed && (
        <div className="slide-up" style={{ background: '#f6f8fa', borderRadius: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 18, marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: '1.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="success-checkmark"></div>
            Jadwal Ditemukan:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'white', padding: 12, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Mulai</div>
              <div style={{ fontWeight: 600 }}>{parsed.startDateStr}</div>
            </div>
            <div style={{ background: 'white', padding: 12, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Jumlah hari</div>
              <div style={{ fontWeight: 600 }}>{parsed.days.length}</div>
            </div>
            <div style={{ background: 'white', padding: 12, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Hari ke-</div>
              <div style={{ fontWeight: 600 }}>{parsed.hariKe}</div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Rute:</div>
            <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '8px 0' }}>
              {parsed.days.map((d, i) => (
                <div key={i} style={{ marginBottom: 12, padding: 12, background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: '#7f53ac' }}>{d.dateStr}</div>
                  {d.flights.map((f, j) => (
                    <div key={j} style={{ fontSize: 14, color: '#555', marginBottom: 2 }}>
                      • {f.flight} {f.from}-{f.to} (ETD {f.etd})
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <button 
            className="btn btn-primary btn-block" 
            style={{ marginTop: 8 }} 
            onClick={() => { setConfirmed(true); onConfirm(); }}
          >
            Lanjutkan
          </button>
        </div>
      )}
    </div>
  );
};

export default StepReview; 