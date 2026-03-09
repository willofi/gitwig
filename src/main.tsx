import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SplitDiffApp from './SplitDiffApp';
import './index.css';
import type { AppTheme } from '@/utils/theme';

const params = new URLSearchParams(window.location.search);
const root = ReactDOM.createRoot(document.getElementById('root')!);

if (params.get('mode') === 'splitdiff') {
  root.render(
    <React.StrictMode>
      <SplitDiffApp
        repoPath={params.get('repo') ?? ''}
        hash={params.get('hash') ?? ''}
        parentHash={params.get('parent') ?? ''}
        filePath={params.get('file') ?? ''}
        theme={(params.get('theme') as AppTheme | null) ?? 'auto'}
      />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
