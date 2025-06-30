# Prism Frontend

This is the frontend application for the Samsung Prism project. It is built using React and Vite, with Tailwind CSS for styling.

## Features
- Modern, responsive UI
- Fast development with Vite
- Styled with Tailwind CSS
- Organized component structure

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Navigate to the `frontend` directory:
   ```sh
   cd frontend
   ```
2. Install dependencies:
   ```sh
   npm install
   # or
   yarn install
   ```

### Running the Development Server

Start the app in development mode:
```sh
npm run dev
# or
yarn dev
```
The app will be available at [http://localhost:5173](http://localhost:5173) by default.

### Building for Production

To build the app for production:
```sh
npm run build
# or
yarn build
```
The output will be in the `dist` folder.

### Linting

To lint the codebase:
```sh
npm run lint
# or
yarn lint
```

## Project Structure
```
frontend/
├── public/           # Static assets
├── src/
│   ├── assets/       # Images and static files
│   ├── components/   # React components
│   ├── json/         # JSON data
│   ├── routes/       # App routes
│   ├── services/     # API services
│   ├── utils/        # Utility functions
│   ├── App.jsx       # Main app component
│   └── main.jsx      # Entry point
├── index.html        # HTML template
├── package.json      # Project metadata and scripts
├── tailwind.config.js# Tailwind CSS config
└── vite.config.js    # Vite config
```

## Customization
- Update `src/components/` to add or modify UI components.
- Edit `tailwind.config.js` for custom styles.
- Place static assets in `public/` or `src/assets/`.

## License
This project is part of the Prism suite. See the main repository for license details.
