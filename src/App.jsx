import { useState, useCallback } from "react";
import HomeScreen from "./components/HomeScreen";
import StudyScreen from "./components/StudyScreen";
import DarkModeToggle from "./components/DarkModeToggle";
import { useDarkMode } from "./hooks/useDarkMode";

export default function App() {
  const [view, setView] = useState("home");
  const [activeTopic, setActiveTopic] = useState(null);
  const [dark, toggleDark] = useDarkMode();

  const handleOpenTopic = useCallback((topic) => {
    setActiveTopic(topic);
    setView("study");
  }, []);

  const handleGoHome = useCallback(() => {
    setView("home");
    setActiveTopic(null);
  }, []);

  return (
    <>
      <DarkModeToggle dark={dark} onToggle={toggleDark} />
      {view === "study" && activeTopic ? (
        <StudyScreen topic={activeTopic} onGoHome={handleGoHome} />
      ) : (
        <HomeScreen onOpenTopic={handleOpenTopic} />
      )}
    </>
  );
}
