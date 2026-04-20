import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { HomeScreen } from './screens/Home.jsx';
import { CreateFlow } from './screens/Create.jsx';
import { JoinFlow } from './screens/Join.jsx';
import { SessionView } from './screens/Session.jsx';
import { StaticTerms } from './screens/StaticTerms.jsx';
import { SettingsScreen } from './screens/Settings.jsx';
import { EdgeScreen } from './screens/Edge.jsx';
import { Toast } from './components/Toast.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/create/:type" element={<CreateFlow />} />
        <Route path="/j/:sessionId" element={<JoinFlow />} />
        <Route path="/s/:sessionId" element={<SessionView />} />
        <Route path="/terms" element={<StaticTerms />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route
          path="*"
          element={
            <EdgeScreen
              tone="warn"
              icon="alert"
              title="Lost the trail."
              body="There's nothing here. Try starting a new luup."
              primary="Back home"
              onPrimary={() => {
                window.location.href = '/';
              }}
            />
          }
        />
      </Routes>
      <Toast />
    </div>
  );
}
