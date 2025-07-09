# Smart Izin Next

A modern, interactive multi-step form application for generating "Izin Ikutan" messages, built with Next.js and TypeScript. This application features OCR text recognition, intelligent date parsing, and automated message generation.

## Features

- **Multi-step Form**: Upload → Review → Info → Documents → Message
- **OCR Integration**: Automatic text recognition from uploaded images using Tesseract.js
- **Smart Date Parsing**: Intelligent parsing of flight schedules and dates
- **Responsive Design**: Mobile-first design with Bootstrap styling
- **TypeScript Support**: Full TypeScript integration for type safety

## Project Structure

```
├── pages/
│   ├── _app.tsx          # App configuration and global styles
│   └── index.tsx         # Main application page
├── components/
│   ├── StepUpload.tsx    # File upload component
│   ├── StepReview.tsx    # OCR review and parsing
│   ├── StepInfo.tsx      # Personal information form
│   ├── StepDokumen.tsx   # Document validation form
│   └── StepPesan.tsx     # Message generation and display
├── public/              # Static assets
├── styles/             # Global CSS styles
└── package.json        # Dependencies and scripts
```

## Technologies Used

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tesseract.js** - OCR text recognition
- **Bootstrap 5** - UI framework
- **FontAwesome** - Icons

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Build and Deploy

```bash
# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Usage

1. **Upload**: Upload an image containing flight schedule text
2. **Review**: Review and confirm the OCR-extracted text
3. **Info**: Enter personal information (time of day, gender, recipient)
4. **Documents**: Fill in document expiration dates and details
5. **Message**: Generate and copy the formatted "Izin Ikutan" message

## License

This project is private and for internal use only.
