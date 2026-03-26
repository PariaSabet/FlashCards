export default function KeyboardHint() {
  return (
    <p className="keyboard-hint" aria-hidden="true">
      <kbd className="kbd">Space</kbd> flip &nbsp;
      <kbd className="kbd">&larr;</kbd>
      <kbd className="kbd">&rarr;</kbd> navigate &nbsp;
      <kbd className="kbd">K</kbd> know it &nbsp;
      <kbd className="kbd">R</kbd> review again
    </p>
  );
}
