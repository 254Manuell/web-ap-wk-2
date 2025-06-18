import os
import logging
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import tempfile
import requests

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static')
CORS(app)
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'csv'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Serve plots from static/plots explicitly
@app.route('/static/plots/<path:filename>')
def serve_plot(filename):
    plot_dir = os.path.join(os.path.dirname(__file__), 'static', 'plots')
    return send_from_directory(plot_dir, filename)

def allowed_file(filename):
    valid = '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    if not valid:
        logger.warning(f"File rejected due to invalid extension: {filename}")
    return valid

@app.route('/upload', methods=['POST'])
def upload_file():
    logger.info('Upload endpoint called')
    logger.info(f"UPLOAD_FOLDER: {app.config['UPLOAD_FOLDER']}")
    if not os.access(app.config['UPLOAD_FOLDER'], os.W_OK):
        logger.error(f"Upload folder not writable: {app.config['UPLOAD_FOLDER']}")
        return jsonify({'error': f"Upload folder not writable: {app.config['UPLOAD_FOLDER']}"}), 500
    if 'file' not in request.files:
        logger.error('No file part in request')
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        logger.error('No selected file')
        return jsonify({'error': 'No selected file'}), 400
    logger.info(f"Received file: {file.filename}, Content-Type: {file.content_type}, Size: {getattr(file, 'content_length', 'unknown')}")
    if file and allowed_file(file.filename):
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        logger.info(f"Saving file to: {filepath}")
        try:
            file.save(filepath)
            logger.info(f"File uploaded successfully: {file.filename}")
            return jsonify({'message': 'File uploaded successfully', 'filename': file.filename}), 200
        except Exception as e:
            logger.exception(f"Failed to save file: {file.filename}")
            return jsonify({'error': 'Failed to save file', 'details': str(e)}), 500
    else:
        logger.error(f"Invalid file type: {file.filename}")
        return jsonify({'error': 'Invalid file type'}), 400

@app.route('/cluster', methods=['POST'])
def cluster():
    logger.info('Cluster endpoint called')
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import seaborn as sns
    from matplotlib.ticker import MaxNLocator
    import uuid
    from sklearn.metrics import silhouette_score
    import numpy as np

    data = request.json
    filename = data.get('filename')
    lat_col = data.get('lat_col', 'pickup_lat')
    lon_col = data.get('lon_col', 'pickup_lon')
    if not filename:
        logger.error('No filename provided for clustering')
        return jsonify({'error': 'No filename provided'}), 400
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        logger.error(f'File not found: {filepath}')
        return jsonify({'error': 'File not found'}), 404
    try:
        df = pd.read_csv(filepath)
    except Exception as e:
        logger.exception(f'Error reading CSV: {filepath}')
        return jsonify({'error': 'Failed to read CSV', 'details': str(e)}), 400
    # Basic cleaning (mirroring notebook logic)
    if lat_col not in df.columns or lon_col not in df.columns:
        logger.error(f'Missing required columns: {lat_col}, {lon_col}')
        return jsonify({'error': f'Missing required columns: {lat_col}, {lon_col}'}), 400
    df = df[[lat_col, lon_col]].dropna()
    df = df[(df[lat_col] != 0) & (df[lon_col] != 0)]
    if df.empty:
        logger.error('No valid data points after cleaning')
        return jsonify({'error': 'No valid data points after cleaning'}), 400
    scaler = StandardScaler()
    features = scaler.fit_transform(df[[lat_col, lon_col]])

    # --- Automatically determine optimal number of clusters (elbow or silhouette) ---
    min_k = 2
    max_k = min(10, len(df)-1) if len(df) > 3 else 2
    best_k = min_k
    best_score = -1
    scores = []
    for k in range(min_k, max_k+1):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(features)
        if len(set(labels)) < 2:
            continue
        try:
            score = silhouette_score(features, labels)
            scores.append(score)
            if score > best_score:
                best_score = score
                best_k = k
        except Exception as e:
            logger.warning(f'Silhouette score error for k={k}: {e}')
            continue
    num_clusters = best_k
    kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(features)
    df['cluster'] = clusters
    centers = scaler.inverse_transform(kmeans.cluster_centers_)

    logger.info(f'Clustering complete: {num_clusters} clusters')
    return jsonify({
        'num_clusters': num_clusters,
        'centers': centers.tolist(),
        'labels': clusters.tolist(),
        'data': df[[lat_col, lon_col]].values.tolist(),
        'clustered': df.to_dict(orient='records')
    })


@app.route('/sample-data', methods=['GET'])
def sample_data():
    # Serve the default CSV for quick demo
    sample_path = os.path.join(os.path.dirname(__file__), '..', 'nairobi_taxi_trips.csv')
    return send_from_directory(os.path.dirname(sample_path), os.path.basename(sample_path), as_attachment=True)


@app.route('/cluster-api-data', methods=['POST'])
def cluster_api_data():
    logger.info('Cluster API data endpoint called')
    data = request.json
    records = data.get('data', [])
    num_clusters = int(data.get('num_clusters', 6))
    lat_col = data.get('lat_col', 'pickup_lat')
    lon_col = data.get('lon_col', 'pickup_lon')
    if not records:
        logger.error('No data provided for API clustering')
        return jsonify({'error': 'No data provided'}), 400
    df = pd.DataFrame(records)
    if lat_col not in df.columns or lon_col not in df.columns:
        logger.error(f'Missing required columns: {lat_col}, {lon_col}')
        return jsonify({'error': f'Missing required columns: {lat_col}, {lon_col}'}), 400
    df = df[[lat_col, lon_col]].dropna()
    df = df[(df[lat_col] != 0) & (df[lon_col] != 0)]
    if len(df) < num_clusters:
        logger.error('Not enough data points for the requested number of clusters')
        return jsonify({'error': 'Not enough data points for the requested number of clusters'}), 400
    scaler = StandardScaler()
    features = scaler.fit_transform(df[[lat_col, lon_col]])
    kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(features)
    df['cluster'] = clusters
    centers = scaler.inverse_transform(kmeans.cluster_centers_)
    logger.info(f'API clustering complete: {num_clusters} clusters')
    return jsonify({
        'centers': centers.tolist(),
        'labels': clusters.tolist(),
        'data': df[[lat_col, lon_col]].values.tolist(),
        'clustered': df.to_dict(orient='records')
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
