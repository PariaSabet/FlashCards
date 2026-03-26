import { useState, useCallback } from "react";
import HomeScreen from "./components/HomeScreen";
import StudyScreen from "./components/StudyScreen";

export default function App() {
  const [view, setView] = useState("home");
  const [activeTopic, setActiveTopic] = useState(null);

  const handleOpenTopic = useCallback((topic) => {
    setActiveTopic(topic);
    setView("study");
  }, []);

  const handleGoHome = useCallback(() => {
    setView("home");
    setActiveTopic(null);
  }, []);

  if (view === "study" && activeTopic) {
    return <StudyScreen topic={activeTopic} onGoHome={handleGoHome} />;
  }

  return <HomeScreen onOpenTopic={handleOpenTopic} />;
}
