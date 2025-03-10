import React from 'react';
import ProductionEstimator from './components/ProductionEstimator';

function App() {
  return (
    <div className="App">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-3xl font-bold">Agave Production Estimator</h1>
        <p className="mt-2">Track and forecast agave production, bottle estimates, and market distribution</p>
      </header>
      <main className="container mx-auto py-6 px-4">
        <ProductionEstimator />
      </main>
      <footer className="bg-gray-100 p-4 mt-8 text-center text-gray-600">
        <p>© 2025 Agave Production Estimator</p>
      </footer>
    </div>
  );
}

export default App;
