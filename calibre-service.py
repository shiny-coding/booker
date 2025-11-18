#!/usr/bin/env python3
"""
Calibre HTTP API Service
Provides a simple HTTP API for ebook conversion using Calibre
"""

import os
import subprocess
import json
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js dev server

# Base path for books
BOOKS_BASE = os.environ.get('CALIBRE_LIBRARY_PATH', '/books')

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'calibre_version': get_calibre_version()
    })

@app.route('/version', methods=['GET'])
def version():
    """Get Calibre version"""
    return jsonify({
        'version': get_calibre_version()
    })

@app.route('/convert', methods=['POST'])
def convert():
    """
    Convert ebook format
    Request body: {
        "source_path": "books/book-name/book.epub",
        "target_path": "books/book-name/book.pdf",
        "options": {}  # Optional conversion options
    }
    """
    try:
        data = request.json
        source_path = data.get('source_path')
        target_path = data.get('target_path')
        options = data.get('options', {})

        if not source_path or not target_path:
            return jsonify({
                'error': 'source_path and target_path are required'
            }), 400

        # Construct full paths
        full_source = os.path.join(BOOKS_BASE, source_path)
        full_target = os.path.join(BOOKS_BASE, target_path)

        # Verify source exists
        if not os.path.exists(full_source):
            return jsonify({
                'error': f'Source file not found: {source_path}'
            }), 404

        # Ensure target directory exists
        target_dir = os.path.dirname(full_target)
        os.makedirs(target_dir, exist_ok=True)

        # Build ebook-convert command
        cmd = ['ebook-convert', full_source, full_target]

        # Add options
        for key, value in options.items():
            cmd.append(f'--{key}')
            if value is not True:
                cmd.append(str(value))

        # Run conversion
        print(f"Running: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        if result.returncode != 0:
            return jsonify({
                'error': 'Conversion failed',
                'details': result.stderr
            }), 500

        # Verify output exists
        if not os.path.exists(full_target):
            return jsonify({
                'error': 'Conversion completed but output file not found'
            }), 500

        # Get output file size
        file_size = os.path.getsize(full_target)

        return jsonify({
            'success': True,
            'source_path': source_path,
            'target_path': target_path,
            'file_size': file_size,
            'message': 'Conversion completed successfully'
        })

    except subprocess.TimeoutExpired:
        return jsonify({
            'error': 'Conversion timed out (max 5 minutes)'
        }), 504
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/formats', methods=['GET'])
def formats():
    """Get supported input and output formats"""
    try:
        # Get input formats
        result = subprocess.run(
            ['ebook-convert', '--input-fmts'],
            capture_output=True,
            text=True
        )
        input_formats = result.stdout.strip().split()

        # Get output formats
        result = subprocess.run(
            ['ebook-convert', '--output-fmts'],
            capture_output=True,
            text=True
        )
        output_formats = result.stdout.strip().split()

        return jsonify({
            'input_formats': input_formats,
            'output_formats': output_formats
        })
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

def get_calibre_version():
    """Get Calibre version"""
    try:
        result = subprocess.run(
            ['ebook-convert', '--version'],
            capture_output=True,
            text=True
        )
        # Extract version from output
        version_line = result.stdout.split('\n')[0]
        return version_line.strip()
    except:
        return 'unknown'

if __name__ == '__main__':
    print("=" * 50)
    print("Calibre HTTP API Service")
    print("=" * 50)
    print(f"Calibre version: {get_calibre_version()}")
    print(f"Books path: {BOOKS_BASE}")
    print(f"Listening on: http://0.0.0.0:8080")
    print("=" * 50)

    app.run(host='0.0.0.0', port=8080, debug=True)
