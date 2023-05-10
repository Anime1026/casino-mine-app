import React from 'react';
import GameManager from './pages/GameManager';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { slice } from './useStore';
import './App.scss';

const store = configureStore({ reducer: slice.reducer });
function App() {
  return (
    <Provider store={store}>
      <GameManager />
    </Provider>
  );
}

export default App;
