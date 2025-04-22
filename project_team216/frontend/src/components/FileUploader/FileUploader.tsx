// frontend/components/FileUploader/FileUploader.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  CircularProgress,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const FileUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const uploadDataset = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const fileBuffer = await file.arrayBuffer();

      const response = await fetch('http://localhost:4321/dataset/rooms/rooms', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/x-zip-compressed',
        },
        body: fileBuffer,
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Success:', data);
        window.location.reload();
      } else {
        setError(data.error || 'Failed to upload dataset');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error uploading dataset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        backgroundColor: 'rgba(36, 36, 36, 0.5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Typography variant="h5" gutterBottom>
        Upload Campus Dataset
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadFileIcon />}
          disabled={loading}
        >
          Choose File
          <input
            type="file"
            accept=".zip"
            hidden
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setError(null);
            }}
          />
        </Button>

        {file && (
          <Typography variant="body2" color="text.secondary">
            {file.name}
          </Typography>
        )}
      </Box>

      <Button
        variant="contained"
        color="primary"
        onClick={uploadDataset}
        disabled={!file || loading}
        startIcon={loading ? <CircularProgress size={20} /> : null}
        sx={{ mt: 2 }}
      >
        {loading ? 'Uploading...' : 'Upload Dataset'}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
};

export default FileUploader;
