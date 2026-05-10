// ========== 应用入口 ==========
// 挂载 React 根组件到 DOM
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 使用 StrictMode 在开发阶段进行额外检查
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
