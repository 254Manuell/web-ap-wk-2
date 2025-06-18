import React, { useState } from 'react';

export default function TransportAnalysis({ results }) {
  const [tab, setTab] = useState('visuals');

  const hasPlots = results && results.plots;

  return (
    <div style={{ margin: '32px auto', maxWidth: 800, background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(25,118,210,0.07)', padding: 24 }}>
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span role="img" aria-label="chart" style={{ fontSize: 22 }}>📊</span>
        <span style={{ fontWeight: 700, fontSize: 22 }}>Transport Analysis & Visualization</span>
      </div>
      <div style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setTab('visuals')}
          style={{
            background: tab === 'visuals' ? '#1976d2' : '#e3f2fd',
            color: tab === 'visuals' ? '#fff' : '#1976d2',
            border: 'none',
            borderRadius: 6,
            padding: '6px 20px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 16
          }}>
          🖼️ Transport Visuals
        </button>
        <button
          onClick={() => setTab('info')}
          style={{
            background: tab === 'info' ? '#1976d2' : '#e3f2fd',
            color: tab === 'info' ? '#fff' : '#1976d2',
            border: 'none',
            borderRadius: 6,
            padding: '6px 20px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 16
          }}>
          ℹ️ Analysis Info
        </button>
      </div>
      {tab === 'visuals' && (
        <div>
          {!hasPlots && (
            <div style={{ color: '#888', textAlign: 'center', margin: '40px 0' }}>
              <b>No analysis visuals yet.</b> Upload data and run clustering to see analysis plots.
            </div>
          )}
          {results && (
            <div style={{ textAlign: 'center', margin: '24px 0', fontSize: 17, fontWeight: 600, color: '#1976d2' }}>
              Number of clusters (k): {results.num_clusters}
              <div style={{ marginTop: 12, color: '#333', fontWeight: 400 }}>
                <div>Cluster centers:</div>
                <pre style={{ textAlign: 'left', display: 'inline-block', background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{JSON.stringify(results.centers, null, 2)}</pre>
                <div style={{ marginTop: 8 }}>
                  Cluster counts: {JSON.stringify((results.clustered || []).reduce((acc, r) => {
                    acc[r.cluster] = (acc[r.cluster] || 0) + 1; return acc;
                  }, {}))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {tab === 'info' && (
        <ul style={{ lineHeight: 1.8, margin: '20px 0 0 0' }}>
          <li><b>Cluster Visualization:</b> Nairobi pickup locations grouped by cluster with cluster centers.</li>
          <li><b>Boxplot Latitude:</b> Outlier detection for latitude values.</li>
          <li><b>Boxplot Longitude:</b> Outlier detection for longitude values.</li>
        </ul>
      )}
    </div>
  );
}
