import './App.css';
import React, { useState } from 'react';
import TransportAnalysis from './components/TransportAnalysis';

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div className="lds-dual-ring" style={{ display: 'inline-block', width: 40, height: 40 }}></div>
      <style>{`
        .lds-dual-ring {
          display: inline-block;
          width: 40px;
          height: 40px;
        }
        .lds-dual-ring:after {
          content: " ";
          display: block;
          width: 32px;
          height: 32px;
          margin: 4px;
          border-radius: 50%;
          border: 4px solid #1976d2;
          border-color: #1976d2 transparent #1976d2 transparent;
          animation: lds-dual-ring 1.2s linear infinite;
        }
        @keyframes lds-dual-ring {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}


const cardStyle = {
  background: '#fff',
  borderRadius: 10,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  padding: 24,
  margin: '24px auto',
  maxWidth: 600,
  textAlign: 'left',
};
const sectionTitle = {
  color: '#1a237e',
  marginBottom: 12,
  fontWeight: 700,
  letterSpacing: 0.5,
};
const labelStyle = {
  fontWeight: 500,
  marginRight: 8,
};
const buttonStyle = {
  background: '#1976d2',
  color: '#fff',
  border: 'none',
  borderRadius: 5,
  padding: '8px 18px',
  marginLeft: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 15,
  transition: 'background 0.2s',
};
const inputStyle = {
  border: '1px solid #bdbdbd',
  borderRadius: 4,
  padding: '6px 10px',
  fontSize: 15,
};
const footerStyle = {
  marginTop: 48,
  textAlign: 'center',
  color: '#888',
  fontSize: 14,
};

function App() {
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState('');
  const [numClusters, setNumClusters] = useState(6);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setFilename('');
    setResults(null);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setFilename(data.filename);
        setSuccess('File uploaded successfully! Running clustering...');
        // Automatically run clustering after successful upload
        setTimeout(() => {
          handleCluster(data.filename);
        }, 0);
      } else {
        setError(data.error || 'Upload failed.');
      }
    } catch (err) {
      setError('Upload error.');
    }
    setLoading(false);
  };

  const handleCluster = async (fileOverride = null) => {
    const fname = fileOverride || filename;
    if (!fname) {
      setError('Please upload a file first.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('http://localhost:5000/cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fname, num_clusters: numClusters }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data);
        setSuccess('Clustering completed successfully!');
      } else {
        setError(data.error || 'Clustering failed.');
      }
    } catch (err) {
      setError('Clustering error.');
    }
    setLoading(false);
  };

  return (
    <div className="App" style={{ background: '#f4f7fa', minHeight: '100vh' }}>
      <header style={{ background: '#1976d2', color: 'white', padding: '28px 0', marginBottom: 30, boxShadow: '0 4px 16px rgba(25,118,210,0.12)' }}>
        <h1 style={{ margin: 0, fontWeight: 800, letterSpacing: 1 }}>SDG11 TransportAI KE</h1>
        <p style={{ margin: '10px 0 0 0', fontWeight: 400, fontSize: 18 }}>Smart Public Transport Data & Clustering for Nairobi</p>
      </header>
      <main>
        <div style={{ margin: '0 auto', maxWidth: 900 }}>
          <h2 style={{ color: '#1976d2', margin: '24px 0 10px 0', fontWeight: 700 }}>Transport Analysis & Visualizations</h2>
          <TransportAnalysis results={results} />
        </div>
        <section style={cardStyle}>
          <div style={sectionTitle}>Upload Transport CSV Data</div>
          <input type="file" accept=".csv" onChange={handleFileChange} style={inputStyle} />
          <button onClick={handleUpload} disabled={loading || !file} style={buttonStyle}>Upload CSV</button>
        </section>
        <section style={cardStyle}>
          <div style={sectionTitle}>Run K-Means Clustering</div>
          <button onClick={handleCluster} disabled={loading || !filename} style={buttonStyle}>Run Clustering</button>
          {loading && <Spinner />}
          {error && <p style={{ color: 'red', marginTop: 10, fontWeight: 600 }}>{error}</p>}
          {success && <p style={{ color: 'green', marginTop: 10, fontWeight: 600 }}>{success}</p>}
          {results && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ marginBottom: 8, color: '#388e3c' }}>Clustering Results</h3>
              <div style={{ background: '#e3f2fd', borderRadius: 6, padding: 12 }}>
                <b>Cluster Centers:</b>
                <ul style={{ margin: '10px 0 0 0' }}>
                  {results.centers.map((center, i) => (
                    <li key={i}>Lat: {center[0].toFixed(6)}, Lon: {center[1].toFixed(6)}</li>
                  ))}
                </ul>
                <div style={{ marginTop: 10 }}><b>Total Points:</b> {results.data.length}</div>
              </div>
              {/* Visualizations will be added here */}
            </div>
          )}
        </section>
      </main>
      <footer style={footerStyle}>
        &copy; {new Date().getFullYear()} SDG11 TransportAI KE &mdash; Powered by Nairobi Open Data.
      </footer>
    </div>
  );
}

// (Removed RealTimeTransport component as per new requirements)



export default App;
