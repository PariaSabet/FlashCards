export default function DarkModeToggle({ dark, onToggle }) {
  return (
    <button
      className="dark-toggle"
      type="button"
      onClick={onToggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      <span className="dark-toggle__icon">{dark ? "☀️" : "🌙"}</span>
    </button>
  );
}
